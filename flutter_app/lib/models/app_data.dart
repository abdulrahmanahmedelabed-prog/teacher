/// حالة التطبيق كاملة: كائن JSON واحد بنفس أسماء حقول نسخة الويب (S)،
/// لذلك ملف النسخة الاحتياطية متوافق بين التطبيقين.
library;

import 'dart:math' as math;

import '../data/content.dart';
import '../logic/dates.dart';

// ---------- أدوات تحويل آمنة (مثل sanitizeState في الويب) ----------
num _num(Object? v) {
  if (v is num && v.isFinite) return v;
  if (v is String) return num.tryParse(v) ?? 0;
  if (v is bool) return v ? 1 : 0;
  return 0;
}

int _int(Object? v) => _num(v).round();
String _str(Object? v) => v is String ? v : (v == null ? '' : '$v');
bool _isMap(Object? v) => v is Map;
Map<String, dynamic> _map(Object? v) => v is Map ? v.map((k, val) => MapEntry('$k', val)) : <String, dynamic>{};
List<dynamic> _list(Object? v) => v is List ? v : const [];
final RegExp _dateRe = RegExp(r'^\d{4}-\d{2}-\d{2}$');
bool dateOk(Object? v) => v is String && _dateRe.hasMatch(v);
final math.Random _rand = math.Random();

/// معرّف قصير آمن (حروف وأرقام فقط).
String randomId([String prefix = '']) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  final ts = DateTime.now().millisecondsSinceEpoch.toRadixString(36);
  final r = List.generate(5, (_) => chars[_rand.nextInt(chars.length)]).join();
  return '$prefix$ts$r';
}

String _safeId(Object? v) {
  final s = _str(v).replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '');
  final cut = s.length > 40 ? s.substring(0, 40) : s;
  return cut.isEmpty ? randomId() : cut;
}

String _cut(String s, int n) => s.length > n ? s.substring(0, n) : s;

// ---------- الملف الشخصي ----------
class Profile {
  Profile({
    required this.name,
    required this.grade,
    this.cls,
    required this.subjects,
    required this.minutes,
    this.goal = '',
    this.when = '',
    Map<String, String>? lastLesson,
    this.g,
  }) : lastLesson = lastLesson ?? {};

  String name;
  String grade;

  /// الصف 1..12، و13 = جامعة.
  int? cls;
  List<String> subjects;
  int minutes;
  String goal;
  String when;
  Map<String, String> lastLesson;

  /// صيغة المخاطبة: "m" أو "f" أو null.
  String? g;

  factory Profile.fromJson(Map<String, dynamic> j) {
    final subs = _list(j['subjects']).whereType<String>().toList();
    final cls0 = j['cls'] == null ? 0 : _int(j['cls']).clamp(1, 13);
    final g = j['g'];
    return Profile(
      name: _cut(_str(j['name']), 30).isEmpty ? 'طالب' : _cut(_str(j['name']), 30),
      grade: _str(j['grade']),
      cls: cls0 == 0 ? null : cls0,
      subjects: subs.isEmpty ? [kSubjects[0]] : subs,
      minutes: (_int(j['minutes']) == 0 ? 45 : _int(j['minutes'])).clamp(10, 240),
      goal: _str(j['goal']),
      when: _str(j['when']),
      lastLesson: _map(j['lastLesson']).map((k, v) => MapEntry(k, _str(v))),
      g: g == 'm' || g == 'f' ? g as String : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'grade': grade,
    if (cls != null) 'cls': cls,
    'subjects': subjects,
    'minutes': minutes,
    'goal': goal,
    'when': when,
    'lastLesson': lastLesson,
    if (g != null) 'g': g,
  };
}

// ---------- سجل اليوم ----------
class DayRecord {
  DayRecord();

  int ch = 0;
  int focus = 0;
  int sessions = 0;
  int? mood;
  int gameXp = 0;
  bool reflected = false;
  bool active = false;
  int reviews = 0;
  int cardsAdded = 0;
  int? given;
  bool full = false;
  bool rest = false;
  bool lost = false;
  int reviewXp = 0;
  int aiQ = 0;

  factory DayRecord.fromJson(Map<String, dynamic> j) {
    final r = DayRecord();
    r.ch = _int(j['ch']);
    r.focus = _int(j['focus']);
    r.sessions = _int(j['sessions']);
    final m = j['mood'];
    r.mood = m is num && m >= 0 && m < kMoods.length ? m.toInt() : null;
    r.gameXp = _int(j['gameXp']);
    r.reflected = j['reflected'] == true;
    r.active = j['active'] == true;
    r.reviews = _int(j['reviews']);
    r.cardsAdded = _int(j['cardsAdded']);
    r.given = j['given'] == null ? null : _int(j['given']);
    r.full = j['full'] == true;
    r.rest = j['rest'] == true;
    r.lost = j['lost'] == true;
    r.reviewXp = _int(j['reviewXp']);
    r.aiQ = _int(j['aiQ']);
    return r;
  }

  Map<String, dynamic> toJson() => {
    'ch': ch,
    'focus': focus,
    'sessions': sessions,
    'mood': mood,
    'gameXp': gameXp,
    'reflected': reflected,
    'active': active,
    'reviews': reviews,
    'cardsAdded': cardsAdded,
    if (given != null) 'given': given,
    if (full) 'full': full,
    if (rest) 'rest': rest,
    if (lost) 'lost': lost,
    if (reviewXp > 0) 'reviewXp': reviewXp,
    if (aiQ > 0) 'aiQ': aiQ,
  };
}

// ---------- تحديات اليوم ----------
class Challenge {
  Challenge({
    required this.id,
    required this.type,
    required this.text,
    required this.subject,
    required this.minutes,
    required this.xp,
    this.done = false,
  });

  final String id;

  /// warmup | wellbeing | study | recall | creative | bonus
  final String type;
  final String text;
  final String subject;
  final int minutes;
  int xp;
  bool done;

  bool get isStudy => type == 'study' || type == 'bonus';

  factory Challenge.fromJson(Map<String, dynamic> j) => Challenge(
    id: _str(j['id']),
    type: _str(j['type']),
    text: _str(j['text']),
    subject: _str(j['subject']),
    minutes: _int(j['minutes']),
    xp: _int(j['xp']),
    done: j['done'] == true,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'text': text,
    'subject': subject,
    'minutes': minutes,
    'xp': xp,
    'done': done,
  };
}

class Daily {
  Daily({required this.date, required this.rerolls, required this.list, this.fullAwarded = false});

  final String date;
  final int rerolls;
  final List<Challenge> list;
  bool fullAwarded;

  factory Daily.fromJson(Map<String, dynamic> j) => Daily(
    date: _str(j['date']),
    rerolls: _int(j['rerolls']),
    list: _list(j['list']).where(_isMap).map((e) => Challenge.fromJson(_map(e))).toList(),
    fullAwarded: j['fullAwarded'] == true,
  );

  Map<String, dynamic> toJson() => {
    'date': date,
    'rerolls': rerolls,
    'list': list.map((c) => c.toJson()).toList(),
    'fullAwarded': fullAwarded,
  };
}

// ---------- البطاقات ----------
class StudyCard {
  StudyCard({
    required this.id,
    required this.subject,
    required this.q,
    required this.a,
    this.box = 1,
    required this.due,
  });

  final String id;
  final String subject;
  final String q;
  final String a;

  /// صندوق لايتنر 1..6.
  int box;

  /// تاريخ المراجعة القادمة YYYY-MM-DD.
  String due;

  factory StudyCard.fromJson(Map<String, dynamic> j, String today) {
    final b = _int(j['box']);
    return StudyCard(
      id: _safeId(j['id']),
      subject: _str(j['subject']),
      q: _str(j['q']),
      a: _str(j['a']),
      box: (b == 0 ? 1 : b).clamp(1, 6),
      due: dateOk(j['due']) ? j['due'] as String : today,
    );
  }

  Map<String, dynamic> toJson() => {'id': id, 'subject': subject, 'q': q, 'a': a, 'box': box, 'due': due};
}

class Assessment {
  Assessment({required this.date, required this.away, required this.levels});

  final String date;
  final int away;
  final Map<String, int> levels;

  Map<String, dynamic> toJson() => {'date': date, 'away': away, 'levels': levels};
}

class JournalEntry {
  JournalEntry(this.date, this.text);
  final String date;
  final String text;
  Map<String, dynamic> toJson() => {'date': date, 'text': text};
}

class FeedbackEntry {
  FeedbackEntry(this.date, this.rating, this.kind, this.text);
  final String date;
  final int rating;
  final String kind;
  final String text;
  Map<String, dynamic> toJson() => {'date': date, 'rating': rating, 'kind': kind, 'text': text};
}

class FocusTimer {
  FocusTimer({required this.end, required this.minutes, required this.subject, this.chId, this.muted = false});

  /// وقت الانتهاء المطلق بالمللي ثانية (يبقى صحيحاً بعد إغلاق التطبيق).
  int end;
  int minutes;
  final String subject;
  final String? chId;
  bool muted;

  int get startMs => end - minutes * 60000;

  Map<String, dynamic> toJson() => {'end': end, 'minutes': minutes, 'subject': subject, 'chId': chId, 'muted': muted};
}

class Settings {
  bool sound = true;
  double volume = 0.6;
  bool haptics = true;
  bool quiet = true;
  bool ambient = false;

  /// إعدادات أخرى من نسخة الويب (مثل الواجهة المبسّطة) نحفظها كما هي.
  Map<String, dynamic> extra = {};

  static const _known = {'sound', 'volume', 'haptics', 'quiet', 'ambient'};

  factory Settings.fromJson(Map<String, dynamic> j) {
    final s = Settings._();
    s.extra = {
      for (final e in j.entries)
        if (!_known.contains(e.key) && (e.value is bool || e.value is num || e.value is String)) e.key: e.value,
    };
    s.sound = j['sound'] != false;
    final v = j['volume'];
    s.volume = (v is num ? v.toDouble() : 0.6).clamp(0.0, 1.0);
    s.haptics = j['haptics'] != false;
    s.quiet = j['quiet'] != false;
    s.ambient = j['ambient'] == true;
    return s;
  }
  Settings._();
  factory Settings.defaults() => Settings._();

  Map<String, dynamic> toJson() => {
    ...extra,
    'sound': sound,
    'volume': volume,
    'haptics': haptics,
    'quiet': quiet,
    'ambient': ambient,
  };
}

class Book {
  Book({
    required this.id,
    required this.title,
    required this.subject,
    required this.kind,
    required this.mime,
    required this.size,
    this.url = '',
    this.fileId = '',
    required this.added,
  });

  final String id;
  String title;
  String subject;

  /// file | link
  final String kind;
  final String mime;
  final int size;
  final String url;
  String fileId;
  final String added;

  bool get isImage => mime.startsWith('image/');

  factory Book.fromJson(Map<String, dynamic> j, String today) {
    final url = _str(j['url']);
    final fid = _str(j['fileId']);
    final title = _cut(_str(j['title']), 80);
    return Book(
      id: _safeId(j['id']),
      title: title.isEmpty ? 'كتاب' : title,
      subject: _cut(_str(j['subject']), 40),
      kind: j['kind'] == 'link' ? 'link' : 'file',
      mime: _cut(_str(j['mime']), 40),
      size: math.max(0, _int(j['size'])),
      url: RegExp(r'^https://', caseSensitive: false).hasMatch(url) ? _cut(url, 2000) : '',
      fileId: RegExp(r'^file_[A-Za-z0-9]+$').hasMatch(fid) ? fid : '',
      added: dateOk(j['added']) ? j['added'] as String : today,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'subject': subject,
    'kind': kind,
    'mime': mime,
    'size': size,
    'url': url,
    'fileId': fileId,
    'added': added,
  };
}

class ChatMsg {
  ChatMsg(this.role, this.text);
  final String role; // user | assistant
  final String text;
  Map<String, dynamic> toJson() => {'role': role, 'text': text};
}

class PlanRef {
  PlanRef(this.id, this.at);
  final int id;
  final int at;
  Map<String, dynamic> toJson() => {'id': id, 'at': at};
}

class Reminders {
  bool on = false;
  String time = '';
  int lead = 10;

  /// أيام الأسبوع بترقيم JS: 0 = الأحد … 6 = السبت. الجمعة (5) مطفأة افتراضياً.
  List<int> days = [0, 1, 2, 3, 4, 6];
  bool miss = true;
  bool showName = false;
  bool shared = false;
  String pausedUntil = '';
  int asks = 0;
  String askedOn = '';
  String onSince = '';
  bool reduced = false;
  bool helpfulAsked = false;
  List<PlanRef> lastPlan = [];

  Reminders();

  factory Reminders.fromJson(Map<String, dynamic> r0) {
    final r = Reminders();
    r.on = r0['on'] == true;
    final t = _str(r0['time']);
    r.time = RegExp(r'^\d{2}:\d{2}$').hasMatch(t) ? t : '';
    final lead = r0['lead'];
    r.lead = lead is num && [0, 10, 15, 30].contains(lead) ? lead.toInt() : 10;
    final days = _list(r0['days'])
        .where((d) => d is num && d == d.roundToDouble() && d >= 0 && d <= 6)
        .map((d) => (d as num).toInt())
        .toList();
    r.days = days.isEmpty ? [0, 1, 2, 3, 4, 6] : days;
    r.miss = r0['miss'] != false;
    r.showName = r0['showName'] == true;
    r.shared = r0['shared'] == true;
    r.pausedUntil = dateOk(r0['pausedUntil']) ? r0['pausedUntil'] as String : '';
    r.asks = _int(r0['asks']).clamp(0, 2);
    r.askedOn = dateOk(r0['askedOn']) ? r0['askedOn'] as String : '';
    r.onSince = dateOk(r0['onSince']) ? r0['onSince'] as String : '';
    r.reduced = r0['reduced'] == true;
    r.helpfulAsked = r0['helpfulAsked'] == true;
    r.lastPlan = _list(r0['lastPlan'])
        .where((x) => x is Map && x['at'] is num)
        .take(12)
        .map((x) => PlanRef(_int((x as Map)['id']), _int(x['at'])))
        .toList();
    return r;
  }

  Map<String, dynamic> toJson() => {
    'on': on,
    'time': time,
    'lead': lead,
    'days': days,
    'miss': miss,
    'showName': showName,
    'shared': shared,
    'pausedUntil': pausedUntil,
    'asks': asks,
    'askedOn': askedOn,
    'onSince': onSince,
    'reduced': reduced,
    'helpfulAsked': helpfulAsked,
    'lastPlan': lastPlan.map((p) => p.toJson()).toList(),
  };
}

class NotifStats {
  int scheduled = 0;
  int tapped = 0;
  int ignored = 0;
  int pauses = 0;
  int disables = 0;
  bool? helpful;
  int? lastTap;

  NotifStats();

  factory NotifStats.fromJson(Map<String, dynamic> n0) {
    final n = NotifStats();
    n.scheduled = _int(n0['scheduled']);
    n.tapped = _int(n0['tapped']);
    n.ignored = _int(n0['ignored']);
    n.pauses = _int(n0['pauses']);
    n.disables = _int(n0['disables']);
    final h = n0['helpful'];
    n.helpful = h is bool ? h : null;
    n.lastTap = n0['lastTap'] is num ? _int(n0['lastTap']) : null;
    return n;
  }

  Map<String, dynamic> toJson() => {
    'scheduled': scheduled,
    'tapped': tapped,
    'ignored': ignored,
    'pauses': pauses,
    'disables': disables,
    'helpful': helpful,
    if (lastTap != null) 'lastTap': lastTap,
  };
}

// ---------- الحالة الكاملة ----------
class AppData {
  AppData();

  int v = 1;
  Profile? profile;
  int xp = 0;
  Map<String, DayRecord> history = {};
  Daily? daily;
  int totalFocus = 0;
  int sessions = 0;
  int lostDone = 0;
  int fullDays = 0;

  /// أفضل النتائج: math, memory, quiz.
  Map<String, int> best = {};
  List<JournalEntry> journal = [];
  List<String> badges = [];
  List<StudyCard> cards = [];
  List<Assessment> assess = [];
  List<FeedbackEntry> feedback = [];
  bool feedbackAsked = false;
  int reviews = 0;
  Map<String, bool> weeklyClaimed = {};
  FocusTimer? timer;
  Settings settings = Settings.defaults();
  List<Book> books = [];
  Map<String, List<ChatMsg>> bookChats = {};
  String deviceId = '';
  Reminders reminders = Reminders();
  NotifStats notif = NotifStats();
  String welcomedOn = '';

  /// يقرأ JSON وينظّفه (مثل sanitizeState). يرمي [FormatException] لملف شخصي تالف.
  /// [keepDaily]: عند الاستيراد نعيد توليد تحديات اليوم (false).
  factory AppData.fromJson(Map<String, dynamic> st, {bool keepDaily = true, String? today}) {
    final t = today ?? dateKey(DateTime.now());
    final s = AppData();
    s.v = 1;
    final p = st['profile'];
    if (p != null) {
      if (p is! Map || p['subjects'] is! List) throw const FormatException('bad profile');
      s.profile = Profile.fromJson(_map(p));
    }
    s.xp = math.max(0, _int(st['xp']));
    final h = _map(st['history']);
    h.forEach((k, v) {
      if (dateOk(k) && v is Map) s.history[k] = DayRecord.fromJson(_map(v));
    });
    if (keepDaily && st['daily'] is Map) {
      final d = Daily.fromJson(_map(st['daily']));
      if (dateOk(d.date) && d.list.isNotEmpty) s.daily = d;
    }
    s.totalFocus = math.max(0, _int(st['totalFocus']));
    s.sessions = math.max(0, _int(st['sessions']));
    s.lostDone = math.max(0, _int(st['lostDone']));
    s.fullDays = math.max(0, _int(st['fullDays']));
    s.reviews = math.max(0, _int(st['reviews']));
    _map(st['best']).forEach((k, v) => s.best[k] = _int(v));
    s.journal = _list(st['journal']).where(_isMap).map((j) {
      final m = _map(j);
      return JournalEntry(_cut(_str(m['date']), 10), _str(m['text']));
    }).toList();
    s.badges = _list(st['badges']).whereType<String>().toList();
    s.cards = _list(st['cards']).where(_isMap).map((c) => StudyCard.fromJson(_map(c), t)).toList();
    s.assess = _list(st['assess']).where((a) => a is Map && dateOk(a['date']) && a['levels'] is Map).map((a) {
      final m = _map(a);
      final lv = _map(m['levels']).map((k, v) {
        final n = _int(v);
        return MapEntry(k, (n == 0 ? 3 : n).clamp(1, 5));
      });
      return Assessment(date: m['date'] as String, away: _int(m['away']), levels: lv);
    }).toList();
    s.feedback = _list(st['feedback']).where((f) => f is Map && dateOk(f['date'])).map((f) {
      final m = _map(f);
      return FeedbackEntry(m['date'] as String, _int(m['rating']), _str(m['kind']), _str(m['text']));
    }).toList();
    s.feedbackAsked = st['feedbackAsked'] == true;
    _map(st['weeklyClaimed']).forEach((k, v) {
      if (v == true) s.weeklyClaimed[k] = true;
    });
    final tm = st['timer'];
    if (tm is Map && _num(tm['end']) > 0 && _num(tm['minutes']) > 0) {
      s.timer = FocusTimer(
        end: _int(tm['end']),
        minutes: _int(tm['minutes']),
        subject: _str(tm['subject']),
        chId: tm['chId'] is String ? tm['chId'] as String : null,
        muted: tm['muted'] == true,
      );
    }
    s.settings = Settings.fromJson(_map(st['settings']));
    s.books = _list(st['books']).where(_isMap).map((b) => Book.fromJson(_map(b), t)).toList();
    _map(st['bookChats']).forEach((k, v) {
      var msgs = _list(v)
          .where((m) => m is Map && (m['role'] == 'user' || m['role'] == 'assistant'))
          .map((m) => ChatMsg((m as Map)['role'] as String, _cut(_str(m['text']), 6000)))
          .toList();
      if (msgs.length > 30) msgs = msgs.sublist(msgs.length - 30);
      s.bookChats[k] = msgs;
    });
    final dev = _str(st['deviceId']);
    s.deviceId = RegExp(r'^[A-Za-z0-9]{8,40}$').hasMatch(dev) ? dev : '';
    s.reminders = Reminders.fromJson(_map(st['reminders']));
    s.notif = NotifStats.fromJson(_map(st['notif']));
    s.welcomedOn = _str(st['welcomedOn']);
    return s;
  }

  Map<String, dynamic> toJson() => {
    'v': v,
    'profile': profile?.toJson(),
    'xp': xp,
    'history': history.map((k, v) => MapEntry(k, v.toJson())),
    'daily': daily?.toJson(),
    'totalFocus': totalFocus,
    'sessions': sessions,
    'lostDone': lostDone,
    'fullDays': fullDays,
    'best': best,
    'journal': journal.map((j) => j.toJson()).toList(),
    'badges': badges,
    'cards': cards.map((c) => c.toJson()).toList(),
    'assess': assess.map((a) => a.toJson()).toList(),
    'feedback': feedback.map((f) => f.toJson()).toList(),
    'feedbackAsked': feedbackAsked,
    'reviews': reviews,
    'weeklyClaimed': weeklyClaimed,
    'timer': timer?.toJson(),
    'settings': settings.toJson(),
    'books': books.map((b) => b.toJson()).toList(),
    'bookChats': bookChats.map((k, v) => MapEntry(k, v.map((m) => m.toJson()).toList())),
    'deviceId': deviceId,
    'reminders': reminders.toJson(),
    'notif': notif.toJson(),
    if (welcomedOn.isNotEmpty) 'welcomedOn': welcomedOn,
  };

  /// سجل يوم (يُنشأ عند الحاجة) — مثل dayRec().
  DayRecord dayRec(String key) => history.putIfAbsent(key, DayRecord.new);

  bool isActive(String key) => history[key]?.active ?? false;

  Map<String, int> get latestLevels => assess.isEmpty ? const {} : assess.last.levels;
}
