// يقارن منطق Dart بقيم مرجعية ولّدها منطق الويب نفسه (tool/gen_web_golden.js).
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:rehla_flutter/logic/daily.dart';
import 'package:rehla_flutter/logic/reminders.dart';
import 'package:rehla_flutter/logic/rng.dart';
import 'package:rehla_flutter/logic/stats.dart';
import 'package:rehla_flutter/models/app_data.dart';

import 'helpers.dart';

const _wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _mo = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
String jsDateStr(DateTime d) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${_wd[d.weekday - 1]} ${_mo[d.month - 1]} ${two(d.day)} ${d.year} ${two(d.hour)}:${two(d.minute)}';
}

void main() {
  final golden = jsonDecode(File('test/fixtures/web_golden.json').readAsStringSync()) as Map<String, dynamic>;

  test('FNV-1a hash matches the web', () {
    final inputs = ['', 'a', 'سارة', '2026-11-02:0:سارة'];
    expect(inputs.map(hashStr).toList(), golden['hash']);
  });

  test('mulberry32 sequence matches the web', () {
    final r = Mulberry32(hashStr('2026-11-02:0:سارة'));
    final seq = List.generate(5, (_) => r.next());
    final want = (golden['rng'] as List).cast<num>();
    for (var i = 0; i < 5; i++) {
      expect(seq[i], closeTo(want[i].toDouble(), 1e-15));
    }
  });

  final scenarios = <String, AppData Function()>{
    'fresh0': baseState,
    'fresh1': baseState,
    'stage3bonus': () {
      final s = baseState();
      addActive(s, daysBack('2026-11-01', 12));
      s.dayRec('2026-11-02').mood = 3;
      s.profile!.lastLesson = {'العلوم': 'الخلية'};
      return s;
    },
    'anxious': () => baseState()..dayRec('2026-11-02').mood = 5,
    'youngLow': () {
      final s = baseState();
      s.profile!.cls = 2;
      s.profile!.grade = 'ابتدائي';
      addActive(s, daysBack('2026-11-01', 4));
      s.dayRec('2026-11-02').mood = 0;
      return s;
    },
    'reentry': () => baseState()..let((s) => addActive(s, daysBack('2026-10-20', 8))),
    'freezes': () =>
        baseState()..let((s) => addActive(s, daysBack('2026-11-01', 20, ['2026-10-25', '2026-10-18', '2026-10-19']))),
    'struggling': () {
      final s = baseState();
      addActive(s, daysBack('2026-11-01', 25));
      for (final k in daysBack('2026-11-01', 7)) {
        s.history[k]!
          ..given = 5
          ..ch = 1;
      }
      return s;
    },
  };

  final scen = golden['scen'] as Map<String, dynamic>;
  for (final e in scenarios.entries) {
    test('buildDaily + stats parity: ${e.key}', () {
      final s = e.value();
      final want = scen[e.key] as Map<String, dynamic>;
      final st = computeStats(s, kNow);
      final ws = want['stats'] as Map<String, dynamic>;
      expect({
        'streak': st.streak,
        'best': st.bestStreak,
        'freezes': st.freezes,
        'activeDays': st.activeDays,
        'stage': st.stage,
        'gap': st.gapDays,
        'reentry': st.reentry,
        'struggling': st.struggling,
        'weekDays': st.weekDays,
      }, ws);
      final d = buildDaily(s, kNow, e.key == 'fresh1' ? 1 : 0);
      final got = d.list
          .map((c) => {'type': c.type, 'text': c.text, 'subject': c.subject, 'minutes': c.minutes, 'xp': c.xp})
          .toList();
      expect(got, want['list']);
    });
  }

  test('daily generation is deterministic for the same date/rerolls/name', () {
    final a = buildDaily(baseState(), kNow, 0).list.map((c) => c.text).toList();
    final b = buildDaily(baseState(), kNow, 0).list.map((c) => c.text).toList();
    final c = buildDaily(baseState(), kNow, 1).list.map((c) => c.text).toList();
    expect(a, b);
    expect(a, isNot(equals(c)));
  });

  List<Map<String, dynamic>> plan(AppData s) => planNotifications(
    s,
    kNow,
  ).map((p) => {'id': p.id, 'at': jsDateStr(p.at), 'title': p.title, 'body': p.body, 'kind': p.kind}).toList();

  test('planNotifications parity: fresh (name shown, Friday shifted)', () {
    expect(plan(baseState()), golden['planFresh']);
  });

  test('planNotifications parity: late time, female copy, active today', () {
    final s = baseState();
    s.reminders
      ..time = '21:25'
      ..lead = 0
      ..showName = false;
    s.profile!.g = 'f';
    addActive(s, ['2026-11-02']);
    expect(plan(s), golden['planLate']);
  });

  test('planNotifications parity: early time clamped to 07:00, paused week', () {
    final s = baseState();
    s.reminders
      ..time = '07:05'
      ..lead = 30
      ..pausedUntil = '2026-11-05';
    expect(plan(s), golden['planEarlyPaused']);
  });
}

extension _Let<T> on T {
  void let(void Function(T) f) => f(this);
}
