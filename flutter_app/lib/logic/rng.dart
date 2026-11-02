/// مولّد أرقام عشوائية قابل للتكرار، مطابق لنسخة الويب بت-ببت:
/// FNV-1a 32-bit للبذرة، و mulberry32 للتوليد.
library;

const int _mask = 0xFFFFFFFF;

/// ضرب 32-بت (Math.imul) — نأخذ أدنى 32 بت.
int imul32(int a, int b) => (a * b) & _mask;

/// FNV-1a على وحدات UTF-16 (مثل charCodeAt).
int hashStr(String s) {
  var h = 2166136261;
  for (final c in s.codeUnits) {
    h ^= c;
    h = imul32(h, 16777619);
  }
  return h & _mask;
}

/// mulberry32: يعيد دالة تعطي رقماً في [0, 1).
class Mulberry32 {
  Mulberry32(int seed) : _a = seed & _mask;
  int _a;

  double next() {
    _a = (_a + 0x6D2B79F5) & _mask;
    var t = _a;
    t = imul32(t ^ (t >>> 15), t | 1);
    t = (t ^ ((t + imul32(t ^ (t >>> 7), t | 61)) & _mask)) & _mask;
    return ((t ^ (t >>> 14)) & _mask) / 4294967296;
  }

  double call() => next();
}

typedef Rand = double Function();

T pick<T>(List<T> arr, Rand r) => arr[(r() * arr.length).floor()];

/// خلط Fisher–Yates بنفس ترتيب استدعاءات الويب.
List<T> shuffle<T>(List<T> arr, Rand r) {
  final a = List<T>.of(arr);
  for (var i = a.length - 1; i > 0; i--) {
    final j = (r() * (i + 1)).floor();
    final tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/// ترتيب مستقر (مثل Array.prototype.sort الحديث).
List<T> stableSorted<T>(List<T> list, int Function(T a, T b) cmp) {
  final indexed = List.generate(list.length, (i) => (i, list[i]));
  indexed.sort((x, y) {
    final c = cmp(x.$2, y.$2);
    return c != 0 ? c : x.$1.compareTo(y.$1);
  });
  return [for (final e in indexed) e.$2];
}
