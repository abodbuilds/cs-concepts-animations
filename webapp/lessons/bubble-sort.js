(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const MAX_LENGTH = 256;
  const code = [
    'bubbleSort(numbers):',
    '  right = length(numbers) - 1',
    '  while right > 0:',
    '    swapped = false',
    '    i = 0',
    '    while i < right:',
    '      if numbers[i] > numbers[i + 1]:',
    '        swap(numbers[i], numbers[i + 1])',
    '        swapped = true',
    '      i = i + 1',
    '    right = right - 1',
    '    if not swapped:',
    '      break',
    '  return numbers',
  ];

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || !Array.isArray(input.numbers)) {
      fail('Expected an object with a numbers array.', 'محتاجين object فيه numbers كصف من الأرقام.');
    }
    if (input.numbers.length > 16) {
      fail('Use at most 16 integers.', 'اكتب 16 رقم صحيح بالكتير.');
    }
    // Iteration also rejects sparse slots, which Array.prototype.some skips.
    for (const value of input.numbers) {
      if (!Number.isSafeInteger(value) || value < -999 || value > 999) {
        fail('Every value must be an integer from -999 to 999.', 'كل قيمة لازم تكون رقم صحيح من -999 لحد 999.');
      }
    }
    return input.numbers;
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput) || typeof rawInput.numbers !== 'string') {
      fail('Enter numbers as text.', 'اكتب الأرقام في خانة numbers كنص.');
    }
    if (rawInput.numbers.length > MAX_LENGTH) {
      fail('Keep the input within 256 characters and 16 integers.', 'خلّي النص 256 حرف بالكتير، وفيه 16 رقم صحيح بالكتير.');
    }
    const text = rawInput.numbers.trim()
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
    if (text && !/^[+-]?\d+(?:(?:\s*[,،]\s*|\s+)[+-]?\d+)*$/.test(text)) {
      fail('Use integers separated by commas or spaces; leave blank for an empty array.',
        'اكتب أرقام صحيحة وبينها فواصل أو مسافات. لو عايز صف فاضي، سيب الخانة فاضية.');
    }
    const input = { numbers: text ? text.split(/[,،\s]+/).map(Number) : [] };
    validate(input);
    return input;
  }

  function build(input) {
    const numbers = validate(input);
    const state = {
      numbers: [...numbers], ids: numbers.map((_, index) => `item-${index}`),
      right: null, i: null, swapped: null, pair: [], condition: null,
      sortedFrom: numbers.length, comparisons: 0, swaps: 0, passes: 0,
      earlyExit: false, done: false, result: null,
    };
    const frames = [];

    function emit(kind, lines, title, explanation, equation = '') {
      const sortedCount = state.numbers.length - state.sortedFrom;
      // Clone the entire frame, including nested labels, so rewinding is isolated.
      frames.push(copy({
        kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'right', value: state.right === null ? '—' : state.right },
          { name: 'i', value: state.i === null ? '—' : state.i },
          { name: 'swapped', value: state.swapped === null ? '—' : state.swapped },
          { name: 'sortedFrom', value: state.sortedFrom },
        ],
        metrics: [
          { label: message('Comparisons', 'مقارنات'), value: state.comparisons },
          { label: message('Swaps', 'تبديلات'), value: state.swaps },
          { label: message('Passes', 'لفات'), value: state.passes },
          { label: message('Fixed cards', 'كروت في مكانها النهائي'), value: sortedCount },
        ],
        scene: {
          rows: [{
            id: 'numbers', label: message('Array', 'الصف'), layout: 'cards',
            cells: state.numbers.map((value, index) => {
              const markers = [];
              if (index === state.i) markers.push('i');
              if (state.pair.length && index === state.i + 1) markers.push('i + 1');
              if (index === state.right) markers.push('right');
              return {
                id: state.ids[index], value, index,
                tone: index >= state.sortedFrom ? 'sorted' : state.pair.includes(index) ? 'active' : 'default',
                marker: markers.join(' · '),
              };
            }),
          }],
          graph: null, collections: [],
          note: message(
            state.numbers.length === 0 ? 'Empty array: there are no cards to compare.'
              : state.right === null ? 'No cards are fixed yet. Set right before starting the first pass.'
              : sortedCount === 0 ? 'No cards are fixed yet. right marks the last index of this pass.'
                : `${sortedCount} of ${state.numbers.length} cards are fixed. The completed suffix starts at index ${state.sortedFrom}.`,
            state.numbers.length === 0 ? 'الصف فاضي: مفيش كروت نقارنها.'
              : state.right === null ? 'لسه مفيش كروت ثبتت. نحدّد right قبل أول لفة.'
              : sortedCount === 0 ? 'لسه مفيش كروت ثبتت. right بيحدّد آخر مكان في اللفة.'
                : `${sortedCount} من ${state.numbers.length} كروت ثبتوا. الجزء اللي خلص بيبدأ من المكان ${state.sortedFrom}.`),
        },
      }));
    }

    emit('ready', [], message('Let larger values move right', 'نخلّي القيم الأكبر تتحرّك يمين'),
      message(`There are ${numbers.length} cards. Compare neighbors, swap only when the left value is larger, and finish one rightmost position per pass.`,
        `عندنا ${numbers.length} كروت. نقارن كل كارت باللي جنبه، ونبدّل بس لو اللي عالشمال أكبر. كل لفة بتثبّت مكان من اليمين.`));
    state.right = numbers.length - 1;
    emit('boundary', [2], message('Set the right boundary', 'نحدّد آخر اللفة'),
      message(`right starts at ${state.right}. We need at least two cards to enter a pass.`,
        `right بيبدأ عند ${state.right}. محتاجين كارتين على الأقل عشان نبدأ لفة.`),
      `right = ${numbers.length} - 1 = ${state.right}`);

    while (true) {
      state.condition = state.right > 0;
      emit('outer-check', [3], message(state.condition ? 'Another pass can help' : 'No pair remains', state.condition ? 'لسه نقدر نعمل لفة' : 'مفيش زوج فاضل'),
        message(state.condition ? `The active prefix ends at index ${state.right}; the suffix beyond it is already fixed.`
          : 'The active prefix has fewer than two cards. No more comparisons are needed.',
        state.condition ? `الجزء اللي شغّالين عليه بينتهي عند ${state.right}. اللي بعده خلاص في مكانه النهائي.`
          : 'الجزء اللي فاضل فيه أقل من كارتين، فمش محتاجين مقارنات تانية.'),
        `${state.right} > 0 → ${state.condition}`);
      if (!state.condition) break;

      state.swapped = false; state.passes++; state.condition = null;
      emit('reset', [4], message(`Start pass ${state.passes}`, `نبدأ اللفة ${state.passes}`),
        message('Reset swapped for this pass. It will stay false only if every adjacent pair is already in order.',
          'نرجّع swapped لـ false في بداية كل لفة. هيفضل كده بس لو كل زوج جنب بعض مترتّب.'), 'swapped = false');
      state.i = 0;
      emit('scan-start', [5], message('Start from the left', 'نبدأ من الشمال'),
        message('Start at index 0. The next guard checks that the right-hand neighbor is within this pass.',
          'نبدأ من المكان 0. الشرط الجاي بيتأكد إن الكارت اللي على يمينه جوّه حدود اللفة.'), 'i = 0');

      while (true) {
        state.pair = []; state.condition = state.i < state.right;
        emit('pair-check', [6], message(state.condition ? 'Both neighbors are in bounds' : 'The pass is complete', state.condition ? 'الكارتين جوّه حدود اللفة' : 'اللفة خلصت'),
          message(state.condition ? `Indices ${state.i} and ${state.i + 1} are within the active prefix.`
            : `i has reached right at index ${state.right}. The largest value in this pass has reached that position.`,
          state.condition ? `المكانين ${state.i} و${state.i + 1} جوّه الجزء اللي بنرتّبه.`
            : `i وصل لـ right عند المكان ${state.right}. أكبر قيمة في اللفة وصلت للمكان ده.`),
          `${state.i} < ${state.right} → ${state.condition}`);
        if (!state.condition) break;

        const i = state.i, leftValue = state.numbers[i], rightValue = state.numbers[i + 1];
        state.pair = [i, i + 1]; state.condition = leftValue > rightValue; state.comparisons++;
        emit('compare', [7], message(state.condition ? 'These neighbors need a swap' : 'Keep their order', state.condition ? 'الكارتين محتاجين تبديل' : 'نسيب ترتيبهم زي ما هو'),
          message(state.condition ? `At indices ${i} and ${i + 1}, ${leftValue} is larger than ${rightValue}. Swap the neighbors so the larger value moves right.`
            : leftValue === rightValue ? `Both neighbors have value ${leftValue}. The strict > test is false, so their original relative order is preserved.`
              : `At indices ${i} and ${i + 1}, ${leftValue} is smaller than ${rightValue}. This pair is already in ascending order.`,
          state.condition ? `عند المكانين ${i} و${i + 1}، ${leftValue} أكبر من ${rightValue}. نبدّلهم عشان الأكبر يتحرّك يمين.`
            : leftValue === rightValue ? `الكارتين قيمتهم ${leftValue}. شرط > طلع false، فنسيبهم بنفس ترتيبهم الأصلي.`
              : `عند المكانين ${i} و${i + 1}، ${leftValue} أصغر من ${rightValue}. الزوج ده مترتّب بالفعل.`),
          `${leftValue} > ${rightValue} → ${state.condition}`);
        if (state.condition) {
          [state.numbers[i], state.numbers[i + 1]] = [state.numbers[i + 1], state.numbers[i]];
          [state.ids[i], state.ids[i + 1]] = [state.ids[i + 1], state.ids[i]];
          state.swaps++; state.condition = null;
          emit('swap', [8], message('Swap adjacent cards', 'نبدّل الكارتين اللي جنب بعض'),
            message(`${leftValue} moves one place right and ${rightValue} moves one place left. Each card keeps its own identity.`,
              `${leftValue} بيتحرّك مكان يمين، و${rightValue} مكان شمال. كل كارت محتفظ بهويّته.`),
            `swap(numbers[${i}], numbers[${i + 1}])`);
          state.swapped = true;
          emit('flag', [9], message('Remember this swap', 'نسجّل إن حصل تبديل'),
            message('Set swapped to true. This pass changed the order, so it cannot use the no-swap early exit.',
              'نخلّي swapped تساوي true. اللفة دي غيّرت الترتيب، فمينفعش نوقف بشرط إن مفيش تبديل حصل.'), 'swapped = true');
        }
        state.i++; state.pair = []; state.condition = null;
        emit('advance', [10], message('Move to the next pair', 'نروح للزوج اللي بعده'),
          message(`Advance i to ${state.i}. The value here is the largest seen in this pass so far. Check the boundary before reading its next neighbor.`,
            `نحرّك i لـ ${state.i}. القيمة هنا أكبر واحدة قابلتنا في اللفة لحد دلوقتي. نتأكد من الحدود قبل ما نقرأ اللي جنبها.`),
          `i = ${state.i - 1} + 1 = ${state.i}`);
      }

      const completed = state.right;
      state.right--; state.sortedFrom = state.right + 1; state.condition = null;
      emit('shrink', [11], message('Grow the completed suffix', 'نكبّر الجزء اللي خلص'),
        message(`Index ${completed} now holds the largest value from the active prefix. It is fixed, so the next pass ends at ${state.right}.`,
          `المكان ${completed} بقى فيه أكبر قيمة من الجزء اللي كنّا بنرتّبه. كده ثبت، واللفة الجاية بتنتهي عند ${state.right}.`),
        `right = ${completed} - 1 = ${state.right}`);
      state.condition = !state.swapped;
      emit('exit-check', [12], message(state.condition ? 'A whole pass without swaps' : 'This pass changed the order', state.condition ? 'لفة كاملة من غير تبديل' : 'اللفة دي غيّرت الترتيب'),
        message(state.condition ? 'Every adjacent pair in the active prefix was in order. Together with the completed suffix, this proves the entire array is sorted.'
          : 'At least one pair was swapped. Return to the outer guard; only the shorter prefix may need more work.',
        state.condition ? 'كل زوج جنب بعض في الجزء النشط كان مترتّب. ومع الجزء اللي خلص، كده نعرف إن الصف كله مترتّب.'
          : 'حصل تبديل واحد على الأقل. نرجع للشرط الخارجي؛ بس الجزء الأصغر اللي فاضل ممكن يحتاج شغل.'),
        `not ${state.swapped} → ${state.condition}`);
      if (state.condition) {
        state.earlyExit = true; state.sortedFrom = 0; state.condition = null;
        emit('early-exit', [13], message('Stop early', 'نوقف بدري'),
          message(`No swap was needed in pass ${state.passes}. The remaining cards are also fixed; another pass would add no information.`,
            `اللفة ${state.passes} ماحتاجتش أي تبديل. باقي الكروت كمان في مكانها النهائي، فلفة تانية مش هتضيف حاجة.`), 'break');
        break;
      }
    }

    state.done = true; state.result = [...state.numbers]; state.sortedFrom = 0;
    state.pair = []; state.condition = null;
    emit('done', [14], message('Sorted, with equal cards still in order', 'اترتّب، والمتساويين فضلوا بنفس ترتيبهم'),
      message(numbers.length < 2 ? 'An empty or single-card array is already sorted. Return it without comparisons or swaps.'
        : `Return the ascending result after ${state.comparisons} comparisons and ${state.swaps} swaps. Equal cards never crossed, so the sort is stable.`,
      numbers.length < 2 ? 'الصف الفاضي أو اللي فيه كارت واحد مترتّب أصلًا. نرجّعه من غير مقارنات أو تبديلات.'
        : `نرجّع النتيجة من الصغير للكبير بعد ${state.comparisons} مقارنات و${state.swaps} تبديلات. الكروت المتساوية معدّتش بعض، فالترتيب stable.`), 'return numbers');
    return frames;
  }

  const lesson = {
    id: 'bubble-sort', name: 'Bubble Sort', theme: 'algorithms', category: 'sort', number: '04',
    label: 'BUBBLE SORT', cost: 'O(n²)',
    description: message('Compare neighbors, move larger values right, and stop when a pass makes no swaps.',
      'نقارن الكروت اللي جنب بعض، ونحرّك الأكبر يمين، ونقف لما لفة تخلص من غير تبديل.'),
    note: message('Strict > keeps equal cards stable. Each pass shrinks right; an already-sorted input needs just one pass.',
      'شرط > بيحافظ على ترتيب الكروت المتساوية. كل لفة بتقلّل right؛ ولو الصف مترتّب أصلًا بنحتاج لفة واحدة.'),
    code,
    keySteps: ['ready', 'compare', 'swap', 'shrink', 'early-exit', 'done'],
    fields: [{
      name: 'numbers', label: message('Numbers', 'الأرقام'), type: 'text', maxLength: MAX_LENGTH,
      help: message('Up to 16 integers from -999 to 999, separated by commas or spaces. Arabic digits work too. Leave blank for an empty array.',
        '16 رقم صحيح بالكتير من -999 لحد 999، وبينهم فواصل أو مسافات. ينفع أرقام عربي كمان. سيبها فاضية لو عايز صف فاضي.'),
    }],
    defaults: { numbers: '7, 3, 5, 2, 6' },
    presets: [
      { id: 'default', label: message('Mixed neighbors', 'كروت محتاجة ترتيب'), input: { numbers: '7, 3, 5, 2, 6' } },
      { id: 'sorted', label: message('Already sorted · early exit', 'مترتّب أصلًا · نوقف بدري'), input: { numbers: '-3, 0, 2, 5, 9' } },
      { id: 'reverse', label: message('Reverse order · most swaps', 'بالعكس · أكبر عدد تبديلات'), input: { numbers: '6, 5, 4, 3, 2, 1' } },
      { id: 'duplicates', label: message('Duplicates · stable identities', 'قيم مكرّرة · نفس ترتيب الكروت'), input: { numbers: '3, 1, 3, 2, 1' } },
      { id: 'equal', label: message('All equal · no swaps', 'كلهم متساويين · من غير تبديل'), input: { numbers: '4, 4, 4, 4' } },
      { id: 'late-small', label: message('Smallest at the end', 'الأصغر في الآخر'), input: { numbers: '2, 3, 4, 5, 1' } },
      { id: 'negative', label: message('Negative values and limits', 'قيم سالبة وحدود الأرقام'), input: { numbers: '999, -2, 0, -999, -2' } },
      { id: 'singleton', label: message('One card', 'كارت واحد'), input: { numbers: '8' } },
      { id: 'empty', label: message('Empty array', 'صف فاضي'), input: { numbers: '' } },
    ],
    parse, build,
    summary(input) {
      const numbers = validate(input);
      return message(`${numbers.length} cards · ascending order · adjacent comparisons`,
        `${numbers.length} كروت · من الصغير للكبير · بنقارن اللي جنب بعض`);
    },
    theory: {
      idea: message('Compare each pair of neighbors and swap them when they are out of order. After every pass, the largest remaining card has bubbled to the end.',
        'قارن كل كارتين جنب بعض، ولو ترتيبهم غلط بدّلهم. بعد كل لفة، أكبر كارت فاضل بيوصل لآخر الصف.'),
      title: message('One pass fixes one more position', 'كل لفة بتثبّت مكان جديد'),
      intro: message('You only need array indices, loops, and a swap of two values. Bubble Sort repeatedly scans adjacent pairs from left to right. This version uses a shrinking right boundary and a swapped flag.',
        'محتاج تعرف أماكن الصف، والـ loops، وإزاي نبدّل قيمتين. Bubble Sort بيمرّ على كل زوج جنب بعض من الشمال لليمين. هنا بنصغّر right وبنستخدم swapped.'),
      invariant: message('At each pass start, positions after right form a sorted suffix in their final positions, and every active value is no larger than any suffix value. During a pass, the largest value seen so far reaches i after each advance. Therefore the pass fixes index right; a pass without swaps proves all remaining adjacent pairs are ordered.',
        'في بداية كل لفة، الأماكن اللي بعد right مترتّبة وفي مكانها النهائي، وكل قيمة في الجزء النشط أصغر من أو بتساوي أي قيمة في الجزء اللي خلص. جوّه اللفة، أكبر قيمة قابلتنا بتوصل لـ i بعد كل تحريك. عشان كده اللفة بتثبّت المكان right، ولو مفيش تبديل يبقى كل الأزواج اللي فاضلة مترتّبة.'),
      steps: [
        { title: message('Scan the active prefix', 'نمرّ على الجزء اللي فاضل'), body: message('Reset swapped to false and i to 0. While i < right, compare numbers[i] with numbers[i + 1]; the guard prevents an out-of-bounds read.',
          'نرجّع swapped لـ false وi لـ 0. طول ما i < right، نقارن numbers[i] باللي بعدها. الشرط بيمنع القراءة برّه الصف.') },
        { title: message('Swap only inverted neighbors', 'نبدّل بس لو الكبير قبل الصغير'), body: message('When the left value is strictly larger, swap both cards and set swapped to true. Equal values stay put. Move i right whether a swap happened or not.',
          'لو اللي عالشمال أكبر فعلًا، نبدّل الكارتين ونخلّي swapped تساوي true. المتساويين يفضلوا زي ما هم. نحرّك i يمين سواء بدّلنا أو لأ.') },
        { title: message('Fix the boundary, then decide', 'نثبّت آخر مكان ونقرّر نكمّل ولا لأ'), body: message('The largest active value has reached right. Decrease right to exclude it. If swapped is false, break; otherwise repeat while right > 0. The shrinking boundary guarantees termination.',
          'أكبر قيمة في الجزء النشط وصلت لـ right. نقلّل right عشان منرجعش نقارنها. لو swapped طلعت false، نقف؛ غير كده نكرّر طول ما right > 0. الحدود بتصغر، فالحلقة لازم تخلص.') },
      ],
      notes: [
        message('Stability: cards with equal values never swap with each other. Since movement is only adjacent, equal cards cannot cross indirectly either. Their input order survives.',
          'الـ stability: الكروت المتساوية مش بتتبدّل مع بعض. ولأن كل حركة بين جيران، مينفعش يعدّوا بعض بطريقة غير مباشرة. ترتيبهم الأصلي بيفضل زي ما هو.'),
        message('For n ≥ 2, already-sorted or all-equal input takes one pass, n − 1 value comparisons, and zero swaps: O(n). Empty and singleton inputs take constant work. A nearly sorted input is not always fast: a small value at the end moves left only one place per pass.',
          'لو n ≥ 2 والصف مترتّب أو كله متساوي، بنعمل لفة واحدة وn − 1 مقارنة ومن غير تبديل: O(n). الفاضي والكارت الواحد شغلهم ثابت. الصف اللي شبه مترتّب مش دايمًا سريع: قيمة صغيرة في الآخر بتتحرّك شمال مكان واحد بس كل لفة.'),
        message('With constant-time integer comparisons and swaps, reverse distinct input requires n(n − 1)/2 comparisons and swaps. Typical random inputs also take O(n²) time. Each strict adjacent swap removes exactly one inversion.',
          'بافتراض إن مقارنة الأرقام وتبديلها بياخدوا وقت ثابت، الصف المقلوب وقيمه مختلفة بيحتاج n(n − 1)/2 مقارنة وتبديل. المدخلات العشوائية المعتادة وقتها كمان O(n²). كل تبديل بيشيل inversion واحدة: زوج كان الكبير فيه قبل الصغير.'),
        message('The sorting algorithm is in-place with O(1) extra space.',
          'الخوارزمية نفسها in-place وبتحتاج مساحة زيادة O(1).'),
        message('Bubble Sort is easy to inspect and needs no auxiliary array, but repeated swaps make it inefficient for large data. Insertion Sort often does less work on nearly sorted data; O(n log n) sorts scale better.',
          'Bubble Sort سهل تتابعه ومش محتاج صف مساعد، بس التبديلات الكتير بتبطّأه مع بيانات كبيرة. Insertion Sort غالبًا بيعمل شغل أقل لو الصف شبه مترتّب، وخوارزميات O(n log n) أنسب لما البيانات تكبر.'),
        message('Counters show value comparisons, adjacent swaps, and passes started. Loop guards are shown separately and do not increase Comparisons. sortedFrom is a display boundary: indices from it onward are known to be in final position.',
          'العدادات بتعرض مقارنات القيم، وتبديلات الجيران، واللفات اللي بدأت. شروط الحلقات بتظهر لوحدها ومش بتزوّد عداد المقارنات. sortedFrom حدّ للعرض: من عنده لآخر الصف الكروت مضمونة في مكانها النهائي.'),
      ],
      costs: [
        { label: message('Already sorted', 'مترتّب أصلًا'), value: 'O(n)' },
        { label: message('Average / worst time', 'متوسط / أسوأ وقت'), value: 'O(n²)' },
        { label: message('Sorting extra space', 'المساحة الزيادة للترتيب'), value: 'O(1)' },
        { label: message('Stable', 'بيحافظ على ترتيب المتساويين'), value: 'Yes · strict >' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
