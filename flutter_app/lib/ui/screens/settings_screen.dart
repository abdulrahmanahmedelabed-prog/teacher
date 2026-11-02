import 'dart:convert';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../data/app_text.dart';
import '../../data/content.dart';
import '../../logic/reminders.dart';
import '../../state/app_scope.dart';
import '../../state/app_state.dart';
import '../../theme/app_theme.dart';
import '../widgets/common.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _name = TextEditingController();
  final _goal = TextEditingController();
  final _fb = TextEditingController();
  late List<String> subs;
  int? cls;
  late int minutes;
  late String when;
  String? g;
  int rating = 0;
  String kind = kFeedbackKinds.first;
  bool _init = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_init) return;
    _init = true;
    final s = AppScope.read(context);
    if (!s.onboarded) return;
    final p = s.profile;
    _name.text = p.name;
    _goal.text = p.goal;
    subs = List.of(p.subjects);
    cls = p.cls;
    minutes = kDailyMinutes.contains(p.minutes) ? p.minutes : 45;
    when = p.when;
    g = p.g;
  }

  @override
  void dispose() {
    _name.dispose();
    _goal.dispose();
    _fb.dispose();
    super.dispose();
  }

  void _save(AppState s) {
    final name = _name.text.trim();
    if (name.isEmpty) {
      s.toast('الاسم مطلوب');
      return;
    }
    if (subs.isEmpty) {
      s.toast('اختر مادة واحدة على الأقل');
      return;
    }
    s.saveProfile(name: name, cls: cls, subjects: subs, minutes: minutes, goal: _goal.text.trim(), when: when, g: g);
  }

  Future<void> _import(AppState s) async {
    try {
      final f = await FilePicker.pickFile(type: FileType.custom, allowedExtensions: const ['json']);
      if (f == null) return;
      final raw = utf8.decode(await f.readAsBytes(), allowMalformed: true);
      if (s.importBackup(raw) && mounted) Navigator.of(context).popUntil((r) => r.isFirst);
    } catch (_) {
      s.toast('الملف غير صالح');
    }
  }

  Future<void> _pickTime(AppState s) async {
    final parts = remindTime(s.data).split(':');
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1])),
      helpText: 'وقت الدراسة',
    );
    if (t != null) s.setReminderTime(t);
  }

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    if (!s.onboarded) return const Scaffold(body: SizedBox.shrink());
    final st = s.data.settings;
    final r = s.data.reminders;
    return Scaffold(
      appBar: AppBar(title: const Text('⚙️ الإعدادات')),
      body: PageBody(
        children: [
          // ---------- الملف الشخصي ----------
          SectionCard(
            title: '👤 ملفي',
            children: [
              TextField(
                controller: _name,
                maxLength: 30,
                decoration: const InputDecoration(labelText: 'الاسم'),
              ),
              DropdownButtonFormField<int>(
                isExpanded: true,
                initialValue: cls,
                decoration: const InputDecoration(labelText: 'الصف'),
                hint: const Text('— اختر صفّك —'),
                items: [
                  for (var c = 1; c <= 13; c++)
                    DropdownMenuItem(
                      value: c,
                      child: Text('${classLabel(c)}${c <= 12 ? ' (${gradeOfClass(c).split(' /').first})' : ''}'),
                    ),
                ],
                onChanged: (v) => setState(() => cls = v),
              ),
              const Gap(),
              const Text('المواد', style: TextStyle(fontWeight: FontWeight.w700)),
              const Gap(6),
              Wrap(
                spacing: Spacing.sm,
                runSpacing: Spacing.sm,
                children: [
                  for (final x in kSubjects)
                    FilterChip(
                      label: Text(x),
                      selected: subs.contains(x),
                      onSelected: (v) => setState(() => v ? subs.add(x) : subs.remove(x)),
                    ),
                ],
              ),
              const Gap(),
              DropdownButtonFormField<int>(
                isExpanded: true,
                initialValue: minutes,
                decoration: const InputDecoration(labelText: 'الوقت اليومي (دقيقة)'),
                items: [for (final m in kDailyMinutes) DropdownMenuItem(value: m, child: Text('$m'))],
                onChanged: (v) => setState(() => minutes = v ?? minutes),
              ),
              const Gap(),
              const Text('أخاطبك بصيغة', style: TextStyle(fontWeight: FontWeight.w700)),
              const Gap(6),
              Wrap(
                spacing: Spacing.sm,
                children: [
                  ChoiceChipX(
                    label: 'المذكّر (صديقي)',
                    selected: g == 'm',
                    onTap: () => setState(() => g = g == 'm' ? null : 'm'),
                  ),
                  ChoiceChipX(
                    label: 'المؤنث (صديقتي)',
                    selected: g == 'f',
                    onTap: () => setState(() => g = g == 'f' ? null : 'f'),
                  ),
                ],
              ),
              const Gap(),
              TextField(
                controller: _goal,
                maxLength: 80,
                decoration: const InputDecoration(labelText: 'هدفي'),
              ),
              const Text('موعد دراستي', style: TextStyle(fontWeight: FontWeight.w700)),
              const Gap(6),
              Wrap(
                spacing: Spacing.sm,
                runSpacing: Spacing.sm,
                children: [
                  for (final w in kWhens)
                    ChoiceChipX(label: w, selected: when == w, onTap: () => setState(() => when = when == w ? '' : w)),
                ],
              ),
              const Gap(Spacing.lg),
              FilledButton(onPressed: () => _save(s), child: const Text('حفظ')),
            ],
          ),

          // ---------- المظهر ----------
          SectionCard(
            title: '🎨 المظهر',
            children: [
              const Muted('«تلقائي» يتبع إعدادات جهازك. الوضع الداكن مريح للعين ليلاً ويوفّر البطارية.'),
              const Gap(),
              SegmentedButton<ThemeMode>(
                segments: const [
                  ButtonSegment(value: ThemeMode.system, label: Text('🌓 تلقائي')),
                  ButtonSegment(value: ThemeMode.light, label: Text('☀️ فاتح')),
                  ButtonSegment(value: ThemeMode.dark, label: Text('🌙 داكن')),
                ],
                selected: {s.themeMode},
                showSelectedIcon: false,
                onSelectionChanged: (v) => s.setTheme(v.first),
              ),
            ],
          ),

          // ---------- التذكيرات ----------
          SectionCard(
            title: '🔔 التذكيرات',
            children: [
              SwitchRow(
                title: 'تذكير بموعد الدراسة',
                hint: 'مرة واحدة في اليوم، لا إشعارات بعد 9:30 مساءً',
                value: r.on,
                onChanged: (_) => s.toggleReminderPref('on'),
              ),
              if (r.on) ...[
                if (s.remindersPaused)
                  Row(
                    children: [
                      Expanded(child: Muted('⏸️ التذكيرات متوقفة حتى ${r.pausedUntil}')),
                      TextButton(onPressed: s.resumeReminders, child: const Text('استئناف')),
                    ],
                  ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('وقت الدراسة', style: TextStyle(fontWeight: FontWeight.w700)),
                  trailing: OutlinedButton.icon(
                    onPressed: () => _pickTime(s),
                    icon: const Icon(Icons.schedule),
                    label: Text(remindTime(s.data), textDirection: TextDirection.ltr),
                  ),
                ),
                const Text('ذكّرني قبله بـ', style: TextStyle(fontWeight: FontWeight.w700)),
                const Gap(6),
                Wrap(
                  spacing: Spacing.sm,
                  children: [
                    for (final m in const [0, 10, 15, 30])
                      ChoiceChipX(
                        label: m == 0 ? 'في الموعد' : '$m د',
                        selected: r.lead == m,
                        onTap: () => s.setReminderLead(m),
                      ),
                  ],
                ),
                const Gap(),
                const Text('الأيام', style: TextStyle(fontWeight: FontWeight.w700)),
                const Gap(6),
                Wrap(
                  spacing: Spacing.sm,
                  runSpacing: Spacing.sm,
                  children: [
                    for (final d in const [6, 0, 1, 2, 3, 4, 5])
                      ChoiceChipX(
                        label: kDayNames[d],
                        selected: r.days.contains(d),
                        onTap: () => s.toggleReminderDay(d),
                      ),
                  ],
                ),
                SwitchRow(
                  title: 'رسائل «اشتقنا لك»',
                  hint: 'إذا غبت: بعد يومين، 4، 7، 14، 30 يوماً ثم نتوقف',
                  value: r.miss,
                  onChanged: (_) => s.toggleReminderPref('miss'),
                ),
                SwitchRow(
                  title: 'هاتف مشترك مع العائلة',
                  hint: 'لا نُظهر اسمك في الإشعارات',
                  value: r.shared,
                  onChanged: (_) => s.toggleReminderPref('shared'),
                ),
                if (!r.shared)
                  SwitchRow(
                    title: 'أظهر اسمي في الإشعارات',
                    value: r.showName,
                    onChanged: (_) => s.toggleReminderPref('showName'),
                  ),
                if (!s.remindersPaused)
                  OutlinedButton(onPressed: s.pauseReminders, child: const Text('⏸️ أوقف التذكيرات أسبوعاً')),
              ],
            ],
          ),

          // ---------- الصوت ----------
          SectionCard(
            title: '🔊 الصوت والاهتزاز',
            children: [
              SwitchRow(
                title: 'أصوات التشجيع',
                hint: 'نغمات قصيرة وهادئة عند الإنجاز',
                value: st.sound,
                onChanged: (_) => s.toggleSetting('sound'),
              ),
              if (st.sound)
                Row(
                  children: [
                    const Text('مستوى الصوت'),
                    Expanded(
                      child: Slider(
                        value: (st.volume * 10).roundToDouble() / 10,
                        divisions: 10,
                        label: '${(st.volume * 100).round()}٪',
                        semanticFormatterCallback: (v) => '${(v * 100).round()}٪',
                        onChanged: (v) {
                          st.volume = v;
                          setState(() {});
                        },
                        onChangeEnd: s.setVolume,
                      ),
                    ),
                    Text('${(st.volume * 100).round()}٪'),
                  ],
                ),
              SwitchRow(
                title: 'الاهتزاز',
                hint: 'لمسات خفيفة مع الإنجاز',
                value: st.haptics,
                onChanged: (_) => s.toggleSetting('haptics'),
              ),
              SwitchRow(
                title: 'الساعات الهادئة',
                hint: 'من 10 مساءً حتى 7 صباحاً: صوت أخفض واهتزاز أقصر',
                value: st.quiet,
                onChanged: (_) => s.toggleSetting('quiet'),
              ),
            ],
          ),

          // ---------- النسخ الاحتياطي ----------
          SectionCard(
            title: '💾 نسخة احتياطية',
            children: [
              const Muted(
                'بياناتك محفوظة على جهازك فقط. انسخها احتياطياً لتنقلها لجهاز آخر — الملف متوافق مع نسخة الويب.',
              ),
              const Gap(),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(onPressed: s.exportBackup, child: const Text('⬆️ تصدير')),
                  ),
                  const SizedBox(width: Spacing.sm),
                  Expanded(
                    child: OutlinedButton(onPressed: () => _import(s), child: const Text('⬇️ استيراد')),
                  ),
                ],
              ),
            ],
          ),

          // ---------- الرأي ----------
          SectionCard(
            title: '💬 رأيك يهمنا',
            children: [
              Muted(
                'قيّم التطبيق واكتب أي اقتراح أو ملاحظة — رأيك يساعدنا نطوّره لك ولغيرك من الطلاب.'
                '${s.data.feedback.isNotEmpty ? ' (أرسلت ${s.data.feedback.length} ملاحظة، شكراً لك 💜)' : ''}',
              ),
              const Gap(),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (var n = 1; n <= 5; n++)
                    IconButton(
                      tooltip: '$n نجوم',
                      iconSize: 34,
                      onPressed: () => setState(() => rating = n),
                      icon: Icon(n <= rating ? Icons.star_rounded : Icons.star_outline_rounded, color: context.rc.warn),
                    ),
                ],
              ),
              Wrap(
                spacing: Spacing.sm,
                children: [
                  for (final k in kFeedbackKinds)
                    ChoiceChipX(label: k, selected: kind == k, onTap: () => setState(() => kind = k)),
                ],
              ),
              const Gap(),
              TextField(
                controller: _fb,
                maxLength: 1000,
                minLines: 3,
                maxLines: 6,
                decoration: const InputDecoration(
                  labelText: 'رسالتك',
                  hintText: 'ما الذي أعجبك؟ ما الذي تتمنى أن نضيفه أو نغيّره؟',
                ),
              ),
              FilledButton(
                onPressed: () {
                  final t = _fb.text.trim();
                  if (t.isEmpty && rating == 0) {
                    s.toast('اختر تقييماً أو اكتب رسالة 🙂');
                    return;
                  }
                  s.sendFeedback(rating, kind, t);
                  setState(() {
                    rating = 0;
                    kind = kFeedbackKinds.first;
                    _fb.clear();
                  });
                },
                child: const Text('أرسل رأيك ✉️'),
              ),
            ],
          ),

          // ---------- التواصل ----------
          SectionCard(
            center: true,
            children: [
              const Emoji('🤝', size: 36),
              Text('تواصل معنا', style: Theme.of(context).textTheme.titleMedium),
              const Gap(6),
              Muted(
                'لديك سؤال أو اقتراح أو تحتاج مساعدة؟ تواصل مع ${kContact.name}${kContact.role.isNotEmpty ? ' — ${kContact.role}' : ''}',
                center: true,
              ),
              const Gap(),
              Wrap(
                spacing: Spacing.sm,
                runSpacing: Spacing.sm,
                alignment: WrapAlignment.center,
                children: [
                  if (kContact.whatsapp.isNotEmpty)
                    ActionChip(
                      label: const Text('💬 واتساب'),
                      onPressed: () =>
                          s.openUrl(Uri.parse('https://wa.me/${kContact.whatsapp.replaceAll(RegExp(r'\D'), '')}')),
                    ),
                  if (kContact.instagram.isNotEmpty)
                    ActionChip(
                      label: const Text('📷 إنستغرام'),
                      onPressed: () => s.openUrl(
                        Uri.parse(
                          kContact.instagram.startsWith('http')
                              ? kContact.instagram
                              : 'https://instagram.com/${kContact.instagram.replaceFirst('@', '')}',
                        ),
                      ),
                    ),
                  if (kContact.facebook.isNotEmpty)
                    ActionChip(
                      label: const Text('👍 فيسبوك'),
                      onPressed: () => s.openUrl(Uri.parse(kContact.facebook)),
                    ),
                  if (kContact.email.isNotEmpty)
                    ActionChip(
                      label: Text('✉️ ${kContact.email}'),
                      onPressed: () => s.openUrl(
                        Uri(
                          scheme: 'mailto',
                          path: kContact.email,
                          query: 'subject=${Uri.encodeComponent('رحلة العودة')}',
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),

          // ---------- المنطقة الخطرة ----------
          Card(
            clipBehavior: Clip.antiAlias,
            child: ExpansionTile(
              shape: const Border(),
              title: Text(
                '⚠️ المنطقة الخطرة',
                style: TextStyle(fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.error),
              ),
              childrenPadding: const EdgeInsets.fromLTRB(Spacing.lg, 0, Spacing.lg, Spacing.lg),
              expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Muted('مسح كل تقدّمك نهائياً. صدّر نسخة احتياطية أولاً.'),
                const Gap(),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error,
                    side: BorderSide(color: Theme.of(context).colorScheme.error),
                  ),
                  onPressed: () async {
                    final ok = await confirmDialog(
                      context,
                      emoji: '⚠️',
                      title: 'مسح كل البيانات؟',
                      body: 'سيتم حذف كل تقدّمك نهائياً. ننصحك بتصدير نسخة احتياطية أولاً.',
                      yes: 'امسح كل شيء',
                      danger: true,
                    );
                    if (!ok) return;
                    await s.resetAll();
                    if (context.mounted) Navigator.of(context).popUntil((r) => r.isFirst);
                  },
                  child: const Text('مسح كل البيانات'),
                ),
              ],
            ),
          ),
          const Gap(Spacing.xl),
        ],
      ),
    );
  }
}
