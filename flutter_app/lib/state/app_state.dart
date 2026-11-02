import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../data/app_text.dart';
import '../data/content.dart';
import '../logic/arabic.dart';
import '../logic/badges.dart';
import '../logic/daily.dart';
import '../logic/dates.dart';
import '../logic/leitner.dart';
import '../logic/levels.dart';
import '../logic/reminders.dart';
import '../logic/rng.dart';
import '../logic/stats.dart';
import '../models/app_data.dart';
import '../services/ai_service.dart';
import '../services/notification_service.dart';
import '../services/share_service.dart';
import '../services/sound_service.dart';
import '../services/storage_service.dart';
import 'ui_events.dart';

/// تبويبات الشريط السفلي.
enum AppTab { home, challenges, focus, study, journey }

/// مسودة البداية (سؤال واحد في كل شاشة).
class OnboardingDraft {
  String name = '';
  String grade = '';
  int cls = 0;
  final List<String> subjects = [];
  int minutes = 45;
  String when = '';
  int? away;
  final Map<String, int> levels = {};
}

/// حالة التطبيق ومنطقه (مثل S والدوال في app.js). الواجهة تستمع لها فقط.
class AppState extends ChangeNotifier with WidgetsBindingObserver {
  AppState({
    required this.storage,
    required this.sound,
    required this.notifications,
    required this.share,
    AiService? ai,
    DateTime Function()? clock,
  }) : ai = ai ?? AiService(),
       _clock = clock ?? DateTime.now;

  final StorageService storage;
  final SoundService sound;
  final NotificationService notifications;
  final ShareService share;
  final AiService ai;
  final DateTime Function() _clock;

  AppData data = AppData();
  ThemeMode themeMode = ThemeMode.system;
  AppTab tab = AppTab.home;

  /// يزداد كل نصف ثانية أثناء جلسة التركيز (لرسم المؤقت دون إعادة بناء كل شيء).
  final ValueNotifier<int> timerTick = ValueNotifier(0);
  final StreamController<UiEvent> _events = StreamController.broadcast();
  final List<UiEvent> _backlog = [];
  Stream<UiEvent> get events => _events.stream;

  /// الأحداث التي صدرت قبل أن تجهز الواجهة (مثل انتهاء جلسة أثناء إغلاق التطبيق).
  List<UiEvent> takeBacklog() {
    final out = List.of(_backlog);
    _backlog.clear();
    return out;
  }

  void _emit(UiEvent e) {
    if (_events.hasListener) {
      _events.add(e);
    } else {
      _backlog.add(e);
    }
  }

  Timer? _timerLoop;
  Timer? _minuteLoop;
  String _lastDay = '';

  // ---------- أساسيات ----------
  DateTime get now => _clock();
  String get today => dateKey(now);
  Stats get stats => computeStats(data, now);
  LevelInfo get level => levelInfo(data.xp);
  DayRecord get rec => data.dayRec(today);
  Profile get profile => data.profile!;
  bool get onboarded => data.profile != null;
  int get studentCls => studentClass(data);
  List<String> get subjects => data.profile?.subjects.isNotEmpty == true ? data.profile!.subjects : const ['عام'];

  Future<void> init() async {
    data = storage.load();
    final t = storage.theme;
    themeMode = t == 'light'
        ? ThemeMode.light
        : t == 'dark'
        ? ThemeMode.dark
        : ThemeMode.system;
    notifications.onTap = _onNotifTap;
    WidgetsBinding.instance.addObserver(this);
    _lastDay = today;
    ensureDaily();
    final tm = data.timer;
    if (tm != null) {
      if (tm.end <= now.millisecondsSinceEpoch) {
        Future.microtask(finishTimer);
      } else {
        _ensureTimerLoop();
      }
    }
    _minuteLoop = Timer.periodic(const Duration(minutes: 1), (_) => _checkDayChange());
    Future.delayed(const Duration(milliseconds: 500), syncReminders);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timerLoop?.cancel();
    _minuteLoop?.cancel();
    _events.close();
    timerTick.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      syncReminders();
      final tm = data.timer;
      if (tm != null && tm.end <= now.millisecondsSinceEpoch) {
        finishTimer();
      } else if (tm != null && !tm.muted) {
        sound.startAmbient();
      }
      _checkDayChange();
    } else if (state == AppLifecycleState.paused) {
      sound.stopAmbient();
    }
  }

  void _checkDayChange() {
    if (today != _lastDay) {
      _lastDay = today;
      ensureDaily();
      notifyListeners();
    }
  }

  void save() {
    storage.save(data);
    notifyListeners();
  }

  void toast(String msg) => _emit(ToastEvent(msg));
  void celebrate(CelebrateEvent e) => _emit(e);
  void fx(String id, {int combo = 0}) => sound.fx(id, combo: combo);

  void setTab(AppTab t) {
    tab = t;
    notifyListeners();
  }

  Future<void> setTheme(ThemeMode m) async {
    themeMode = m;
    await storage.setTheme(
      m == ThemeMode.light
          ? 'light'
          : m == ThemeMode.dark
          ? 'dark'
          : 'auto',
    );
    notifyListeners();
  }

  void markActive() => rec.active = true;

  // ---------- النقاط والمكافآت ----------
  void addXP(int n, [String? reason]) {
    final before = levelInfo(data.xp).level;
    data.xp = math.max(0, data.xp + n);
    if (n > 0) markActive();
    final after = levelInfo(data.xp).level;
    save();
    if (n > 0 && reason != null) toast('+$n⭐ $reason');
    if (after > before) {
      final goal = data.profile?.goal ?? '';
      celebrate(
        CelebrateEvent(
          '🎉',
          'المستوى $after: ${levelInfo(data.xp).title}',
          'لقب جديد تستحقه! كل مستوى يقرّبك من هدفك${goal.isNotEmpty ? ' «$goal»' : ''}. استمر، أنت تتقدّم فعلاً.',
          sound: 'levelup',
          confetti: true,
        ),
      );
    }
    checkBadges();
  }

  void checkBadges() {
    final newly = newlyEarned(data, stats);
    if (newly.isEmpty) return;
    for (final b in newly) {
      data.badges.add(b.id);
    }
    save();
    final b = newly.first;
    celebrate(CelebrateEvent(b.icon, 'وسام جديد: ${b.name}', b.desc, sound: 'badge', confetti: true));
  }

  // ---------- التحديات اليومية ----------
  void ensureDaily() {
    if (data.profile == null) return;
    if (data.daily == null || data.daily!.date != today) rebuildDaily(0, notify: false);
  }

  void rebuildDaily(int rerolls, {bool notify = true}) {
    if (data.profile == null) return;
    data.daily = buildDaily(data, now, rerolls);
    rec.given = data.daily!.list.length;
    storage.save(data);
    if (notify) notifyListeners();
  }

  Daily get daily {
    ensureDaily();
    return data.daily!;
  }

  void completeChallenge(Challenge ch) {
    final r = rec;
    ch.done = true;
    r.ch++;
    fx('complete');
    addXP(ch.xp);
    final d = data.daily!;
    if (d.list.every((c) => c.done) && !d.fullAwarded && !r.full) {
      d.fullAwarded = true;
      r.full = true;
      data.fullDays++;
      save();
      addXP(30, 'يوم مثالي!');
      fx('perfect');
      _emit(const ConfettiEvent());
    }
    save();
  }

  void toggleChallenge(String id) {
    if (data.daily == null || data.daily!.date != today) {
      toast('بدأ يوم جديد ✨ إليك تحديات اليوم');
      ensureDaily();
      notifyListeners();
      return;
    }
    final ch = data.daily!.list.where((c) => c.id == id).firstOrNull;
    if (ch == null) return;
    if (!ch.done) {
      completeChallenge(ch);
    } else {
      ch.done = false;
      rec.ch = math.max(0, rec.ch - 1);
      addXP(-ch.xp);
      save();
    }
  }

  void reroll() {
    rebuildDaily(daily.rerolls + 1);
    toast('تحديات جديدة 🎲');
  }

  void setMood(int i) {
    final r = rec;
    final prev = r.mood;
    r.mood = i;
    save();
    // أعد توليد التحديات حسب المزاج إذا لم يبدأ بعد
    if (prev != i && !daily.list.any((c) => c.done)) rebuildDaily(daily.rerolls);
  }

  void restDay() {
    rec.rest = true;
    markActive();
    save();
    toast('🌿 يوم راحة — تقدّمك وسلسلتك محفوظة');
  }

  bool reflect(String text) {
    final t = text.trim();
    if (t.length < 5) {
      toast('اكتب جملة على الأقل 🙂');
      return false;
    }
    data.journal.add(JournalEntry(today, t));
    rec.reflected = true;
    save();
    addXP(15, 'تأمّل رائع');
    return true;
  }

  WeeklyChallenge get weekly => weeklyChallenge(data, now);

  void claimWeekly() {
    final wk = weekly;
    if (wk.val >= wk.target && !wk.claimed) {
      data.weeklyClaimed[wk.key] = true;
      save();
      _emit(const ConfettiEvent());
      addXP(150, 'تحدي الأسبوع!');
    }
  }

  void lostDone() {
    final r = rec;
    if (r.lost) {
      markActive();
      save();
      toast('أحسنت! 💪 استمر');
      return;
    }
    r.lost = true;
    data.lostDone++;
    save();
    addXP(20, 'بدأت فعلاً!');
  }

  int get lowStreakDays => lowStreak(data, now);
  List<StudyCard> get due => dueCards(data, now);

  // ---------- مؤقت التركيز ----------
  bool get timerRunning => data.timer != null && data.timer!.end > now.millisecondsSinceEpoch;

  void startTimer(int minutes, String subject, {String? chId}) {
    final end = now.millisecondsSinceEpoch + minutes * 60000;
    data.timer = FocusTimer(end: end, minutes: minutes, subject: subject, chId: chId);
    save();
    fx('focusStart');
    sound.startAmbient();
    notifications.scheduleFocusEnd(DateTime.fromMillisecondsSinceEpoch(end));
    tab = AppTab.focus;
    _ensureTimerLoop();
    notifyListeners();
  }

  void _ensureTimerLoop() {
    _timerLoop?.cancel();
    if (data.timer == null) return;
    _timerLoop = Timer.periodic(const Duration(milliseconds: 500), (_) {
      final tm = data.timer;
      if (tm == null) {
        _timerLoop?.cancel();
        return;
      }
      if (tm.end <= now.millisecondsSinceEpoch) {
        finishTimer();
      } else {
        timerTick.value++;
      }
    });
  }

  /// الدقائق التي مرّت فعلاً في الجلسة الحالية.
  int get timerDoneMinutes {
    final tm = data.timer;
    if (tm == null) return 0;
    return ((tm.minutes * 60000 - (tm.end - now.millisecondsSinceEpoch)) / 60000).floor();
  }

  /// إنهاء مبكر: تُحسب الدقائق إذا كانت 3 أو أكثر.
  void stopTimerEarly() {
    final tm = data.timer;
    if (tm == null) return;
    final m = timerDoneMinutes;
    notifications.cancelFocusEnd();
    sound.stopAmbient();
    if (m >= 3) {
      tm.minutes = m;
      tm.end = now.millisecondsSinceEpoch;
      tm.muted = true;
      finishTimer();
    } else {
      _timerLoop?.cancel();
      data.timer = null;
      save();
    }
  }

  void toggleSessionMute() {
    final tm = data.timer;
    if (tm == null) return;
    tm.muted = !tm.muted;
    save();
    if (tm.muted) {
      sound.stopAmbient();
    } else {
      sound.startAmbient();
    }
  }

  void finishTimer() {
    final tm = data.timer;
    _timerLoop?.cancel();
    data.timer = null;
    if (tm == null) return;
    final r = rec;
    r.focus += tm.minutes;
    r.sessions++;
    data.totalFocus += tm.minutes;
    data.sessions++;
    save();
    sound.stopAmbient();
    // نعزف نغمة النهاية فقط إذا انتهت الجلسة للتو (لا بعد ساعات)، وما لم يكتمها الطالب
    if (!tm.muted && now.millisecondsSinceEpoch - tm.end < 600000) fx('focusEnd');
    var earned = tm.minutes * 2;
    addXP(earned);
    var chDone = false;
    final d = data.daily;
    if (tm.chId != null && d != null && d.date == today) {
      final ch = d.list.where((c) => c.id == tm.chId && !c.done).firstOrNull;
      if (ch != null) {
        completeChallenge(ch);
        earned += ch.xp;
        chDone = true;
      }
    }
    final next = d != null && d.date == today ? d.list.where((c) => !c.done).firstOrNull : null;
    celebrate(
      CelebrateEvent(
        '🧠',
        'أحسنت! ${arMins(tm.minutes)} تركيز',
        '+$earned ⭐${chDone ? ' · وأنجزت التحدي ✔' : ''}. خذ استراحة 5 دقائق: قم، تحرّك، وتنفّس.',
        primaryLabel: next != null
            ? '👉 التالي: ${next.text.length > 38 ? '${next.text.substring(0, 38)}…' : next.text}'
            : null,
        onPrimary: next != null ? () => setTab(AppTab.home) : null,
        closeLabel: '🌿 استراحة',
      ),
    );
    notifyListeners();
  }

  // ---------- الألعاب ----------
  void gameXP(int n) {
    final r = rec;
    final allowed = math.max(0, math.min(n, kGameXpCap - r.gameXp));
    r.gameXp += allowed;
    if (allowed > 0) {
      addXP(allowed, 'من الألعاب');
    } else {
      markActive();
      save();
      toast('وصلت لحد نقاط الألعاب اليوم — نقاط الدراسة أهم 😉');
    }
  }

  void mathOver(int score) {
    if (score > (data.best['math'] ?? 0)) {
      data.best['math'] = score;
      toast('رقم قياسي جديد! 🏆');
      fx('record');
    } else {
      fx('gameEnd');
    }
    save();
    gameXP(score * 2);
  }

  void memoryOver(int tries) {
    final b = data.best['memory'] ?? 0;
    if (b == 0 || tries < b) {
      data.best['memory'] = tries;
      toast('رقم قياسي جديد! 🏆');
      fx('record');
    } else {
      fx('gameEnd');
    }
    save();
    gameXP(math.max(10, 40 - tries));
  }

  void quizOver(int score) {
    final rec0 = data.best['quiz'];
    if (rec0 == null || score > rec0) data.best['quiz'] = score;
    fx(rec0 != null && score > rec0 ? 'record' : 'gameEnd');
    save();
    gameXP(score * 3);
  }

  // ---------- البطاقات ----------
  void addCard(String subject, String q, String a) {
    data.cards.add(StudyCard(id: randomId(), subject: subject, q: q, a: a, due: today));
    final r = rec;
    r.cardsAdded++;
    save();
    if (r.cardsAdded <= kCardXpDaily) {
      addXP(5, 'بطاقة جديدة');
    } else {
      markActive();
      save();
      toast('أضيفت البطاقة ✔');
      checkBadges();
    }
  }

  void deleteCard(String id) {
    data.cards.removeWhere((c) => c.id == id);
    save();
  }

  void quizToCard(String subject, String q, String a) {
    data.cards.add(StudyCard(id: randomId(), subject: subject, q: q, a: a, due: dateKey(addDays(now, 1))));
    save();
    toast('أضيفت لبطاقاتك 🗂️');
  }

  ReviewSession startReview() => ReviewSession(shuffle(due.map((c) => c.id).toList(), math.Random().nextDouble));

  void showAnswer(ReviewSession r) {
    r.show = true;
    fx('flip');
    notifyListeners();
  }

  void gradeCard(ReviewSession r, bool ok) {
    if (r.queue.isEmpty) return;
    final c = data.cards.where((x) => x.id == r.queue.first).firstOrNull;
    if (c == null) {
      r.queue.removeAt(0);
      notifyListeners();
      return;
    }
    if (ok) fx('right');
    final d = rec;
    d.reviews++;
    data.reviews++;
    // النقاط على المراجعة الصادقة (عرفتها أو لا)، بحد أقصى 60 نقطة مراجعة يومياً
    if (r.grade(c, ok, now)) {
      d.reviewXp += 2;
      if (d.reviewXp <= kReviewXpCap) {
        addXP(2);
        r.xp += 2;
      } else {
        markActive();
      }
    } else {
      markActive();
    }
    save();
    checkBadges();
  }

  // ---------- البداية والتقييم ----------
  String welcomePlan(Map<String, int> levels, int? away) {
    final subs = stableSorted(levels.keys.toList(), (a, b) => levels[b]! - levels[a]!);
    final strong = subs.first, weak = subs.last;
    return '${(away ?? 0) >= 3 ? 'غبت فترة طويلة، وهذا لا يقلل منك أبداً. ' : ''}'
        'نبدأ بمادتك الأقوى «$strong» لنكسب الحماس'
        '${weak != strong ? '، ثم نعطي «$weak» اهتماماً أكبر تدريجياً' : ''}'
        '. ما عليك اليوم إلا أن تنجز خطوة واحدة!';
  }

  void finishOnboarding(OnboardingDraft ob) {
    final levels = {for (final x in ob.subjects) x: ob.levels[x] ?? 3};
    data.profile = Profile(
      name: ob.name,
      grade: ob.grade.isEmpty ? kGrades[2] : ob.grade,
      cls: ob.cls == 0 ? null : ob.cls,
      subjects: List.of(ob.subjects),
      minutes: ob.minutes,
      when: ob.when,
    );
    data.assess.add(Assessment(date: today, away: ob.away ?? 0, levels: levels));
    data.daily = null;
    tab = AppTab.home;
    save();
    ensureDaily();
    addXP(20);
    fx('focusStart');
    celebrate(CelebrateEvent('✨', 'مرحباً ${ob.name}!', welcomePlan(levels, ob.away), closeLabel: 'لنبدأ!'));
  }

  void saveAssess(int away, Map<String, int> levels0, Map<String, String> lessons) {
    final first = data.assess.isEmpty;
    final levels = {for (final s in profile.subjects) s: levels0[s] ?? 3};
    final lastDate = first ? null : data.assess.last.date;
    data.assess.add(Assessment(date: today, away: away, levels: levels));
    lessons.forEach((k, v) {
      if (v.trim().isNotEmpty) profile.lastLesson[k] = v.trim();
    });
    if (data.daily != null && !data.daily!.list.any((c) => c.done)) data.daily = null;
    ensureDaily();
    save();
    final sorted = stableSorted(profile.subjects, (a, b) => levels[b]! - levels[a]!);
    final weak = sorted.last;
    if (first) {
      addXP(20, 'أكملت التقييم');
      celebrate(CelebrateEvent('✨', 'مرحباً ${profile.name}!', welcomePlan(levels, away)));
    } else {
      if (lastDate == null || dayNumber(today) - dayNumber(lastDate) >= 7) addXP(15, 'تقييم جديد');
      celebrate(
        CelebrateEvent(
          '📊',
          'تم حفظ تقييمك',
          'شاهد تطوّرك في صفحة «رحلتي». المادة التي تحتاج تركيزاً أكثر الآن: «$weak».',
        ),
      );
    }
  }

  void saveProfile({
    required String name,
    required int? cls,
    required List<String> subjects,
    required int minutes,
    required String goal,
    required String when,
    required String? g,
  }) {
    final p = profile;
    p.name = name;
    p.subjects = List.of(subjects);
    if (cls != null && cls > 0) {
      p.cls = cls;
      p.grade = gradeOfClass(cls);
    }
    p.minutes = minutes;
    p.goal = goal;
    p.when = when;
    p.g = g;
    syncReminders();
    if (data.daily != null && !data.daily!.list.any((c) => c.done)) rebuildDaily(data.daily!.rerolls);
    save();
    toast('تم الحفظ ✔');
  }

  // ---------- الإعدادات ----------
  void toggleSetting(String k) {
    final s = data.settings;
    switch (k) {
      case 'sound':
        s.sound = !s.sound;
        if (s.sound) Future.delayed(const Duration(milliseconds: 30), () => fx('right'));
        if (!s.sound) sound.stopAmbient();
      case 'haptics':
        s.haptics = !s.haptics;
        if (s.haptics) sound.buzz(const [15]);
      case 'quiet':
        s.quiet = !s.quiet;
      case 'ambient':
        s.ambient = !s.ambient;
    }
    save();
  }

  void setVolume(double v) {
    data.settings.volume = v.clamp(0.0, 1.0);
    save();
    fx('right');
  }

  // ---------- التذكيرات ----------
  Future<void> syncReminders() async {
    if (data.profile == null) return;
    final r = data.reminders;
    final nowMs = now.millisecondsSinceEpoch;
    // قياس محلي بدون تتبّع: كم إشعاراً مرّ دون أن يُفتح التطبيق منه
    final fired = r.lastPlan.where((p) => p.at < nowMs).length;
    final lastTap = data.notif.lastTap;
    if (fired > 0 && !(lastTap != null && nowMs - lastTap < 600000)) data.notif.ignored += fired;
    final plan = planNotifications(data, now);
    r.lastPlan = plan.map((p) => PlanRef(p.id, p.at.millisecondsSinceEpoch)).toList();
    data.notif.scheduled += plan.length;
    storage.save(data);
    await notifications.replaceReminders(plan);
  }

  void _onNotifTap(String? actionId) {
    data.notif.tapped++;
    data.notif.ignored = 0;
    data.notif.lastTap = now.millisecondsSinceEpoch;
    save();
    if (actionId == 'start5' && data.profile != null && !timerRunning) startTimer(5, subjects.first);
  }

  Future<void> enableReminders() async {
    final ok = await notifications.requestPermission();
    final r = data.reminders;
    r.asks = math.max(r.asks, 1);
    r.askedOn = today;
    if (!ok) {
      r.asks = 2; // لا نسأل مرة ثالثة بعد الرفض
      save();
      toast('حسناً، لن نرسل تذكيرات 💜');
      return;
    }
    r.on = true;
    if (r.onSince.isEmpty) r.onSince = today;
    save();
    await syncReminders();
    toast('🔔 سنذكّرك بلطف قبل موعدك');
  }

  void remindNo() {
    final r = data.reminders;
    r.asks = math.min(2, r.asks + 1);
    r.askedOn = today;
    save();
  }

  void remindHelpful(bool yes) {
    data.reminders.helpfulAsked = true;
    data.notif.helpful = yes;
    if (!yes) {
      data.reminders.reduced = true;
      toast('خففنا التذكيرات. يمكنك إيقافها من الإعدادات');
    } else {
      toast('شكراً لك 💜');
    }
    save();
    syncReminders();
  }

  void toggleReminderPref(String k) {
    final r = data.reminders;
    switch (k) {
      case 'on':
        if (!r.on) {
          enableReminders();
          return;
        }
        r.on = false;
        data.notif.disables++;
      case 'miss':
        r.miss = !r.miss;
      case 'shared':
        r.shared = !r.shared;
        if (r.shared) r.showName = false;
      case 'showName':
        r.showName = !r.showName;
    }
    save();
    syncReminders();
  }

  void setReminderLead(int m) {
    data.reminders.lead = m;
    save();
    syncReminders();
  }

  void toggleReminderDay(int d) {
    final days = data.reminders.days;
    if (days.contains(d)) {
      if (days.length > 1) days.remove(d);
    } else {
      days.add(d);
    }
    save();
    syncReminders();
  }

  /// يضبط الوقت داخل 07:00–21:30 ويعيد true إذا تمّ تعديله.
  bool setReminderTime(TimeOfDay t) {
    var v = '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
    final orig = v;
    if (v.compareTo('07:00') < 0) v = '07:00';
    if (v.compareTo('21:30') > 0) v = '21:30';
    data.reminders.time = v;
    save();
    syncReminders();
    if (v != orig) toast('لا تذكيرات قبل 7 صباحاً أو بعد 9:30 مساءً');
    return v != orig;
  }

  void pauseReminders() {
    data.reminders.pausedUntil = dateKey(addDays(now, 7));
    data.notif.pauses++;
    save();
    syncReminders();
    toast('⏸️ أوقفنا التذكيرات أسبوعاً. خذ وقتك 💜');
  }

  void resumeReminders() {
    data.reminders.pausedUntil = '';
    save();
    syncReminders();
  }

  bool get remindersPaused => data.reminders.pausedUntil.isNotEmpty && data.reminders.pausedUntil.compareTo(today) >= 0;

  /// بطاقة السؤال اللطيف: بعد أول تحدٍّ، ومرة ثانية بعد 14 يوماً على الأكثر.
  bool get showReminderAsk {
    final r = data.reminders;
    if (r.on || r.asks >= 2 || stats.totalChallenges < 1) return false;
    if (r.asks == 1 && r.askedOn.isNotEmpty && dayNumber(today) - dayNumber(r.askedOn) < 14) return false;
    return true;
  }

  bool get showReminderHelpful {
    final r = data.reminders;
    return r.on && !r.helpfulAsked && r.onSince.isNotEmpty && dayNumber(today) - dayNumber(r.onSince) >= 14;
  }

  // ---------- رسائل الرئيسية ----------
  /// «أهلاً بعودتك» مرة يومياً بعد غياب يومين أو أكثر، أو سؤال الرأي بعد 3 أيام.
  void homeShown() {
    if (data.profile == null) return;
    final st = stats;
    if (st.gapDays >= 2 && data.welcomedOn != today) {
      data.welcomedOn = today;
      save();
      fx('welcome');
      celebrate(
        CelebrateEvent(
          '💜',
          'أهلاً بعودتك يا ${profile.name}!',
          'الغياب جزء من الرحلة، والمهم أنك هنا الآن. تقدّمك كله محفوظ'
              '${st.reentry ? '، وخففنا لك تحديات الأيام القادمة لتعود بهدوء.' : '.'}',
        ),
      );
      return;
    }
    if (!data.feedbackAsked && st.activeDays >= 3) {
      data.feedbackAsked = true;
      save();
      celebrate(
        CelebrateEvent(
          '💬',
          'ما رأيك بالتطبيق حتى الآن؟',
          'مرّت 3 أيام على رحلتك! تقييمك واقتراحاتك تساعدنا نطوّر التطبيق.',
          primaryLabel: 'أعطِ رأيك',
          onPrimary: () => _emit(const NavigateEvent('settings')),
          closeLabel: 'لاحقاً',
        ),
      );
    }
  }

  // ---------- الرأي والتواصل ----------
  Future<void> sendFeedback(int rating, String kind, String text) async {
    final st = stats, lv = level;
    data.feedback.add(FeedbackEntry(today, rating, kind, text));
    final firstThisWeek = !data.feedback
        .sublist(0, data.feedback.length - 1)
        .any((f) => dayNumber(today) - dayNumber(f.date) < 7);
    save();
    final n = data.notif;
    final body =
        'التقييم: ${rating > 0 ? '${'★' * rating}${'☆' * (5 - rating)} ($rating/5)' : 'بدون'}\n'
        'النوع: $kind\n\n$text\n\n'
        '— معلومات (بدون بيانات شخصية):\n'
        'التذكيرات: ${data.reminders.on ? 'مفعّلة' : 'مطفأة'} · فُتحت من إشعار: ${n.tapped} · إيقاف مؤقت: ${n.pauses}'
        '${n.helpful == null ? '' : ' · مفيدة: ${n.helpful! ? 'نعم' : 'لا'}'}\n'
        'المرحلة الدراسية: ${profile.grade}${profile.cls != null ? ' — ${classLabel(profile.cls)}' : ''}\n'
        'المستوى في التطبيق: ${lv.level}\nأيام الاستخدام: ${st.activeDays}\nالمرحلة: ${st.stageObj.name}\n'
        'المصدر: تطبيق Flutter';
    if (firstThisWeek) {
      addXP(10, 'شكراً على رأيك');
    } else {
      markActive();
      save();
    }
    final uri = Uri(
      scheme: 'mailto',
      path: kContact.email,
      query: 'subject=${Uri.encodeComponent('رأي في رحلة العودة — $kind')}&body=${Uri.encodeComponent(body)}',
    );
    toast('شكراً لك! 💜 سيفتح تطبيق البريد لإرسال رسالتك');
    await openUrl(uri);
  }

  Future<bool> openUrl(Uri uri) async {
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      toast('تعذّر فتح الرابط');
      return false;
    }
  }

  // ---------- النسخ الاحتياطي ----------
  Future<void> exportBackup() async {
    final json = jsonEncode(data.toJson());
    final ok = await share.shareBytes(
      Uint8List.fromList(utf8.encode(json)),
      'rehla-backup-$today.json',
      'application/json',
      text: 'نسخة احتياطية من رحلة العودة',
    );
    if (!ok) toast('تعذّرت المشاركة');
  }

  /// يستورد نسخة احتياطية (من الويب أو Flutter). يعيد false إذا كان الملف غير صالح.
  bool importBackup(String raw) {
    try {
      final j = jsonDecode(raw);
      if (j is! Map<String, dynamic> || !j.containsKey('xp')) throw const FormatException('bad');
      final next = AppData.fromJson(j, keepDaily: false, today: today);
      _timerLoop?.cancel();
      data = next;
      tab = AppTab.home;
      ensureDaily();
      if (data.timer != null) _ensureTimerLoop();
      save();
      syncReminders();
      toast('تم استيراد البيانات ✔');
      return true;
    } catch (_) {
      toast('الملف غير صالح');
      return false;
    }
  }

  Future<void> resetAll() async {
    _timerLoop?.cancel();
    await notifications.replaceReminders(const []);
    await notifications.cancelFocusEnd();
    await storage.deleteAllBooks();
    data = AppData();
    tab = AppTab.home;
    save();
  }

  // ---------- كتبي + المعلم الذكي ----------
  String get deviceId {
    if (data.deviceId.isEmpty) {
      data.deviceId = randomId().replaceAll(RegExp(r'[^A-Za-z0-9]'), '');
      storage.save(data);
    }
    return data.deviceId;
  }

  Future<Book?> addBook(Uint8List bytes, String fileName) async {
    final lower = fileName.toLowerCase();
    final ext = lower.contains('.') ? lower.split('.').last : '';
    final isPdf = ext == 'pdf';
    final isImg = const ['jpg', 'jpeg', 'png', 'webp', 'heic', 'gif'].contains(ext);
    if (!isPdf && !isImg) {
      toast('ارفع ملف PDF أو صورة');
      return null;
    }
    final mime = isPdf ? 'application/pdf' : 'image/${ext == 'jpg' ? 'jpeg' : ext}';
    final id = 'b${randomId()}';
    try {
      await storage.putBook(id, bytes);
    } catch (_) {
      toast('لا توجد مساحة كافية على الجهاز لحفظ الكتاب');
      return null;
    }
    var title = fileName.replaceAll(RegExp(r'\.[^.]+$'), '').replaceAll(RegExp(r'[_-]+'), ' ');
    if (title.length > 80) title = title.substring(0, 80);
    if (title.trim().isEmpty) title = isImg ? 'صفحات الدرس' : 'كتاب';
    final b = Book(
      id: id,
      title: title,
      subject: subjects.first,
      kind: 'file',
      mime: mime,
      size: bytes.length,
      added: today,
    );
    data.books.add(b);
    save();
    toast(bytes.length > AiService.maxFile ? 'أُضيف الكتاب ✔ (كبير على المعلم — ارفع فصلاً واحداً)' : 'أُضيف الكتاب ✔');
    fx('complete');
    return b;
  }

  Book? addBookLink(String url, String title, String subject) {
    if (!RegExp(r'^https://\S+$', caseSensitive: false).hasMatch(url)) {
      toast('اكتب رابطاً صحيحاً يبدأ بـ https://');
      return null;
    }
    final b = Book(
      id: 'b${randomId()}',
      title: title.isEmpty ? 'كتاب من رابط' : title,
      subject: subject,
      kind: 'link',
      mime: 'application/pdf',
      size: 0,
      url: url,
      added: today,
    );
    data.books.add(b);
    save();
    fx('complete');
    return b;
  }

  Future<void> deleteBook(String id) async {
    data.books.removeWhere((b) => b.id == id);
    data.bookChats.remove(id);
    await storage.deleteBook(id);
    save();
  }

  Future<void> openBookFile(Book b) async {
    if (b.kind == 'link') {
      await openUrl(Uri.parse(b.url));
      return;
    }
    final f = await storage.bookFile(b.id);
    if (!f.existsSync()) {
      toast(AiError('missing').message);
      return;
    }
    await share.shareFile(f.path, b.mime, text: b.title);
  }

  static String aiTarget(String lesson) => lesson.trim().isNotEmpty ? '«${lesson.trim()}»' : 'أول درس في الكتاب';

  static String aiPrompt(String mode, String lesson) {
    final t = aiTarget(lesson);
    switch (mode) {
      case 'explain':
        return 'اشرح لي $t خطوة بخطوة بأسلوب بسيط، مع مثال من الحياة، ثم اسألني سؤالاً واحداً لأتأكد أني فهمت.';
      case 'summary':
        return 'لخّص لي $t في نقاط قصيرة: الأفكار الرئيسية، والمصطلحات المهمة، وما يجب أن أحفظه.';
      case 'quiz':
        return 'اختبرني في $t: اسألني سؤالاً واحداً فقط في كل مرة، وانتظر إجابتي، ثم صحّحها بلطف وانتقل للسؤال التالي. ابدأ بالسؤال الأول.';
    }
    return 'اصنع 8 بطاقات مراجعة (سؤال قصير وجوابه من الكتاب) من $t.';
  }

  bool aiBusy = false;
  String aiStatus = '';

  Future<void> _ensureUploaded(Book b, {bool force = false}) async {
    if (b.kind != 'file' || (b.fileId.isNotEmpty && !force)) return;
    final bytes = await storage.getBook(b.id);
    if (bytes == null) throw AiError('missing');
    if (bytes.length > AiService.maxFile) throw AiError('too_large');
    aiStatus = 'نرفع الكتاب للمعلم (مرة واحدة فقط)';
    notifyListeners();
    final ext = (b.mime.split('/').length > 1 ? b.mime.split('/')[1] : 'pdf').replaceAll('jpeg', 'jpg');
    b.fileId = await ai.upload(bytes, 'book.$ext', deviceId);
    save();
    aiStatus = '';
  }

  Map<String, dynamic> _bookPayload(Book b, Map<String, dynamic> extra) => {
    if (b.kind == 'file') 'fileId': b.fileId,
    if (b.kind == 'link') 'url': b.url,
    'mime': b.mime,
    'title': b.title,
    'subject': b.subject,
    'grade': classLabel(studentCls).isNotEmpty ? classLabel(studentCls) : profile.grade,
    ...extra,
  };

  Future<Map<String, dynamic>> _aiCall(Book b, String path, Map<String, dynamic> extra) async {
    await _ensureUploaded(b);
    try {
      return await ai.post(path, _bookPayload(b, extra), deviceId);
    } on AiError catch (e) {
      // ملف منتهٍ أو مفقود من الخادم: نرفعه مرة أخرى ونعيد المحاولة مرة واحدة
      if (e.code == 'bad_request' && b.kind == 'file') {
        await _ensureUploaded(b, force: true);
        return ai.post(path, _bookPayload(b, extra), deviceId);
      }
      rethrow;
    }
  }

  void _aiReward() {
    final r = rec;
    r.aiQ++;
    if (r.aiQ <= 10) {
      addXP(3);
    } else {
      markActive();
      save();
    }
  }

  /// يعيد النص الذي يجب إرجاعه لخانة الكتابة عند الفشل.
  Future<String?> aiSend(Book b, String text, {bool deep = false}) async {
    if (aiBusy || text.trim().isEmpty) return null;
    final chat = data.bookChats.putIfAbsent(b.id, () => []);
    chat.add(ChatMsg('user', text.trim()));
    aiBusy = true;
    aiStatus = '';
    save();
    try {
      var hist = chat.length > 11 ? chat.sublist(chat.length - 11) : List.of(chat);
      while (hist.isNotEmpty && hist.first.role != 'user') {
        hist = hist.sublist(1);
      }
      final r = await _aiCall(b, '/chat', {'deep': deep, 'messages': hist.map((m) => m.toJson()).toList()});
      chat.add(ChatMsg('assistant', '${r['text'] ?? '…'}'));
      if (chat.length > 30) data.bookChats[b.id] = chat.sublist(chat.length - 30);
      fx('flip');
      _aiReward();
      return null;
    } on AiError catch (e) {
      chat.removeLast();
      toast(e.message);
      return text;
    } finally {
      aiBusy = false;
      aiStatus = '';
      save();
    }
  }

  Future<void> aiCards(Book b, String lesson) async {
    if (aiBusy) return;
    final prompt = aiPrompt('cards', lesson);
    aiBusy = true;
    aiStatus = 'المعلم يصنع بطاقاتك';
    notifyListeners();
    try {
      final r = await _aiCall(b, '/cards', {
        'messages': [
          {'role': 'user', 'text': prompt},
        ],
      });
      final list = (r['cards'] is List ? r['cards'] as List : const [])
          .whereType<Map>()
          .where((c) => '${c['q'] ?? ''}'.isNotEmpty && '${c['a'] ?? ''}'.isNotEmpty)
          .toList();
      for (final c in list) {
        data.cards.add(
          StudyCard(
            id: randomId(),
            subject: b.subject.isNotEmpty ? b.subject : subjects.first,
            q: '${c['q']}',
            a: '${c['a']}',
            due: today,
          ),
        );
      }
      final chat = data.bookChats.putIfAbsent(b.id, () => []);
      chat.add(ChatMsg('user', prompt));
      chat.add(
        ChatMsg(
          'assistant',
          list.isNotEmpty
              ? '✔ أضفت **${list.length} بطاقة** إلى «بطاقاتي». راجعها الآن لتثبت المعلومة 🗂️'
              : 'لم أستطع صنع بطاقات من هذا الجزء. جرّب تحديد الدرس أو الصفحات.',
        ),
      );
      if (list.isNotEmpty) {
        fx('complete');
        _aiReward();
        checkBadges();
      }
    } on AiError catch (e) {
      toast(e.message);
    } finally {
      aiBusy = false;
      aiStatus = '';
      save();
    }
  }

  void clearChat(String bookId) {
    data.bookChats[bookId] = [];
    save();
  }

  // ---------- مشاركة الإنجاز ----------
  Future<void> shareProgress() async {
    final st = stats, lv = level;
    final png = await renderProgressImage(
      ProgressCardData(
        name: profile.name,
        levelLine: 'المستوى ${lv.level} — ${lv.title}',
        stageLine: 'المرحلة: ${st.stageObj.icon} ${st.stageObj.name}',
        streak: st.streak,
        xp: data.xp,
        focus: data.totalFocus,
        badges: data.badges.length,
        quote: kQuotes[dayNumber(today) % kQuotes.length],
      ),
    );
    if (png == null) {
      toast('تعذّر إنشاء الصورة');
      return;
    }
    final ok = await share.shareBytes(
      png,
      'rehla-$today.png',
      'image/png',
      text: 'وصلت للمستوى ${lv.level} في رحلة العودة 🚀 ودرست ${st.activeDays} يوماً 📚',
    );
    if (!ok) toast('تعذّرت المشاركة');
  }
}
