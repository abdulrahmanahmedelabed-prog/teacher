/// شروط الأوسمة (مثل BADGES.check في الويب).
library;

import '../data/content.dart';
import '../models/app_data.dart';
import '../models/content_models.dart';
import 'stats.dart';

bool badgeEarned(String id, AppData s, Stats st) {
  switch (id) {
    case 'first':
      return st.totalChallenges >= 1;
    case 'lost':
      return s.lostDone >= 1;
    case 'streak3':
      return st.bestStreak >= 3;
    case 'streak7':
      return st.bestStreak >= 7;
    case 'streak30':
      return st.bestStreak >= 30;
    case 'focus60':
      return s.totalFocus >= 60;
    case 'focus600':
      return s.totalFocus >= 600;
    case 'full':
      return s.fullDays >= 1;
    case 'math15':
      return (s.best['math'] ?? 0) >= 15;
    case 'memory':
      final m = s.best['memory'] ?? 0;
      return m > 0 && m <= 12;
    case 'journal5':
      return s.journal.length >= 5;
    case 'xp1000':
      return s.xp >= 1000;
    case 'stage3':
      return st.stage >= 3;
    case 'stage5':
      return st.stage >= 5;
    case 'cards10':
      return s.cards.length >= 10;
    case 'reviews50':
      return s.reviews >= 50;
    case 'mastered':
      return s.cards.any((c) => c.box >= 5);
    case 'quiz10':
      return (s.best['quiz'] ?? 0) >= 10;
  }
  return false;
}

/// الأوسمة الجديدة التي استحقها الطالب الآن (بالترتيب).
List<BadgeInfo> newlyEarned(AppData s, Stats st) =>
    kBadgeInfo.where((b) => !s.badges.contains(b.id) && badgeEarned(b.id, s, st)).toList();
