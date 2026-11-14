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
      invalid('Provide an object with a numbers array.', 'ابعت object فيه numbers تكون array.');
    }
    if (input.numbers.length > MAX_ITEMS) {
      invalid('Use at most 16 integers.', 'أقصى حاجة 16 رقم صحيح.');
    }
    // Index every slot so sparse arrays cannot bypass validation.
    for (let index = 0; index < input.numbers.length; index++) {
      const value = input.numbers[index];
      if (!Number.isSafeInteger(value) || value < -999 || value > 999) {
        invalid('Every value must be an integer from -999 to 999.',
          'كل رقم لازم يكون صحيح ومن -999 لحد 999.');
      }
    }
    return input.numbers.slice();
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput.numbers !== 'string') {
      invalid('Enter the numbers as text.', 'اكتب الأرقام كـ text.');
    }
    if (rawInput.numbers.length > MAX_TEXT) {
      invalid('Keep the input within 256 characters.', 'الـ input مينفعش يزيد عن 256 character.');
    }
    const text = rawInput.numbers
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776))
      .replace(/،/g, ',').trim();
    if (!text) return { numbers: [] };
    // Commas and whitespace may be mixed, but commas cannot leave empty items.
    if (!/^[+-]?\d+(?:(?:\s*,\s*|\s+)[+-]?\d+)*$/.test(text)) {
      invalid('Separate whole numbers with commas or spaces; do not leave an empty item.',
        'افصل بين الأرقام بفاصلة أو مسافة، ومتسيبش مكان فاضي بين فاصلتين.');
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
          { label: message('Value comparisons', 'عدد المقارنات'), value: state.comparisons },
          { label: message('Swaps', 'عدد الـ swaps'), value: state.swaps },
          { label: message('Fixed cards', 'أرقام اتثبّتت'), value: state.fixedCount },
        ],
        scene: {
          rows: [{ id: 'numbers', label: message('Array', 'الـ array'), layout: 'cards', cells }],
          graph: null,
          collections: [],
          note: length === 0
            ? message('The array is empty: there are no cards to scan or swap.',
              'الـ array فاضية، مفيش أرقام نقارنها أو نعملها swap.')
            : message(`${state.fixedCount} of ${length} cards form the fixed prefix. Letters follow original cards; indices show current positions.`,
              `${state.fixedCount} من ${length} أرقام اتثبّتوا في أول الـ array. الحرف ماشي مع الكارت بتاعه، والـ index بيقول هو فين دلوقتي.`),
        },
      }));
    }

    emit('ready', [], message('Select the smallest remaining card', 'بندوّر على أصغر رقم فاضل'),
      message(length > 1
        ? 'Scan the unfixed part for its minimum, then swap it into the next fixed position. Card letters let us follow equal values separately.'
        : length === 1 ? 'One card is already sorted. The outer loop will have no pass to run.'
          : 'An empty array is already sorted. Both loops will be skipped.',
      length > 1
        ? 'بندوّر على أصغر رقم في الجزء اللي لسه مش مترتّب، وبنعمل swap بينه وبين أول مكان في الجزء ده. الحروف اللي على الكروت بتخلّينا نفرّق بين الأرقام المتساوية.'
        : length === 1 ? 'رقم واحد يبقى sorted لوحده. الـ loop الخارجية مش هتلف ولا pass.'
          : 'الـ array الفاضية sorted أصلًا. مش هندخل ولا loop.'));

    state.n = length;
    emit('length', [2], message('Count the cards', 'بنعدّ الأرقام'),
      message('Use n to bound both loops. Indices start at zero.',
        'n هو اللي بيحدد الـ loops الاتنين هيقفوا فين. والـ index بيبدأ من 0.'), `n = ${length}`);

    for (let start = 0; ; start++) {
      state.start = start;
      state.scan = null;
      state.minIndex = null;
      state.condition = start < length - 1;
      emit('pass', [3], message(state.condition ? 'Choose the next fixed position' : 'No selection pass remains',
        state.condition ? 'بنختار المكان اللي هنثبّته دلوقتي' : 'خلاص، مفيش pass تانية'),
      message(state.condition
        ? `Indices before ${start} are final. Find the minimum of the suffix beginning at index ${start}.`
        : length > 1 ? 'Only the last card remains. Earlier passes guarantee it is at least as large as every fixed card.'
          : 'Fewer than two cards need no selection pass or value comparison.',
      state.condition
        ? `كل اللي قبل index ${start} خلاص في مكانه. دلوقتي هندوّر على أصغر رقم من index ${start} لآخر الـ array.`
        : length > 1 ? 'فاضل آخر رقم بس. الـ passes اللي فاتت ضامنة إنه مش أصغر من أي رقم اتثبّت.'
          : 'أقل من رقمين يبقى مش محتاجين ولا pass ولا مقارنة.'),
      `${start} < ${length - 1} → ${state.condition}`);
      if (!state.condition) break;

      state.minIndex = start;
      state.condition = null;
      emit('minimum', [4], message('Start with a candidate minimum', 'بنبدأ بأول رقم على إنه الأصغر'),
        message(`Card ${cardLabel(state.itemIds[start])} is the only suffix card considered so far. The rest still needs scanning.`,
          `الـ ${state.numbers[start]} هو الرقم الوحيد اللي شفناه لحد دلوقتي. لسه هنقارن الباقي.`),
        `minIndex = ${start}`);

      for (let scan = start + 1; ; scan++) {
        state.scan = scan;
        state.condition = scan < length;
        emit('scan', [5], message(state.condition ? 'Inspect the next candidate' : 'The suffix has been scanned',
          state.condition ? 'بنبص على الرقم اللي بعده' : 'خلّصنا الجزء كله'),
        message(state.condition
          ? `Index ${scan} is in bounds. Compare its value with the current minimum.`
          : `minIndex ${state.minIndex} now identifies the minimum of the whole unfixed suffix. No read occurs at index n.`,
        state.condition
          ? `index ${scan} لسه جوّه الـ array. هنقارن الرقم اللي فيه بأصغر رقم لقيناه.`
          : `minIndex بقى ${state.minIndex}، يعني بيشاور على أصغر رقم في الجزء اللي لسه مش مترتّب كله. ومش هنقرا حاجة عند index n.`),
        `${scan} < ${length} → ${state.condition}`);
        if (!state.condition) break;

        const candidate = state.numbers[scan];
        const minimum = state.numbers[state.minIndex];
        state.condition = candidate < minimum;
        state.comparisons++;
        emit('compare', [6], message(state.condition ? 'A smaller value was found' : 'Keep the current minimum',
          state.condition ? 'لقينا رقم أصغر' : 'الأصغر زي ما هو'),
        message(state.condition
          ? `The value at index ${scan} is smaller. Update minIndex next; no card moves yet.`
          : candidate === minimum ? 'The values are equal, so the strict less-than test fails. Keep the earlier candidate; later swaps can still break stability.'
            : `The value at index ${scan} is larger. It cannot replace the current minimum.`,
        state.condition
          ? `الـ ${candidate} أصغر من الـ ${minimum}، يبقى هنغيّر minIndex. لسه مفيش رقم اتحرّك.`
          : candidate === minimum ? 'الرقمين زي بعض، والـ condition عايز أصغر بالظبط، فطلع false. هنفضل على الرقم الأولاني، بس الـ swap اللي جاي ممكن برضه يخلّي الترتيب مش stable.'
            : `الـ ${candidate} أكبر من الـ ${minimum}، يبقى الأصغر زي ما هو.`),
        `${candidate} < ${minimum} → ${state.condition}`);
        if (state.condition) {
          state.minIndex = scan;
          emit('new-minimum', [7], message('Remember the smaller candidate', 'بنحفظ مكان الرقم الأصغر'),
            message(`Card ${cardLabel(state.itemIds[scan])} is now the minimum among the suffix cards examined so far. Continue scanning.`,
              `الـ ${state.numbers[scan]} بقى أصغر رقم من اللي شفناهم لحد دلوقتي. هنكمّل.`),
            `minIndex = ${scan}`);
        }
      }

      state.condition = state.minIndex !== start;
      if (!state.condition) state.fixedCount = start + 1;
      emit('swap-check', [8], message(state.condition ? 'The minimum belongs at start' : 'The minimum is already in place',
        state.condition ? 'الأصغر مكانه عند start' : 'الأصغر في مكانه أصلًا'),
      message(state.condition
        ? `Swap indices ${start} and ${state.minIndex} to extend the fixed prefix.`
        : `Skip a self-swap. Index ${start} is now final, but the full suffix still had to be scanned.`,
      state.condition
        ? `هنعمل swap بين index ${start} وindex ${state.minIndex}، كده الجزء المترتّب يكبر برقم.`
        : `مش هنعمل swap للرقم مع نفسه. index ${start} خلاص في مكانه النهائي، بس برضه كان لازم نلف على الجزء كله الأول.`),
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
            'الرقم التاني راح للجزء اللي لسه مش مترتّب، وكل اللي اتثبّت قبل كده فضل مكانه.')
          : message(`Card ${cardLabel(displacedId)} jumps past equal-valued card ${cardLabel(crossedId)}. Their relative order changes: this is why distant swaps can break stability.`,
            `الـ ${state.numbers[minIndex]} اللي اسمه ${cardLabel(displacedId)} عدّى الـ ${state.numbers[minIndex]} اللي اسمه ${cardLabel(crossedId)}، يعني ترتيبهم اتقلب. عشان كده الـ swap البعيد ممكن يخلّي الترتيب مش stable.`);
        emit('swap', [9], message('Fix the minimum in its final position', 'بنعمل swap والأصغر بيتثبّت'),
          message(`Card ${cardLabel(selectedId)} moves to index ${start}. ${detail.en}`,
            `الـ ${state.numbers[start]} راح لـ index ${start}. ${detail.ar}`),
          `swap(numbers[${start}], numbers[${minIndex}])`);
      }
    }

    state.fixedCount = length;
    state.done = true;
    state.result = state.numbers.slice();
    emit('done', [10], message('The array is sorted', 'الـ array بقت sorted'),
      message(length > 1
        ? `All ${length} cards are final. The trace used ${state.comparisons} value comparisons and ${state.swaps} swaps. Sorted input of this length needs the same comparisons.`
        : length === 1 ? 'Return the single value. No value comparison or swap was needed.'
          : 'Return an empty array. No value comparison or swap was needed.',
      length > 1
        ? `الـ ${length} أرقام كلهم في مكانهم النهائي. عدد المقارنات ${state.comparisons}، وعدد الـ swaps ${state.swaps}. ولو الـ array كانت sorted من الأول، كنا هنعمل نفس عدد المقارنات.`
        : length === 1 ? 'بنعمل return للرقم الوحيد، من غير ولا مقارنة ولا swap.'
          : 'بنعمل return لـ array فاضية، من غير ولا مقارنة ولا swap.'),
      `${length} × (${length} - 1) / 2 = ${state.comparisons} comparisons`);
    return frames;
  }

  const lesson = {
    id: 'selection-sort', name: 'Selection Sort', theme: 'algorithms', category: 'sort', number: '03',
    label: 'SELECTION SORT', cost: 'O(n²)',
    description: message('Scan for the minimum, swap it into place, and grow a fixed prefix.',
      'بندوّر على أصغر رقم، بنعمله swap لمكانه، والجزء المترتّب في أول الـ array بيكبر.'),
    note: message('Every suffix must be scanned, even on sorted input. Distant swaps make this version unstable.',
      'لازم نلف على كل الجزء اللي فاضل حتى لو الـ array sorted. والـ swap البعيد بيخلّي النسخة دي مش stable.'),
    code,
    keySteps: ['ready', 'minimum', 'compare', 'new-minimum', 'swap', 'done'],
    fields: [{ name: 'numbers', label: message('Numbers', 'الأرقام'), type: 'text', maxLength: MAX_TEXT,
      help: message('Up to 16 integers from -999 to 999, separated by commas or spaces. Arabic digits work. Leave blank for an empty array.',
        'لحد 16 رقم صحيح من -999 لـ 999، بينهم فاصلة أو مسافة. الأرقام العربي شغّالة برضه. سيبه فاضي لو عايز تجرّب array فاضية.') }],
    defaults: { numbers: '64, 25, 12, 22, 11' },
    presets: [
      { id: 'default', label: message('Find successive minima', 'أصغر رقم كل مرة'), input: { numbers: '64, 25, 12, 22, 11' } },
      { id: 'sorted', label: message('Sorted: still scan', 'sorted ولسه هنلف عليها'), input: { numbers: '1, 2, 3, 4, 5' } },
      { id: 'reverse', label: message('Reverse order', 'مترتّبة بالعكس'), input: { numbers: '5, 4, 3, 2, 1' } },
      { id: 'unstable', label: message('Equal cards change order', 'أرقام متساوية ترتيبها بيتقلب'), input: { numbers: '2, 2, 1' } },
      { id: 'equal', label: message('All values equal', 'كل الأرقام زي بعض'), input: { numbers: '4, 4, 4, 4' } },
      { id: 'negative', label: message('Negatives and duplicates', 'أرقام سالبة ومكرّرة'), input: { numbers: '-3, 0, -8, -3, 5' } },
      { id: 'singleton', label: message('One card', 'رقم واحد'), input: { numbers: '7' } },
      { id: 'empty', label: message('Empty array', 'array فاضية'), input: { numbers: '' } },
    ],
    parse, build,
    summary(input) {
      const numbers = validate(input);
      const comparisons = numbers.length * (numbers.length - 1) / 2;
      return message(`${numbers.length} cards · ${comparisons} value comparisons · ascending order`,
        `${numbers.length} أرقام · ${comparisons} مقارنة · من الصغير للكبير`);
    },
    theory: {
      idea: message('Find the smallest card in the unsorted part and swap it to the front of that part. Repeat, and the sorted part grows from the left one card at a time.',
        'بندوّر على أصغر رقم في الجزء اللي لسه مش مترتّب، وبنعمل swap بينه وبين أول مكان في الجزء ده. نكرّر ده، والجزء المترتّب يكبر من الشمال رقم رقم.'),
      title: message('Select, swap, and fix', 'بنختار الأصغر، نعمل swap، ونثبّته'),
      intro: message('Prerequisites: array indices, loops, comparisons, and swapping two values. This standard minimum-selection sort repeatedly finds the smallest remaining value and fixes one position. Indices are zero-based; letters A–P track original card identities.',
        'قبل ما تبدأ لازم تكون عارف الـ index في الـ array، والـ loops، والمقارنة، وإزاي تعمل swap لرقمين. دي Selection Sort العادية: كل مرة بنلاقي أصغر رقم فاضل ونثبّته في مكانه. الـ index بيبدأ من 0، والحروف من A لـ P بتقولك كل كارت كان مين في الأول.'),
      invariant: message('Before each pass, the prefix before start is sorted, final, and no greater than any suffix value. During a scan, minIndex identifies the first minimum among the suffix cards examined so far. Completing the scan and placing that minimum extends the invariant by one card. When at most one card remains, the entire array is sorted.',
        'قبل كل pass، الجزء اللي قبل start بيبقى sorted وفي مكانه النهائي، ومفيش فيه رقم أكبر من أي رقم بعده. وإحنا بنلف، minIndex بيشاور على أول أصغر رقم من الأرقام اللي شفناها لحد دلوقتي. لما نخلّص اللفة ونحط الأصغر ده في مكانه، الجزء المترتّب بيزيد رقم والـ invariant بيفضل صح. ولما يفضل رقم واحد أو مفيش خالص، الـ array كلها تبقى sorted.'),
      steps: [
        { title: message('Choose a position', 'بنختار مكان'), body: message('start is the first unfixed index. Begin with minIndex = start; there is no need to compare this card with itself.',
          'start هو أول index لسه متثبتش. بنبدأ بـ minIndex = start، ومش محتاجين نقارن الرقم بنفسه.') },
        { title: message('Scan every remaining candidate', 'بنقارن بكل اللي فاضل'), body: message('Compare each later value with the current minimum. Update minIndex only for a strictly smaller value. Changing the candidate moves a pointer, not a card.',
          'بنقارن كل رقم بعده بأصغر رقم لقيناه. بنغيّر minIndex بس لو الرقم أصغر بجد، مش مساوي. ولما minIndex بيتغيّر، اللي بيتغيّر هو الـ index اللي بنشاور عليه بس، والأرقام نفسها مبتتحرّكش.') },
        { title: message('Swap once, or skip', 'swap مرة واحدة أو مفيش'), body: message('After the full scan, swap the minimum into start if the indices differ. Otherwise skip the self-swap. Either way, this position is final and the next pass starts one place later.',
          'بعد ما نلف على الجزء كله، بنعمل swap للأصغر مع start لو الـ index مختلف. لو نفس الـ index، مفيش swap. وفي الحالتين المكان ده بقى نهائي، والـ pass الجاية بتبدأ من اللي بعده.') },
      ],
      notes: [
        message('Instability: in the equal-card preset, A and B both hold 2, with A first. Selecting the smaller card C swaps it with A, leaving B before A. Keeping the earlier equal minimum does not prevent this reversal.',
          'ليه مش stable: في مثال الأرقام المتساوية، A وB الاتنين قيمتهم 2، وA الأول. لما نختار الرقم الأصغر C ونعمل swap بينه وبين A، الـ B بيبقى قبل A. وإننا بنفضل على أول رقم مساوي مش بيمنع الترتيب إنه يتقلب.'),
        message('Even sorted and all-equal inputs need (n−1) + (n−2) + … + 1 = n(n−1)/2 value comparisons. This version has no early exit. The metric excludes loop-boundary and index checks.',
          'حتى لو الـ array sorted أو كل أرقامها زي بعض، محتاجين (n−1) + (n−2) + … + 1 = n(n−1)/2 مقارنة. النسخة دي مفيهاش خروج بدري. والعداد بيحسب مقارنات الأرقام بس، مش الـ conditions بتاعة الـ loops ولا مقارنة الـ index.'),
        message('Selection sort uses few swaps and can suit tiny inputs when moving records is expensive. It is a poor choice for large or nearly sorted arrays: insertion sort can exploit existing order, while selection sort still scans every suffix.',
          'Selection Sort بتعمل swaps قليلة، فممكن تنفع مع input صغير لو نقل البيانات تقيل. بس مش اختيار كويس لـ array كبيرة أو شبه sorted: Insertion Sort بتستفيد من الترتيب اللي موجود، لكن Selection Sort برضه بتلف على كل الجزء اللي فاضل.'),
        message('Complexity assumes constant-time comparisons and swaps. The algorithm itself is in-place with O(1) extra space.',
          'الـ complexity هنا على أساس إن المقارنة والـ swap بياخدوا وقت ثابت. وSelection Sort نفسها in-place، ومحتاجة مساحة زيادة O(1) بس.'),
      ],
      costs: [
        { label: message('Best / average / worst time', 'الوقت في الـ best / average / worst case'), value: 'Θ(n²)' },
        { label: message('Exact value comparisons', 'عدد المقارنات بالظبط'), value: 'n(n−1)/2' },
        { label: message('Swaps', 'عدد الـ swaps'), value: '0 … max(0, n−1)' },
        { label: message('Algorithm extra space', 'المساحة الزيادة'), value: 'O(1)' },
        { label: message('Stable', 'stable؟'), value: 'No / لأ' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
