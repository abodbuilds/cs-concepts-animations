// Authored narration and approximate recording timings. Replace these timings
// with acoustic anchors once the user supplies their voice; never speed it up.
export const episode = {
  id: '002-insertion-sort', title: 'Insertion Sort', revision: 2,
  number: 2, theme: 'Algorithms', conceptLabel: 'Insert Sort',
  width: 1080, height: 1920, fps: 30, duration: 159,
  brand: '@abodbuilds', language: 'ar-EG', values: [7, 3, 5, 2, 6],
  timingStatus: 'estimated-before-user-recording',
};

// Each cue has a scene-local start, end, and exact text to record.
export const scenes = [
  {id:'01', start:0, end:8, section:'problem', title:'نرتّبهم إزاي؟', subtitle:'من الصغير للكبير',
    visual:'Five plum ceramic cards appear immediately in the order [7, 3, 5, 2, 6]. The first pair tilts toward each other as 7 > 3 reveals the out-of-order relationship. Keep the card identities and left-to-right order fixed.',
    cues:[[0.3,2.0,'الكروت دي مش مترتّبة.'],[2.2,7.0,'نرتّبها من الصغير للكبير إزاي، بحركة بسيطة نكررها؟']]},
  {id:'02', start:8, end:17, section:'problem', title:'نبدأ بجزء مترتّب', subtitle:'ونكبّره كارت كل مرة',
    visual:'Flatten the same physical tray into an array. A gold bracket identifies only the first card, 7, as the sorted prefix. The remaining cards stay plum. Introduce the selected-card storage position above the row without moving a value yet.',
    cues:[[0.3,2.9,'زي لما ترتّب كروت في إيدك.'],[3.1,5.5,'بتخلّي جزء مترتّب، وتاخد الكارت اللي بعده،'],[5.7,8.2,'وتحطّه في مكانه جوّه الجزء ده.']]},
  {id:'03', start:17, end:26, section:'theory', title:'نحتفظ بالكارت الجديد', subtitle:'ونفتح مكان للإدخال',
    visual:'Hold the single-card prefix [7]. Lift card 3 above its slot at index 1; its temporary storage is separate from the row. The marked insertion slot stays visible below. This is a physical card model, not an array deletion.',
    cues:[[0.3,3.0,'أول كارت لوحده يعتبر جزء مترتّب.'],[3.2,5.9,'نحتفظ بقيمة الكارت اللي بعده برّه الصف،'],[6.1,8.2,'عشان نفضّي مكان نحرّك فيه الكروت.']]},
  {id:'04', start:26, end:35, section:'theory', title:'الأكبر يتحرّك يمين', subtitle:'وبعدين نحطّ الكارت في مكانه',
    visual:'Evaluate 7 > 3, shift 7 from index 0 to index 1, and insert 3 at index 0. Hold [3, 7, 5, 2, 6] with a two-card sorted-prefix bracket.',
    cues:[[0.2,1.5,'نقارن التلاتة بالسبعة.'],[1.7,3.9,'السبعة أكبر، فنزقّها مكان لليمين.'],[4.1,6.9,'كده أول مكان فضي، نحطّ فيه التلاتة.'],[7.1,8.7,'أول كارتين اتّرتّبوا.']]},
  {id:'05', start:35, end:46, section:'theory', title:'الخمسة مكانها في النصّ', subtitle:'نقف عند أول رقم أصغر أو مساوي',
    visual:'Save 5, compare 7 > 5, shift 7 right, compare 3 > 5 (false), then insert 5 at index 1. The same cards now read [3, 5, 7, 2, 6]. Hold the three-card sorted prefix.',
    cues:[[0.3,1.6,'ناخد الخمسة.'],[1.8,4.8,'السبعة أكبر، فنحرّكها يمين.'],[5.0,8.1,'التلاتة أصغر، فنقف هنا، ونحطّ الخمسة بعدها.'],[9.3,10.7,'والجزء المترتّب كبر.']]},
  {id:'06', start:46, end:56, section:'theory', title:'Insertion Sort', subtitle:'جزء مترتّب… بيكبر كل مرة',
    visual:'Keep [3, 5, 7] bracketed and the unprocessed [2, 6] visible. Introduce the algorithm name. Show the invariant in one short sentence and a schematic progression 1 → 2 → 3 without rearranging the cards or implying that prefix positions are final.',
    cues:[[0.3,2.3,'ودي فكرة Insertion Sort.'],[2.5,5.5,'كل مرة بندخل كارت جديد في مكانه،'],[5.7,8.7,'والجزء اللي عالشمال يفضل مترتّب ويكبر كارت.']]},
  {id:'07', start:56, end:64, section:'theory', title:'الكارت الجاي مكانه في الأول', subtitle:'نفس الحركات، بالكود',
    visual:'Outline card 2 and briefly illuminate the larger prefix [3, 5, 7], without moving it early. Bring the code panel into the lower part of the composition at the next scene boundary.',
    cues:[[0.3,2.0,'الكارت الجاي أصغر.'],[2.2,5.1,'لازم يرجع للأول، فنحرّك اللي قبله يمين.'],[5.3,7.1,'خلّينا نشوف نفس الحركات بالكود.']]},
  {id:'08', start:64, end:75, section:'application', title:'نربط الكروت بالكود', subtitle:'نكمّل من نفس الحالة',
    visual:'Keep [3, 5, 7, 2, 6]. Reveal zero-based indices 0–4, the label numbers, and current = 3 below the selected card. Show the outer loop and value assignment as a code explanation; do not execute assignments before their scheduled events.',
    cues:[[0.3,2.0,'هنسمّي الأرقام numbers.'],[2.2,5.2,'وعدّ الأماكن، أو index، بيبدأ من صفر.'],[5.4,9.6,'current مكان الكارت الجديد، وvalue قيمته اللي بنحتفظ بيها.']]},
  {id:'09', start:75, end:85, section:'application', title:'نحفظ value ونبدأ المقارنة', subtitle:'نبدأ بالمكان اللي قبل current',
    visual:'Execute value = numbers[current], then compareIndex = current - 1. Move the separate value copy of 2 above the row. In code mode the original value remains faintly readable in the marked slot; nothing is deleted from the real array.',
    cues:[[0.3,4.0,'نحفظ قيمة الكارت في value، عشان متضيعش مع التحريك.'],[4.2,6.2,'compareIndex هو مكان المقارنة،'],[6.4,9.1,'ونبدأ بالمكان اللي قبل current مباشرة.']]},
  {id:'10', start:85, end:97, section:'application', title:'نختبر الشرط، ثم نحرّك', subtitle:'هل الرقم أكبر من value؟',
    visual:'Highlight the bounds check before the value comparison. Evaluate 7 > 2 as true, then highlight the assignment while 7 moves from index 2 to 3. Preserve the previous value in the source slot as a faint stale value, matching the real copied array.',
    cues:[[0.3,4.8,'طول ما لسه جوّه الصف، والرقم عند compareIndex أكبر من value،'],[5.0,7.3,'ننقل الرقم مكان لليمين.'],[7.5,10.9,'السبعة أكبر من الاتنين، فتتحرّك.']]},
  {id:'11', start:97, end:106, section:'application', title:'نرجع خطوة ونقارن تاني', subtitle:'compareIndex يرجع خطوة',
    visual:'Execute compareIndex = compareIndex - 1 to reach index 1, evaluate 5 > 2, and copy 5 to index 2. Move the marked insertion slot left. Keep value = 2 unchanged above the row.',
    cues:[[0.3,3.0,'بعدها نقلّل compareIndex بواحد، ونقارن تاني.'],[3.2,6.6,'الخمسة كمان أكبر من الاتنين، فتتحرّك لليمين،'],[6.8,8.3,'والمكان الفاضي يتحرّك شمال.']]},
  {id:'12', start:106, end:114, section:'application', title:'آخر كارت أكبر من الاتنين', subtitle:'لسه جوّه الصف؟ الرقم أكبر؟',
    visual:'Move compareIndex to 0, evaluate 3 > 2, shift 3 to index 1, then decrement compareIndex to -1. Draw the -1 marker outside the array without reading numbers[-1].',
    cues:[[0.2,1.9,'ونفس الكلام مع التلاتة.'],[2.1,4.3,'نحرّكها يمين، ونرجع خطوة كمان.'],[4.5,7.8,'كده compareIndex بقى سالب واحد. عدّينا أول الصف.']]},
  {id:'13', start:114, end:125, section:'application', title:'وصلنا لأول الصف', subtitle:'compareIndex + 1 = 0',
    visual:'Evaluate compareIndex >= 0 as false. Dim the second half of the condition to show that no array access occurs. Execute numbers[compareIndex + 1] = value at index 0. The completed prefix is [2, 3, 5, 7].',
    cues:[[0.3,4.5,'الشرط يقف هنا، قبل ما نحاول نقرأ مكان برّه الصف.'],[4.7,8.5,'نحطّ value في المكان اللي بعد compareIndex؛'],[8.7,10.1,'هنا المكان صفر.']]},
  {id:'14', start:125, end:136, section:'application', title:'فاضل الستة', subtitle:'نقف عند الخمسة',
    visual:'Select current = 4, save value = 6, compare 7 > 6, shift 7, decrement compareIndex, compare 5 > 6 (false), and insert 6 at index 3. Each highlighted code line follows the corresponding trace event. Hold [2, 3, 5, 6, 7].',
    cues:[[0.2,1.5,'فاضل آخر كارت.'],[1.7,4.1,'السبعة أكبر منه فتتحرّك،'],[4.3,6.3,'لكن الخمسة أصغر.'],[6.5,8.6,'نقف، ونحطّ الستة بعد الخمسة.'],[8.8,10.2,'كده خلّصنا كل الكروت.']]},
  {id:'15', start:136, end:144, section:'application', title:'كل الكروت بالترتيب', subtitle:'2 < 3 < 5 < 6 < 7',
    visual:'Execute return numbers. Resolve all five cards to warm gold while preserving their identities. Show the final array and the invariant that the sorted prefix has grown to include every card.',
    cues:[[0.3,2.0,'كده كل الكروت اتّرتّبت.'],[2.2,5.3,'الفكرة كلها إننا بنحافظ على جزء مترتّب،'],[5.5,7.4,'ونوسّعه كارت كل مرة.']]},
  {id:'16', start:144, end:159, section:'application', title:'إمتى تكون مناسبة؟', subtitle:'قليل، أو قريب من الترتيب',
    visual:'Keep the completed main example fixed. Replace the code panel with two concise use-case notes. A separately labeled miniature row [7, 6, 5, 3, 2] illustrates reverse order; it is not a reset of the worked example. End holding the completed main row and the algorithm name.',
    cues:[[0.3,4.9,'الطريقة دي مناسبة لما الأرقام قليلة، أو قريبة من الترتيب.'],[5.1,8.8,'لكن لو مترتّبة بالعكس، هنحرّك كروت كتير.'],[9.0,13.4,'عشان كده، مش كل خوارزميات Sorting بتاخد نفس الشغل.']]},
];

// Each event is a genuine operation from the algorithm, scheduled in seconds.
// Selection, copying value, and initializing compareIndex are separate operations.
export const schedule = [
  [1,'select',20.1,.45], [1,'save',22,.75], [1,'init',23.1,.25],
  [1,'compare',26.4,.55], [1,'shift',29,.8], [1,'retreat',30.2,.3],
  [1,'bound',31,.3], [1,'insert',32.4,.8],
  [2,'select',35.2,.3], [2,'save',36,.7], [2,'init',36.8,.25],
  [2,'compare',37.5,.5], [2,'shift',39,.8], [2,'retreat',40.2,.3],
  [2,'compare',41,.5], [2,'insert',43.4,.85],
  [3,'select',64.2,.35], [3,'save',76.2,.8], [3,'init',81.9,.35],
  [3,'compare',86.5,.6], [3,'shift',94.5,.85], [3,'retreat',97.8,.35],
  [3,'compare',100.3,.55], [3,'shift',102.8,.8], [3,'retreat',106.1,.3],
  [3,'compare',107,.5], [3,'shift',108.7,.8], [3,'retreat',111.1,.35],
  [3,'bound',114.5,.5], [3,'insert',121.8,.9],
  [4,'select',125.1,.25], [4,'save',125.7,.65], [4,'init',126.4,.25],
  [4,'compare',127,.45], [4,'shift',128.1,.7], [4,'retreat',129.2,.3],
  [4,'compare',130,.5], [4,'insert',132.4,.85],
  [5,'return',136.4,.5],
];

export const pseudocode = `insertion_sort(numbers):
    for current from 1 to length(numbers) - 1:
        value = numbers[current]
        compareIndex = current - 1
        while compareIndex >= 0 and numbers[compareIndex] > value:
            numbers[compareIndex + 1] = numbers[compareIndex]
            compareIndex = compareIndex - 1
        numbers[compareIndex + 1] = value
    return numbers`;
