/// المستويات: XP(L) = 50·L·(L−1) — المستوى 2 = 100، 3 = 300، 4 = 600…
library;

import '../data/content.dart';

int xpForLevel(int l) => 50 * l * (l - 1);

class LevelInfo {
  const LevelInfo(this.level, this.title, this.pct, this.toNext);
  final int level;
  final String title;
  final int pct;
  final int toNext;
}

LevelInfo levelInfo(int xp) {
  var l = 1;
  while (xp >= xpForLevel(l + 1)) {
    l++;
  }
  final cur = xpForLevel(l), next = xpForLevel(l + 1);
  return LevelInfo(
    l,
    kLevelTitles[(l - 1).clamp(0, kLevelTitles.length - 1)],
    (((xp - cur) / (next - cur)) * 100).round(),
    next - xp,
  );
}
