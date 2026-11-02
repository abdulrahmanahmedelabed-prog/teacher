import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:rehla_flutter/logic/arabic.dart';
import 'package:rehla_flutter/logic/dates.dart';
import 'package:rehla_flutter/logic/leitner.dart';
import 'package:rehla_flutter/logic/levels.dart';
import 'package:rehla_flutter/logic/reminders.dart';
import 'package:rehla_flutter/logic/stats.dart';
import 'package:rehla_flutter/models/app_data.dart';
import 'package:rehla_flutter/services/sound_synth.dart';

import 'helpers.dart';

void main() {
  final golden = jsonDecode(File('test/fixtures/web_golden.json').readAsStringSync()) as Map<String, dynamic>;

  group('levels', () {
    test('XP(L) = 50·L·(L−1)', () {
      expect([1, 2, 3, 4, 5].map(xpForLevel).toList(), [0, 100, 300, 600, 1000]);
    });
    test('levelInfo matches the web', () {
      final xs = [0, 99, 100, 299, 300, 599, 600, 1000, 5000];
      final got = xs.map((x) {
        final l = levelInfo(x);
        return [l.level, l.title, l.pct, l.toNext];
      }).toList();
      expect(got, golden['levels']);
    });
  });

  group('arabic number agreement', () {
    test('arDays / arMins match the web', () {
      final got = [1, 2, 3, 10, 11, 25].map((n) => [arDays(n), arMins(n)]).toList();
      expect(got, golden['ar']);
    });
    test('arCount: 3–10 plural, otherwise singular', () {
      expect(arCount(2, 'دقائق', 'دقيقة'), 'دقيقة');
      expect(arCount(3, 'دقائق', 'دقيقة'), 'دقائق');
      expect(arCount(10, 'دقائق', 'دقيقة'), 'دقائق');
      expect(arCount(11, 'دقائق', 'دقيقة'), 'دقيقة');
      expect(arCount2(5, 'بطاقات', 'بطاقة'), '5 بطاقات');
    });
    test('relDay', () {
      expect(relDay('2026-11-02', '2026-11-02'), 'اليوم');
      expect(relDay('2026-11-03', '2026-11-02'), 'غداً');
      expect(relDay('2026-11-04', '2026-11-02'), 'بعد يومين');
      expect(relDay('2026-11-06', '2026-11-02'), 'بعد 4 أيام');
      expect(relDay('2026-11-20', '2026-11-02'), 'بعد 18 يوماً');
    });
    test('gtext feminine copy', () {
      expect(gtext('وينك يا صديقي؟', 'f'), 'وينك يا صديقتي؟');
      expect(gtext('وينك يا صديقي؟', 'm'), 'وينك يا صديقي؟');
      expect(gtext('حين تريد العودة', 'f'), 'حين تريدين العودة');
    });
  });

  group('forgiving streak', () {
    test('one missed day after 7 study days is covered by a freeze', () {
      final s = baseState();
      // 7 أيام دراسة، ثم يوم غياب، ثم يومان
      addActive(s, daysBack('2026-10-31', 7));
      addActive(s, ['2026-11-01', '2026-11-02']);
      s.history.remove('2026-10-31');
      addActive(s, daysBack('2026-10-30', 7));
      final st = computeStats(s, kNow);
      expect(st.streak, 9);
      expect(st.freezes, 0); // استُهلك يوم السماح
    });
    test('missed day without a freeze resets the streak', () {
      final s = baseState();
      addActive(s, ['2026-10-28', '2026-10-29', '2026-10-31', '2026-11-01']);
      expect(computeStats(s, kNow).streak, 2);
      expect(computeStats(s, kNow).bestStreak, 2);
    });
    test('today not studied yet does not break the streak', () {
      final s = baseState();
      addActive(s, daysBack('2026-11-01', 3));
      expect(computeStats(s, kNow).streak, 3);
    });
    test('freezes are capped at 2', () {
      final s = baseState();
      addActive(s, daysBack('2026-11-01', 30));
      expect(computeStats(s, kNow).freezes, 2);
    });
    test('week strip starts on Saturday', () {
      expect(jsDay(weekStart(kNow)), 6);
      expect(dateKey(weekStart(kNow)), '2026-10-31');
    });
  });

  group('Leitner', () {
    StudyCard card() => StudyCard(id: 'c1', subject: 'العلوم', q: 'q', a: 'a', due: '2026-11-02');

    test('known card moves up a box and is delayed by BOX_DAYS', () {
      final c = card();
      final r = ReviewSession(['c1']);
      expect(r.grade(c, true, kNow), isTrue);
      expect(c.box, 2);
      expect(c.due, '2026-11-04');
      expect(r.right, 1);
      expect(r.queue, isEmpty);
    });
    test('box sequence 1→6 uses 2,4,8,16,30 days and caps at 6', () {
      final c = card();
      final dues = <String>[];
      for (var i = 0; i < 6; i++) {
        ReviewSession(['c1']).grade(c, true, kNow);
        dues.add(c.due);
      }
      expect(c.box, 6);
      expect(dues, ['2026-11-04', '2026-11-06', '2026-11-10', '2026-11-18', '2026-12-02', '2026-12-02']);
      expect(kBoxDays, [0, 1, 2, 4, 8, 16, 30]);
    });
    test('forgotten card goes back to box 1, due tomorrow, retried once in session', () {
      final c = card()..box = 4;
      final r = ReviewSession(['c1']);
      expect(r.grade(c, false, kNow), isTrue);
      expect(c.box, 1);
      expect(c.due, '2026-11-03');
      expect(r.queue, ['c1']);
      // تذكّرها في نفس الجلسة: تبقى في الصندوق 1 ولا نقاط إضافية
      expect(r.grade(c, true, kNow), isFalse);
      expect(c.box, 1);
      expect(c.due, '2026-11-03');
      expect(r.queue, isEmpty);
      expect(r.done, 1);
    });
  });

  group('reminders', () {
    test('quiet hours: no notifications after 21:30 or before 07:00', () {
      expect(clampQuiet(DateTime(2026, 11, 2, 23, 10)), DateTime(2026, 11, 2, 21, 30));
      expect(clampQuiet(DateTime(2026, 11, 2, 5, 0)), DateTime(2026, 11, 2, 7, 0));
      expect(clampQuiet(DateTime(2026, 11, 2, 16, 0)), DateTime(2026, 11, 2, 16, 0));
    });
    test('all planned times are inside 07:00–21:30 and never on Friday by default', () {
      final s = baseState()..reminders.time = '21:30';
      for (final p in planNotifications(s, kNow)) {
        final m = p.at.hour * 60 + p.at.minute;
        expect(m >= 7 * 60 && m <= 21 * 60 + 30, isTrue);
        expect(jsDay(p.at), isNot(5));
      }
    });
    test('miss-you stops after +30 days and uses reduced offsets after ignores', () {
      final s = baseState();
      final ids = planNotifications(s, kNow).where((p) => p.kind == 'miss').map((p) => p.id).toList();
      expect(ids, [7102, 7104, 7107, 7114, 7130]);
      s.notif.ignored = 3;
      final reduced = planNotifications(s, kNow).where((p) => p.kind == 'miss').map((p) => p.id).toList();
      expect(reduced, [7102, 7107, 7130]);
    });
    test('shared phone hides the name; off means no plan', () {
      final s = baseState()..reminders.shared = true;
      expect(planNotifications(s, kNow).any((p) => p.title.contains('سارة')), isFalse);
      s.reminders.on = false;
      expect(planNotifications(s, kNow), isEmpty);
    });
    test('three low-mood days suppress miss-you messages for a week', () {
      final s = baseState();
      for (final k in daysBack('2026-11-02', 3)) {
        s.dayRec(k).mood = 0;
      }
      final ids = planNotifications(s, kNow).where((p) => p.kind == 'miss').map((p) => p.id).toList();
      expect(ids, [7114, 7130]);
    });
  });

  group('state JSON', () {
    test('sanitizes imported web backups', () {
      final s = AppData.fromJson(
        {
          'xp': '120',
          'profile': {
            'name': '',
            'subjects': ['العلوم', 5],
            'minutes': 999,
            'g': 'x',
          },
          'history': {
            'bad': {},
            '2026-11-01': {'ch': 2, 'active': true, 'mood': 9},
          },
          'cards': [
            {'id': 'a<b>', 'q': 'q', 'a': 'a', 'box': 9, 'due': 'nope'},
          ],
          'daily': {
            'date': '2026-11-02',
            'list': [
              {'id': 'x'},
            ],
          },
          'reminders': {
            'lead': 7,
            'days': [5, 9],
            'time': '7pm',
          },
          'settings': {'volume': 3, 'young': true},
        },
        keepDaily: false,
        today: '2026-11-02',
      );
      expect(s.xp, 120);
      expect(s.profile!.name, 'طالب');
      expect(s.profile!.subjects, ['العلوم']);
      expect(s.profile!.minutes, 240);
      expect(s.profile!.g, isNull);
      expect(s.history.keys, ['2026-11-01']);
      expect(s.history['2026-11-01']!.mood, isNull);
      expect(s.cards.single.id, 'ab');
      expect(s.cards.single.box, 6);
      expect(s.cards.single.due, '2026-11-02');
      expect(s.daily, isNull);
      expect(s.reminders.lead, 10);
      expect(s.reminders.days, [5]);
      expect(s.reminders.time, '');
      expect(s.settings.volume, 1.0);
      expect(s.settings.toJson()['young'], isTrue); // إعدادات الويب الإضافية تُحفظ
    });
    test('round-trips through JSON', () {
      final s = baseState();
      addActive(s, daysBack('2026-11-01', 3));
      final again = AppData.fromJson(jsonDecode(jsonEncode(s.toJson())) as Map<String, dynamic>);
      expect(jsonEncode(again.toJson()), jsonEncode(s.toJson()));
    });
    test('rejects a broken profile', () {
      expect(
        () => AppData.fromJson({
          'xp': 0,
          'profile': {'name': 'x'},
        }),
        throwsFormatException,
      );
    });
  });

  group('sound synthesis', () {
    test('every event renders a valid, non-silent WAV', () {
      for (final id in kSoundTier.keys) {
        final wav = encodeWav(renderVoices(soundRecipe(id)));
        expect(String.fromCharCodes(wav.sublist(0, 4)), 'RIFF');
        expect(String.fromCharCodes(wav.sublist(8, 12)), 'WAVE');
        expect(wav.length, greaterThan(44 + 500), reason: id);
      }
      final amb = renderAmbient();
      expect(amb.length, kSampleRate * 2);
      expect(amb.every((x) => x.abs() <= 1), isTrue);
    });
  });
}
