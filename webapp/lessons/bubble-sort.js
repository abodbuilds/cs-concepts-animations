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
      fail('Expected an object with a numbers array.', 'محتاجين object جواه numbers، وتكون array أرقام.');
    }
    if (input.numbers.length > 16) {
      fail('Use at most 16 integers.', 'اكتب 16 رقم صحيح بالكتير.');
    }
    // Iteration also rejects sparse slots, which Array.prototype.some skips.
    for (const value of input.numbers) {
      if (!Number.isSafeInteger(value) || value < -999 || value > 999) {
        fail('Every value must be an integer from -999 to 999.', 'كل رقم لازم يكون صحيح ومن -999 لحد 999.');
      }
    }
    return input.numbers;
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput) || typeof rawInput.numbers !== 'string') {
      fail('Enter numbers as text.', 'اكتب الأرقام كـ text.');
    }
    if (rawInput.numbers.length > MAX_LENGTH) {
      fail('Keep the input within 256 characters and 16 integers.', 'خلّي الـ input في حدود 256 حرف و16 رقم صحيح.');
    }
    const text = rawInput.numbers.trim()
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
    if (text && !/^[+-]?\d+(?:(?:\s*[,،]\s*|\s+)[+-]?\d+)*$/.test(text)) {
      fail('Use integers separated by commas or spaces; leave blank for an empty array.',
        'اكتب أرقام صحيحة وافصل بينها بـ comma أو مسافة. لو عايز array فاضية، سيب الخانة فاضية.');
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
          { label: message('Comparisons', 'المقارنات'), value: state.comparisons },
          { label: message('Swaps', 'الـ swaps'), value: state.swaps },
          { label: message('Passes', 'الـ passes'), value: state.passes },
          { label: message('Fixed cards', 'أرقام في مكانها النهائي'), value: sortedCount },
        ],
        scene: {
          rows: [{
            id: 'numbers', label: message('Array', 'الـ array'), layout: 'cards',
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
            state.numbers.length === 0 ? 'الـ array فاضية، مفيش أرقام نقارنها.'
              : state.right === null ? 'لسه مفيش رقم ثبت في مكانه. هنحدّد right قبل أول pass.'
              : sortedCount === 0 ? 'لسه مفيش رقم ثبت في مكانه. right بيشاور على آخر index في الـ pass دي.'
                : `${sortedCount} من ${state.numbers.length} أرقام ثبتوا في مكانهم. الجزء اللي خلص بيبدأ من index ${state.sortedFrom}.`),
        },
      }));
    }

    emit('ready', [], message('Let larger values move right', 'الأرقام الأكبر بتتحرّك يمين'),
      message(`There are ${numbers.length} cards. Compare neighbors, swap only when the left value is larger, and finish one rightmost position per pass.`,
        `عندنا ${numbers.length} أرقام. بنقارن كل رقم باللي جنبه، ونعمل swap بس لو اللي على الشمال أكبر. كل pass بتثبّت مكان من اليمين.`));
    state.right = numbers.length - 1;
    emit('boundary', [2], message('Set the right boundary', 'بنحدّد right، آخر الـ pass'),
      message(`right starts at ${state.right}. We need at least two cards to enter a pass.`,
        `right بيبدأ من ${state.right}. محتاجين رقمين على الأقل عشان نبدأ pass.`),
      `right = ${numbers.length} - 1 = ${state.right}`);

    while (true) {
      state.condition = state.right > 0;
      emit('outer-check', [3], message(state.condition ? 'Another pass can help' : 'No pair remains', state.condition ? 'لسه محتاجين pass كمان' : 'مفيش رقمين فاضلين نقارنهم'),
        message(state.condition ? `The active prefix ends at index ${state.right}; the suffix beyond it is already fixed.`
          : 'The active prefix has fewer than two cards. No more comparisons are needed.',
        state.condition ? `الجزء اللي بنشتغل عليه بيخلص عند index ${state.right}، واللي بعده خلاص في مكانه.`
          : 'الجزء اللي فاضل فيه أقل من رقمين، يعني مفيش مقارنات تانية.'),
        `${state.right} > 0 → ${state.condition}`);
      if (!state.condition) break;

      state.swapped = false; state.passes++; state.condition = null;
      emit('reset', [4], message(`Start pass ${state.passes}`, `بنبدأ الـ pass رقم ${state.passes}`),
        message('Reset swapped for this pass. It will stay false only if every adjacent pair is already in order.',
          'بنرجّع swapped = false في أول كل pass. هتفضل false بس لو كل رقمين جنب بعض مترتّبين أصلًا.'), 'swapped = false');
      state.i = 0;
      emit('scan-start', [5], message('Start from the left', 'بنبدأ من الشمال'),
        message('Start at index 0. The next guard checks that the right-hand neighbor is within this pass.',
          'بنبدأ من index 0. الـ condition اللي جاي بيتأكد إن الرقم اللي على اليمين لسه جوّه الـ pass دي.'), 'i = 0');

      while (true) {
        state.pair = []; state.condition = state.i < state.right;
        emit('pair-check', [6], message(state.condition ? 'Both neighbors are in bounds' : 'The pass is complete', state.condition ? 'الرقمين لسه جوّه الحدود' : 'الـ pass خلصت'),
          message(state.condition ? `Indices ${state.i} and ${state.i + 1} are within the active prefix.`
            : `i has reached right at index ${state.right}. The largest value in this pass has reached that position.`,
          state.condition ? `index ${state.i} و${state.i + 1} الاتنين جوّه الجزء اللي بنشتغل عليه.`
            : `i وصل لـ right عند index ${state.right}. أكبر رقم في الـ pass دي وصل للمكان ده.`),
          `${state.i} < ${state.right} → ${state.condition}`);
        if (!state.condition) break;

        const i = state.i, leftValue = state.numbers[i], rightValue = state.numbers[i + 1];
        state.pair = [i, i + 1]; state.condition = leftValue > rightValue; state.comparisons++;
        emit('compare', [7], message(state.condition ? 'These neighbors need a swap' : 'Keep their order', state.condition ? `الـ ${leftValue} أكبر، يبقى هنعمل swap` : 'ترتيبهم صح، هنسيبهم'),
          message(state.condition ? `At indices ${i} and ${i + 1}, ${leftValue} is larger than ${rightValue}. Swap the neighbors so the larger value moves right.`
            : leftValue === rightValue ? `Both neighbors have value ${leftValue}. The strict > test is false, so their original relative order is preserved.`
              : `At indices ${i} and ${i + 1}, ${leftValue} is smaller than ${rightValue}. This pair is already in ascending order.`,
          state.condition ? `عند index ${i} و${i + 1}، الـ ${leftValue} أكبر من الـ ${rightValue}. هنعمل swap عشان الأكبر يروح يمين.`
            : leftValue === rightValue ? `الرقمين ${leftValue} زي بعض. الـ condition > طلع false، فهيفضلوا بنفس ترتيبهم الأصلي.`
              : `عند index ${i} و${i + 1}، الـ ${leftValue} أصغر من الـ ${rightValue}. يعني مترتّبين أصلًا.`),
          `${leftValue} > ${rightValue} → ${state.condition}`);
        if (state.condition) {
          [state.numbers[i], state.numbers[i + 1]] = [state.numbers[i + 1], state.numbers[i]];
          [state.ids[i], state.ids[i + 1]] = [state.ids[i + 1], state.ids[i]];
          state.swaps++; state.condition = null;
          emit('swap', [8], message('Swap adjacent cards', `بنعمل swap للـ ${leftValue} والـ ${rightValue}`),
            message(`${leftValue} moves one place right and ${rightValue} moves one place left. Each card keeps its own identity.`,
              `الـ ${leftValue} راح مكان يمين، والـ ${rightValue} راح مكان شمال.`),
            `swap(numbers[${i}], numbers[${i + 1}])`);
          state.swapped = true;
          emit('flag', [9], message('Remember this swap', 'بنسجّل إن حصل swap'),
            message('Set swapped to true. This pass changed the order, so it cannot use the no-swap early exit.',
              'swapped بقت true. الـ pass دي غيّرت الترتيب، فمش هينفع نوقف بدري بعدها.'), 'swapped = true');
        }
        state.i++; state.pair = []; state.condition = null;
        emit('advance', [10], message('Move to the next pair', 'بنروح للرقمين اللي بعدهم'),
          message(`Advance i to ${state.i}. The value here is the largest seen in this pass so far. Check the boundary before reading its next neighbor.`,
            `i بقى ${state.i}. الرقم هنا أكبر رقم قابلناه في الـ pass دي لحد دلوقتي. هنتأكد من الحدود قبل ما نقرأ اللي جنبه.`),
          `i = ${state.i - 1} + 1 = ${state.i}`);
      }

      const completed = state.right;
      state.right--; state.sortedFrom = state.right + 1; state.condition = null;
      emit('shrink', [11], message('Grow the completed suffix', 'الجزء اللي خلص بيكبر برقم'),
        message(`Index ${completed} now holds the largest value from the active prefix. It is fixed, so the next pass ends at ${state.right}.`,
          `index ${completed} دلوقتي فيه أكبر رقم من الجزء اللي كنا شغالين عليه. كده ثبت في مكانه، والـ pass الجاية هتخلص عند ${state.right}.`),
        `right = ${completed} - 1 = ${state.right}`);
      state.condition = !state.swapped;
      emit('exit-check', [12], message(state.condition ? 'A whole pass without swaps' : 'This pass changed the order', state.condition ? 'pass كاملة عدّت من غير swap' : 'الـ pass دي غيّرت الترتيب'),
        message(state.condition ? 'Every adjacent pair in the active prefix was in order. Together with the completed suffix, this proves the entire array is sorted.'
          : 'At least one pair was swapped. Return to the outer guard; only the shorter prefix may need more work.',
        state.condition ? 'كل رقمين جنب بعض في الجزء اللي بنشتغل عليه طلعوا مترتّبين. ومع الجزء اللي خلص، يبقى الـ array كلها sorted.'
          : 'عملنا swap مرة على الأقل. هنرجع للـ condition بتاع الـ loop الخارجية، وبس الجزء الأقصر اللي فاضل ممكن يحتاج شغل تاني.'),
        `not ${state.swapped} → ${state.condition}`);
      if (state.condition) {
        state.earlyExit = true; state.sortedFrom = 0; state.condition = null;
        emit('early-exit', [13], message('Stop early', 'بنعمل break ونوقف بدري'),
          message(`No swap was needed in pass ${state.passes}. The remaining cards are also fixed; another pass would add no information.`,
            `الـ pass رقم ${state.passes} ماحتاجتش ولا swap. يعني باقي الأرقام كمان في مكانها، وpass تانية مش هتضيف حاجة.`), 'break');
        break;
      }
    }

    state.done = true; state.result = [...state.numbers]; state.sortedFrom = 0;
    state.pair = []; state.condition = null;
    emit('done', [14], message('Sorted, with equal cards still in order', 'الـ array بقت sorted، والمتساويين فضلوا بترتيبهم'),
      message(numbers.length < 2 ? 'An empty or single-card array is already sorted. Return it without comparisons or swaps.'
        : `Return the ascending result after ${state.comparisons} comparisons and ${state.swaps} swaps. Equal cards never crossed, so the sort is stable.`,
      numbers.length < 2 ? 'الـ array الفاضية أو اللي فيها رقم واحد sorted أصلًا. بنعمل return ليها من غير مقارنات ولا swaps.'
        : `بنعمل return للنتيجة من الصغير للكبير بعد ${state.comparisons} مقارنات و${state.swaps} swaps. الأرقام المتساوية عمرها ما عدّت بعض، فالـ sort ده stable.`), 'return numbers');
    return frames;
  }

  const lesson = {
    id: 'bubble-sort', name: 'Bubble Sort', theme: 'algorithms', category: 'sort', number: '04',
    label: 'BUBBLE SORT', cost: 'O(n²)',
    description: message('Compare neighbors, move larger values right, and stop when a pass makes no swaps.',
      'بنقارن كل رقمين جنب بعض، والأكبر بيروح يمين، وبنوقف لما pass تعدّي من غير swap.'),
    note: message('Strict > keeps equal cards stable. Each pass shrinks right; an already-sorted input needs just one pass.',
      'الـ condition > بيخلّي الأرقام المتساوية بترتيبها (stable). كل pass بتصغّر right، ولو الـ array مترتّبة أصلًا بتكفي pass واحدة.'),
    code,
    keySteps: ['ready', 'compare', 'swap', 'shrink', 'early-exit', 'done'],
    fields: [{
      name: 'numbers', label: message('Numbers', 'الأرقام'), type: 'text', maxLength: MAX_LENGTH,
      help: message('Up to 16 integers from -999 to 999, separated by commas or spaces. Arabic digits work too. Leave blank for an empty array.',
        'لحد 16 رقم صحيح من -999 لـ 999، وافصل بينهم بـ comma أو مسافة. الأرقام العربي شغالة كمان. سيبها فاضية لو عايز array فاضية.'),
    }],
    defaults: { numbers: '7, 3, 5, 2, 6' },
    presets: [
      { id: 'default', label: message('Mixed neighbors', 'أرقام ملخبطة'), input: { numbers: '7, 3, 5, 2, 6' } },
      { id: 'sorted', label: message('Already sorted · early exit', 'مترتّبة أصلًا · بنوقف بدري'), input: { numbers: '-3, 0, 2, 5, 9' } },
      { id: 'reverse', label: message('Reverse order · most swaps', 'مقلوبة · أكتر عدد swaps'), input: { numbers: '6, 5, 4, 3, 2, 1' } },
      { id: 'duplicates', label: message('Duplicates · stable identities', 'أرقام مكرّرة · بتفضل بترتيبها'), input: { numbers: '3, 1, 3, 2, 1' } },
      { id: 'equal', label: message('All equal · no swaps', 'كلها زي بعض · من غير swap'), input: { numbers: '4, 4, 4, 4' } },
      { id: 'late-small', label: message('Smallest at the end', 'أصغر رقم في الآخر'), input: { numbers: '2, 3, 4, 5, 1' } },
      { id: 'negative', label: message('Negative values and limits', 'أرقام سالبة وأقصى الحدود'), input: { numbers: '999, -2, 0, -999, -2' } },
      { id: 'singleton', label: message('One card', 'رقم واحد'), input: { numbers: '8' } },
      { id: 'empty', label: message('Empty array', 'array فاضية'), input: { numbers: '' } },
    ],
    parse, build,
    summary(input) {
      const numbers = validate(input);
      return message(`${numbers.length} cards · ascending order · adjacent comparisons`,
        `${numbers.length} أرقام · من الصغير للكبير · بنقارن كل رقمين جنب بعض`);
    },
    theory: {
      idea: message('Compare each pair of neighbors and swap them when they are out of order. After every pass, the largest remaining card has bubbled to the end.',
        'بنقارن كل رقمين جنب بعض، ولو ترتيبهم غلط بنعمل swap. بعد كل pass، أكبر رقم فاضل بيوصل لآخر الـ array.'),
      title: message('One pass fixes one more position', 'كل pass بتثبّت مكان زيادة'),
      intro: message('You only need array indices, loops, and a swap of two values. Bubble Sort repeatedly scans adjacent pairs from left to right. This version uses a shrinking right boundary and a swapped flag.',
        'محتاج بس تعرف الـ indices والـ loops وإزاي تعمل swap لرقمين. Bubble Sort بيلف على كل رقمين جنب بعض من الشمال لليمين، ويعيد تاني. النسخة دي فيها right بيصغر كل مرة، وflag اسمه swapped.'),
      invariant: message('At each pass start, positions after right form a sorted suffix in their final positions, and every active value is no larger than any suffix value. During a pass, the largest value seen so far reaches i after each advance. Therefore the pass fixes index right; a pass without swaps proves all remaining adjacent pairs are ordered.',
        'في أول كل pass، الأرقام اللي بعد right مترتّبة وفي مكانها النهائي، وكل رقم قبل right أصغر من أو بيساوي أي رقم بعده. جوّه الـ pass، أكبر رقم قابلناه بيوصل لـ i بعد كل خطوة. عشان كده كل pass بتثبّت index right. ولو pass عدّت من غير swap، يبقى كل الأرقام اللي فاضلة مترتّبة.'),
      steps: [
        { title: message('Scan the active prefix', 'بنلف على الجزء اللي فاضل'), body: message('Reset swapped to false and i to 0. While i < right, compare numbers[i] with numbers[i + 1]; the guard prevents an out-of-bounds read.',
          'بنرجّع swapped = false وi = 0. طول ما i < right، بنقارن numbers[i] بـ numbers[i + 1]. الـ condition ده بيمنعنا نطلع برّه الـ array.') },
        { title: message('Swap only inverted neighbors', 'بنعمل swap بس لو الكبير قبل الصغير'), body: message('When the left value is strictly larger, swap both cards and set swapped to true. Equal values stay put. Move i right whether a swap happened or not.',
          'لو اللي على الشمال أكبر (مش بيساوي)، بنعمل swap وswapped بتبقى true. الأرقام المتساوية بتفضل مكانها. وبنحرّك i يمين، عملنا swap أو لأ.') },
        { title: message('Fix the boundary, then decide', 'بنثبّت آخر مكان، وبعدين نقرّر نكمّل ولا لأ'), body: message('The largest active value has reached right. Decrease right to exclude it. If swapped is false, break; otherwise repeat while right > 0. The shrinking boundary guarantees termination.',
          'أكبر رقم في الجزء اللي بنشتغل عليه وصل لـ right. بنقلّل right عشان مانقارنوش تاني. لو swapped لسه false، بنعمل break. غير كده بنكرّر طول ما right > 0. الجزء اللي بنشتغل عليه بيصغر كل مرة، فالـ loop لازم تخلص.') },
      ],
      notes: [
        message('Stability: cards with equal values never swap with each other. Since movement is only adjacent, equal cards cannot cross indirectly either. Their input order survives.',
          'الـ stability: الأرقام المتساوية عمرها ما بتعمل swap مع بعض. ولأن كل حركة بتبقى بين رقمين جنب بعض، مينفعش يعدّوا بعض بشكل غير مباشر. فترتيبهم في الـ input بيفضل زي ما هو.'),
        message('For n ≥ 2, already-sorted or all-equal input takes one pass, n − 1 value comparisons, and zero swaps: O(n). Empty and singleton inputs take constant work. A nearly sorted input is not always fast: a small value at the end moves left only one place per pass.',
          'لو n ≥ 2 والـ array مترتّبة أصلًا أو كل أرقامها زي بعض، بنعمل pass واحدة فيها n − 1 مقارنة ومن غير ولا swap، يعني O(n). الـ array الفاضية أو اللي فيها رقم واحد شغلها ثابت. والـ array اللي شبه مترتّبة مش دايمًا سريعة: رقم صغير في الآخر بيتحرّك شمال مكان واحد بس في كل pass.'),
        message('With constant-time integer comparisons and swaps, reverse distinct input requires n(n − 1)/2 comparisons and swaps. Typical random inputs also take O(n²) time. Each strict adjacent swap removes exactly one inversion.',
          'لو مقارنة رقمين والـ swap بياخدوا وقت ثابت، فالـ array المقلوبة اللي أرقامها مختلفة محتاجة n(n − 1)/2 مقارنة ونفس العدد swaps. والـ input العشوائي العادي برضه بياخد O(n²). وكل swap بيشيل inversion واحدة بالظبط.'),
        message('The sorting algorithm is in-place with O(1) extra space.',
          'الـ sort نفسه in-place، ومش محتاج غير O(1) مساحة زيادة.'),
        message('Bubble Sort is easy to inspect and needs no auxiliary array, but repeated swaps make it inefficient for large data. Insertion Sort often does less work on nearly sorted data; O(n log n) sorts scale better.',
          'Bubble Sort سهل تتابعه ومش محتاج array تانية، بس كتر الـ swaps بيخلّيه بطيء مع الـ data الكبيرة. Insertion Sort غالبًا بيشتغل أقل لو الـ array شبه مترتّبة، والـ sorts اللي O(n log n) أحسن لما الـ data تكبر.'),
        message('Counters show value comparisons, adjacent swaps, and passes started. Loop guards are shown separately and do not increase Comparisons. sortedFrom is a display boundary: indices from it onward are known to be in final position.',
          'العدادات بتعدّ مقارنات الأرقام، والـ swaps بين الأرقام اللي جنب بعض، والـ passes اللي بدأت. الـ conditions بتاعة الـ loops بتظهر لوحدها ومش بتزوّد عداد المقارنات. sortedFrom ده للعرض بس: من الـ index ده لآخر الـ array، الأرقام أكيد في مكانها النهائي.'),
      ],
      costs: [
        { label: message('Already sorted', 'مترتّبة أصلًا'), value: 'O(n)' },
        { label: message('Average / worst time', 'الـ average / worst case'), value: 'O(n²)' },
        { label: message('Sorting extra space', 'المساحة الزيادة للـ sort'), value: 'O(1)' },
        { label: message('Stable', 'stable'), value: 'Yes · strict >' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
