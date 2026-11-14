# Episode 002 — Insertion Sort

**Theme:** Algorithms. **Audience:** beginner programmers who know variables, conditions, and loops. **Learning outcome:** grow a sorted prefix by saving the next value, shifting larger values right, and inserting the saved value after the stopping position.

**Language:** conversational Egyptian Arabic with English technical terms. **Frame:** 1080 × 1920, 9:16, 30 fps. **Style:** Logic Workshop, Alexandria; yellow #F4D35E on deep purple #2D123F. **Brand:** @abodbuilds.

**Opening question:** How can we sort [7, 3, 5, 2, 6] by repeating one simple operation? **Estimated runtime:** 159 seconds. **Narration budget:** 289 words at about 130.5 words/minute during speech, plus 26.1 seconds of explicit silent holds. No recorded voice or synthetic voice is included; these are planned timings, not verified speech alignment.

The narration declares the visible state and explains the operations; it does not read out the input, intermediate arrays, or final sequence. Say individual values only when they explain a comparison or boundary. The first two insertions establish the idea. The code walkthrough continues from the same state with value = 2, then finishes with value = 6. Gold brackets mean sorted relative to the current prefix, not final fixed positions.

## Timecoded storyboard

| Time | Exact narration | Visual state and action | On-screen text and code | Transition and sound |
| --- | --- | --- | --- | --- |
| 00:00:00.000–00:00:08.000 | الكروت دي مش مترتّبة. نرتّبها من الصغير للكبير إزاي، بحركة بسيطة نكررها؟ | Five plum ceramic cards appear immediately in the order [7, 3, 5, 2, 6]. The first pair tilts toward each other as 7 > 3 reveals the out-of-order relationship. Keep the card identities and left-to-right order fixed. | نرتّبهم إزاي؟. من الصغير للكبير. No code. | Silent export. Reading holds: 00:00.0–00:00.3, 00:02.0–00:02.2, 00:07.0–00:08.0. |
| 00:00:08.000–00:00:17.000 | زي لما ترتّب كروت في إيدك. بتخلّي جزء مترتّب، وتاخد الكارت اللي بعده، وتحطّه في مكانه جوّه الجزء ده. | Flatten the same physical tray into an array. A gold bracket identifies only the first card, 7, as the sorted prefix. The remaining cards stay plum. Introduce the selected-card storage position above the row without moving a value yet. | نبدأ بجزء مترتّب. ونكبّره كارت كل مرة. No code. | Silent export. Reading holds: 00:08.0–00:08.3, 00:10.9–00:11.1, 00:13.5–00:13.7, 00:16.2–00:17.0. |
| 00:00:17.000–00:00:26.000 | أول كارت لوحده يعتبر جزء مترتّب. نحتفظ بقيمة الكارت اللي بعده برّه الصف، عشان نفضّي مكان نحرّك فيه الكروت. | Hold the single-card prefix [7]. Lift card 3 above its slot at index 1; its temporary storage is separate from the row. The marked insertion slot stays visible below. This is a physical card model, not an array deletion. | نحتفظ بالكارت الجديد. ونفتح مكان للإدخال. No code. | Silent export. Reading holds: 00:17.0–00:17.3, 00:20.0–00:20.2, 00:22.9–00:23.1, 00:25.2–00:26.0. |
| 00:00:26.000–00:00:35.000 | نقارن التلاتة بالسبعة. السبعة أكبر، فنزقّها مكان لليمين. كده أول مكان فضي، نحطّ فيه التلاتة. أول كارتين اتّرتّبوا. | Evaluate 7 > 3, shift 7 from index 0 to index 1, and insert 3 at index 0. Hold [3, 7, 5, 2, 6] with a two-card sorted-prefix bracket. | الأكبر يتحرّك يمين. وبعدين نحطّ الكارت في مكانه. No code. | Silent export. Reading holds: 00:26.0–00:26.2, 00:27.5–00:27.7, 00:29.9–00:30.1, 00:32.9–00:33.1, 00:34.7–00:35.0. |
| 00:00:35.000–00:00:46.000 | ناخد الخمسة. السبعة أكبر، فنحرّكها يمين. التلاتة أصغر، فنقف هنا، ونحطّ الخمسة بعدها. والجزء المترتّب كبر. | Save 5, compare 7 > 5, shift 7 right, compare 3 > 5 (false), then insert 5 at index 1. The same cards now read [3, 5, 7, 2, 6]. Hold the three-card sorted prefix. | الخمسة مكانها في النصّ. نقف عند أول رقم أصغر أو مساوي. No code. | Silent export. Reading holds: 00:35.0–00:35.3, 00:36.6–00:36.8, 00:39.8–00:40.0, 00:43.1–00:44.3, 00:45.7–00:46.0. |
| 00:00:46.000–00:00:56.000 | ودي فكرة Insertion Sort. كل مرة بندخل كارت جديد في مكانه، والجزء اللي عالشمال يفضل مترتّب ويكبر كارت. | Keep [3, 5, 7] bracketed and the unprocessed [2, 6] visible. Introduce the algorithm name. Show the invariant in one short sentence and a schematic progression 1 → 2 → 3 without rearranging the cards or implying that prefix positions are final. | Insertion Sort. جزء مترتّب… بيكبر كل مرة. No code. | Silent export. Reading holds: 00:46.0–00:46.3, 00:48.3–00:48.5, 00:51.5–00:51.7, 00:54.7–00:56.0. |
| 00:00:56.000–00:01:04.000 | الكارت الجاي أصغر. لازم يرجع للأول، فنحرّك اللي قبله يمين. خلّينا نشوف نفس الحركات بالكود. | Outline card 2 and briefly illuminate the larger prefix [3, 5, 7], without moving it early. Bring the code panel into the lower part of the composition at the next scene boundary. | الكارت الجاي مكانه في الأول. نفس الحركات، بالكود. No code. | Silent export. Reading holds: 00:56.0–00:56.3, 00:58.0–00:58.2, 01:01.1–01:01.3, 01:03.1–01:04.0. |
| 00:01:04.000–00:01:15.000 | هنسمّي الأرقام numbers. وعدّ الأماكن، أو index، بيبدأ من صفر. current مكان الكارت الجديد، وvalue قيمته اللي بنحتفظ بيها. | Keep [3, 5, 7, 2, 6]. Reveal zero-based indices 0–4, the label numbers, and current = 3 below the selected card. Show the outer loop and value assignment as a code explanation; do not execute assignments before their scheduled events. | نربط الكروت بالكود. نكمّل من نفس الحالة. Progressive pseudocode, at most five lines. Active operation follows the algorithm trace. | Silent export. Reading holds: 01:04.0–01:04.3, 01:06.0–01:06.2, 01:09.2–01:09.4, 01:13.6–01:15.0. |
| 00:01:15.000–00:01:25.000 | نحفظ قيمة الكارت في value، عشان متضيعش مع التحريك. compareIndex هو مكان المقارنة، ونبدأ بالمكان اللي قبل current مباشرة. | Execute value = numbers[current], then compareIndex = current - 1. Move the separate value copy of 2 above the row. In code mode the original value remains faintly readable in the marked slot; nothing is deleted from the real array. | نحفظ value ونبدأ المقارنة. نبدأ بالمكان اللي قبل current. Progressive pseudocode, at most five lines. Active operation follows the algorithm trace. | Silent export. Reading holds: 01:15.0–01:15.3, 01:19.0–01:19.2, 01:21.2–01:21.4, 01:24.1–01:25.0. |
| 00:01:25.000–00:01:37.000 | طول ما لسه جوّه الصف، والرقم عند compareIndex أكبر من value، ننقل الرقم مكان لليمين. السبعة أكبر من الاتنين، فتتحرّك. | Highlight the bounds check before the value comparison. Evaluate 7 > 2 as true, then highlight the assignment while 7 moves from index 2 to 3. Preserve the previous value in the source slot as a faint stale value, matching the real copied array. | نختبر الشرط، ثم نحرّك. هل الرقم أكبر من value؟. Progressive pseudocode, at most five lines. Active operation follows the algorithm trace. | Silent export. Reading holds: 01:25.0–01:25.3, 01:29.8–01:30.0, 01:32.3–01:32.5, 01:35.9–01:37.0. |
| 00:01:37.000–00:01:46.000 | بعدها نقلّل compareIndex بواحد، ونقارن تاني. الخمسة كمان أكبر من الاتنين، فتتحرّك لليمين، والمكان الفاضي يتحرّك شمال. | Execute compareIndex = compareIndex - 1 to reach index 1, evaluate 5 > 2, and copy 5 to index 2. Move the marked insertion slot left. Keep value = 2 unchanged above the row. | نرجع خطوة ونقارن تاني. compareIndex يرجع خطوة. Progressive pseudocode, at most five lines. Active operation follows the algorithm trace. | Silent export. Reading holds: 01:37.0–01:37.3, 01:40.0–01:40.2, 01:43.6–01:43.8, 01:45.3–01:46.0. |
| 00:01:46.000–00:01:54.000 | ونفس الكلام مع التلاتة. نحرّكها يمين، ونرجع خطوة كمان. كده compareIndex بقى سالب واحد. عدّينا أول الصف. | Move compareIndex to 0, evaluate 3 > 2, shift 3 to index 1, then decrement compareIndex to -1. Draw the -1 marker outside the array without reading numbers[-1]. | آخر كارت أكبر من الاتنين. لسه جوّه الصف؟ الرقم أكبر؟. Progressive pseudocode, at most five lines. Active operation follows the algorithm trace. | Silent export. Reading holds: 01:46.0–01:46.2, 01:47.9–01:48.1, 01:50.3–01:50.5, 01:53.8–01:54.0. |
| 00:01:54.000–00:02:05.000 | الشرط يقف هنا، قبل ما نحاول نقرأ مكان برّه الصف. نحطّ value في المكان اللي بعد compareIndex؛ هنا المكان صفر. | Evaluate compareIndex >= 0 as false. Dim the second half of the condition to show that no array access occurs. Execute numbers[compareIndex + 1] = value at index 0. The completed prefix is [2, 3, 5, 7]. | وصلنا لأول الصف. compareIndex + 1 = 0. Progressive pseudocode, at most five lines. Active operation follows the algorithm trace. | Silent export. Reading holds: 01:54.0–01:54.3, 01:58.5–01:58.7, 02:02.5–02:02.7, 02:04.1–02:05.0. |
| 00:02:05.000–00:02:16.000 | فاضل آخر كارت. السبعة أكبر منه فتتحرّك، لكن الخمسة أصغر. نقف، ونحطّ الستة بعد الخمسة. كده خلّصنا كل الكروت. | Select current = 4, save value = 6, compare 7 > 6, shift 7, decrement compareIndex, compare 5 > 6 (false), and insert 6 at index 3. Each highlighted code line follows the corresponding trace event. Hold [2, 3, 5, 6, 7]. | فاضل الستة. نقف عند الخمسة. Progressive pseudocode, at most five lines. Active operation follows the algorithm trace. | Silent export. Reading holds: 02:05.0–02:05.2, 02:06.5–02:06.7, 02:09.1–02:09.3, 02:11.3–02:11.5, 02:13.6–02:13.8, 02:15.2–02:16.0. |
| 00:02:16.000–00:02:24.000 | كده كل الكروت اتّرتّبت. الفكرة كلها إننا بنحافظ على جزء مترتّب، ونوسّعه كارت كل مرة. | Execute return numbers. Resolve all five cards to warm gold while preserving their identities. Show the final array and the invariant that the sorted prefix has grown to include every card. | كل الكروت بالترتيب. 2 < 3 < 5 < 6 < 7. Progressive pseudocode, at most five lines. Active operation follows the algorithm trace. | Silent export. Reading holds: 02:16.0–02:16.3, 02:18.0–02:18.2, 02:21.3–02:21.5, 02:23.4–02:24.0. |
| 00:02:24.000–00:02:39.000 | الطريقة دي مناسبة لما الأرقام قليلة، أو قريبة من الترتيب. لكن لو مترتّبة بالعكس، هنحرّك كروت كتير. عشان كده، مش كل خوارزميات Sorting بتاخد نفس الشغل. | Keep the completed main example fixed. Replace the code panel with two concise use-case notes. A separately labeled miniature row [7, 6, 5, 3, 2] illustrates reverse order; it is not a reset of the worked example. End holding the completed main row and the algorithm name. | إمتى تكون مناسبة؟. قليل، أو قريب من الترتيب. Progressive pseudocode, at most five lines. Active operation follows the algorithm trace. | Silent export. Reading holds: 02:24.0–02:24.3, 02:28.9–02:29.1, 02:32.8–02:33.0, 02:37.4–02:39.0. |

## Complete pseudocode

```text
insertion_sort(numbers):
    for current from 1 to length(numbers) - 1:
        value = numbers[current]
        compareIndex = current - 1
        while compareIndex >= 0 and numbers[compareIndex] > value:
            numbers[compareIndex + 1] = numbers[compareIndex]
            compareIndex = compareIndex - 1
        numbers[compareIndex + 1] = value
    return numbers
```

The loop endpoint is inclusive. For an empty or one-element array the loop does not run. Evaluate the bounds check first with short-circuit AND, so a negative compareIndex never accesses the array. Use a strict greater-than comparison: equal values do not move past each other. The algorithm sorts in place and returns the same array.

## Checked trace

| Inserted value | Larger values shifted, in order | Stop | Array after insertion |
| --- | --- | --- | --- |
| 3 | 7 | compareIndex = -1; no array read | [3, 7, 5, 2, 6] |
| 5 | 7 | 3 <= 5 | [3, 5, 7, 2, 6] |
| 2 | 7, 5, 3 | compareIndex = -1; no array read | [2, 3, 5, 7, 6] |
| 6 | 7 | 5 <= 6 | [2, 3, 5, 6, 7] |

This example performs 8 value comparisons and 6 shifts. These counts exclude loop-bound checks and insertion writes; they are not a wall-clock benchmark and are not narrated as a speed claim.

## Visual model and code accuracy

The lifted card illustrates the saved value. The marked slot is a conceptual insertion gap, not a deleted array element. In the code section, its old value remains faintly visible because assignment copies values; value and stale slot values can coexist. The executable trace stores both the real numeric memory state and the physical card identities. Comparisons, copies, pointer decrements, bounds checks, and insertions have distinct timings.

Best-case work is linear for an already sorted array. Average and worst-case work are quadratic; additional storage is constant. The spoken episode explains the practical limitation without introducing Big O before viewers know it. The reverse-order miniature in the final scene is separately labeled and uses the same set of values.

## Production and recording handoff

Use the installed @napi-rs/canvas renderer for procedural matte ceramic cards, the physical-to-diagram transition, shaped Alexandria Arabic, and progressive code panels. FFmpeg encodes the silent H.264 MP4 at 1080 × 1920, 30 fps. No downloaded assets, AI images, music, or synthetic voice are needed.

- [Plain narration](narration-ar-EG.txt)
- [Recording guide](voiceover-guide.md)
- [Clean silent animation](output/insertion-sort-silent-v2.mp4)
- [Video with recording prompts](output/insertion-sort-recording-guide-v2.mp4)
- [Estimated guide subtitles](output/insertion-sort-recording-guide.srt)
- Editable narration and action times: source/episode.mjs
- Executable algorithm: source/algorithm.mjs

Rebuild: `node production/prepare-insertion-sort.mjs`, then `node production/render-insertion-sort.mjs`. For stills, use `node production/render-insertion-sort.mjs stills`. After the user records, derive acoustic anchors and retime the graphics to the unmodified source audio.
