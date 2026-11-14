# Technical Arabic style

How we write Arabic in the lab and the videos: the way an Egyptian developer explains code to a friend sitting next to them. If a sentence would sound odd said out loud in a Cairo office, rewrite it.

## References

We copy how these creators talk, not textbook Arabic:

- **Elzero Web School** (Osama Elzero): Egyptian colloquial, every programming term in English, short sentences, "هنعمل" and "دلوقتي" to move the lesson forward.
- **Arabic Competitive Programming** (Mostafa Saad Ibrahim): algorithms and data structures in Egyptian Arabic with English terms. The closest match to our topics.
- **Codezilla**: beginner-friendly Egyptian explanations of programming concepts.
- **Adel Nasim, *Data Structures Full Course in Arabic***: the same topic list we cover (sorting, queues, trees, graphs), with English terms kept.

What they all share is our standard: **Egyptian sentence, English term.** Mozilla's Arabic localization guide asks for the same register, "language that resembles conversation observed in everyday settings" rather than the formal register common in technical text ([Mozilla L10n, Arabic](https://mozilla-l10n.github.io/styleguides/ar)).

## The rules

1. **Programming terms stay in English, in Latin script.** Never translate them (الصف، الطابور، الحلقة، العقدة) and never transliterate them (أراي، لووب). Put `الـ` before the term with a space: `الـ array`، `الـ loop`، `الـ pivot`.
2. **Everything around the term is spoken Egyptian.** Use دلوقتي، كده، يعني، علشان/عشان، لسه، خلاص، بقى، اللي، مش، فيه/مفيش, and ب-/ه- verbs (بنقارن، هنعمل).
3. **Speak as "we" doing it together.** For what is happening now, use بنقارن، بنعمل. For what comes next, use هنقارن، هنعمل. In titles, avoid the bare subjunctive (نبدّل الكارتين) because it reads like a manual. Use بنعمل swap، or state the fact: الـ 7 أكبر، يبقى هنعمل swap.
4. **Operations named in the code become "نعمل + term".** Write نعمل swap، نعمل return، نعمل push للـ node، نعمل enqueue. Plain actions stay as Arabic verbs: بنقارن، بنحرّك، بنرجع خطوة، بندوّر.
5. **No translationese.** If you can see the English sentence behind the Arabic one, rewrite it. Say what is happening, not what the English concept is called.
6. **No MSA connectors**: حيث، إذ، يتم + مصدر، بواسطة، قام بـ، عملية، الخاص بـ، ذلك، هذا/هذه. Use اللي، ده/دي/دول، عشان، لما، يعني.
7. **Short sentences.** One idea per sentence. A step title is one short line.
8. **Variables and code appear exactly as in the pseudocode**: `minIndex`، `swapped = true`، `numbers[i]`. Don't inflect them and don't translate them.
9. **Digits are Western (0–9)**, as in the code. Use the Arabic comma `،` and the Arabic question mark `؟`.
10. **Gender of English terms is fixed** (see the glossary), so the same word never flips between ده and دي.

## Glossary

Keep these in English. The gender is the one the rest of the sentence agrees with.

| Term | Gender | Example |
| --- | --- | --- |
| array | f | الـ array دي فيها 5 أرقام |
| element | m | أول element في الـ array |
| index | m | الـ index ده |
| loop | f | الـ loop الخارجية |
| iteration | f | في كل iteration |
| function | f | الـ function بترجع الـ index |
| recursion / recursive call | m | الـ recursive call ده |
| call stack | m | الـ call stack فيه 3 calls |
| variable | m | الـ variable ده |
| condition | m | الـ condition ده طلع true |
| true / false / null / ∞ | — | swapped بقت true |
| swap | m | بنعمل swap |
| pivot | m | الـ pivot ده |
| partition | m | بعد الـ partition |
| merge | m | الـ merge |
| buffer | m | الـ buffer |
| pass | f | أول pass |
| sorted / stable / in-place | — | الـ array بقت sorted (or مترتّبة, see below) |
| graph | m | الـ graph ده |
| node | f | الـ node دي |
| edge | m | الـ edge ده |
| neighbor | m | الـ neighbors بتوع A |
| weight | m | الـ weight بتاع الـ edge |
| queue | f | الـ queue فاضية |
| stack | m | الـ stack فاضي |
| visited / discovered | — | الـ node دي discovered قبل كده |
| path / shortest path | m | أقصر path |
| distance | f | الـ distance بتاعة D |
| text / pattern | m | الـ pattern ده |
| character | m | أول character |
| match / mismatch | m | لقينا match |
| complexity, O(n), worst / best / average case | — | الـ worst case هنا O(n²) |
| invariant | m | الـ invariant |
| algorithm | m | الـ algorithm ده |
| range | m | الـ range [0, 4) |
| input | m | الـ input فاضي |
| call | m | الـ calls اللي مستنيّين |
| depth / level | m | الـ level الجاي |
| cycle | f | الـ cycle دي |
| self-loop | m | الـ self-loop ده (it is an edge) |
| tree (DFS tree, shortest-path tree) | f | الـ DFS tree بتدّينا path |
| frontier / candidate / component | m | الـ frontier فاضي |
| start / target | f when it is a node, m when it is a number | A هي الـ start؛ الـ target مش موجود |

**Arabic is fine and natural for**: رقم/أرقام (for values)، مكان، أصغر/أكبر، شمال/يمين، أول/آخر، نص (half)، خطوة، نتيجة، مقارنة، ترتيب/مترتّب، مكرّر، فاضي، موجود/مش موجود، لفة (an informal pass, when the code has no named term).

**Nodes by letter** are feminine (B جديدة، A بقت الـ parent), even when the sentence calls them a neighbor. **Values** are masculine, like رقم: الـ 7 أكبر، الـ 2 اللي اسمه A.

**Counts** avoid number–noun agreement when the number is a variable: write "عدد الأرقام 5" or "عدد الـ nodes اللي مستنية: 1", not "5 element" or "1 nodes".

**Western identifiers after و** get a space (و j، و [4, 8)) so they don't stick to و in RTL.

**The cards in the animation**: talk about values, not cards. Write الـ 7، الرقم 7، or element when no value is shown. Use كارت only when the sentence is about the picture itself, for example "الكارت اللي باهت ده نسخة قديمة".

## Before and after

| Alien | Natural |
| --- | --- |
| الصف فاضي | الـ array فاضية |
| نبدّل الكارتين اللي جنب بعض | بنعمل swap للـ 7 والـ 3 |
| كل كارت محتفظ بهويّته | (cut, it says nothing to a learner) |
| الشرط بيمنع القراءة برّه الصف | الـ condition ده بيمنعنا نطلع برّه الـ array |
| الحدود بتصغر، فالحلقة لازم تخلص | الجزء اللي بنشتغل عليه بيصغر كل مرة، فالـ loop لازم تخلص |
| الفكرة اللي بنحافظ عليها | الـ invariant |
| ندخّل C في المستوى 1 | بنعمل enqueue لـ C، والـ distance بتاعتها 1 |
| الطابور بيحفظ الـ nodes بترتيب اكتشافها | الـ queue بتطلّع الـ nodes بنفس الترتيب اللي اكتشفناها بيه |
| الـ code points دول مختلفين | الـ characters دول مش زي بعض، يبقى mismatch |
| اترتّب بثبات | الـ array بقت sorted، والأرقام المتساوية فضلت بنفس ترتيبها (stable) |
| عدد الوصلات من البداية | عدد الـ edges من البداية |

## Checklist before shipping Arabic copy

- [ ] Read it out loud. Does it sound like a person explaining?
- [ ] No translated or transliterated programming terms.
- [ ] No MSA connectors from rule 6.
- [ ] Each term has the same gender everywhere.
- [ ] Code identifiers are exactly as in the pseudocode.
- [ ] The Arabic says the same thing as the English. It can be shorter, but never different.
- [ ] A native Egyptian speaker has heard it before it ships (Claude can't judge how natural it sounds by ear).
