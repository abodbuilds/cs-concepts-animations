(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const CAPACITY = 6;
  const MAX_OPERATIONS = 12;
  const MAX_LENGTH = 240;
  const MIN_VALUE = -99;
  const MAX_VALUE = 999;
  const code = [
    'enqueue(value):',
    '  if size == capacity: return overflow',
    '  rear = (front + size) % capacity',
    '  buffer[rear] = value',
    '  size = size + 1',
    'dequeue():',
    '  if size == 0: return underflow',
    '  value = buffer[front]; buffer[front] = empty',
    '  front = (front + 1) % capacity',
    '  size = size - 1',
    '  return value',
    'peek():',
    '  if size == 0: return underflow',
    '  return buffer[front]',
  ];

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  const describe = operation => operation.op === 'enqueue' ? `enqueue ${operation.value}` : operation.op;

  // Public build input: {operations: [{op:'enqueue', value} | {op:'dequeue'} | {op:'peek'}]}.
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || !Array.isArray(input.operations)) {
      fail('Expected an object with an operations array.', 'محتاجين object جواه operations، وتكون array.');
    }
    if (input.operations.length > MAX_OPERATIONS) {
      fail(`Use at most ${MAX_OPERATIONS} operations.`, `اكتب ${MAX_OPERATIONS} operation بالكتير.`);
    }
    const operations = [];
    // Iteration also rejects sparse slots, which Array.prototype methods skip.
    for (const operation of input.operations) {
      if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
        fail('Each operation must be an object such as {op: "dequeue"}.', 'كل operation لازم تبقى object زي {op: "dequeue"}.');
      }
      const keys = Object.keys(operation);
      if (operation.op === 'enqueue' && keys.length === 2 && keys.includes('value')) {
        if (!Number.isSafeInteger(operation.value) || operation.value < MIN_VALUE || operation.value > MAX_VALUE) {
          fail(`Every enqueued value must be an integer from ${MIN_VALUE} to ${MAX_VALUE}.`,
            `أي رقم بنعمله enqueue لازم يكون صحيح ومن ${MIN_VALUE} لحد ${MAX_VALUE}.`);
        }
        operations.push({ op: 'enqueue', value: operation.value });
      } else if ((operation.op === 'dequeue' || operation.op === 'peek') && keys.length === 1) {
        operations.push({ op: operation.op });
      } else {
        fail('Use only enqueue with a value, dequeue, or peek.', 'المسموح بس enqueue ومعاها رقم، أو dequeue، أو peek.');
      }
    }
    return operations;
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput) || typeof rawInput.operations !== 'string') {
      fail('Enter the operations as text.', 'اكتب الـ operations كـ text.');
    }
    if (rawInput.operations.length > MAX_LENGTH) {
      fail(`Keep the script within ${MAX_LENGTH} characters and ${MAX_OPERATIONS} operations.`,
        `خلّي الـ operations في حدود ${MAX_LENGTH} حرف و ${MAX_OPERATIONS} operation.`);
    }
    const text = rawInput.operations.trim()
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
    if (!text) return { operations: [] };
    const operations = text.split(/\s*[,،;\n]\s*/).map(token => {
      const enqueue = /^(?:enqueue|enq)\s+([+-]?\d+)$/i.exec(token);
      if (enqueue) return { op: 'enqueue', value: Number(enqueue[1]) };
      if (/^(?:dequeue|deq)$/i.test(token)) return { op: 'dequeue' };
      if (/^peek$/i.test(token)) return { op: 'peek' };
      const shown = token.length > 16 ? token.slice(0, 16) + '…' : token;
      fail(`"${shown}" is not an operation. Write enqueue 5, dequeue or peek, separated by commas or new lines.`,
        `"${shown}" مش operation. اكتب enqueue 5 أو dequeue أو peek، وافصل بينهم بـ comma أو سطر جديد.`);
    });
    const input = { operations };
    validate(input);
    return input;
  }

  function build(input) {
    const operations = validate(input);
    const state = {
      capacity: CAPACITY, buffer: Array(CAPACITY).fill(null), front: 0, size: 0, rear: 0,
      step: null, op: null, value: null, condition: null, focus: null, focusTone: null,
      outputs: [], writes: 0, naiveShifts: 0, overflows: 0, underflows: 0,
      done: false, result: null,
    };
    const frames = [];
    // rear always names the next free slot, (front + size) % capacity. A dequeue moves front and size
    // together, so rear never changes during one; the occupied slots always end just before rear.
    // Mid-dequeue frames (slot cleared, size not yet lowered) therefore still read correctly.
    const occupied = () => state.buffer.filter(value => value !== null).length;
    const logical = () => {
      const count = occupied(), start = (state.rear - count + CAPACITY) % CAPACITY;
      return Array.from({ length: count }, (_, k) => state.buffer[(start + k) % CAPACITY]);
    };

    function emit(kind, lines, title, explanation, equation = '') {
      const rear = state.rear, count = occupied(), start = (rear - count + CAPACITY) % CAPACITY;
      const wrapped = count > 0 && start + count > CAPACITY;
      frames.push(copy({
        kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'front', value: state.front },
          { name: 'size', value: state.size },
          { name: 'rear', value: state.rear },
          { name: 'value', value: state.value === null ? '—' : state.value },
          { name: 'capacity', value: CAPACITY },
        ],
        metrics: [
          { label: message('Size', 'الـ size'), value: `${state.size} / ${CAPACITY}` },
          { label: message('Elements shifted', 'elements اتحرّكت'), value: 0 },
          { label: message('Shifts a naive array would do', 'shifts كانت هتحصل في array عادية'), value: state.naiveShifts },
          { label: message('Overflow / underflow', 'overflow / underflow'), value: `${state.overflows} / ${state.underflows}` },
        ],
        scene: {
          rows: [{
            id: 'buffer', label: message('Circular buffer · capacity 6', 'الـ circular buffer · capacity 6'), layout: 'cards',
            cells: state.buffer.map((value, index) => {
              const markers = [];
              if (index === state.front) markers.push('front');
              if (index === rear) markers.push('rear');
              return {
                id: `slot-${index}`, value, index,
                tone: index === state.focus ? state.focusTone : value === null ? 'muted' : 'default',
                marker: markers.join(' · '),
              };
            }),
          }],
          graph: null,
          collections: [
            { label: message('Queue order · front → rear', 'ترتيب الـ queue · من front لـ rear'), values: logical() },
            { label: message('Returned', 'اللي رجع'), values: state.outputs.filter(entry => entry.status === 'ok' && entry.op !== 'enqueue').map(entry => `${entry.op} → ${entry.value}`) },
          ],
          note: message(
            count === 0 ? `The queue is empty. front = ${state.front}, and rear = (front + size) % 6 = ${rear} is where the next enqueue writes.`
              : count === CAPACITY ? `All 6 slots are taken, so rear wrapped onto front (${rear}). The next enqueue overflows.`
                : count === 1 ? `One element, in slot ${start}. The next enqueue writes at rear = ${rear}.`
                : wrapped ? `${count} elements from slot ${start} past slot 5, wrapping to slot ${(start + count - 1) % CAPACITY}. The next enqueue writes at rear = ${rear}.`
                  : `${count} elements in slots ${start} to ${start + count - 1}. The next enqueue writes at rear = ${rear}.`,
            count === 0 ? `الـ queue فاضية. front = ${state.front}، و rear = (front + size) % 6 = ${rear} ده المكان اللي أول enqueue جاي هيكتب فيه.`
              : count === CAPACITY ? `الـ 6 slots مليانين، فـ rear لفّ ووقف على front (${rear}). أي enqueue جاي هيعمل overflow.`
                : count === 1 ? `فيه element واحد بس، في slot ${start}. الـ enqueue الجاي هيكتب عند rear = ${rear}.`
                : wrapped ? `عدد الـ elements: ${count}، بيبدأوا من slot ${start}، بيعدّوا slot 5 ويلفّوا لحد slot ${(start + count - 1) % CAPACITY}. الـ enqueue الجاي هيكتب عند rear = ${rear}.`
                  : `عدد الـ elements: ${count}، من slot ${start} لحد slot ${start + count - 1}. الـ enqueue الجاي هيكتب عند rear = ${rear}.`),
        },
      }));
    }

    function focus(slot, tone) { state.focus = slot; state.focusTone = slot === null ? null : tone; }

    emit('ready', [], message('An empty queue in a fixed array', 'queue فاضية جوّه array ثابتة'),
      message(`We have ${CAPACITY} slots, front = 0 and size = 0, and ${operations.length} operations to run. New values go in at rear, old values leave from front, and nothing ever shifts.`,
        `عندنا ${CAPACITY} slots، و front = 0 و size = 0، وهنشغّل ${operations.length} operations. الجديد بيدخل عند rear، والقديم بيخرج من عند front، ومفيش أي element بيتحرّك من مكانه.`));

    operations.forEach((operation, step) => {
      state.step = step + 1; state.op = operation.op; state.value = null; focus(null);
      const label = describe(operation);
      if (operation.op === 'enqueue') {
        const value = operation.value;
        state.condition = state.size === CAPACITY;
        emit('full-check', [1, 2], message(`${label}: is there room?`, `${label}: لسه فيه مكان؟`),
          message(state.condition ? `size is ${state.size}, the same as capacity. Every slot holds an element.`
            : `size is ${state.size} and capacity is ${CAPACITY}, so ${CAPACITY - state.size} slot(s) are free.`,
          state.condition ? `size بقى ${state.size}، زي الـ capacity بالظبط. كل slot فيه element.`
            : `size = ${state.size} والـ capacity = ${CAPACITY}، يعني عدد الـ slots الفاضية: ${CAPACITY - state.size}.`),
          `size == capacity → ${state.size} == ${CAPACITY} → ${state.condition}`);
        if (state.condition) {
          state.overflows++; state.condition = null; focus(state.front, 'pivot');
          state.outputs.push({ op: 'enqueue', value, status: 'overflow' });
          emit('overflow', [2], message(`Overflow: ${value} does not fit`, `overflow: الـ ${value} مش هيدخل`),
            message(`The buffer is full, so enqueue ${value} returns overflow and nothing changes. rear would land on front (slot ${state.front}) and overwrite the oldest element. A real program throws here, or copies everything into a bigger array, which costs O(n).`,
              `الـ buffer مليان، فالـ enqueue ${value} بترجع overflow ومفيش حاجة بتتغيّر. لو كتبنا، rear هيقع على front (slot ${state.front}) ويمسح أقدم element. في برنامج حقيقي يا إما بنعمل throw، يا إما بننقل كل حاجة لـ array أكبر، ودي بتاخد O(n).`),
            'return overflow');
          return;
        }
        state.condition = null;
        const sum = state.front + state.size;
        state.rear = sum % CAPACITY; state.value = value; focus(state.rear, 'found');
        const wraps = sum >= CAPACITY;
        emit(wraps ? 'rear-wrap' : 'rear', [3], message(wraps ? `rear wraps around to slot ${state.rear}` : `rear is slot ${state.rear}`,
          wraps ? `rear بيلفّ ويرجع لـ slot ${state.rear}` : `rear هو slot ${state.rear}`),
        message(wraps ? `front + size = ${sum} is past the last index 5, so % ${CAPACITY} wraps rear back to slot ${state.rear}. That slot was freed by an earlier dequeue. A naive array would have had to shift every element left to make room; we just reuse the slot.`
          : `The element after the last one goes at front + size = ${sum}. It is still inside the array, so % ${CAPACITY} leaves it as ${state.rear}.`,
        wraps ? `front + size = ${sum}، وده بعد آخر index (5)، فالـ % ${CAPACITY} بيرجّع rear لـ slot ${state.rear}. الـ slot ده فضي من dequeue قديمة. لو array عادية كنا هنحتاج نعمل shift لكل الـ elements شمال عشان نلاقي مكان، هنا بنستخدم الـ slot الفاضي على طول.`
          : `أول مكان بعد آخر element هو front + size = ${sum}. لسه جوّه الـ array، فالـ % ${CAPACITY} مش بيغيّره، يعني ${state.rear}.`),
        `rear = (${state.front} + ${state.size}) % ${CAPACITY} = ${state.rear}`);
        const slot = state.rear;
        state.buffer[slot] = value; state.size++; state.writes++; state.rear = (state.front + state.size) % CAPACITY;
        state.outputs.push({ op: 'enqueue', value, status: 'ok' });
        emit('write', [4, 5], message(`Write ${value} into slot ${slot}`, `بنكتب الـ ${value} في slot ${slot}`),
          message(`buffer[${slot}] = ${value} and size grows to ${state.size}. One write and one counter update: enqueue is O(1), and no other element moved.`,
            `buffer[${slot}] = ${value}، و size بقى ${state.size}. كتابة واحدة وعدّاد واحد، يعني الـ enqueue بـ O(1)، ومفيش ولا element تاني اتحرّك.`),
          `buffer[${slot}] = ${value}; size = ${state.size}`);
        return;
      }

      const checkLines = operation.op === 'dequeue' ? [6, 7] : [12, 13];
      state.condition = state.size === 0;
      emit(operation.op === 'dequeue' ? 'empty-check' : 'peek-check', checkLines,
        message(`${label}: is anything waiting?`, `${label}: فيه حد مستني؟`),
        message(state.condition ? 'size is 0. There is no element at front to read.'
          : `size is ${state.size}, so the oldest element is waiting at front = ${state.front}.`,
        state.condition ? 'size = 0، يعني مفيش element عند front نقرأه.'
          : `size = ${state.size}، يعني أقدم element مستني عند front = ${state.front}.`),
        `size == 0 → ${state.size} == 0 → ${state.condition}`);
      if (state.condition) {
        state.underflows++; state.condition = null;
        state.outputs.push({ op: operation.op, value: null, status: 'underflow' });
        emit('underflow', [checkLines[1]], message(`Underflow: ${operation.op} on an empty queue`, `underflow: ${operation.op} على queue فاضية`),
          message(`The queue is empty, so ${operation.op} returns underflow and front stays at ${state.front}. Reading buffer[front] now would return a stale or empty slot, which is why the size check comes first.`,
            `الـ queue فاضية، فالـ ${operation.op} بترجع underflow، و front فاضل ${state.front}. لو قرينا buffer[front] دلوقتي هنجيب slot فاضي أو قيمة قديمة، وعشان كده بنشيك على size الأول.`),
          'return underflow');
        return;
      }
      state.condition = null;

      if (operation.op === 'peek') {
        state.value = state.buffer[state.front]; focus(state.front, 'active');
        state.outputs.push({ op: 'peek', value: state.value, status: 'ok' });
        emit('peek', [14], message(`peek returns ${state.value}`, `الـ peek بترجع ${state.value}`),
          message(`We read buffer[${state.front}] = ${state.value} and change nothing: front and size stay the same. peek is O(1) and the next dequeue returns this same value.`,
            `بنقرا buffer[${state.front}] = ${state.value} ومش بنغيّر حاجة، front و size زي ما هما. الـ peek بـ O(1)، والـ dequeue الجاية هترجع نفس الرقم ده.`),
          `return buffer[${state.front}] = ${state.value}`);
        return;
      }

      const from = state.front;
      state.value = state.buffer[from]; state.buffer[from] = null; focus(from, 'active');
      emit('take', [8], message(`Take ${state.value} from slot ${from}`, `بناخد الـ ${state.value} من slot ${from}`),
        message(`value = buffer[${from}] = ${state.value}, the oldest element, and its slot is now empty. The other ${state.size - 1} element(s) stay exactly where they are.`,
          `value = buffer[${from}] = ${state.value}، وده أقدم element، والـ slot بتاعه بقى فاضي. باقي الـ elements (عددهم ${state.size - 1}) فاضلين في مكانهم بالظبط.`),
        `value = buffer[${from}] = ${state.value}`);
      state.front = (from + 1) % CAPACITY;
      const wraps = from + 1 === CAPACITY;
      emit(wraps ? 'front-wrap' : 'front', [9], message(wraps ? 'front wraps around to slot 0' : `front moves to slot ${state.front}`,
        wraps ? 'front بيلفّ ويرجع لـ slot 0' : `front بيتنقل لـ slot ${state.front}`),
      message(wraps ? `front + 1 = ${CAPACITY} would fall off the end, so % ${CAPACITY} sends front back to slot 0. The queue now continues from the start of the array.`
        : `Instead of moving the elements toward index 0, we move the front index one slot right. That is the whole trick.`,
      wraps ? `front + 1 = ${CAPACITY} هيطلع برّه الـ array، فالـ % ${CAPACITY} بيرجّع front لـ slot 0. الـ queue بتكمّل من أول الـ array.`
        : 'بدل ما نحرّك الـ elements ناحية index 0، بنحرّك front نفسه slot واحد يمين. ودي الفكرة كلها.'),
      `front = (${from} + 1) % ${CAPACITY} = ${state.front}`);
      const shifts = state.size - 1;
      state.size--; state.naiveShifts += shifts; focus(null);
      state.outputs.push({ op: 'dequeue', value: state.value, status: 'ok' });
      emit('dequeued', [10, 11], message(`dequeue returns ${state.value}`, `الـ dequeue بترجع ${state.value}`),
        message(`size drops to ${state.size} and we return ${state.value}. That is O(1) with 0 elements moved. An array that keeps the front at index 0 would have shifted ${shifts} element(s) left here, which is O(n).`,
          `size بقى ${state.size} وبنعمل return للـ ${state.value}. كده O(1) ومفيش ولا element اتحرّك. لو array عادية لازم الـ front بتاعها يفضل عند index 0، كانت هتعمل shift لكل اللي فاضل (عددهم ${shifts}) خطوة شمال هنا، ودي O(n).`),
        `size = ${state.size}; return ${state.value}`);
    });

    state.done = true; state.step = null; state.op = null; state.value = null; focus(null);
    state.result = { queue: logical(), outputs: copy(state.outputs) };
    const returned = state.outputs.filter(entry => entry.status === 'ok' && entry.op === 'dequeue').length;
    emit('done', [], message('Every operation ran in O(1)', 'كل operation خدت O(1)'),
      message(operations.length === 0 ? 'No operations: the queue stays empty.'
        : `${operations.length} operations: ${state.writes} enqueue(s), ${returned} dequeue(s), ${state.overflows} overflow(s) and ${state.underflows} underflow(s). ${state.size} element(s) remain, front first. 0 elements were shifted, where a naive array would have shifted ${state.naiveShifts}.`,
      operations.length === 0 ? 'مفيش operations، فالـ queue فضلت فاضية.'
        : `${operations.length} operations: عدد الـ enqueue اللي نجحت ${state.writes}، والـ dequeue ${returned}، والـ overflow ${state.overflows}، والـ underflow ${state.underflows}. عدد الـ elements اللي فاضلة: ${state.size}، وأولهم عند front. ومفيش ولا element اتحرّك، والـ array العادية كانت هتعمل ${state.naiveShifts} shifts.`));
    return frames;
  }

  const defaults = { operations: 'enqueue 5, enqueue 3, enqueue 8, dequeue, dequeue, enqueue 1, enqueue 9, enqueue 4, enqueue 7, peek, dequeue' };

  const lesson = {
    id: 'queue', name: 'Queue', theme: 'data-structures', category: 'structure', number: '14',
    label: 'QUEUE', cost: 'O(1)',
    description: message('A FIFO queue in a fixed circular array: enqueue at rear, dequeue at front, and wrap both indices with modulo instead of shifting.',
      'FIFO queue جوّه array ثابتة بتلفّ على نفسها: الـ enqueue عند rear، والـ dequeue من عند front، والاتنين بيلفّوا بالـ % بدل ما نعمل shift.'),
    note: message('Capacity 6. rear = (front + size) % 6 is the next free slot. enqueue on a full buffer overflows; dequeue or peek on an empty one underflows. Nothing ever shifts.',
      'الـ capacity هنا 6. rear = (front + size) % 6 هو أول slot فاضي. الـ enqueue على buffer مليان بتعمل overflow، والـ dequeue أو الـ peek على queue فاضية بتعمل underflow. ومفيش أي shift خالص.'),
    code,
    keySteps: ['ready', 'rear-wrap', 'write', 'overflow', 'take', 'front-wrap', 'dequeued', 'underflow', 'peek', 'done'],
    fields: [{
      name: 'operations', label: message('Operations', 'الـ operations'), type: 'textarea', maxLength: MAX_LENGTH,
      help: message(`Up to ${MAX_OPERATIONS} operations, separated by commas or new lines: enqueue 5 (or enq 5), dequeue (or deq), peek. Values are integers from ${MIN_VALUE} to ${MAX_VALUE}. The queue starts empty with capacity ${CAPACITY}. Leave blank to run nothing.`,
        `لحد ${MAX_OPERATIONS} operation، وافصل بينهم بـ comma أو سطر جديد: enqueue 5 (أو enq 5)، dequeue (أو deq)، peek. الأرقام صحيحة من ${MIN_VALUE} لـ ${MAX_VALUE}. الـ queue بتبدأ فاضية والـ capacity بتاعتها ${CAPACITY}. سيبها فاضية لو مش عايز تشغّل حاجة.`),
    }],
    defaults,
    presets: [
      { id: 'default', label: message('rear wraps around', 'rear بيلفّ'), input: { ...defaults } },
      { id: 'front-wrap', label: message('front wraps too', 'front كمان بيلفّ'), input: { operations: 'enq 1, enq 2, enq 3, enq 4, enq 5, deq, deq, deq, deq, deq, enq 6, deq' } },
      { id: 'overflow', label: message('Full buffer · overflow', 'buffer مليان · overflow'), input: { operations: 'enq 10, enq 20, enq 30, enq 40, enq 50, enq 60, enq 70, dequeue, enq 70, peek' } },
      { id: 'underflow', label: message('Empty queue · underflow', 'queue فاضية · underflow'), input: { operations: 'dequeue, peek, enqueue 4, dequeue, dequeue' } },
      { id: 'duplicates', label: message('Duplicate values', 'أرقام مكرّرة'), input: { operations: 'enq 7, enq 7, enq -99, enq 7, deq, peek, deq' } },
      { id: 'peek-only', label: message('peek changes nothing', 'الـ peek مش بتغيّر حاجة'), input: { operations: 'enq 999, peek, peek, deq, peek' } },
      { id: 'empty', label: message('No operations', 'من غير operations'), input: { operations: '' } },
    ],
    parse, build,
    summary(input) {
      const operations = validate(input);
      return message(`${operations.length} operations · capacity ${CAPACITY} · circular buffer`,
        `${operations.length} operations · الـ capacity ${CAPACITY} · circular buffer`);
    },
    theory: {
      whenToUse: {
        use: [
          { en: "Work must be handled in arrival order: print jobs, requests, messages.", ar: "الشغل لازم يتعمل بترتيب وصوله: الـ print jobs، الـ requests، الـ messages." },
          { en: "One side adds and another side takes at different speeds: the buffer absorbs the gap.", ar: "فيه حد بيحط وحد بيسحب بسرعات مختلفة: الـ buffer بيستوعب الفرق." },
          { en: "You explore level by level: BFS keeps its frontier in a queue.", ar: "بتلف level ورا level: الـ BFS بيحفظ الـ frontier بتاعه في queue." },
        ],
        avoid: [
          { en: "Some items are more urgent than others → use a priority queue (a heap).", ar: "فيه elements أهم من غيرها ← استخدم priority queue، يعني heap." },
          { en: "The newest item should leave first → use a stack.", ar: "الأحدث لازم يطلع الأول ← استخدم stack." },
          { en: "You cannot bound the size → a fixed circular buffer overflows; grow it, or use a queue built on a linked list.", ar: "مش عارف الحجم هيوصل لحد فين ← الـ circular buffer الثابت هيعمل overflow؛ كبّره، أو استخدم queue مبني على linked list." },
        ],
      },
      idea: message('A queue lets the first element in be the first one out, like a line at a bakery. Store it in a fixed array, move front and rear forward instead of the elements, and wrap them back to 0 with modulo.',
        'الـ queue بتخلّي أول element دخل هو أول واحد يخرج، زي طابور الفرن. بنخزّنها في array ثابتة، وبنحرّك front و rear نفسهم بدل الـ elements، ولما يوصلوا للآخر بيلفّوا لـ 0 بالـ %.'),
      title: message('Move the indices, not the elements', 'حرّك الـ indices، مش الـ elements'),
      intro: message('You need arrays, indices and the remainder operator %. A queue is FIFO: enqueue adds at the back, dequeue removes from the front, peek reads the front. The naive array version keeps the front at index 0, so every dequeue shifts the rest left. A circular buffer keeps a front index and a size and treats the array as a ring, so both ends move in O(1).',
        'محتاج تعرف الـ arrays والـ indices وعلامة الـ % (باقي القسمة). الـ queue دي FIFO: الـ enqueue بتضيف في الآخر، والـ dequeue بتشيل من الأول، والـ peek بتقرا الأول من غير ما تشيله. لو عملناها array عادية الـ front بتاعها دايمًا عند index 0، كل dequeue هتعمل shift لباقي الـ elements شمال. الـ circular buffer بيحتفظ بـ front و size، وبيعامل الـ array كأنها دايرة، فالطرفين بيتحرّكوا في O(1).'),
      invariant: message('0 ≤ size ≤ capacity, and the queue is exactly buffer[front], buffer[(front + 1) % capacity], …, buffer[(front + size − 1) % capacity], oldest first. Every other slot is free, and rear = (front + size) % capacity is the first free one. enqueue and dequeue each change one slot and one index, so the invariant survives every step.',
        '0 ≤ size ≤ capacity، والـ queue هي بالظبط buffer[front]، buffer[(front + 1) % capacity]، …، buffer[(front + size − 1) % capacity]، من الأقدم للأجدد. أي slot تاني فاضي، و rear = (front + size) % capacity هو أول slot فاضي. الـ enqueue والـ dequeue كل واحدة بتغيّر slot واحد و index واحد، فالـ invariant بيفضل صح بعد كل خطوة.'),
      steps: [
        { title: message('enqueue writes at rear', 'الـ enqueue بتكتب عند rear'), body: message('If size == capacity, report overflow. Otherwise rear = (front + size) % capacity, write the value there, and add 1 to size. When front + size passes the end, % wraps rear into a slot that an earlier dequeue freed.',
          'لو size == capacity، بنرجّع overflow. غير كده rear = (front + size) % capacity، بنكتب الرقم هناك، وبنزوّد size بواحد. لما front + size يعدّي آخر الـ array، الـ % بيلفّ rear لـ slot فضي من dequeue قديمة.') },
        { title: message('dequeue reads at front', 'الـ dequeue بتقرا من عند front'), body: message('If size == 0, report underflow. Otherwise read buffer[front], clear it, move front to (front + 1) % capacity, and subtract 1 from size. No element moves; only the index does.',
          'لو size == 0، بنرجّع underflow. غير كده بنقرا buffer[front]، بنفضّيه، وبننقل front لـ (front + 1) % capacity، وبنقلّل size بواحد. مفيش element بيتحرّك، الـ index بس اللي بيتحرّك.') },
        { title: message('peek only looks', 'الـ peek بتبص بس'), body: message('peek checks size == 0 like dequeue, then returns buffer[front] without changing front or size.',
          'الـ peek بتشيك على size == 0 زي الـ dequeue، وبعدين بترجّع buffer[front] من غير ما تغيّر front ولا size.') },
        { title: message('Why keep size', 'ليه بنحتفظ بـ size'), body: message('With only front and rear, an empty queue and a full queue both have front == rear. Keeping size (or leaving one slot always empty) tells them apart.',
          'لو معانا front و rear بس، الـ queue الفاضية والمليانة الاتنين فيهم front == rear. لما نحتفظ بـ size (أو نسيب slot واحد فاضي على طول) نقدر نفرّق بينهم.') },
      ],
      notes: [
        message('The naive array queue makes dequeue O(n) because it shifts size − 1 elements left each time. The metric "Shifts a naive array would do" adds those shifts up so you can compare.',
          'الـ queue المعمولة بـ array عادية بتخلّي الـ dequeue بـ O(n)، عشان كل مرة بتعمل shift لـ size − 1 elements شمال. العدّاد "shifts كانت هتحصل في array عادية" بيجمع الـ shifts دي عشان تقارن.'),
        message('A fixed capacity is the price. When the queue may grow without limit, use a dynamic version that copies into a buffer twice as big when full (O(1) amortized per enqueue), or a linked list with head and tail pointers (O(1) per operation, but more memory per element and worse cache locality).',
          'التمن هنا إن الـ capacity ثابتة. لو الـ queue ممكن تكبر من غير حد، استخدم نسخة dynamic بتنقل كل حاجة لـ buffer ضعف الحجم لما تتملي (O(1) amortized لكل enqueue)، أو linked list فيها head و tail (O(1) لكل operation، بس كل element بياخد memory أكتر والـ cache مش بيحبّها).'),
        message('Pick a queue when order of arrival matters: BFS, task schedulers, print jobs, network packets, producer/consumer buffers. If you need the newest element first, you want a stack; if you need the smallest first, a priority queue.',
          'استخدم queue لما ترتيب الوصول يفرق: الـ BFS، الـ task schedulers، الطباعة، الـ network packets، والـ buffers بين producer و consumer. لو عايز أحدث element الأول يبقى محتاج stack، ولو عايز الأصغر الأول يبقى محتاج priority queue.'),
        message('Overflow and underflow here return a status and leave the queue unchanged so the trace can continue. Real code usually throws an error or returns a flag the caller must check.',
          'الـ overflow والـ underflow هنا بيرجّعوا status ومش بيغيّروا الـ queue، عشان الـ trace يكمّل. في الـ code الحقيقي غالبًا بنعمل throw لـ error أو بنرجّع flag لازم اللي نادى يشيك عليه.'),
      ],
      costs: [
        { label: message('enqueue / dequeue / peek', 'enqueue / dequeue / peek'), value: 'O(1)' },
        { label: message('Naive array dequeue (shift)', 'dequeue في array عادية (shift)'), value: 'O(n)' },
        { label: message('Space', 'المساحة'), value: 'O(capacity)' },
        { label: message('Growing when full (copy)', 'التكبير لما تتملي (copy)'), value: 'O(n) once · O(1) amortized' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
