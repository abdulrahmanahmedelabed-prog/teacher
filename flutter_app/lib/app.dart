import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'state/app_scope.dart';
import 'state/app_state.dart';
import 'theme/app_theme.dart';
import 'ui/screens/assess_screen.dart';
import 'ui/screens/onboarding_screen.dart';
import 'ui/screens/shell.dart';
import 'ui/widgets/event_host.dart';

class RehlaApp extends StatefulWidget {
  const RehlaApp({super.key, required this.state});
  final AppState state;

  @override
  State<RehlaApp> createState() => _RehlaAppState();
}

class _RehlaAppState extends State<RehlaApp> {
  final _nav = GlobalKey<NavigatorState>();
  final _messenger = GlobalKey<ScaffoldMessengerState>();

  @override
  Widget build(BuildContext context) {
    return AppScope(
      state: widget.state,
      child: ListenableBuilder(
        listenable: widget.state,
        builder: (context, _) {
          final s = widget.state;
          return MaterialApp(
            title: 'رحلة العودة',
            debugShowCheckedModeBanner: false,
            navigatorKey: _nav,
            scaffoldMessengerKey: _messenger,
            locale: const Locale('ar'),
            supportedLocales: const [Locale('ar')],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            theme: buildTheme(Brightness.light),
            darkTheme: buildTheme(Brightness.dark),
            themeMode: s.themeMode,
            themeAnimationDuration: MediaQuery.maybeDisableAnimationsOf(context) == true
                ? Duration.zero
                : const Duration(milliseconds: 300),
            builder: (context, child) {
              s.sound.reducedMotion = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
              return EventHost(state: s, navigatorKey: _nav, messengerKey: _messenger, child: child!);
            },
            home: const _RootGate(),
          );
        },
      ),
    );
  }
}

/// يختار الشاشة الجذرية حسب الحالة (البداية، التقييم الأول، أو التطبيق).
class _RootGate extends StatelessWidget {
  const _RootGate();

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    if (!s.onboarded) return const OnboardingScreen();
    if (s.data.assess.isEmpty) return const AssessScreen(first: true);
    return const Shell();
  }
}
