import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/app_data.dart';

/// تخزين محلي: الحالة كلها JSON واحد في shared_preferences (مثل localStorage في الويب)،
/// وملفات الكتب في مجلد التطبيق.
class StorageService {
  static const String stateKey = 'rehla-state-v1';
  static const String themeKey = 'rehla-theme';

  SharedPreferences? _prefs;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  AppData load() {
    final raw = _prefs?.getString(stateKey);
    if (raw == null || raw.isEmpty) return AppData();
    try {
      final j = jsonDecode(raw);
      if (j is Map<String, dynamic>) return AppData.fromJson(j);
    } catch (e) {
      debugPrint('state load failed: $e');
    }
    return AppData();
  }

  Future<void> save(AppData s) async {
    try {
      await _prefs?.setString(stateKey, jsonEncode(s.toJson()));
    } catch (e) {
      debugPrint('state save failed: $e');
    }
  }

  /// "auto" | "light" | "dark"
  String get theme {
    final v = _prefs?.getString(themeKey);
    return v == 'light' || v == 'dark' ? v! : 'auto';
  }

  Future<void> setTheme(String v) async {
    if (v == 'auto') {
      await _prefs?.remove(themeKey);
    } else {
      await _prefs?.setString(themeKey, v);
    }
  }

  // ---------- ملفات الكتب ----------
  Future<Directory> _booksDir() async {
    final base = await getApplicationDocumentsDirectory();
    final d = Directory('${base.path}/books');
    if (!d.existsSync()) await d.create(recursive: true);
    return d;
  }

  Future<File> bookFile(String id) async => File('${(await _booksDir()).path}/$id');

  Future<void> putBook(String id, Uint8List bytes) async => (await bookFile(id)).writeAsBytes(bytes, flush: true);

  Future<Uint8List?> getBook(String id) async {
    final f = await bookFile(id);
    return f.existsSync() ? f.readAsBytes() : null;
  }

  Future<void> deleteBook(String id) async {
    final f = await bookFile(id);
    if (f.existsSync()) await f.delete();
  }

  Future<void> deleteAllBooks() async {
    final d = await _booksDir();
    if (d.existsSync()) await d.delete(recursive: true);
  }
}
