# Episode 001 — Binary Search, revision 8

**Audience:** beginner programmers. **Frame:** 1080 × 1920, 9:16, 30 fps. **Language:** Egyptian Arabic with English technical terms. **Style:** Logic Workshop, Alexandria, yellow #F4D35E on purple #2D123F. **Brand:** @abodbuilds.

**Learning outcome:** Use sorted order to discard the impossible half of a search interval, then follow its bounds in code.

**Narration:** The complete user-supplied audio.wav is used continuously, at its original speed. No previous voice clips, new TTS, sound effects, or inserted internal pauses are used. Spoken source text is preserved verbatim in [narration-with-tashkeel.txt](narration-with-tashkeel.txt). Captions omit diacritics and space Arabic articles before English terms for readability. Delivery tags remain in the original script and storyboard metadata; they are not shown as captions.

**Runtime:** 124.933 seconds; recording 124.923 seconds. The source timeline ends at 124.923 seconds. The video holds its final frame for 0.010499 seconds beyond the audio endpoint to reach a complete video frame; the audio itself is neither padded nor trimmed.

**Timing:** The 18 scene boundaries come directly from the supplied lines.json/graphics.json and are not moved. Word timings are extracted acoustically from the linked takes on this machine. The fast takes 6, 8 and 9 are slowed only during analysis; their acoustic timings are mapped back to the original timeline. No words are timed by dividing a line duration.

| Time | Exact spoken script | Visual state and action | On-screen headline |
| --- | --- | --- | --- |
| 00:00:00.000–00:00:04.875 | خمستاشر رقم…هل تقدر تلاقي الواحد وسبعين بأربع خطوات بَسّ؟ | Show the 15 numbered ceramic modules immediately in three columns, target 71 above, and four empty step markers below. Keep the numerical challenge visible while the modules settle. | 71 في 4 خطوات؟ |
| 00:00:04.875–00:00:11.712 | ممكن نبدأ من الأول، ونمشي خطوة خطوة لحدّ ما نلاقيه. بس… كده احتجنا حداشر مقارنة. | Scan the ceramic modules from index 0 through index 10 as the narrator says خطوة خطوة. Count all eleven inspected elements, mark value 71 as found, then hold the result during the cost explanation. | Linear Search |
| 00:00:11.712–00:00:18.539 | طب نختصر ده إزاي؟ خصوصًا لو عندنا أرقام أكتر بكتير. هنا الترتيب هيفرق جداً معانا. | Keep the found module and original tray visible while faint additional trays suggest a larger input. Show the motivating question without claiming a measured speedup. | طب نختصر ده إزاي؟ |
| 00:00:18.539–00:00:25.301 | لو الأرقام بالترتيب من الصغير للكبير. يبقى نقدر نبدأ من النصّ، ونستبعد نٌص الاعداد بِمُقارنَة واحدة. | Unfold the ceramic modules during the spoken sorted-order phrase, finishing as للكبير ends. Preserve ascending order, five columns, three rows, and indices 0–14. | الترتيب هو المفتاح |
| 00:00:25.301–00:00:32.651 | ودي فكرة الBinary Search. نقارن الرقم اللي في النصّ بالمطلوب. والرقم اللي بندوّر عليه بنسمّيه target. | Hold the flat array, select index 7 with value 50, and keep target 71 prominent while introducing Binary Search and target. | Binary Search |
| 00:00:32.651–00:00:36.347 | هنا عندنا الخمسين، وإحنا عايزين الواحد وسبعين. الخمسين أصغر، يبقى كل اللي قبله أصغر كمان. | Hold value 50 selected. Show 50 < 71 and keep all fifteen candidates visible while the narrator explains why lower values cannot match. | 50 < 71 |
| 00:00:36.347–00:00:43.173 | عشان كده حنستبعد الخمسين وكل اللي قبلها. الواحد وسبعين، لو موجود، هيبقى في الجزء اللي بعده. | At the spoken exclusion, fade indices 0–7, including 50. Leave indices 8–14 visible and display the seven remaining candidates. | نكمّل في الجزء اللي بعده |
| 00:00:43.173–00:00:46.144 | طيب، نُصّ الجزء اللي فاضل هوّ التمانية وسبعين. ده أكبر من المطلوب، فنستبعده وكل اللي بعده. | Select index 11, value 78. Hold 78 > 71, then fade indices 11–14 on the spoken exclusion, retaining indices 8–10. | 78 > 71 |
| 00:00:46.144–00:00:50.469 | بعد كده، الأربعة وستّين. لسه أصغر، فنستبعدها واللي قبلها. فاضل الواحد وسبعين. لقيناه في أربع مقارنات! | Compare index 9, value 64. Fade indices 8–9 when excluded, select index 10 as the sole remaining candidate, then mark value 71 found at the spoken result. Resolve the counter to four comparisons. | كل مرة، الاحتمالات بتقل |
| 00:00:50.469–00:00:57.275 | خد بالك، إحنا بنكمل في الجزء اللي لسه ممكن يكون فيه الرقم. بس بشرط إن الأرقام تكون بالترتيب. | Replay the four retained ranges within the spoken explanation of the possible search region. Reveal the sorted-order prerequisite when بشرط is spoken, and hold the result during the remaining narration. | لو موجود، لازم يكون هنا |
| 00:00:57.275–00:01:04.784 | طيب، نكتب ده إزاي في الكود؟ هنسمّي أول مكان left، وآخر مكان right. و عد الأماكن، أو index، بيبدأ من صفر. | Restore every cell. Show left = 0 and right = 14, highlight each initialization as named, and preserve zero-based index labels beneath the array. | خلّينا نكتب Code |
| 00:01:04.784–00:01:13.573 | دلوقتي، طول ما left أصغر من right أو بيساويه، نكمّل. نحسب middle: نجمع الحدّين، ونقسم على اتنين، ونقرّب لتحت. | Follow the spoken loop condition, middle, addition, division and rounding. Keep the midpoint unset while calculating; reveal index 7 and the result only as rounding finishes. | نحسب middle |
| 00:01:13.573–00:01:21.392 | بعد كده، نقارن الرقم عند middle بالمطلوب. لو بيساويه، نرجّع مكانه. غير كده، نحدد هنكمّل فين. | Highlight the equality test for value 50 against target 71, then move to the less-than branch on غير كده. Do not execute a return when the condition is false. | هل لقينا target؟ |
| 00:01:21.392–00:01:28.432 | الخمسين أصغر. يبقى نحرّك left للمكان اللي بعد middle بخطوة. كده عدّينا الجزء اللي مش محتاجينه. | Highlight the less-than branch and the update left = middle + 1. Move left from 0 to 8 and fade precisely indices 0–7 as the narrated update finishes. | left = middle + 1 |
| 00:01:28.432–00:01:36.741 | أما التمانية وسبعين، فده أكبر. عشان كده نرجّع right للمكان اللي قبل middle بخطوة. ونشوف الرقم اللي في النصّ تاني. | Compare value 78, highlight the else branch and right = middle - 1. Move right to index 10 and fade indices 11–14. | right = middle - 1 |
| 00:01:36.741–00:01:46.811 | وبنفس الطريقة، الأربعة وستّين أصغر، فنحرّك left تاني. لقينا الواحد وسبعين في المكان رقم عشرة. بنرجّع الindex، مش القيمة. | Highlight the update when فنحرك is spoken, finish moving left at تاني, then select index 10 at لقينا. Mark 71 found after its number is spoken and highlight return middle at بنرجع. | return 10 |
| 00:01:46.811–00:01:55.440 | طب ولو عايزين التلاتة وسبعين؟ مش موجود. في الآخر left هيعدّي right، وساعتها نرجّع Not Found. | Introduce target 73 before replaying its four probes on the corresponding spoken phrases. Cross left past right when right is spoken, then highlight NOT_FOUND when the return is narrated. | طب لو مش موجود؟ |
| 00:01:55.440–00:02:04.933 | وبكده لقينا الواحد وسبعين بأربع مقارنات بدل حداشر. استغلّينا الترتيب، بدل ما نفتّش في كل الأرقام. وديه قوة الBinary Search | Grow the Binary Search and Linear Search bars over their spoken count phrases. Reveal sorted-order arrows over استغلينا الترتيب. Step through retained counts 15 → 7 → 3 → 1 on وديه, قوة, Binary and Search. | لقينا 71 |

## Complete pseudocode

```text
binary_search(numbers, target):
    left = 0
    right = length(numbers) - 1
    while left <= right:
        middle = floor((left + right) / 2)
        if numbers[middle] == target:
            return middle
        elif numbers[middle] < target:
            left = middle + 1
        else:
            right = middle - 1
    return NOT_FOUND
```

## Checked trace

| Probe | left | right | middle | Value | Next action |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 | 14 | 7 | 50 | left = 8 |
| 2 | 8 | 14 | 11 | 78 | right = 10 |
| 3 | 8 | 10 | 9 | 64 | left = 10 |
| 4 | 10 | 10 | 10 | 71 | return 10 |

The absent-target replay uses 73 and ends at left = 11, right = 10 after the same four midpoint probes, then returns NOT_FOUND. The scan for 71 inspects 11 elements; Binary Search uses 4 midpoint probes. These are operation counts in this example, not a wall-clock benchmark. The Array is already sorted; sorting cost is not included.

## Production

Blender ceramic modules feed the deterministic canvas renderer. Visual operations and code highlights are rebuilt from spoken-word spans. The video is rendered silently, then the original uploaded audio is attached at time zero. The MOV master copies the original PCM stream without filtering, resampling, gain changes, trimming, padding, or speed changes. The viewing MP4 uses AAC encoding only at the original sample rate. A decoded-PCM hash check verifies the MOV master against the uploaded WAV. The original uploaded files and their hashes are retained under episodes/001-binary-search/source/user-voice-v7.
