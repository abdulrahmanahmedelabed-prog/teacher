import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../models/app_data.dart';
import '../../services/ai_service.dart';
import '../../state/app_scope.dart';
import '../../state/app_state.dart';
import '../../theme/app_theme.dart';
import '../widgets/common.dart';

String fmtSize(int n) =>
    n > 1048576 ? '${(n / 1048576).toStringAsFixed(1)} MB' : '${(n / 1024).round().clamp(1, 1 << 30)} KB';
String bookIcon(Book b) => b.kind == 'link'
    ? '🔗'
    : b.isImage
    ? '🖼️'
    : '📕';

/// قائمة «كتبي».
class BooksList extends StatefulWidget {
  const BooksList({super.key});

  @override
  State<BooksList> createState() => _BooksListState();
}

class _BooksListState extends State<BooksList> {
  bool linkForm = false;
  final _url = TextEditingController();
  final _title = TextEditingController();
  String? _sub;

  @override
  void dispose() {
    _url.dispose();
    _title.dispose();
    super.dispose();
  }

  void _open(Book b) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => BookScreen(bookId: b.id)));

  Future<void> _pick(AppState s) async {
    try {
      final f = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: const ['pdf', 'jpg', 'jpeg', 'png', 'webp'],
      );
      if (f == null) return;
      final bytes = await f.readAsBytes();
      final b = await s.addBook(bytes, f.name);
      if (b != null && mounted) _open(b);
    } catch (_) {
      s.toast('تعذّر فتح الملف');
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final subs = s.subjects;
    if (_sub == null || !subs.contains(_sub)) _sub = subs.first;
    final addRow = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: FilledButton(onPressed: () => _pick(s), child: const Text('📄 ملف أو صورة')),
            ),
            const SizedBox(width: Spacing.sm),
            Expanded(
              child: OutlinedButton(onPressed: () => setState(() => linkForm = true), child: const Text('🔗 رابط')),
            ),
          ],
        ),
        const Gap(6),
        const Muted('PDF للكتاب أو لفصل منه، أو صور صفحات الدرس 📷', center: true),
      ],
    );
    final form = !linkForm
        ? const SizedBox.shrink()
        : SectionCard(
            title: '🔗 رابط كتاب',
            children: [
              TextField(
                controller: _url,
                keyboardType: TextInputType.url,
                textDirection: TextDirection.ltr,
                decoration: const InputDecoration(
                  labelText: 'الرابط (PDF مباشر يبدأ بـ https)',
                  hintText: 'https://…/book.pdf',
                ),
              ),
              const Gap(),
              TextField(
                controller: _title,
                maxLength: 80,
                decoration: const InputDecoration(labelText: 'اسم الكتاب', hintText: 'مثلاً: رياضيات الصف السابع ج1'),
              ),
              DropdownButtonFormField<String>(
                isExpanded: true,
                initialValue: _sub,
                decoration: const InputDecoration(labelText: 'المادة'),
                items: [for (final x in subs) DropdownMenuItem(value: x, child: Text(x))],
                onChanged: (v) => setState(() => _sub = v),
              ),
              const Gap(),
              FilledButton(
                onPressed: () {
                  final b = s.addBookLink(_url.text.trim(), _title.text.trim(), _sub!);
                  if (b != null) {
                    _url.clear();
                    _title.clear();
                    setState(() => linkForm = false);
                    _open(b);
                  }
                },
                child: const Text('أضف الكتاب'),
              ),
              TextButton(onPressed: () => setState(() => linkForm = false), child: const Text('إلغاء')),
            ],
          );
    final info = s.ai.enabled
        ? const SizedBox.shrink()
        : const Card(
            clipBehavior: Clip.antiAlias,
            child: ExpansionTile(
              shape: Border(),
              title: Text('🤖 أين المعلم الذكي؟', style: TextStyle(fontWeight: FontWeight.w700)),
              childrenPadding: EdgeInsets.fromLTRB(Spacing.lg, 0, Spacing.lg, Spacing.lg),
              children: [
                Muted(
                  'المعلم الذكي (Gemini من Google) سيكون متاحاً قريباً في هذه النسخة. الآن يمكنك حفظ كتبك وقراءتها، وصنع بطاقاتك بنفسك.',
                ),
              ],
            ),
          );
    if (s.data.books.isEmpty) {
      return PageBody(
        children: [
          SectionCard(
            center: true,
            children: [
              const Emoji('📖', size: 46),
              Text('كتبي', style: Theme.of(context).textTheme.titleLarge),
              const Gap(6),
              const Muted(
                'أضف كتابك أو صوّر صفحات الدرس، والمعلم الذكي يشرحه لك خطوة بخطوة، ويلخّصه، ويختبرك فيه، ويصنع لك بطاقات مراجعة.',
                small: false,
                center: true,
              ),
              const Gap(),
              addRow,
            ],
          ),
          form,
          info,
        ],
      );
    }
    return PageBody(
      children: [
        SectionCard(title: '📖 كتبي', children: [addRow]),
        form,
        Card(
          child: Column(
            children: [
              for (final b in s.data.books.reversed)
                ListTile(
                  minTileHeight: 64,
                  leading: Emoji(bookIcon(b), size: 28),
                  title: Text(b.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text(
                    '${b.subject}${b.size > 0 ? ' · ${fmtSize(b.size)}' : ''}'
                    '${(s.data.bookChats[b.id] ?? const []).isNotEmpty ? ' · 💬 ${((s.data.bookChats[b.id]!.length) / 2).ceil()}' : ''}',
                  ),
                  trailing: const Icon(Icons.chevron_left),
                  onTap: () => _open(b),
                ),
            ],
          ),
        ),
        info,
      ],
    );
  }
}

/// صفحة كتاب واحد + المعلم الذكي.
class BookScreen extends StatefulWidget {
  const BookScreen({super.key, required this.bookId});
  final String bookId;

  @override
  State<BookScreen> createState() => _BookScreenState();
}

class _BookScreenState extends State<BookScreen> {
  final _lesson = TextEditingController();
  final _input = TextEditingController();
  final _scroll = ScrollController();
  bool deep = false;

  @override
  void dispose() {
    _lesson.dispose();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send(AppState s, Book b, String text) async {
    _input.clear();
    final back = await s.aiSend(b, text, deep: deep);
    if (back != null && _input.text.isEmpty) _input.text = back;
  }

  @override
  Widget build(BuildContext context) {
    final s = AppScope.of(context);
    final b = s.data.books.where((x) => x.id == widget.bookId).firstOrNull;
    if (b == null) return const Scaffold(body: SizedBox.shrink());
    final chat = s.data.bookChats[b.id] ?? const <ChatMsg>[];
    final big = b.kind == 'file' && b.size > AiService.maxFile;
    final ai = s.ai.enabled && !big;
    return Scaffold(
      appBar: AppBar(title: Text(b.title, overflow: TextOverflow.ellipsis)),
      body: PageBody(
        controller: _scroll,
        children: [
          SectionCard(
            children: [
              Row(
                children: [
                  Emoji(bookIcon(b), size: 40),
                  const SizedBox(width: Spacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(b.title, style: Theme.of(context).textTheme.titleMedium),
                        Muted(
                          '${b.subject}${b.size > 0 ? ' · ${fmtSize(b.size)}' : ''}${b.fileId.isNotEmpty ? ' · جاهز للمعلم ✔' : ''}',
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const Gap(),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(onPressed: () => s.openBookFile(b), child: const Text('📖 افتح الكتاب')),
                  ),
                  const SizedBox(width: Spacing.sm),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () async {
                        final ok = await confirmDialog(
                          context,
                          emoji: '🗑️',
                          title: 'حذف هذا الكتاب؟',
                          body: 'سيُحذف من جهازك مع محادثاته. بطاقاتك تبقى.',
                          yes: 'احذف',
                          danger: true,
                        );
                        if (ok) {
                          await s.deleteBook(b.id);
                          if (context.mounted) Navigator.pop(context);
                        }
                      },
                      child: const Text('🗑️ حذف'),
                    ),
                  ),
                ],
              ),
            ],
          ),
          SectionCard(
            title: '🤖 المعلم الذكي',
            children: [
              TextField(
                controller: _lesson,
                maxLength: 80,
                decoration: const InputDecoration(
                  labelText: 'الدرس أو الصفحات (اختياري)',
                  hintText: 'مثلاً: درس الكسور، أو صفحات 20–25',
                ),
              ),
              if (ai) ...[
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  childAspectRatio: 3.2,
                  mainAxisSpacing: Spacing.sm,
                  crossAxisSpacing: Spacing.sm,
                  children: [
                    for (final m in const [
                      ('explain', '📖 اشرح لي'),
                      ('summary', '📝 لخّص'),
                      ('quiz', '❓ اختبرني'),
                      ('cards', '🗂️ اصنع بطاقات'),
                    ])
                      OutlinedButton(
                        onPressed: s.aiBusy
                            ? null
                            : () => m.$1 == 'cards'
                                  ? s.aiCards(b, _lesson.text)
                                  : _send(s, b, AppState.aiPrompt(m.$1, _lesson.text)),
                        child: Text(m.$2),
                      ),
                  ],
                ),
                if (chat.isNotEmpty || s.aiBusy) ...[
                  const Gap(),
                  Semantics(
                    liveRegion: true,
                    child: Column(
                      children: [
                        for (final m in chat) _Bubble(m: m),
                        if (s.aiBusy)
                          _Bubble(m: ChatMsg('assistant', '${s.aiStatus.isNotEmpty ? s.aiStatus : 'المعلم يكتب'} …')),
                      ],
                    ),
                  ),
                ],
                const Gap(),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _input,
                        minLines: 1,
                        maxLines: 4,
                        maxLength: 1500,
                        decoration: const InputDecoration(
                          hintText: 'اسأل عن أي شيء في الكتاب…',
                          labelText: 'سؤالك للمعلم',
                          counterText: '',
                        ),
                      ),
                    ),
                    const SizedBox(width: Spacing.sm),
                    IconButton.filled(
                      tooltip: 'إرسال',
                      onPressed: s.aiBusy ? null : () => _send(s, b, _input.text),
                      icon: const Icon(Icons.send),
                    ),
                  ],
                ),
                SwitchRow(
                  title: '🧠 شرح أعمق',
                  hint: 'أبطأ قليلاً — للدروس الصعبة',
                  value: deep,
                  onChanged: (v) => setState(() => deep = v),
                ),
                if (chat.isNotEmpty)
                  TextButton(onPressed: () => s.clearChat(b.id), child: const Text('🧹 محادثة جديدة')),
                const Muted('يُرسَل الكتاب للمعلم الذكي (Gemini) لشرحه لك فقط.'),
                const Gap(),
              ] else if (big)
                const Muted('الملف أكبر من 20 ميغابايت. لتستخدم المعلم: ارفع فصلاً واحداً أو صوّر صفحات الدرس.')
              else
                const Muted(
                  'المعلم الذكي (Gemini من Google) سيكون متاحاً قريباً في هذه النسخة. الآن: افتح كتابك وادرس، واصنع بطاقاتك بنفسك من «بطاقاتي» 🗂️',
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.m});
  final ChatMsg m;
  @override
  Widget build(BuildContext context) {
    final me = m.role == 'user';
    final p = Theme.of(context).colorScheme.primary;
    return Align(
      alignment: me ? AlignmentDirectional.centerStart : AlignmentDirectional.centerEnd,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.all(Spacing.md),
        constraints: const BoxConstraints(maxWidth: 560),
        decoration: BoxDecoration(
          color: me ? p.withValues(alpha: 0.12) : context.rc.bg,
          borderRadius: BorderRadius.circular(Spacing.rMd),
        ),
        child: Text(m.text.replaceAll('**', ''), style: const TextStyle(height: 1.6)),
      ),
    );
  }
}
