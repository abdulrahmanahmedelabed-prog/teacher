import 'package:flutter/widgets.dart';

import 'app_state.dart';

/// يوفّر [AppState] للشجرة ويعيد بناء من يستمع عند أي تغيير.
class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child}) : super(notifier: state);

  /// يستمع للتغييرات.
  static AppState of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<AppScope>()!.notifier!;

  /// بدون استماع (للأفعال داخل الأزرار).
  static AppState read(BuildContext context) => context.getInheritedWidgetOfExactType<AppScope>()!.notifier!;
}
