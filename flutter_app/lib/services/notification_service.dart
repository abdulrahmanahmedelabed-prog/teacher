import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_10y.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import '../logic/reminders.dart';

/// إشعارات محلية: نهاية جلسة التركيز وتذكيرات الدراسة.
/// نجدول بالوقت المطلق (UTC) فلا نحتاج معرفة المنطقة الزمنية للجهاز.
class NotificationService {
  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _ready = false;

  /// يُستدعى عند الضغط على إشعار أو زر فيه (actionId: start5 أو null).
  void Function(String? actionId)? onTap;

  static const _reminderChannel = AndroidNotificationDetails(
    'reminders',
    'تذكيرات الدراسة',
    channelDescription: 'تذكير لطيف واحد في اليوم بموعد دراستك',
    importance: Importance.defaultImportance,
    priority: Priority.defaultPriority,
    // شاشة القفل تُظهر «رحلة العودة» فقط (خصوصية الهاتف المشترك)
    visibility: NotificationVisibility.private,
    actions: [AndroidNotificationAction('start5', 'ابدأ 5 دقائق', showsUserInterface: true)],
  );

  static const _focusChannel = AndroidNotificationDetails(
    'focus',
    'جلسات التركيز',
    channelDescription: 'تنبيه عند انتهاء جلسة التركيز',
    importance: Importance.high,
    priority: Priority.high,
  );

  Future<void> init() async {
    try {
      tzdata.initializeTimeZones();
      await _plugin.initialize(
        settings: const InitializationSettings(android: AndroidInitializationSettings('ic_stat_rehla')),
        onDidReceiveNotificationResponse: (r) => onTap?.call(r.actionId),
      );
      _ready = true;
      final launch = await _plugin.getNotificationAppLaunchDetails();
      if (launch?.didNotificationLaunchApp ?? false) {
        final id = launch!.notificationResponse?.actionId;
        Future.microtask(() => onTap?.call(id));
      }
    } catch (e) {
      debugPrint('notifications init failed: $e');
    }
  }

  AndroidFlutterLocalNotificationsPlugin? get _android =>
      _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

  Future<bool> hasPermission() async {
    if (!_ready) return false;
    try {
      return await _android?.areNotificationsEnabled() ?? false;
    } catch (_) {
      return false;
    }
  }

  /// يطلب الإذن (Android 13+) — فقط من بطاقة التذكير اللطيفة.
  Future<bool> requestPermission() async {
    if (!_ready) return false;
    try {
      final ok = await _android?.requestNotificationsPermission();
      return ok ?? await hasPermission();
    } catch (_) {
      return false;
    }
  }

  tz.TZDateTime _at(DateTime local) => tz.TZDateTime.from(local.toUtc(), tz.UTC);

  Future<void> scheduleFocusEnd(DateTime end) async {
    if (!_ready || !await hasPermission()) return;
    try {
      await _plugin.zonedSchedule(
        id: kFocusNotifId,
        title: 'رحلة العودة',
        body: 'أحسنت! انتهت جلستك 🌟',
        scheduledDate: _at(end),
        notificationDetails: const NotificationDetails(android: _focusChannel),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      );
    } catch (e) {
      debugPrint('focus notif failed: $e');
    }
  }

  Future<void> cancelFocusEnd() async {
    if (!_ready) return;
    try {
      await _plugin.cancel(id: kFocusNotifId);
    } catch (_) {}
  }

  /// يلغي كل التذكيرات (7100–7299) ثم يجدول الخطة الجديدة.
  Future<void> replaceReminders(List<PlannedNotification> plan) async {
    if (!_ready) return;
    try {
      final pending = await _plugin.pendingNotificationRequests();
      for (final p in pending) {
        if (p.id >= kReminderIdMin && p.id <= kReminderIdMax) await _plugin.cancel(id: p.id);
      }
      if (plan.isEmpty || !await hasPermission()) return;
      for (final p in plan) {
        await _plugin.zonedSchedule(
          id: p.id,
          title: p.title,
          body: p.body,
          scheduledDate: _at(p.at),
          notificationDetails: const NotificationDetails(android: _reminderChannel),
          androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
          payload: p.kind,
        );
      }
    } catch (e) {
      debugPrint('reminders failed: $e');
    }
  }
}
