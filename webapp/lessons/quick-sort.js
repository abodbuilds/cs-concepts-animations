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
      fail('Expected { numbers: an array of integers }.', 'لازم numbers تبقى array من الأرقام الصحيحة جوّه object.');
    }
    if (input.numbers.length > MAX_ITEMS) {
      fail('Use at most 16 integers.', 'اكتب 16 رقم صحيح بالكتير.');
    }
    // Indexed iteration also rejects sparse arrays; Array#some skips their holes.
    const numbers = [];
    for (let i = 0; i < input.numbers.length; i++) {
      const value = input.numbers[i];
      if (!Number.isSafeInteger(value) || value < -999 || value > 999) {
        fail('Each value must be an integer from -999 to 999.', 'كل رقم لازم يكون صحيح ومن -999 لحد 999.');
      }
      numbers.push(Object.is(value, -0) ? 0 : value);
    }
    return { numbers };
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput.numbers !== 'string') {
      fail('Enter numbers as text.', 'اكتب الأرقام كـ text.');
    }
    if (rawInput.numbers.length > MAX_TEXT) {
      fail('Keep the input within 256 characters.', 'متكتبش أكتر من 256 character.');
    }
    const text = rawInput.numbers.trim()
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
    if (!text) return { numbers: [] };
    if (!/^[+-]?\d+(?:(?:\s*[,،]\s*|\s+)[+-]?\d+)*$/.test(text)) {
      fail('Separate whole numbers with spaces or commas; do not leave an empty entry.',
        'افصل بين الأرقام الصحيحة بمسافة أو comma، ومتسيبش حاجة فاضية بين الـ commas.');
    }
    return validate({ numbers: text.split(/[,،\s]+/).map(Number) });
  }

  function summary(input) {
    const { numbers } = validate(input);
    return message(
      `${numbers.length} cards · Lomuto · last element pivot · ascending`,
      `عدد الأرقام ${numbers.length} · Lomuto · آخر رقم هو الـ pivot · من الصغير للكبير`
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
          'كل element في مكانه النهائي. الـ call stack بتاع sort فاضي، ومفيش calls مستنيّة.');
      } else if (state.partitioned) {
        note = message(`The pivot at index ${state.pivotIndex} is final. Child ranges exclude it.`,
          `الـ pivot اللي في index ${state.pivotIndex} ثبت مكانه. الجزئين اللي جايين مش بيشملوه.`);
      } else if (state.scan !== null && state.boundary !== null) {
        note = message(
          `Pivot = ${state.value}; scan = ${state.scan}; boundary = ${state.boundary}${state.boundary === state.left - 1 ? ' (before this range)' : ''}.`,
          `الـ pivot = ${state.value}، scan = ${state.scan}، boundary = ${state.boundary}${state.boundary === state.left - 1 ? ' (قبل أول الجزء ده)' : ''}.`
        );
      } else if (state.left !== null) {
        note = message(`Current range ${rangeText(state)}. Range endpoints are inclusive.`,
          `شغّالين دلوقتي على ${rangeText(state)}. أول وآخر index داخلين في الجزء.`);
      } else {
        note = message('Indices start at 0. Each partition uses its last card as pivot.',
          'الـ index بيبدأ من 0. كل partition بياخد آخر element في الجزء بتاعه كـ pivot.');
      }
      return {
        rows: [{
          id: 'numbers', label: message('Array', 'الـ array'), layout: 'cards',
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
            label: message('Sort call stack · top last', 'الـ call stack بتاع sort · اللي فوق في الآخر'),
            values: state.callStack.map(call => `sort(${call.left}, ${call.right}) · ${call.phase}${call.p === null ? '' : ` · p=${call.p}`}`),
          },
          {
            label: message('Pending calls · next first', 'الـ calls المستنيّة · الجاي في الأول'),
            values: state.pendingRanges.map(rangeText),
          },
          {
            label: message('Finalized pivot indices', 'الـ index بتاع كل pivot ثبت'),
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
          { label: message('Value comparisons', 'مقارنات الأرقام'), value: state.comparisons },
          { label: message('Swaps', 'الـ swaps'), value: state.swaps },
          { label: message('Self-swaps', 'swap في نفس المكان'), value: state.selfSwaps },
          { label: message('Partitions', 'عدد الـ partitions'), value: state.partitions },
          { label: message('Max sort depth', 'أكبر depth وصله sort'), value: state.maxDepth },
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
        ? message('A self-swap moves no cards', 'swap في نفس المكان، مفيش حاجة بتتحرّك')
        : purpose === 'pivot'
          ? message('Place the pivot between the two regions', 'بنحط الـ pivot بين الجزئين')
          : message('Move the accepted card to the boundary', `بنعمل swap ونجيب الـ ${state.swap.valuesBefore[1]} عند boundary`);
      let explanation;
      if (purpose === 'pivot') {
        explanation = message(
          from === to
            ? `The pivot already occupies index ${from}. All scanned values are <= ${state.value}; this split leaves an empty right side.`
            : `Swap indices ${from} and ${to}. The pivot now separates values <= ${state.value} on its left from values > ${state.value} on its right.`,
          from === to
            ? `الـ pivot أصلًا في index ${from}. كل الأرقام اللي شفناها <= ${state.value}، فاليمين هيفضل فاضي.`
            : `بنعمل swap بين index ${from} وindex ${to}. دلوقتي الأرقام <= ${state.value} على شمال الـ pivot، والأرقام > ${state.value} على يمينه.`
        );
      } else {
        explanation = message(
          from === to
            ? `boundary and scan both equal ${from}. This card is already in the <= ${state.value} region; the swap instruction changes nothing.`
            : `Exchange indices ${from} and ${to}. The accepted card joins the <= ${state.value} region; the displaced larger card stays in the scanned region.`,
          from === to
            ? `boundary وscan الاتنين = ${from}. الرقم ده أصلًا في جزء الـ <= ${state.value}، فالـ swap مش هيغيّر حاجة.`
            : `بنعمل swap بين index ${from} وindex ${to}. الرقم اللي قبلناه دخل جزء الـ <= ${state.value}، والرقم الأكبر اللي اتشال لسه في الجزء اللي عدّينا عليه.`
        );
      }
      emit(purpose === 'pivot' ? 'pivot-swap' : 'swap', [purpose === 'pivot' ? 20 : 18],
        title, explanation, `swap(numbers[${from}], numbers[${to}])`);
      state.swap = null;
    }

    function partition(left, right) {
      state.partitions++;
      emit('partition-call', [7, 11], message('Partition the current range', 'بنعمل partition للجزء ده'),
        message(`Partition indices ${left} through ${right}. Only this range can move.`,
          `هنعمل partition من index ${left} لحد ${right}. الأرقام اللي برّه الجزء ده مش هتتحرّك.`));
      state.value = state.numbers[right];
      state.pivotId = state.slots[right];
      state.pivotIndex = right;
      emit('pivot', [12], message(`Use ${state.value} as the pivot`, `الـ ${state.value} هو الـ pivot`),
        message(`Save value from index ${right}. Its card stays there until the final partition swap.`,
          `بنحفظ الرقم اللي في index ${right} في value. الرقم نفسه هيفضل مكانه لحد آخر swap في الـ partition.`),
        `value = numbers[${right}] = ${state.value}`);
      state.boundary = left - 1;
      emit('boundary-start', [13], message('Start with an empty small-value region', 'بنبدأ وجزء الأرقام الصغيرة فاضي'),
        message(`boundary = ${state.boundary} sits just before this range. No value has been accepted yet.`,
          `boundary = ${state.boundary}، يعني قبل أول الجزء ده بخطوة. لسه مقبلناش ولا رقم.`),
        `boundary = ${left} - 1 = ${state.boundary}`);
      state.scan = left;
      emit('scan-start', [14], message('Start scanning at left', 'بنبدأ scan من left'),
        message(`scan starts at index ${left}. The pivot at ${right} is excluded from the scan.`,
          `scan بيبدأ من index ${left}. الـ pivot اللي في index ${right} مش داخل في الـ scan.`), `scan = ${left}`);
      while (true) {
        state.condition = state.scan < right;
        emit('scan-check', [15], message(state.condition ? 'Another card remains to scan' : 'The scan reached the pivot',
          state.condition ? 'لسه فيه رقم هنشيك عليه' : 'scan وصل للـ pivot'),
        message(state.condition
          ? `Index ${state.scan} is before the pivot; its value can be compared.`
          : `Every non-pivot card in this range was compared. The pivot belongs at boundary + 1 = ${state.boundary + 1}.`,
        state.condition
          ? `index ${state.scan} قبل الـ pivot، يعني نقدر نقارن الرقم اللي فيه.`
          : `قارنّا كل الأرقام في الجزء ده غير الـ pivot. مكانه الصح هو boundary + 1 = ${state.boundary + 1}.`),
        `${state.scan} < ${right} → ${state.condition}`);
        if (!state.condition) break;
        const scanned = state.numbers[state.scan];
        state.condition = scanned <= state.value;
        state.comparisons++;
        emit('compare', [16], message(state.condition ? 'Accept this value on the left' : 'Keep this value in the larger region',
          state.condition ? `الـ ${scanned} هيروح شمال` : `الـ ${scanned} هيفضل مع الأرقام الأكبر`),
        message(state.condition
          ? `At index ${state.scan}, ${scanned} <= ${state.value}. Grow the accepted region before swapping this card into it.`
          : `At index ${state.scan}, ${scanned} > ${state.value}. Leave this card in place and keep boundary at ${state.boundary}.`,
        state.condition
          ? `في index ${state.scan}: ${scanned} <= ${state.value}. هنكبّر جزء الشمال الأول، وبعدين نعمل swap عشان الرقم ده يدخل فيه.`
          : `في index ${state.scan}: ${scanned} > ${state.value}. هنسيب الرقم مكانه، وboundary هيفضل ${state.boundary}.`),
        `${scanned} <= ${state.value} → ${state.condition}`);
        if (state.condition) {
          state.boundary++;
          emit('boundary-advance', [17], message('Reserve the next accepted position', 'بنحجز المكان الجاي في جزء الشمال'),
            message(`Advance boundary to ${state.boundary}. The next swap fills this position with the accepted card at scan = ${state.scan}.`,
              `boundary بقى ${state.boundary}. الـ swap الجاي هيحط هنا الرقم اللي عند scan = ${state.scan}.`),
            `boundary = ${state.boundary}`);
          exchange(state.boundary, state.scan, 'scan');
        }
        state.scan++;
        state.condition = null;
        emit('scan-advance', [19], message('Move scan one place right', 'بنحرّك scan خطوة لليمين'),
          message(`scan is now ${state.scan}. Recheck the loop guard before reading another value.`,
            `scan بقى ${state.scan}. هنشيك على الـ condition بتاع الـ loop تاني قبل ما نقرا رقم جديد.`), `scan = ${state.scan}`);
      }
      state.condition = null;
      exchange(state.boundary + 1, right, 'pivot');
      finalize(state.pivotIndex, true);
      state.partitioned = true;
      emit('partition-return', [21], message('This pivot is finalized', 'الـ pivot ده ثبت في مكانه'),
        message(`Return index ${state.pivotIndex}. No later recursive call includes this position; the two sides still need sorting.`,
          `بنعمل return لـ index ${state.pivotIndex}. مفيش recursive call بعد كده هيلمس المكان ده، بس لسه الناحيتين محتاجين يترتّبوا.`),
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
      emit('enter', [4], message('Enter a sort call', 'بندخل call جديد لـ sort'),
        message(`Work on ${rangeText(call)} at sort depth ${state.callStack.length}. Suspended callers stay on the stack.`,
          `بنشتغل على ${rangeText(call)}، والـ depth بتاع sort بقى ${state.callStack.length}. الـ calls اللي قبلنا لسه مستنيّين في الـ call stack.`),
        `sort(${left}, ${right})`);
      state.condition = left >= right;
      emit('base-check', [5], message(state.condition ? 'This range needs no partition' : 'This range needs partitioning',
        state.condition ? 'الجزء ده مش محتاج partition' : 'الجزء ده محتاج partition'),
      message(left > right ? 'The range is empty. Return without reading any card.'
        : left === right ? `Only index ${left} remains. A single card is already sorted.`
          : `There are ${right - left + 1} cards in this range. Choose a pivot and partition them.`,
      left > right ? 'الجزء فاضي. هنعمل return من غير ما نقرا أي رقم.'
        : left === right ? `فاضل index ${left} لوحده. رقم واحد يبقى مترتّب أصلًا.`
          : `عدد الأرقام في الجزء ده ${right - left + 1}. هنختار pivot ونعمل partition.`),
      `${left} >= ${right} → ${state.condition}`);
      if (state.condition) {
        call.phase = 'return';
        if (left === right) finalize(left, false);
        emit('base-return', [6], message('Return to the caller', 'بنرجع للـ call اللي نادانا'),
          message(left === right
            ? `Finalize index ${left} without comparisons or swaps, then return.`
            : 'This empty call performs no comparisons or swaps, then returns.',
          left === right
            ? `index ${left} ثبت مكانه من غير مقارنات ولا swaps، وبنعمل return.`
            : 'الـ call الفاضي ده مفيهوش مقارنات ولا swaps، وبيعمل return على طول.'), 'return');
        state.callStack.pop();
        return;
      }
      state.condition = null;
      call.phase = 'partition';
      call.p = partition(left, right);
      focus(call);
      state.pendingRanges.unshift({ left, right: call.p - 1 }, { left: call.p + 1, right });
      emit('partition-result', [7], message('Split the remaining work around p', 'بنقسم الشغل اللي فاضل حوالين p'),
        message(`p = ${call.p}. Schedule the left range first, then the right range. Neither includes the finalized pivot.`,
          `p = ${call.p}. هنعمل sort للجزء الشمال الأول، وبعدين اليمين. ولا واحد فيهم فيه الـ pivot اللي ثبت.`), `p = ${call.p}`);
      call.phase = 'left';
      emit('call-left', [8], message('Sort the left side', 'بنعمل sort للجزء الشمال'),
        message(`Call sort(${left}, ${call.p - 1}); the right side waits while this call runs.`,
          `بنعمل call لـ sort(${left}, ${call.p - 1})، والجزء اليمين مستني لحد ما يخلص.`),
        `sort(${left}, ${call.p - 1})`);
      sort(left, call.p - 1);
      focus(call);
      call.phase = 'right';
      emit('call-right', [9], message('The left side returned; sort the right', 'الشمال خلص، دلوقتي اليمين'),
        message(`The left side is sorted. Call sort(${call.p + 1}, ${right}) for the remaining side.`,
          `الجزء الشمال بقى مترتّب. بنعمل call لـ sort(${call.p + 1}, ${right}) للجزء اللي فاضل.`),
        `sort(${call.p + 1}, ${right})`);
      sort(call.p + 1, right);
      focus(call);
      call.phase = 'return';
      emit('return', [10], message('Both sides are sorted', 'الناحيتين اترتّبوا'),
        message(`The pivot and both sorted sides complete range [${left}, ${right}]. Return without a merge step.`,
          `كده [${left}, ${right}] كلها مترتّبة: الناحيتين والـ pivot في النص. بنعمل return من غير merge.`), 'return');
      state.callStack.pop();
    }

    emit('ready', [], message('Quicksort: partition, then recurse', 'Quicksort: الـ partition وبعدين الـ recursion'),
      message(numbers.length === 0
        ? 'The input is empty. Watch the base case return without choosing a pivot.'
        : `Start with ${numbers.length} cards. Each partition uses its last card as pivot, then sorts the two remaining ranges.`,
      numbers.length === 0
        ? 'الـ array فاضية. هنشوف الـ base case بيعمل return من غير ما يختار pivot.'
        : `عدد الأرقام في الـ array ${numbers.length}. كل partition بياخد آخر رقم كـ pivot، وبعدين بنعمل sort للجزئين اللي فاضلين.`));
    emit('start', [2], message('Call sort on the whole input', 'بنعمل call لـ sort على الـ array كلها'),
      message(`Begin with inclusive bounds 0 and ${numbers.length - 1}.`,
        `بنبدأ من 0 لحد ${numbers.length - 1}، والاتنين داخلين في الجزء.`), `sort(0, ${numbers.length - 1})`);
    sort(0, numbers.length - 1);
    focus(null);
    state.done = true;
    state.result = [...state.numbers];
    emit('done', [3], message(numbers.length ? 'The array is sorted' : 'The empty array is sorted',
      numbers.length ? 'الـ array بقت مترتّبة' : 'الـ array الفاضية مترتّبة أصلًا'),
    message(`Return the ascending result after ${state.comparisons} value comparisons and ${state.swaps} swaps between distinct positions. Self-swaps are counted separately.`,
      `بنعمل return للنتيجة من الصغير للكبير بعد ${state.comparisons} مقارنة و${state.swaps} swap بين أماكن مختلفة. الـ swap في نفس المكان ليه عدّاد لوحده.`),
    'return numbers');
    return frames;
  }

  const lesson = {
    id: 'quick-sort', name: 'Quicksort', theme: 'algorithms', category: 'sort', number: '06',
    label: 'QUICKSORT', cost: 'O(n²)',
    description: message('Use a last-element pivot to partition a range, fix its position, and recursively sort both sides.',
      'بناخد آخر element كـ pivot، ونعمل partition للجزء حواليه فيثبت مكانه، وبعدين نعمل sort لكل ناحية بالـ recursion.'),
    note: message('Lomuto partition · <= goes left · inclusive, zero-based ranges · unstable',
      'Lomuto partition · الـ <= بيروح شمال · الـ index بيبدأ من 0 والطرفين داخلين · مش stable'),
    code,
    keySteps: ['ready', 'pivot', 'compare', 'swap', 'pivot-swap', 'done'],
    fields: [{
      name: 'numbers', label: message('Numbers', 'الأرقام'), type: 'text', maxLength: MAX_TEXT,
      help: message('Up to 16 integers from -999 to 999. Separate with spaces or commas ( , or ، ). Arabic and Persian digits work. Leave blank for an empty array.',
        'لحد 16 رقم صحيح، من -999 لحد 999. افصل بمسافة أو comma ( , أو ، ). الأرقام العربي والفارسي شغّالة. سيبها فاضية لو عايز array فاضية.'),
    }],
    defaults: { numbers: '8, 3, 1, 7, 0, 10, 2, 5' },
    presets: [
      { id: 'default', label: message('Mixed values', 'أرقام متلخبطة'), input: { numbers: '8, 3, 1, 7, 0, 10, 2, 5' } },
      { id: 'sorted', label: message('Sorted · worst-case splits', 'مترتّبة · worst case'), input: { numbers: '1, 2, 3, 4, 5, 6, 7, 8' } },
      { id: 'reverse', label: message('Reverse order', 'مترتّبة بالعكس'), input: { numbers: '8, 7, 6, 5, 4, 3, 2, 1' } },
      { id: 'equal', label: message('All equal · unbalanced', 'كلها زي بعض · partition مش متوازن'), input: { numbers: '4, 4, 4, 4, 4, 4' } },
      { id: 'unstable', label: message('Equal cards can reverse', 'الأرقام المتساوية ممكن تتعكس'), input: { numbers: '2, 2, 1' } },
      { id: 'negatives', label: message('Negatives and duplicates', 'أرقام سالبة ومكرّرة'), input: { numbers: '-5, 3, 0, -5, 3, -1' } },
      { id: 'limits', label: message('Value limits', 'أصغر وأكبر رقم مسموح'), input: { numbers: '999, -999, 0, 999, -999' } },
      { id: 'single', label: message('One card', 'element واحد'), input: { numbers: '7' } },
      { id: 'empty', label: message('Empty input', 'input فاضي'), input: { numbers: '' } },
    ],
    parse, build, summary,
    theory: {
      idea: message('Pick a pivot, then move every smaller card to its left and every larger card to its right. The pivot is now in its final place, so repeat the same idea on each side.',
        'بنختار pivot، ونودّي كل رقم أصغر منه على شماله وكل رقم أكبر على يمينه. كده الـ pivot بقى في مكانه النهائي، فبنكرّر نفس الفكرة على كل ناحية.'),
      title: message('Quicksort with Lomuto partitioning', 'Quicksort بالـ Lomuto partition'),
      intro: message('Prerequisites: zero-based array indices, swaps, loops, and recursive calls. This version sorts ascending with inclusive left/right bounds, chooses the last element as pivot, and sends equal values left.',
        'قبل ما نبدأ لازم تكون فاهم الـ index اللي بيبدأ من 0، والـ swap، والـ loops، والـ recursive calls. النسخة دي بترتّب من الصغير للكبير، وleft وright نفسهم داخلين في الجزء. بتاخد آخر element كـ pivot، والأرقام المساوية ليه بتروح شمال.'),
      invariant: message('At every loop guard: [left, boundary] contains values <= value; [boundary + 1, scan - 1] contains values > value; [scan, right - 1] is unexamined; numbers[right] is the pivot. Empty ranges are allowed. After scanning, swapping the pivot into boundary + 1 fixes its position. Recursing on strictly smaller sides sorts the whole range; empty and singleton ranges terminate.',
        'كل مرة بنشيك على الـ condition بتاع الـ loop: من left لحد boundary الأرقام <= value، ومن boundary + 1 لحد scan - 1 الأرقام > value، ومن scan لحد right - 1 لسه مشفناهاش، وnumbers[right] هو الـ pivot. أي جزء من دول ممكن يبقى فاضي. بعد ما الـ scan يخلص، الـ swap بين الـ pivot وboundary + 1 بيثبّته في مكانه. الـ recursive calls بتشتغل على أجزاء أصغر كل مرة، فالجزء كله بيترتّب، والجزء الفاضي أو اللي فيه element واحد بيقف على طول.'),
      steps: [
        { title: message('1. Stop on small ranges', '1. الجزء الصغير بيقف على طول'),
          body: message('If left >= right, return. A singleton is final; an empty range reads no card. Suspended sort calls remain visible on the stack.',
            'لو left >= right بنعمل return. الـ element الواحد مكانه نهائي، والجزء الفاضي مش بيقرا حاجة. الـ sort calls اللي مستنيّة بتفضل باينة في الـ call stack.') },
        { title: message('2. Save the pivot value', '2. بنحفظ قيمة الـ pivot'),
          body: message('Save numbers[right] as value, set boundary = left - 1, and scan from left. The pivot card stays at right during the scan.',
            'بنحفظ numbers[right] في value، ونخلّي boundary = left - 1، ونبدأ scan من left. الـ pivot بيفضل عند right طول الـ scan.') },
        { title: message('3. Grow the accepted region', '3. بنكبّر جزء الشمال'),
          body: message('Compare each scanned value with the pivot. For <=, increment boundary and swap with scan; otherwise leave the card. Advancing scan restores the loop invariant for the next guard.',
            'بنقارن كل رقم بالـ pivot. لو <= بنزوّد boundary ونعمل swap مع scan، غير كده بنسيبه مكانه. لما scan يتحرّك خطوة، الـ invariant بيرجع صح قبل الـ condition الجاي بتاع الـ loop.') },
        { title: message('4. Fix the pivot and recurse', '4. بنثبّت الـ pivot ونعمل recursion'),
          body: message('Swap the pivot into boundary + 1 and return that index as p. Sort [left, p - 1], then [p + 1, right]. Never include p again. No merge is needed.',
            'بنعمل swap للـ pivot مع boundary + 1، ونعمل return للـ index ده في p. بنعمل sort لـ [left, p - 1] وبعدين [p + 1, right]. p مش بيدخل في أي جزء تاني، ومش محتاجين merge.') },
      ],
      notes: [
        message('A partition of m cards makes exactly m - 1 value comparisons. The comparison metric excludes range and loop guards. Swaps count exchanges of distinct positions; self-swaps are separate and move no cards.',
          'الـ partition على m element بيعمل بالظبط m - 1 مقارنة. عدّاد المقارنات مش بيحسب الـ conditions بتوع الـ range والـ loop. عدّاد الـ swaps بيحسب الـ swap بين مكانين مختلفين بس، والـ swap في نفس المكان ليه عدّاد لوحده ومش بيحرّك حاجة.'),
        message('Average O(n log n) assumes distinct values in uniformly random input order for this deterministic last-pivot scheme. Balanced partitions also give O(n log n). This implementation does not shuffle or randomize its pivot.',
          'الـ average case بتاع O(n log n) بيفترض إن الأرقام مختلفة وترتيبها عشوائي، لأننا دايمًا بناخد آخر element كـ pivot. الـ partitions المتوازنة برضه بتدي O(n log n). النسخة دي مش بتلخبط الـ input ولا بتختار pivot عشوائي.'),
        message('Sorted, reverse-sorted, and all-equal inputs can leave one side empty repeatedly: n(n - 1)/2 comparisons, O(n²) time, and O(n) recursive depth. Equal values all go left with <=. Three-way partitioning is better suited to many duplicates; randomized pivots help with ordered inputs.',
          'لو الـ input مترتّب، أو مترتّب بالعكس، أو كله زي بعض، ممكن ناحية تفضل فاضية كل مرة: n(n - 1)/2 مقارنة، ووقت O(n²)، والـ depth بتاع الـ recursion يوصل O(n). مع <= كل الأرقام المتساوية بتروح شمال. الـ three-way partition أحسن لو فيه تكرار كتير، والـ random pivot بيساعد مع الـ input المترتّب.'),
        message('Quicksort is unstable: in the equal-cards preset, the two cards with value 2 reverse their original order when pivot 1 moves to the front. Stable item IDs expose their movement even when the numbers look identical.',
          'Quicksort مش stable: في مثال الأرقام المتساوية، الـ 2 والـ 2 بيعكسوا ترتيبهم الأصلي لما الـ pivot 1 يروح لأول الـ array. كل كارت ليه ID ثابت، فتقدر تتابع حركته حتى لو الأرقام شبه بعض.'),
        message('Partitioning uses O(1) auxiliary space, but this recursive version is not O(1) space overall: balanced or expected depth is O(log n) under the average-case assumptions; worst depth is O(n). The depth metric counts sort calls, including base cases, and excludes the constant-size partition helper.',
          'الـ partition بياخد مساحة إضافية O(1)، بس النسخة الـ recursive دي مش O(1) في المجمل: الـ depth لو متوازن أو في الـ average case بيبقى O(log n)، وفي الـ worst case O(n). عدّاد الـ depth بيحسب الـ sort calls ومعاهم الـ base cases، ومش بيحسب partition لأن مساحته ثابتة.'),
        message('The algorithm exchanges cards in place and needs no merge buffer.',
          'الـ algorithm ده بيعمل swap جوّه الـ array نفسها (in-place)، ومش محتاج buffer للـ merge.'),
      ],
      costs: [
        { label: message('One partition', 'partition واحد'), value: 'O(m) time · O(1) auxiliary space' },
        { label: message('Average time · random distinct input', 'وقت الـ average case · أرقام مختلفة بترتيب عشوائي'), value: 'O(n log n)' },
        { label: message('Best time · balanced splits', 'وقت الـ best case · partitions متوازنة'), value: 'O(n log n)' },
        { label: message('Worst time', 'وقت الـ worst case'), value: 'O(n²)' },
        { label: message('Balanced / expected recursion space', 'مساحة الـ recursion · متوازنة / متوقعة'), value: 'O(log n)' },
        { label: message('Worst recursion space', 'مساحة الـ recursion في الـ worst case'), value: 'O(n)' },
        { label: message('Stable?', 'stable؟'), value: 'No' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
