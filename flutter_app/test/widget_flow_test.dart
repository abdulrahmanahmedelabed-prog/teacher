// اختبار دخان للواجهة: البداية كاملة ثم كل التبويبات والإعدادات والألعاب.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rehla_flutter/app.dart';
import 'package:rehla_flutter/services/notification_service.dart';
import 'package:rehla_flutter/services/share_service.dart';
import 'package:rehla_flutter/services/sound_service.dart';
import 'package:rehla_flutter/services/storage_service.dart';
import 'package:rehla_flutter/state/app_state.dart';
import 'package:rehla_flutter/ui/screens/assess_screen.dart';
import 'package:rehla_flutter/ui/screens/books_screen.dart';
import 'package:rehla_flutter/ui/screens/games/math_game.dart';
import 'package:rehla_flutter/ui/screens/games/memory_game.dart';
import 'package:rehla_flutter/ui/screens/games/quiz_game.dart';
import 'package:rehla_flutter/ui/screens/home_screen.dart';
import 'package:rehla_flutter/ui/screens/journey_screen.dart';
import 'package:rehla_flutter/ui/screens/settings_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

Future<AppState> makeState() async {
  SharedPreferences.setMockInitialValues({});
  final storage = StorageService();
  await storage.init();
  late final AppState state;
  final sound = SoundService(() => state.data.settings);
  state = AppState(storage: storage, sound: sound, notifications: NotificationService(), share: ShareService());
  await state.init();
  return state;
}

Future<void> tapText(WidgetTester t, String text) async {
  var f = find.text(text);
  if (f.evaluate().isEmpty) f = find.textContaining(text);
  await Scrollable.ensureVisible(t.element(f.first), alignment: 0.5);
  await t.pumpAndSettle();
  await t.tap(f.first);
  await t.pumpAndSettle();
}

/// يغلق نوافذ الاحتفال المتتالية (وسام، مستوى…).
Future<void> closeDialogs(WidgetTester t) async {
  for (var i = 0; i < 6; i++) {
    await t.pump(const Duration(milliseconds: 400));
    await t.pumpAndSettle();
    final f = find.descendant(of: find.byType(AlertDialog), matching: find.byType(FilledButton));
    if (f.evaluate().isEmpty) return;
    await t.tap(f.last);
    await t.pumpAndSettle();
  }
}

void main() {
  testWidgets('onboarding → home → all tabs', (t) async {
    t.view.physicalSize = const Size(1080, 2340);
    t.view.devicePixelRatio = 3;
    addTearDown(t.view.reset);
    final state = await makeState();
    await t.pumpWidget(RehlaApp(state: state));
    await t.pumpAndSettle();

    expect(find.text('أهلاً بك في رحلة العودة'), findsOneWidget);
    await t.enterText(find.byType(TextField), 'سارة');
    await tapText(t, 'لنبدأ');
    await tapText(t, 'إعدادي');
    await t.pump(const Duration(milliseconds: 300));
    await t.pumpAndSettle();
    await tapText(t, 'الصف الثامن');
    await t.pump(const Duration(milliseconds: 300));
    await t.pumpAndSettle();
    await tapText(t, 'الرياضيات');
    await tapText(t, 'العلوم');
    await tapText(t, 'التالي');
    await tapText(t, 'بعد العصر');
    await tapText(t, 'التالي');
    await tapText(t, '1-3 أشهر');
    await t.pump(const Duration(milliseconds: 300));
    await t.pumpAndSettle();
    await tapText(t, 'جيد');
    await t.pump(const Duration(milliseconds: 300));
    await t.pumpAndSettle();
    await tapText(t, 'ضعيف');
    await t.pump(const Duration(milliseconds: 300));
    await t.pumpAndSettle();

    expect(state.onboarded, isTrue);
    expect(state.data.assess.single.levels, {'الرياضيات': 4, 'العلوم': 2});
    // نافذة الترحيب بالخطة
    expect(find.textContaining('نبدأ بمادتك الأقوى «الرياضيات»'), findsOneWidget);
    await tapText(t, 'لنبدأ!');

    expect(find.text('👉 خطوتك التالية'), findsOneWidget);
    expect(state.data.xp, 20);

    // أنجز الخطوة التالية
    final next = state.daily.list.first;
    state.toggleChallenge(next.id);
    await t.pumpAndSettle();
    expect(state.daily.list.first.done, isTrue);
    expect(state.data.xp, 20 + next.xp);
    await closeDialogs(t);

    // مزاج
    await t.tap(find.bySemanticsLabel('متعب جداً').first);
    await t.pumpAndSettle();
    expect(state.rec.mood, 0);

    for (final tab in ['التحديات', 'تركيز', 'مذاكرة', 'رحلتي', 'الرئيسية']) {
      await t.tap(find.text(tab).last);
      await t.pumpAndSettle();
    }

    // تركيز: ابدأ ثم أنهِ مبكراً
    await t.tap(find.text('تركيز').last);
    await t.pumpAndSettle();
    await tapText(t, '▶ ابدأ');
    expect(state.timerRunning, isTrue);
    expect(find.text('تدرس الآن'), findsOneWidget);
    await t.tap(find.text('إنهاء مبكر'));
    await t.pumpAndSettle();
    await t.tap(find.text('إنهاء'));
    await t.pumpAndSettle();
    expect(state.timerRunning, isFalse);
    await closeDialogs(t);

    // مذاكرة: بطاقة جديدة
    await t.tap(find.text('مذاكرة').last);
    await t.pumpAndSettle();
    await tapText(t, '🗂️ بطاقاتي');
    await tapText(t, '➕ اصنع أول بطاقة');
    await t.enterText(find.widgetWithText(TextField, 'السؤال'), 'ما عاصمة فلسطين؟');
    await t.enterText(find.widgetWithText(TextField, 'الجواب'), 'القدس');
    await tapText(t, 'أضف البطاقة (+5 ⭐)');
    expect(state.data.cards, hasLength(1));
    await closeDialogs(t);
    await tapText(t, '🔁 راجع الآن · 1 بطاقة');
    await tapText(t, '👀 أظهر الجواب');
    await tapText(t, '✔ عرفتها');
    expect(state.data.cards.single.box, 2);
    await closeDialogs(t);
    await tapText(t, 'تمام');

    // الإعدادات
    await t.tap(find.byTooltip('الإعدادات'));
    await t.pumpAndSettle();
    expect(find.text('⚙️ الإعدادات'), findsOneWidget);
    await t.scrollUntilVisible(find.text('⚠️ المنطقة الخطرة'), 400, scrollable: find.byType(Scrollable).first);
    Navigator.of(t.element(find.text('⚙️ الإعدادات'))).pop();
    await t.pumpAndSettle();
    state.dispose();
    await t.pump(const Duration(seconds: 1));
  });

  testWidgets('games render and finish', (t) async {
    t.view.physicalSize = const Size(1080, 2340);
    t.view.devicePixelRatio = 3;
    addTearDown(t.view.reset);
    final state = await makeState();
    await t.pumpWidget(RehlaApp(state: state));
    await t.pumpAndSettle();
    // ملف جاهز بدون المرور بالبداية
    final ob = OnboardingDraft()
      ..name = 'علي'
      ..grade = 'ثانوي'
      ..cls = 10
      ..away = 0;
    ob.subjects.addAll(['الفيزياء', 'الكيمياء']);
    state.finishOnboarding(ob);
    await t.pumpAndSettle();
    await tapText(t, 'لنبدأ!');

    final nav = Navigator.of(t.element(find.text('👉 خطوتك التالية')));
    nav.push(MaterialPageRoute(builder: (_) => const QuizGame()));
    await t.pumpAndSettle();
    for (var i = 0; i < 10; i++) {
      await t.tap(find.descendant(of: find.byType(QuizGame), matching: find.byType(OutlinedButton)).first);
      await t.pumpAndSettle();
      await tapText(t, i == 9 ? 'النتيجة 🏁' : 'التالي ←');
    }
    await closeDialogs(t);
    expect(find.textContaining('نتيجتك:'), findsOneWidget);
    expect(state.data.best['quiz'], isNotNull);
    nav.pop();
    await t.pumpAndSettle();

    nav.push(MaterialPageRoute(builder: (_) => const MemoryGame()));
    await t.pumpAndSettle();
    expect(find.text('🃏 لعبة الذاكرة'), findsOneWidget);
    nav.pop();
    await t.pumpAndSettle();

    nav.push(MaterialPageRoute(builder: (_) => const MathGame()));
    await t.pump();
    await t.pump(const Duration(milliseconds: 400));
    expect(find.textContaining('= ?'), findsOneWidget);
    await t.tap(find.descendant(of: find.byType(MathGame), matching: find.byType(FilledButton)).first);
    await t.pump(const Duration(milliseconds: 100));
    // الوقت الحقيقي يُقاس بالساعة؛ نُنهي اللعبة بتقديم الساعة عبر انتظار حقيقي قصير غير ممكن هنا،
    // لذلك نكتفي بالتحقق من أن اللعبة تعمل ثم نخرج.
    nav.pop();
    await t.pumpAndSettle();
    state.dispose();
    await t.pump(const Duration(seconds: 1));
  });

  testWidgets('small phone, dark theme: every screen lays out without overflow', (t) async {
    t.view.physicalSize = const Size(720, 1280); // 360×640 dp
    t.view.devicePixelRatio = 2;
    addTearDown(t.view.reset);
    final state = await makeState();
    await state.setTheme(ThemeMode.dark);
    final ob = OnboardingDraft()
      ..name = 'هبة عبد الرحمن'
      ..grade = 'جامعة'
      ..cls = 13
      ..minutes = 120
      ..when = 'قبل النوم'
      ..away = 4;
    ob.subjects.addAll(['التربية الإسلامية', 'اللغة الإنجليزية', 'الجغرافيا']);
    ob.levels.addAll({'التربية الإسلامية': 5, 'اللغة الإنجليزية': 1, 'الجغرافيا': 2});
    state.finishOnboarding(ob);
    state.data.reminders.on = true;
    final b = state.addBookLink(
      'https://example.com/book.pdf',
      'كتاب الجغرافيا للصف الأول الثانوي الجزء الأول',
      'الجغرافيا',
    );
    state.addCard('الجغرافيا', 'أكبر محيطات العالم؟', 'الهادئ');
    await t.pumpWidget(RehlaApp(state: state));
    await t.pumpAndSettle();
    await closeDialogs(t);

    for (final tab in ['التحديات', 'تركيز', 'مذاكرة', 'رحلتي', 'الرئيسية']) {
      await t.tap(find.text(tab).last);
      await t.pumpAndSettle();
      await closeDialogs(t);
    }
    // التقدّم المطوي
    await t.scrollUntilVisible(
      find.text('📈 تقدّمك'),
      300,
      scrollable: find.descendant(of: find.byType(HomeScreen), matching: find.byType(Scrollable)).first,
    );
    await t.tap(find.text('📈 تقدّمك'));
    await t.pumpAndSettle();
    // رحلتي حتى النهاية
    await t.tap(find.text('رحلتي').last);
    await t.pumpAndSettle();
    await t.drag(
      find.descendant(of: find.byType(JourneyScreen), matching: find.byType(Scrollable)).first,
      const Offset(0, -3000),
    );
    await t.pumpAndSettle();

    final nav = Navigator.of(t.element(find.byType(NavigationBar)));
    nav.push(MaterialPageRoute(builder: (_) => BookScreen(bookId: b!.id)));
    await t.pumpAndSettle();
    expect(find.textContaining('Gemini'), findsWidgets);
    nav.pop();
    await t.pumpAndSettle();

    nav.push(MaterialPageRoute(builder: (_) => const SettingsScreen()));
    await t.pumpAndSettle();
    for (var i = 0; i < 12; i++) {
      await t.drag(
        find.descendant(of: find.byType(SettingsScreen), matching: find.byType(Scrollable)).first,
        const Offset(0, -500),
      );
      await t.pumpAndSettle();
    }
    nav.pop();
    await t.pumpAndSettle();
    nav.push(MaterialPageRoute(builder: (_) => const AssessScreen()));
    await t.pumpAndSettle();
    nav.pop();
    await t.pumpAndSettle();
    state.dispose();
    await t.pump(const Duration(seconds: 1));
  });
}
