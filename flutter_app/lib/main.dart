import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app.dart';
import 'services/notification_service.dart';
import 'services/share_service.dart';
import 'services/sound_service.dart';
import 'services/storage_service.dart';
import 'state/app_state.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  final storage = StorageService();
  await storage.init();
  final notifications = NotificationService();
  late final AppState state;
  final sound = SoundService(() => state.data.settings);
  state = AppState(storage: storage, sound: sound, notifications: notifications, share: ShareService());
  await state.init();
  await Future.wait([notifications.init(), sound.init()]);

  runApp(RehlaApp(state: state));
}
