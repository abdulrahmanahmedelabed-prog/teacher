import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../data/content.dart';

/// خطأ من المعلم الذكي برمز مثل الويب (offline, network, timeout, daily_limit…).
class AiError implements Exception {
  AiError(this.code, {this.status, this.limit});
  final String code;
  final int? status;
  final Object? limit;

  String get message {
    switch (code) {
      case 'offline':
        return '📶 أنت غير متصل بالإنترنت الآن. جرّب لاحقاً — كتابك محفوظ عندك.';
      case 'network':
        return 'تعذّر الاتصال. تأكد من الإنترنت وحاول مرة أخرى.';
      case 'timeout':
        return 'الاتصال بطيء جداً. حاول مرة أخرى، أو اسأل عن جزء أصغر من الكتاب.';
      case 'daily_limit':
        return 'وصلت للحد اليومي للمعلم الذكي${limit != null ? ' ($limit)' : ''}. نكمل غداً 💜';
      case 'busy':
        return 'المعلم مشغول الآن. حاول بعد دقيقة.';
      case 'too_large':
        return 'الملف كبير جداً للمعلم. ارفع فصلاً واحداً أو صوّر صفحات الدرس.';
      case 'missing':
        return 'لم نجد ملف الكتاب على جهازك. احذفه وأضفه من جديد.';
      case 'server_not_configured':
      case 'origin_not_allowed':
        return 'المعلم الذكي غير جاهز بعد في هذه النسخة.';
    }
    return 'حدث خطأ. حاول مرة أخرى.';
  }

  @override
  String toString() => 'AiError($code)';
}

/// عميل اختياري لخادم معلم ذكي (/upload و /chat و /cards). مطفأ افتراضياً (kAiProxyUrl فارغ).
/// المعلم في نسخة الويب/Capacitor يعمل بـ Gemini عبر Firebase؛ نقله لهذه النسخة يحتاج App Check (Play Integrity).
class AiService {
  AiService({String? baseUrl}) : base = (baseUrl ?? kAiProxyUrl).replaceAll(RegExp(r'/+$'), '');

  final String base;
  static const int maxFile = 20 * 1024 * 1024;
  static const Duration _timeout = Duration(seconds: 120);

  bool get enabled => base.isNotEmpty;

  Future<Map<String, dynamic>> _handle(http.Response res) async {
    Map<String, dynamic> data = {};
    try {
      final j = jsonDecode(utf8.decode(res.bodyBytes));
      if (j is Map<String, dynamic>) data = j;
    } catch (_) {}
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw AiError('${data['error'] ?? 'http'}', status: res.statusCode, limit: data['limit']);
    }
    return data;
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> payload, String deviceId) async {
    try {
      final res = await http
          .post(
            Uri.parse('$base$path'),
            headers: {'Content-Type': 'application/json', 'X-Device-Id': deviceId},
            body: jsonEncode(payload),
          )
          .timeout(_timeout);
      return await _handle(res);
    } on AiError {
      rethrow;
    } on Exception catch (e) {
      throw AiError(e.toString().contains('Timeout') ? 'timeout' : 'network');
    }
  }

  Future<String> upload(Uint8List bytes, String filename, String deviceId) async {
    try {
      final req = http.MultipartRequest('POST', Uri.parse('$base/upload'))
        ..headers['X-Device-Id'] = deviceId
        ..files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));
      final res = await http.Response.fromStream(await req.send().timeout(_timeout));
      final data = await _handle(res);
      return '${data['fileId'] ?? ''}';
    } on AiError {
      rethrow;
    } on Exception catch (e) {
      throw AiError(e.toString().contains('Timeout') ? 'timeout' : 'network');
    }
  }
}
