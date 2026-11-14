(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const MAX_ITEMS = 16;
  const MAX_TEXT = 256;
  const code = [
    'quickSort(numbers):',
    '  sort(0, length(numbers) - 1)',
    '  return numbers',
    'sort(left, right):',
    '  if left >= right:',
    '    return',
    '  p = partition(left, right)',
    '  sort(left, p - 1)',
    '  sort(p + 1, right)',
    '  return',
    'partition(left, right):',
    '  value = numbers[right]',
    '  boundary = left - 1',
    '  scan = left',
    '  while scan < right:',
    '    if numbers[scan] <= value:',
    '      boundary = boundary + 1',
    '      swap(numbers[boundary], numbers[scan])',
    '    scan = scan + 1',
    '  swap(numbers[boundary + 1], numbers[right])',
    '  return boundary + 1',
  ];

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  // parse, build, and summary all use { numbers }; build validates independently.
  function validate(input) {
    if (!input || typeof input !== 'object' || !Array.isArray(input.numbers)) {
      fail('Expected { numbers: an array of integers }.', 'محتاجين numbers تكون صف أعداد صحيحة جوّه object.');
    }
    if (input.numbers.length > MAX_ITEMS) {
      fail('Use at most 16 integers.', 'اكتب ١٦ عدد صحيح بالكتير.');
    }
    // Indexed iteration also rejects sparse arrays; Array#some skips their holes.
    const numbers = [];
    for (let i = 0; i < input.numbers.length; i++) {
      const value = input.numbers[i];
      if (!Number.isSafeInteger(value) || value < -999 || value > 999) {
        fail('Each value must be an integer from -999 to 999.', 'كل value لازم تكون عدد صحيح من -999 لحد 999.');
      }
      numbers.push(Object.is(value, -0) ? 0 : value);
    }
    return { numbers };
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput.numbers !== 'string') {
      fail('Enter numbers as text.', 'اكتب الأرقام كنص في خانة numbers.');
    }
    if (rawInput.numbers.length > MAX_TEXT) {
      fail('Keep the input within 256 characters.', 'خلّي النص ٢٥٦ حرف بالكتير.');
    }
    const text = rawInput.numbers.trim()
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
    if (!text) return { numbers: [] };
    if (!/^[+-]?\d+(?:(?:\s*[,،]\s*|\s+)[+-]?\d+)*$/.test(text)) {
      fail('Separate whole numbers with spaces or commas; do not leave an empty entry.',
        'افصل الأعداد الصحيحة بمسافات أو فواصل، ومن غير خانة فاضية بين الفواصل.');
    }
    return validate({ numbers: text.split(/[,،\s]+/).map(Number) });
  }

  function summary(input) {
    const { numbers } = validate(input);
    return message(
      `${numbers.length} cards · Lomuto · last element pivot · ascending`,
      `${numbers.length} كارت · Lomuto · آخر كارت هو pivot · من الصغير للكبير`
    );
  }

  function build(input) {
    const { numbers } = validate(input);
    const state = {
      numbers, slots: numbers.map((_, index) => `item-${index}`),
      left: null, right: null, scan: null, boundary: null,
      value: null, pivotIndex: null, pivotId: null, p: null,
      condition: null, swap: null, partitioned: false,
      finalized: [], finalizedPivots: [], callStack: [],
      pendingRanges: [{ left: 0, right: numbers.length - 1 }],
      comparisons: 0, swaps: 0, selfSwaps: 0, partitions: 0,
      calls: 0, maxDepth: 0, done: false, result: null,
    };
    const frames = [];
    const rangeText = ({ left, right }) => `${left > right ? '∅ ' : ''}[${left}, ${right}]`;

    function scene() {
      let note;
      if (state.done) {
        note = message('Every position is final; the sort call stack and pending calls are empty.',
          'كل كارت في مكانه النهائي؛ مفيش استدعاءات sort شغّالة أو مستنيّة.');
      } else if (state.partitioned) {
        note = message(`The pivot at index ${state.pivotIndex} is final. Child ranges exclude it.`,
          `pivot في المكان ${state.pivotIndex} ثبت. الأجزاء الصغيرة مش بتشمله.`);
      } else if (state.scan !== null && state.boundary !== null) {
        note = message(
          `Pivot = ${state.value}; scan = ${state.scan}; boundary = ${state.boundary}${state.boundary === state.left - 1 ? ' (before this range)' : ''}.`,
          `pivot = ${state.value}؛ scan = ${state.scan}؛ boundary = ${state.boundary}${state.boundary === state.left - 1 ? ' (قبل بداية الجزء ده)' : ''}.`
        );
      } else if (state.left !== null) {
        note = message(`Current range ${rangeText(state)}. Range endpoints are inclusive.`,
          `شغّالين على الجزء ${rangeText(state)}. البداية والنهاية داخلين معانا.`);
      } else {
        note = message('Indices start at 0. Each partition uses its last card as pivot.',
          'الأماكن بتبدأ من 0. كل partition بتختار آخر كارت عندها كـ pivot.');
      }
      return {
        rows: [{
          id: 'numbers', label: message('Array', 'الصف'), layout: 'cards',
          cells: state.numbers.map((value, index) => {
            const markers = [];
            if (index === state.left) markers.push('left');
            if (index === state.right) markers.push('right');
            if (index === state.scan) markers.push('scan');
            if (index === state.boundary) markers.push('boundary');
            if (state.finalizedPivots.includes(index)) markers.push('pivot ✓');
            else if (index === state.pivotIndex) markers.push('pivot');
            let tone = 'default';
            if (state.left !== null && (index < state.left || index > state.right)) tone = 'muted';
            if (index === state.scan || (state.swap && (index === state.swap.from || index === state.swap.to))) tone = 'active';
            if (index === state.pivotIndex) tone = 'pivot';
            if (state.finalized.includes(index)) tone = 'sorted';
            return { id: state.slots[index], value, index, tone, marker: markers.join(' · ') };
          }),
        }],
        graph: null,
        collections: [
          {
            label: message('Sort call stack · top last', 'استدعاءات sort الشغّالة · الحالي في الآخر'),
            values: state.callStack.map(call => `sort(${call.left}, ${call.right}) · ${call.phase}${call.p === null ? '' : ` · p=${call.p}`}`),
          },
          {
            label: message('Pending calls · next first', 'الاستدعاءات المستنيّة · الجاي في الأول'),
            values: state.pendingRanges.map(rangeText),
          },
          {
            label: message('Finalized pivot indices', 'أماكن الـ pivots اللي ثبتت'),
            values: state.finalizedPivots.map(String),
          },
        ],
        note,
      };
    }

    function emit(kind, lines, title, explanation, equation = '') {
      const visible = value => value === null ? '—' : value;
      // Copy the whole frame: no references are shared with inputs or other frames.
      frames.push(copy({
        kind, lines, title, explanation, equation, state,
        variables: [
          ...['left', 'right', 'value', 'pivotIndex', 'boundary', 'scan', 'p', 'condition']
            .map(name => ({ name, value: visible(state[name]) })),
          { name: 'sort depth', value: state.callStack.length },
        ],
        metrics: [
          { label: message('Value comparisons', 'مقارنات القيم'), value: state.comparisons },
          { label: message('Swaps', 'تبديلات فعلية'), value: state.swaps },
          { label: message('Self-swaps', 'تبديلات في نفس المكان'), value: state.selfSwaps },
          { label: message('Partitions', 'مرّات التقسيم'), value: state.partitions },
          { label: message('Max sort depth', 'أكبر عمق لاستدعاءات sort'), value: state.maxDepth },
        ],
        scene: scene(),
      }));
    }

    function focus(call) {
      state.left = call ? call.left : null;
      state.right = call ? call.right : null;
      state.p = call ? call.p : null;
      state.scan = null;
      state.boundary = null;
      state.condition = null;
      state.swap = null;
      state.partitioned = state.p !== null;
      state.pivotIndex = state.p;
      state.pivotId = state.p === null ? null : state.slots[state.p];
      state.value = state.p === null ? null : state.numbers[state.p];
    }

    function finalize(index, pivot) {
      state.finalized.push(index);
      state.finalized.sort((a, b) => a - b);
      if (pivot) {
        state.finalizedPivots.push(index);
        state.finalizedPivots.sort((a, b) => a - b);
      }
    }

    function exchange(from, to, purpose) {
      state.swap = {
        from, to, purpose, moved: from !== to,
        idsBefore: [state.slots[from], state.slots[to]],
        valuesBefore: [state.numbers[from], state.numbers[to]],
      };
      [state.numbers[from], state.numbers[to]] = [state.numbers[to], state.numbers[from]];
      [state.slots[from], state.slots[to]] = [state.slots[to], state.slots[from]];
      if (from === to) state.selfSwaps++;
      else state.swaps++;
      if (purpose === 'pivot') state.pivotIndex = from;
      const title = from === to
        ? message('A self-swap moves no cards', 'تبديل في نفس المكان؛ مفيش كارت بيتحرّك')
        : purpose === 'pivot'
          ? message('Place the pivot between the two regions', 'نحط pivot بين الجزئين')
          : message('Move the accepted card to the boundary', 'ننقل الكارت المقبول عند boundary');
      let explanation;
      if (purpose === 'pivot') {
        explanation = message(
          from === to
            ? `The pivot already occupies index ${from}. All scanned values are <= ${state.value}; this split leaves an empty right side.`
            : `Swap indices ${from} and ${to}. The pivot now separates values <= ${state.value} on its left from values > ${state.value} on its right.`,
          from === to
            ? `pivot أصلًا في المكان ${from}. كل القيم اللي فحصناها <= ${state.value}، فالتقسيم ده هيسيّب اليمين فاضي.`
            : `نبدّل المكان ${from} مع ${to}. كده pivot فصل القيم <= ${state.value} على شماله عن القيم > ${state.value} على يمينه.`
        );
      } else {
        explanation = message(
          from === to
            ? `boundary and scan both equal ${from}. This card is already in the <= ${state.value} region; the swap instruction changes nothing.`
            : `Exchange indices ${from} and ${to}. The accepted card joins the <= ${state.value} region; the displaced larger card stays in the scanned region.`,
          from === to
            ? `boundary وscan الاتنين عند ${from}. الكارت ده أصلًا في جزء <= ${state.value}؛ أمر التبديل مش هيغيّر حاجة.`
            : `نبدّل المكان ${from} مع ${to}. الكارت المقبول يدخل جزء <= ${state.value}، والكارت الأكبر يفضل جوّه الجزء اللي فحصناه.`
        );
      }
      emit(purpose === 'pivot' ? 'pivot-swap' : 'swap', [purpose === 'pivot' ? 20 : 18],
        title, explanation, `swap(numbers[${from}], numbers[${to}])`);
      state.swap = null;
    }

    function partition(left, right) {
      state.partitions++;
      emit('partition-call', [7, 11], message('Partition the current range', 'نقسّم الجزء الحالي'),
        message(`Partition indices ${left} through ${right}. Only this range can move.`,
          `هنقسّم من المكان ${left} لحد ${right}. الكروت اللي برّه الجزء ده هتفضل مكانها.`));
      state.value = state.numbers[right];
      state.pivotId = state.slots[right];
      state.pivotIndex = right;
      emit('pivot', [12], message(`Use ${state.value} as the pivot`, `نختار ${state.value} كـ pivot`),
        message(`Save value from index ${right}. Its card stays there until the final partition swap.`,
          `نحفظ value من المكان ${right}. الكارت نفسه هيفضل هناك لحد آخر تبديل في partition.`),
        `value = numbers[${right}] = ${state.value}`);
      state.boundary = left - 1;
      emit('boundary-start', [13], message('Start with an empty small-value region', 'نبدأ والجزء الصغير فاضي'),
        message(`boundary = ${state.boundary} sits just before this range. No value has been accepted yet.`,
          `boundary = ${state.boundary} قبل بداية الجزء ده. لسه مفيش قيمة دخلت جزء الأصغر أو المساوي.`),
        `boundary = ${left} - 1 = ${state.boundary}`);
      state.scan = left;
      emit('scan-start', [14], message('Start scanning at left', 'نبدأ الفحص من left'),
        message(`scan starts at index ${left}. The pivot at ${right} is excluded from the scan.`,
          `scan بيبدأ من المكان ${left}. مش هنفحص pivot اللي في المكان ${right}.`), `scan = ${left}`);
      while (true) {
        state.condition = state.scan < right;
        emit('scan-check', [15], message(state.condition ? 'Another card remains to scan' : 'The scan reached the pivot',
          state.condition ? 'لسه في كارت نفحصه' : 'scan وصل للـ pivot'),
        message(state.condition
          ? `Index ${state.scan} is before the pivot; its value can be compared.`
          : `Every non-pivot card in this range was compared. The pivot belongs at boundary + 1 = ${state.boundary + 1}.`,
        state.condition
          ? `المكان ${state.scan} قبل pivot؛ نقدر نقارن قيمته.`
          : `قارنّا كل الكروت في الجزء ده ما عدا pivot. مكانه هيكون boundary + 1 = ${state.boundary + 1}.`),
        `${state.scan} < ${right} → ${state.condition}`);
        if (!state.condition) break;
        const scanned = state.numbers[state.scan];
        state.condition = scanned <= state.value;
        state.comparisons++;
        emit('compare', [16], message(state.condition ? 'Accept this value on the left' : 'Keep this value in the larger region',
          state.condition ? 'القيمة دي تدخل الجزء الشمال' : 'القيمة دي تفضل في الجزء الأكبر'),
        message(state.condition
          ? `At index ${state.scan}, ${scanned} <= ${state.value}. Grow the accepted region before swapping this card into it.`
          : `At index ${state.scan}, ${scanned} > ${state.value}. Leave this card in place and keep boundary at ${state.boundary}.`,
        state.condition
          ? `في المكان ${state.scan}، ${scanned} <= ${state.value}. هنكبّر الجزء المقبول وبعدين نبدّل الكارت عشان يدخل فيه.`
          : `في المكان ${state.scan}، ${scanned} > ${state.value}. نسيب الكارت مكانه وboundary يفضل عند ${state.boundary}.`),
        `${scanned} <= ${state.value} → ${state.condition}`);
        if (state.condition) {
          state.boundary++;
          emit('boundary-advance', [17], message('Reserve the next accepted position', 'نجهّز المكان المقبول الجاي'),
            message(`Advance boundary to ${state.boundary}. The next swap fills this position with the accepted card at scan = ${state.scan}.`,
              `نزوّد boundary لحد ${state.boundary}. التبديل الجاي هيحط هنا الكارت المقبول اللي عند scan = ${state.scan}.`),
            `boundary = ${state.boundary}`);
          exchange(state.boundary, state.scan, 'scan');
        }
        state.scan++;
        state.condition = null;
        emit('scan-advance', [19], message('Move scan one place right', 'نحرّك scan مكان يمين'),
          message(`scan is now ${state.scan}. Recheck the loop guard before reading another value.`,
            `scan بقى ${state.scan}. نراجع شرط الحلقة قبل ما نقرأ قيمة جديدة.`), `scan = ${state.scan}`);
      }
      state.condition = null;
      exchange(state.boundary + 1, right, 'pivot');
      finalize(state.pivotIndex, true);
      state.partitioned = true;
      emit('partition-return', [21], message('This pivot is finalized', 'pivot ده ثبت في مكانه'),
        message(`Return index ${state.pivotIndex}. No later recursive call includes this position; the two sides still need sorting.`,
          `نرجّع المكان ${state.pivotIndex}. مفيش استدعاء بعد كده هيشمل المكان ده؛ لسه هنرتّب الجزئين اللي حواليه.`),
        `return ${state.boundary} + 1 = ${state.pivotIndex}`);
      return state.pivotIndex;
    }

    function sort(left, right) {
      state.pendingRanges.shift();
      const call = { left, right, p: null, phase: 'enter' };
      state.callStack.push(call);
      state.calls++;
      state.maxDepth = Math.max(state.maxDepth, state.callStack.length);
      focus(call);
      emit('enter', [4], message('Enter a sort call', 'ندخل استدعاء sort'),
        message(`Work on ${rangeText(call)} at sort depth ${state.callStack.length}. Suspended callers stay on the stack.`,
          `نشتغل على ${rangeText(call)} بعمق sort = ${state.callStack.length}. الاستدعاءات اللي مستنيّة رجوعنا لسه في الـ stack.`),
        `sort(${left}, ${right})`);
      state.condition = left >= right;
      emit('base-check', [5], message(state.condition ? 'This range needs no partition' : 'This range needs partitioning',
        state.condition ? 'الجزء ده مش محتاج partition' : 'الجزء ده محتاج partition'),
      message(left > right ? 'The range is empty. Return without reading any card.'
        : left === right ? `Only index ${left} remains. A single card is already sorted.`
          : `There are ${right - left + 1} cards in this range. Choose a pivot and partition them.`,
      left > right ? 'الجزء فاضي. نرجع من غير ما نقرأ أي كارت.'
        : left === right ? `فاضل المكان ${left} لوحده. كارت واحد مترتّب أصلًا.`
          : `في ${right - left + 1} كروت في الجزء ده. نختار pivot ونقسّمهم.`),
      `${left} >= ${right} → ${state.condition}`);
      if (state.condition) {
        call.phase = 'return';
        if (left === right) finalize(left, false);
        emit('base-return', [6], message('Return to the caller', 'نرجع للاستدعاء اللي قبلنا'),
          message(left === right
            ? `Finalize index ${left} without comparisons or swaps, then return.`
            : 'This empty call performs no comparisons or swaps, then returns.',
          left === right
            ? `نثبّت المكان ${left} من غير مقارنات أو تبديلات، ونرجع.`
            : 'الاستدعاء الفاضي ده مش بيعمل مقارنات أو تبديلات؛ نرجع.'), 'return');
        state.callStack.pop();
        return;
      }
      state.condition = null;
      call.phase = 'partition';
      call.p = partition(left, right);
      focus(call);
      state.pendingRanges.unshift({ left, right: call.p - 1 }, { left: call.p + 1, right });
      emit('partition-result', [7], message('Split the remaining work around p', 'نوزّع الشغل اللي فاضل حوالين p'),
        message(`p = ${call.p}. Schedule the left range first, then the right range. Neither includes the finalized pivot.`,
          `p = ${call.p}. نجهّز الجزء الشمال الأول، وبعده اليمين. ولا واحد فيهم بيشمل pivot اللي ثبت.`), `p = ${call.p}`);
      call.phase = 'left';
      emit('call-left', [8], message('Sort the left side', 'نرتّب الجزء الشمال'),
        message(`Call sort(${left}, ${call.p - 1}); the right side waits while this call runs.`,
          `نستدعي sort(${left}, ${call.p - 1})؛ الجزء اليمين هيستنى لحد ما نخلّص.`),
        `sort(${left}, ${call.p - 1})`);
      sort(left, call.p - 1);
      focus(call);
      call.phase = 'right';
      emit('call-right', [9], message('The left side returned; sort the right', 'الشمال خلص؛ نرتّب اليمين'),
        message(`The left side is sorted. Call sort(${call.p + 1}, ${right}) for the remaining side.`,
          `الجزء الشمال اترتّب. نستدعي sort(${call.p + 1}, ${right}) عشان نخلّص الجزء التاني.`),
        `sort(${call.p + 1}, ${right})`);
      sort(call.p + 1, right);
      focus(call);
      call.phase = 'return';
      emit('return', [10], message('Both sides are sorted', 'الجزئين اترتّبوا'),
        message(`The pivot and both sorted sides complete range [${left}, ${right}]. Return without a merge step.`,
          `pivot والجزئين المترتّبين خلّصوا الجزء [${left}, ${right}]. نرجع من غير خطوة دمج.`), 'return');
      state.callStack.pop();
    }

    emit('ready', [], message('Quicksort: partition, then recurse', 'Quicksort: نقسّم، ونكرّر على الأجزاء'),
      message(numbers.length === 0
        ? 'The input is empty. Watch the base case return without choosing a pivot.'
        : `Start with ${numbers.length} cards. Each partition uses its last card as pivot, then sorts the two remaining ranges.`,
      numbers.length === 0
        ? 'الصف فاضي. هنشوف حالة التوقّف بترجع من غير ما تختار pivot.'
        : `هنبدأ بـ ${numbers.length} كارت. كل partition بتختار آخر كارت كـ pivot، وبعدين بنرتّب الجزئين اللي فاضلين.`));
    emit('start', [2], message('Call sort on the whole input', 'نستدعي sort على الصف كله'),
      message(`Begin with inclusive bounds 0 and ${numbers.length - 1}.`,
        `نبدأ من 0 لحد ${numbers.length - 1}، والحدّين داخلين معانا.`), `sort(0, ${numbers.length - 1})`);
    sort(0, numbers.length - 1);
    focus(null);
    state.done = true;
    state.result = [...state.numbers];
    emit('done', [3], message(numbers.length ? 'The array is sorted' : 'The empty array is sorted',
      numbers.length ? 'كل الكروت اتّرتّبت' : 'الصف الفاضي مترتّب أصلًا'),
    message(`Return the ascending result after ${state.comparisons} value comparisons and ${state.swaps} swaps between distinct positions. Self-swaps are counted separately.`,
      `نرجّع الناتج من الصغير للكبير بعد ${state.comparisons} مقارنة قيم و${state.swaps} تبديل بين مكانين مختلفين. التبديلات في نفس المكان ليها عدّاد لوحدها.`),
    'return numbers');
    return frames;
  }

  const lesson = {
    id: 'quick-sort', name: 'Quicksort', category: 'sort', number: '06',
    label: 'QUICKSORT', cost: 'O(n²)',
    description: message('Use a last-element pivot to partition a range, fix its position, and recursively sort both sides.',
      'نختار آخر كارت كـ pivot، نقسّم الجزء حواليه ونثبّته، وبعدين نرتّب كل ناحية بـ recursion.'),
    note: message('Lomuto partition · <= goes left · inclusive, zero-based ranges · unstable',
      'تقسيم Lomuto · الأصغر أو المساوي يروح شمال · الحدود شاملة وبتبدأ من 0 · مش stable'),
    code,
    fields: [{
      name: 'numbers', label: message('Numbers', 'الأرقام'), type: 'text', maxLength: MAX_TEXT,
      help: message('Up to 16 integers from -999 to 999. Separate with spaces or commas ( , or ، ). Arabic and Persian digits work. Leave blank for an empty array.',
        '١٦ عدد صحيح بالكتير، من -999 لحد 999. افصل بمسافات أو فواصل ( , أو ، ). الأرقام العربي والفارسي شغّالة. سيبها فاضية عشان صف فاضي.'),
    }],
    defaults: { numbers: '8, 3, 1, 7, 0, 10, 2, 5' },
    presets: [
      { id: 'default', label: message('Mixed values', 'قيم متلخبطة'), input: { numbers: '8, 3, 1, 7, 0, 10, 2, 5' } },
      { id: 'sorted', label: message('Sorted · worst-case splits', 'مترتّب · أسوأ تقسيم'), input: { numbers: '1, 2, 3, 4, 5, 6, 7, 8' } },
      { id: 'reverse', label: message('Reverse order', 'ترتيب عكسي'), input: { numbers: '8, 7, 6, 5, 4, 3, 2, 1' } },
      { id: 'equal', label: message('All equal · unbalanced', 'كلهم متساويين · تقسيم مش متوازن'), input: { numbers: '4, 4, 4, 4, 4, 4' } },
      { id: 'unstable', label: message('Equal cards can reverse', 'الكروت المتساوية ممكن تعكس ترتيبها'), input: { numbers: '2, 2, 1' } },
      { id: 'negatives', label: message('Negatives and duplicates', 'سوالب وتكرار'), input: { numbers: '-5, 3, 0, -5, 3, -1' } },
      { id: 'limits', label: message('Value limits', 'أصغر وأكبر قيمة مسموحة'), input: { numbers: '999, -999, 0, 999, -999' } },
      { id: 'single', label: message('One card', 'كارت واحد'), input: { numbers: '7' } },
      { id: 'empty', label: message('Empty input', 'صف فاضي'), input: { numbers: '' } },
    ],
    parse, build, summary,
    theory: {
      title: message('Quicksort with Lomuto partitioning', 'Quicksort بتقسيم Lomuto'),
      intro: message('Prerequisites: zero-based array indices, swaps, loops, and recursive calls. This version sorts ascending with inclusive left/right bounds, chooses the last element as pivot, and sends equal values left.',
        'قبل ما نبدأ: نكون فاهمين أماكن الصف اللي بتبدأ من 0، والتبديل، والحلقات، وrecursion. النسخة دي بترتّب تصاعدي بحدود left وright شاملة، وبتختار آخر كارت كـ pivot، والمساوي بيروح شمال.'),
      invariant: message('At every loop guard: [left, boundary] contains values <= value; [boundary + 1, scan - 1] contains values > value; [scan, right - 1] is unexamined; numbers[right] is the pivot. Empty ranges are allowed. After scanning, swapping the pivot into boundary + 1 fixes its position. Recursing on strictly smaller sides sorts the whole range; empty and singleton ranges terminate.',
        'عند كل فحص لشرط الحلقة: من left لحد boundary القيم <= value؛ ومن boundary + 1 لحد scan - 1 القيم > value؛ ومن scan لحد right - 1 لسه متفحصش؛ وnumbers[right] هو pivot. أي جزء ممكن يكون فاضي. بعد الفحص، تبديل pivot مع boundary + 1 بيثبّته. بنكرّر على جزئين أصغر فعلًا، ولما الجزء يبقى فاضي أو كارت واحد بنقف؛ كده الجزء كله بيترتّب.'),
      steps: [
        { title: message('1. Stop on small ranges', '١. نقف عند الأجزاء الصغيرة'),
          body: message('If left >= right, return. A singleton is final; an empty range reads no card. Suspended sort calls remain visible on the stack.',
            'لو left >= right نرجع. الكارت الواحد مكانه نهائي؛ والجزء الفاضي مش بيقرأ كروت. استدعاءات sort المستنيّة بتفضل ظاهرة في الـ stack.') },
        { title: message('2. Save the pivot value', '٢. نحفظ قيمة pivot'),
          body: message('Save numbers[right] as value, set boundary = left - 1, and scan from left. The pivot card stays at right during the scan.',
            'نحفظ numbers[right] في value، ونخلّي boundary = left - 1، ونبدأ scan من left. كارت pivot يفضل عند right طول الفحص.') },
        { title: message('3. Grow the accepted region', '٣. نكبّر الجزء المقبول'),
          body: message('Compare each scanned value with the pivot. For <=, increment boundary and swap with scan; otherwise leave the card. Advancing scan restores the loop invariant for the next guard.',
            'نقارن كل قيمة بـ pivot. لو <= نزوّد boundary ونبدّل مع scan؛ غير كده نسيب الكارت. لما نزوّد scan، شرط صحة التقسيم يرجع متحقّق عند فحص الحلقة الجاي.') },
        { title: message('4. Fix the pivot and recurse', '٤. نثبّت pivot ونكرّر'),
          body: message('Swap the pivot into boundary + 1 and return that index as p. Sort [left, p - 1], then [p + 1, right]. Never include p again. No merge is needed.',
            'نبدّل pivot مع boundary + 1 ونرجّع المكان ده في p. نرتّب [left, p - 1] وبعده [p + 1, right]. المكان p مش بيدخل تاني. مش محتاجين دمج.') },
      ],
      notes: [
        message('A partition of m cards makes exactly m - 1 value comparisons. The comparison metric excludes range and loop guards. Swaps count exchanges of distinct positions; self-swaps are separate and move no cards.',
          'partition فيها m كارت بتعمل بالظبط m - 1 مقارنة قيم. العدّاد مش بيشمل شروط الحدود والحلقة. عدّاد swaps بيحسب التبديل بين مكانين مختلفين؛ والتبديل في نفس المكان له عدّاد لوحده ومش بيحرّك كروت.'),
        message('Average O(n log n) assumes distinct values in uniformly random input order for this deterministic last-pivot scheme. Balanced partitions also give O(n log n). This implementation does not shuffle or randomize its pivot.',
          'متوسط O(n log n) هنا بيفترض قيم مختلفة وترتيب إدخال عشوائي بالتساوي، لأننا بنختار آخر pivot بشكل ثابت. التقسيم المتوازن كمان بيدي O(n log n). النسخة دي مش بتلخبط الإدخال ولا بتختار pivot عشوائي.'),
        message('Sorted, reverse-sorted, and all-equal inputs can leave one side empty repeatedly: n(n - 1)/2 comparisons, O(n²) time, and O(n) recursive depth. Equal values all go left with <=. Three-way partitioning is better suited to many duplicates; randomized pivots help with ordered inputs.',
          'الإدخال المترتّب أو العكسي أو اللي كله متساوي ممكن يسيب ناحية فاضية كل مرة: n(n - 1)/2 مقارنة، ووقت O(n²)، وعمق recursion من O(n). مع <= كل المتساوي بيروح شمال. تقسيم ثلاثي أنسب للتكرار الكتير؛ واختيار pivot عشوائي بيساعد مع الإدخال المترتّب.'),
        message('Quicksort is unstable: in the equal-cards preset, the two cards with value 2 reverse their original order when pivot 1 moves to the front. Stable item IDs expose their movement even when the numbers look identical.',
          'Quicksort مش stable: في مثال الكروت المتساوية، كارتين القيمة 2 بيعكسوا ترتيبهم الأصلي لما pivot اللي قيمته 1 ييجي للأول. كل كارت له ID ثابت يوضّح حركته حتى لو الأرقام شبه بعض.'),
        message('Partitioning uses O(1) auxiliary space, but this recursive version is not O(1) space overall: balanced or expected depth is O(log n) under the average-case assumptions; worst depth is O(n). The depth metric counts sort calls, including base cases, and excludes the constant-size partition helper.',
          'التقسيم بيستخدم مساحة إضافية O(1)، بس النسخة اللي فيها recursion مش O(1) إجمالًا: العمق المتوازن أو المتوقع O(log n) بنفس افتراضات المتوسط، والأسوأ O(n). عدّاد العمق بيحسب استدعاءات sort حتى حالات التوقّف، ومش بيحسب partition اللي مساحتها ثابتة.'),
        message('The algorithm exchanges cards in place and needs no merge buffer. This teaching API copies its input and stores independent snapshots for seeking; that visualization storage is extra and is not included in the algorithm space bounds.',
          'الخوارزمية بتبدّل الكروت جوّه الصف ومش محتاجة مساحة دمج. الـ API التعليمي بينسخ الإدخال وبيحفظ snapshots مستقلة عشان نرجع لأي خطوة؛ تخزين العرض ده زيادة ومش داخل في حساب مساحة الخوارزمية.'),
      ],
      costs: [
        { label: message('One partition', 'تقسيم واحد'), value: 'O(m) time · O(1) auxiliary space' },
        { label: message('Average time · random distinct input', 'متوسط الوقت · قيم مختلفة بترتيب عشوائي'), value: 'O(n log n)' },
        { label: message('Best time · balanced splits', 'أفضل وقت · تقسيم متوازن'), value: 'O(n log n)' },
        { label: message('Worst time', 'أسوأ وقت'), value: 'O(n²)' },
        { label: message('Balanced / expected recursion space', 'مساحة recursion المتوازنة / المتوقعة'), value: 'O(log n)' },
        { label: message('Worst recursion space', 'أسوأ مساحة recursion'), value: 'O(n)' },
        { label: message('Stable?', 'بيحافظ على ترتيب المتساوي؟'), value: 'No' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
