(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  function copy(value) {
    if (Array.isArray(value)) return value.map(copy);
    if (value && typeof value === 'object') {
      const result = {};
      for (const name of Object.keys(value)) result[name] = copy(value[name]);
      return result;
    }
    return value;
  }
  const MAX_ITEMS = 16;
  const MAX_TEXT = 256;
  const code = [
    'selectionSort(numbers):',
    '  n = length(numbers)',
    '  for start = 0 .. n - 2:',
    '    minIndex = start',
    '    for scan = start + 1 .. n - 1:',
    '      if numbers[scan] < numbers[minIndex]:',
    '        minIndex = scan',
    '    if minIndex != start:',
    '      swap(numbers[start], numbers[minIndex])',
    '  return numbers',
  ];

  function invalid(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  function validate(input) {
    if (!input || typeof input !== 'object' || !Array.isArray(input.numbers)) {
      invalid('Provide an object with a numbers array.', 'ابعت object فيه numbers كـ array.');
    }
    if (input.numbers.length > MAX_ITEMS) {
      invalid('Use at most 16 integers.', 'اكتب ١٦ عدد صحيح بالكتير.');
    }
    // Index every slot so sparse arrays cannot bypass validation.
    for (let index = 0; index < input.numbers.length; index++) {
      const value = input.numbers[index];
      if (!Number.isSafeInteger(value) || value < -999 || value > 999) {
        invalid('Every value must be an integer from -999 to 999.',
          'كل قيمة لازم تكون عدد صحيح من -٩٩٩ لحد ٩٩٩.');
      }
    }
    return input.numbers.slice();
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput.numbers !== 'string') {
      invalid('Enter the numbers as text.', 'اكتب الأرقام كنص.');
    }
    if (rawInput.numbers.length > MAX_TEXT) {
      invalid('Keep the input within 256 characters.', 'خلي النص ٢٥٦ حرف بالكتير.');
    }
    const text = rawInput.numbers
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
      .replace(/،/g, ',').trim();
    if (!text) return { numbers: [] };
    // Commas and whitespace may be mixed, but commas cannot leave empty items.
    if (!/^[+-]?\d+(?:(?:\s*,\s*|\s+)[+-]?\d+)*$/.test(text)) {
      invalid('Separate whole numbers with commas or spaces; do not leave an empty item.',
        'افصل الأعداد الصحيحة بفواصل أو مسافات، ومن غير قيمة ناقصة بين الفواصل.');
    }
    const numbers = text.split(/[,\s]+/).map(Number);
    return { numbers: validate({ numbers }) };
  }

  const cardLabel = id => String.fromCharCode(65 + Number(id.slice(5)));

  function build(input) {
    const numbers = validate(input);
    const length = numbers.length;
    const state = {
      numbers, itemIds: numbers.map((_, index) => `item-${index}`),
      n: null, start: null, scan: null, minIndex: null,
      fixedCount: 0, comparisons: 0, swaps: 0,
      condition: null, done: false, result: null,
    };
    const frames = [];

    function emit(kind, lines, title, explanation, equation = '') {
      const selecting = state.minIndex !== null && state.fixedCount === state.start;
      const cells = state.numbers.map((value, index) => {
        const markers = [cardLabel(state.itemIds[index])];
        if (index === state.start && !state.done) markers.push('start');
        if (selecting && index === state.minIndex) markers.push('min');
        if (selecting && index === state.scan) markers.push('scan');
        let tone = 'default';
        if (index < state.fixedCount) tone = 'sorted';
        else if (selecting && index === state.minIndex) tone = 'found';
        else if (index === state.scan || index === state.start) tone = 'active';
        return { id: state.itemIds[index], value, index, tone, marker: markers.join(' · ') };
      });
      // Clone the entire frame, including UI objects, for independent seeking.
      frames.push(copy({
        kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'n', value: state.n ?? '—' },
          { name: 'start', value: state.start ?? '—' },
          { name: 'scan', value: state.scan ?? '—' },
          { name: 'minIndex', value: state.minIndex ?? '—' },
          { name: 'minimum value', value: selecting ? state.numbers[state.minIndex] : '—' },
          { name: 'fixedCount', value: state.fixedCount },
        ],
        metrics: [
          { label: message('Value comparisons', 'مقارنات القيم'), value: state.comparisons },
          { label: message('Swaps', 'تبديلات'), value: state.swaps },
          { label: message('Fixed cards', 'كروت في مكانها النهائي'), value: state.fixedCount },
        ],
        scene: {
          rows: [{ id: 'numbers', label: message('Array', 'الصف'), layout: 'cards', cells }],
          graph: null,
          collections: [],
          note: length === 0
            ? message('The array is empty: there are no cards to scan or swap.',
              'الصف فاضي: مفيش كروت نفحصها أو نبدّلها.')
            : message(`${state.fixedCount} of ${length} cards form the fixed prefix. Letters follow original cards; indices show current positions.`,
              `${state.fixedCount} من ${length} كروت في أول الصف ثبتوا في مكانهم النهائي. الحروف بتفضل مع نفس الكروت؛ والـ index بيوضّح المكان الحالي.`),
        },
      }));
    }

    emit('ready', [], message('Select the smallest remaining card', 'نختار أصغر كارت فاضل'),
      message(length > 1
        ? 'Scan the unfixed part for its minimum, then swap it into the next fixed position. Card letters let us follow equal values separately.'
        : length === 1 ? 'One card is already sorted. The outer loop will have no pass to run.'
          : 'An empty array is already sorted. Both loops will be skipped.',
      length > 1
        ? 'نفحص الجزء اللي لسه متثبتش، ونبدّل أصغر كارت مع أول مكان فيه. حروف الكروت بتخلّينا نتابع القيم المتساوية كل واحدة لوحدها.'
        : length === 1 ? 'كارت واحد مترتّب لوحده. الحلقة الخارجية مش هتحتاج أي لفة.'
          : 'الصف الفاضي مترتّب أصلًا. مش هندخل أي حلقة.'));

    state.n = length;
    emit('length', [2], message('Count the cards', 'نحدّد عدد الكروت'),
      message('Use n to bound both loops. Indices start at zero.',
        'هنستخدم n عشان نحدّد آخر كل حلقة. الأماكن بتبدأ من صفر.'), `n = ${length}`);

    for (let start = 0; ; start++) {
      state.start = start;
      state.scan = null;
      state.minIndex = null;
      state.condition = start < length - 1;
      emit('pass', [3], message(state.condition ? 'Choose the next fixed position' : 'No selection pass remains',
        state.condition ? 'نختار المكان الجاي اللي هنثبّته' : 'مفيش لفة اختيار تانية'),
      message(state.condition
        ? `Indices before ${start} are final. Find the minimum of the suffix beginning at index ${start}.`
        : length > 1 ? 'Only the last card remains. Earlier passes guarantee it is at least as large as every fixed card.'
          : 'Fewer than two cards need no selection pass or value comparison.',
      state.condition
        ? `كل الأماكن قبل ${start} نهائية. هندور على أصغر قيمة في الجزء اللي بيبدأ من المكان ${start}.`
        : length > 1 ? 'فاضل آخر كارت بس. اللفات اللي فاتت ضمنت إنه مش أصغر من أي كارت اتثبّت.'
          : 'أقل من كارتين مش محتاجين لفة اختيار ولا مقارنة قيم.'),
      `${start} < ${length - 1} → ${state.condition}`);
      if (!state.condition) break;

      state.minIndex = start;
      state.condition = null;
      emit('minimum', [4], message('Start with a candidate minimum', 'نبدأ بمرشّح لأصغر قيمة'),
        message(`Card ${cardLabel(state.itemIds[start])} is the only suffix card considered so far. The rest still needs scanning.`,
          `الكارت ${cardLabel(state.itemIds[start])} هو الوحيد اللي بصّينا عليه في الجزء ده لحد دلوقتي. لسه لازم نفحص الباقي.`),
        `minIndex = ${start}`);

      for (let scan = start + 1; ; scan++) {
        state.scan = scan;
        state.condition = scan < length;
        emit('scan', [5], message(state.condition ? 'Inspect the next candidate' : 'The suffix has been scanned',
          state.condition ? 'نفحص الكارت الجاي' : 'فحصنا الجزء كله'),
        message(state.condition
          ? `Index ${scan} is in bounds. Compare its value with the current minimum.`
          : `minIndex ${state.minIndex} now identifies the minimum of the whole unfixed suffix. No read occurs at index n.`,
        state.condition
          ? `المكان ${scan} جوّه حدود الصف. هنقارن قيمته بأصغر قيمة لقيناها لحد دلوقتي.`
          : `minIndex عند ${state.minIndex} بقى بيشاور على أصغر قيمة في كل الجزء اللي لسه متثبتش. مش هنقرأ عند المكان n.`),
        `${scan} < ${length} → ${state.condition}`);
        if (!state.condition) break;

        const candidate = state.numbers[scan];
        const minimum = state.numbers[state.minIndex];
        state.condition = candidate < minimum;
        state.comparisons++;
        emit('compare', [6], message(state.condition ? 'A smaller value was found' : 'Keep the current minimum',
          state.condition ? 'لقينا قيمة أصغر' : 'نحتفظ بأصغر قيمة عندنا'),
        message(state.condition
          ? `The value at index ${scan} is smaller. Update minIndex next; no card moves yet.`
          : candidate === minimum ? 'The values are equal, so the strict less-than test fails. Keep the earlier candidate; later swaps can still break stability.'
            : `The value at index ${scan} is larger. It cannot replace the current minimum.`,
        state.condition
          ? `القيمة عند المكان ${scan} أصغر. هنغيّر minIndex دلوقتي؛ لسه مفيش كارت اتحرّك.`
          : candidate === minimum ? 'القيمتين متساويين، فشرط الأصغر مش متحقق. نسيب المرشّح الأسبق؛ بس التبديل بعد كده لسه ممكن يغيّر ترتيب المتساويين.'
            : `القيمة عند المكان ${scan} أكبر. مش هتاخد مكان أصغر قيمة عندنا.`),
        `${candidate} < ${minimum} → ${state.condition}`);
        if (state.condition) {
          state.minIndex = scan;
          emit('new-minimum', [7], message('Remember the smaller candidate', 'نسجّل مكان المرشّح الأصغر'),
            message(`Card ${cardLabel(state.itemIds[scan])} is now the minimum among the suffix cards examined so far. Continue scanning.`,
              `الكارت ${cardLabel(state.itemIds[scan])} بقى أصغر واحد من كروت الجزء اللي فحصناه لحد دلوقتي. نكمّل فحص.`),
            `minIndex = ${scan}`);
        }
      }

      state.condition = state.minIndex !== start;
      if (!state.condition) state.fixedCount = start + 1;
      emit('swap-check', [8], message(state.condition ? 'The minimum belongs at start' : 'The minimum is already in place',
        state.condition ? 'أصغر كارت مكانه عند start' : 'أصغر كارت موجود في مكانه'),
      message(state.condition
        ? `Swap indices ${start} and ${state.minIndex} to extend the fixed prefix.`
        : `Skip a self-swap. Index ${start} is now final, but the full suffix still had to be scanned.`,
      state.condition
        ? `هنبدّل المكان ${start} مع ${state.minIndex} عشان نكبّر الجزء اللي اتثبّت.`
        : `مش هنبدّل الكارت مع نفسه. المكان ${start} بقى نهائي، بس كان لازم نفحص الجزء كله الأول.`),
      `${state.minIndex} != ${start} → ${state.condition}`);

      if (state.condition) {
        const minIndex = state.minIndex;
        const displacedId = state.itemIds[start];
        const selectedId = state.itemIds[minIndex];
        const crossedIndex = state.numbers.findIndex((value, index) =>
          index > start && index < minIndex && value === state.numbers[start]);
        const crossedId = crossedIndex < 0 ? null : state.itemIds[crossedIndex];
        [state.numbers[start], state.numbers[minIndex]] = [state.numbers[minIndex], state.numbers[start]];
        [state.itemIds[start], state.itemIds[minIndex]] = [state.itemIds[minIndex], state.itemIds[start]];
        state.swaps++;
        state.fixedCount = start + 1;
        const detail = crossedId === null
          ? message('The other card moves into the suffix; all earlier fixed cards stay in place.',
            'الكارت التاني بيروح للجزء اللي لسه متثبتش؛ وكل الكروت اللي ثبتناها قبل كده بتفضل مكانها.')
          : message(`Card ${cardLabel(displacedId)} jumps past equal-valued card ${cardLabel(crossedId)}. Their relative order changes: this is why distant swaps can break stability.`,
            `الكارت ${cardLabel(displacedId)} عدّى الكارت ${cardLabel(crossedId)} اللي ليه نفس القيمة. ترتيبهم بالنسبة لبعض اتغيّر: عشان كده التبديل البعيد ممكن يخلّي الترتيب مش stable.`);
        emit('swap', [9], message('Fix the minimum in its final position', 'نثبّت أصغر كارت في مكانه النهائي'),
          message(`Card ${cardLabel(selectedId)} moves to index ${start}. ${detail.en}`,
            `الكارت ${cardLabel(selectedId)} راح للمكان ${start}. ${detail.ar}`),
          `swap(numbers[${start}], numbers[${minIndex}])`);
      }
    }

    state.fixedCount = length;
    state.done = true;
    state.result = state.numbers.slice();
    emit('done', [10], message('The array is sorted', 'الصف اترتّب'),
      message(length > 1
        ? `All ${length} cards are final. The trace used ${state.comparisons} value comparisons and ${state.swaps} swaps. Sorted input of this length needs the same comparisons.`
        : length === 1 ? 'Return the single value. No value comparison or swap was needed.'
          : 'Return an empty array. No value comparison or swap was needed.',
      length > 1
        ? `كل الـ ${length} كروت في مكانها النهائي. عملنا ${state.comparisons} مقارنة قيم و${state.swaps} تبديل. حتى لو الصف كان مترتّب من الأول، كنا هنحتاج نفس عدد المقارنات.`
        : length === 1 ? 'نرجّع القيمة الوحيدة. محتجناش مقارنة قيم ولا تبديل.'
          : 'نرجّع صف فاضي. محتجناش مقارنة قيم ولا تبديل.'),
      `${length} × (${length} - 1) / 2 = ${state.comparisons} comparisons`);
    return frames;
  }

  const lesson = {
    id: 'selection-sort', name: 'Selection Sort', category: 'sort', number: '03',
    label: 'SELECTION SORT', cost: 'O(n²)',
    description: message('Scan for the minimum, swap it into place, and grow a fixed prefix.',
      'دوّر على أصغر قيمة، بدّلها لمكانها، وكبّر الجزء اللي اتثبّت في أول الصف.'),
    note: message('Every suffix must be scanned, even on sorted input. Distant swaps make this version unstable.',
      'لازم نفحص كل جزء فاضل، حتى لو الصف مترتّب. التبديل البعيد بيخلّي النسخة دي مش stable.'),
    code,
    keySteps: ['ready', 'minimum', 'compare', 'new-minimum', 'swap', 'done'],
    fields: [{ name: 'numbers', label: message('Numbers', 'الأرقام'), type: 'text', maxLength: MAX_TEXT,
      help: message('Up to 16 integers from -999 to 999, separated by commas or spaces. Arabic digits work. Leave blank for an empty array.',
        '١٦ عدد صحيح بالكتير من -٩٩٩ لحد ٩٩٩، بينهم فواصل أو مسافات. الأرقام العربي شغّالة. سيبه فاضي عشان تجرّب صف فاضي.') }],
    defaults: { numbers: '64, 25, 12, 22, 11' },
    presets: [
      { id: 'default', label: message('Find successive minima', 'نلاقي أصغر قيمة كل مرة'), input: { numbers: '64, 25, 12, 22, 11' } },
      { id: 'sorted', label: message('Sorted: still scan', 'مترتّب: لسه هنفحص'), input: { numbers: '1, 2, 3, 4, 5' } },
      { id: 'reverse', label: message('Reverse order', 'ترتيب عكسي'), input: { numbers: '5, 4, 3, 2, 1' } },
      { id: 'unstable', label: message('Equal cards change order', 'المتساويين بيغيّروا ترتيبهم'), input: { numbers: '2, 2, 1' } },
      { id: 'equal', label: message('All values equal', 'كل القيم متساوية'), input: { numbers: '4, 4, 4, 4' } },
      { id: 'negative', label: message('Negatives and duplicates', 'سوالب وقيم مكرّرة'), input: { numbers: '-3, 0, -8, -3, 5' } },
      { id: 'singleton', label: message('One card', 'كارت واحد'), input: { numbers: '7' } },
      { id: 'empty', label: message('Empty array', 'صف فاضي'), input: { numbers: '' } },
    ],
    parse, build,
    summary(input) {
      const numbers = validate(input);
      const comparisons = numbers.length * (numbers.length - 1) / 2;
      return message(`${numbers.length} cards · ${comparisons} value comparisons · ascending order`,
        `${numbers.length} كروت · ${comparisons} مقارنة قيم · من الصغير للكبير`);
    },
    theory: {
      idea: message('Find the smallest card in the unsorted part and swap it to the front of that part. Repeat, and the sorted part grows from the left one card at a time.',
        'دوّر على أصغر كارت في الجزء اللي لسه مش مترتّب، وبدّله مع أول مكان في الجزء ده. كرّر، والجزء المترتّب بيكبر من الشمال كارت كارت.'),
      title: message('Select, swap, and fix', 'نختار، نبدّل، ونثبّت'),
      intro: message('Prerequisites: array indices, loops, comparisons, and swapping two values. This standard minimum-selection sort repeatedly finds the smallest remaining value and fixes one position. Indices are zero-based; letters A–P track original card identities.',
        'محتاج تبقى عارف أماكن الـ array، والـ loops، والمقارنات، وتبديل قيمتين. دي Selection Sort العادية: كل مرة بنختار أصغر قيمة فاضلة ونثبّت مكان. الأماكن بتبدأ من صفر؛ وحروف A–P بتتابع هوية الكروت الأصلية.'),
      invariant: message('Before each pass, the prefix before start is sorted, final, and no greater than any suffix value. During a scan, minIndex identifies the first minimum among the suffix cards examined so far. Completing the scan and placing that minimum extends the invariant by one card. When at most one card remains, the entire array is sorted.',
        'قبل كل لفة، الجزء اللي قبل start مترتّب ونهائي، ومفيش قيمة فيه أكبر من أي قيمة في الجزء الفاضل. أثناء الفحص، minIndex بيشاور على أول أصغر قيمة في الكروت اللي فحصناها لحد دلوقتي. لما نخلّص ونحط الأصغر في مكانه، القاعدة دي بتفضل صح وكارت كمان بيتثبّت. لما يفضل كارت واحد بالكتير، الصف كله يبقى مترتّب.'),
      steps: [
        { title: message('Choose a position', 'نختار مكان'), body: message('start is the first unfixed index. Begin with minIndex = start; there is no need to compare this card with itself.',
          'start هو أول مكان لسه متثبتش. نبدأ بـ minIndex = start؛ مش محتاجين نقارن الكارت بنفسه.') },
        { title: message('Scan every remaining candidate', 'نفحص كل المرشّحين'), body: message('Compare each later value with the current minimum. Update minIndex only for a strictly smaller value. Changing the candidate moves a pointer, not a card.',
          'نقارن كل قيمة بعدها بأصغر قيمة عندنا. نغيّر minIndex بس لو لقينا قيمة أصغر فعلًا. تغيير المرشّح بيغيّر المؤشر، والكروت لسه مكانها.') },
        { title: message('Swap once, or skip', 'نبدّل مرة أو نعدّي'), body: message('After the full scan, swap the minimum into start if the indices differ. Otherwise skip the self-swap. Either way, this position is final and the next pass starts one place later.',
          'بعد الفحص كله، نبدّل الأصغر مع start لو الأماكن مختلفة. غير كده نعدّي من غير تبديل. في الحالتين المكان ده بقى نهائي، واللفة الجاية تبدأ بعده.') },
      ],
      notes: [
        message('Instability: in the equal-card preset, A and B both hold 2, with A first. Selecting the smaller card C swaps it with A, leaving B before A. Keeping the earlier equal minimum does not prevent this reversal.',
          'عدم الثبات: في مثال المتساويين، A وB قيمتهم ٢، وA في الأول. لما نختار الكارت الأصغر C ونبدّله مع A، يبقى B قبل A. الاحتفاظ بأول مرشّح مساوي مش بيمنع قلب الترتيب ده.'),
        message('Even sorted and all-equal inputs need (n−1) + (n−2) + … + 1 = n(n−1)/2 value comparisons. This version has no early exit. The metric excludes loop-boundary and index checks.',
          'حتى الصف المترتّب أو اللي كله نفس القيمة محتاج (n−1) + (n−2) + … + 1 = n(n−1)/2 مقارنة قيم. النسخة دي مفيهاش خروج بدري. العداد مش بيحسب شروط حدود الحلقات ولا مقارنة الأماكن.'),
        message('Selection sort uses few swaps and can suit tiny inputs when moving records is expensive. It is a poor choice for large or nearly sorted arrays: insertion sort can exploit existing order, while selection sort still scans every suffix.',
          'Selection Sort بتعمل تبديلات قليلة، وممكن تنفع مع عدد صغير لو تحريك البيانات مكلف. مش اختيار مناسب لصفوف كبيرة أو شبه مترتّبة: Insertion Sort تقدر تستفيد من الترتيب الموجود، لكن هنا لسه بنفحص كل جزء فاضل.'),
        message('Complexity assumes constant-time comparisons and swaps. The algorithm itself is in-place with O(1) extra space.',
          'التعقيد هنا بافتراض إن المقارنة والتبديل وقتهم ثابت. الخوارزمية نفسها بتشتغل في نفس الصف وبمساحة زيادة O(1).'),
      ],
      costs: [
        { label: message('Best / average / worst time', 'أفضل / متوسط / أسوأ وقت'), value: 'Θ(n²)' },
        { label: message('Exact value comparisons', 'مقارنات القيم بالظبط'), value: 'n(n−1)/2' },
        { label: message('Swaps', 'التبديلات'), value: '0 … max(0, n−1)' },
        { label: message('Algorithm extra space', 'المساحة الزيادة للخوارزمية'), value: 'O(1)' },
        { label: message('Stable', 'بيحافظ على ترتيب المتساويين'), value: 'No / لأ' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
