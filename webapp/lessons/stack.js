(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const MAX_OPS = 12, MAX_CAPACITY = 8, MIN_VALUE = -99, MAX_VALUE = 999;
  const OPS_LENGTH = 240, INITIAL_LENGTH = 64, CAPACITY_LENGTH = 4;
  const code = [
    'stack: items[0..capacity-1], top = -1',
    'push(value):',
    '  if top == capacity - 1:',
    '    error "overflow"',
    '  top = top + 1',
    '  items[top] = value',
    'pop():',
    '  if top == -1:',
    '    error "underflow"',
    '  value = items[top]',
    '  top = top - 1',
    '  return value',
    'peek():',
    '  if top == -1:',
    '    error "underflow"',
    '  return items[top]',
    'isEmpty():',
    '  return top == -1',
  ];

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  const isValue = value => Number.isSafeInteger(value) && value >= MIN_VALUE && value <= MAX_VALUE;
  const opText = op => op.op === 'push' ? `push ${op.value}` : op.op;

  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      fail('Expected an object with capacity, initial, and operations.', 'محتاجين object جواه capacity و initial و operations.');
    }
    const { capacity, initial, operations } = input;
    if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > MAX_CAPACITY) {
      fail('Capacity must be an integer from 1 to 8.', 'الـ capacity لازم يكون رقم صحيح من 1 لـ 8.');
    }
    if (!Array.isArray(initial) || initial.length > capacity) {
      fail('The starting values must be an array that fits within the capacity.', 'الأرقام اللي بنبدأ بيها لازم تكون array وتساع في الـ capacity.');
    }
    for (const value of initial) {
      if (!isValue(value)) fail('Every value must be an integer from -99 to 999.', 'كل رقم لازم يكون صحيح ومن -99 لحد 999.');
    }
    if (!Array.isArray(operations) || operations.length < 1 || operations.length > MAX_OPS) {
      fail('Use from 1 to 12 operations.', 'اكتب من 1 لـ 12 operation.');
    }
    for (const op of operations) {
      if (!op || typeof op !== 'object' || !['push', 'pop', 'peek', 'isEmpty'].includes(op.op)
        || (op.op === 'push' ? !isValue(op.value) : op.value !== undefined)) {
        fail('Each operation must be push with an integer from -99 to 999, pop, peek, or isEmpty.',
          'كل operation لازم تكون push ومعاها رقم صحيح من -99 لـ 999، أو pop، أو peek، أو isEmpty.');
      }
    }
    return input;
  }

  const westernDigits = text => text
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));

  function parseOp(token) {
    let match = token.match(/^push(?:\s+([+-]?\d+)|\s*\(\s*([+-]?\d+)\s*\))$/i);
    if (match) {
      const value = Number(match[1] ?? match[2]);
      if (!isValue(value)) fail(`"${token}": push values must be integers from -99 to 999.`, `"${token}": الرقم اللي بنعمله push لازم يكون صحيح من -99 لـ 999.`);
      return { op: 'push', value };
    }
    match = token.match(/^(pop|peek|is\s*empty)(?:\s*\(\s*\))?$/i);
    if (match) {
      const name = match[1].toLowerCase().replace(/\s+/g, '');
      return { op: name === 'isempty' ? 'isEmpty' : name };
    }
    fail(`"${token.slice(0, 20)}" is not an operation. Use push 5, pop, peek, or isEmpty.`,
      `"${token.slice(0, 20)}" مش operation نعرفها. استخدم push 5 أو pop أو peek أو isEmpty.`);
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)
      || typeof rawInput.operations !== 'string' || typeof rawInput.capacity !== 'string'
      || (rawInput.initial !== undefined && typeof rawInput.initial !== 'string')) {
      fail('Enter operations, capacity, and starting values as text.', 'اكتب الـ operations والـ capacity والأرقام اللي بنبدأ بيها كـ text.');
    }
    const initialRaw = rawInput.initial ?? '';
    if (rawInput.operations.length > OPS_LENGTH || initialRaw.length > INITIAL_LENGTH || rawInput.capacity.length > CAPACITY_LENGTH) {
      fail('The input is too long.', 'الـ input طويل زيادة عن اللزوم.');
    }
    const capacityText = westernDigits(rawInput.capacity.trim());
    if (!/^\d+$/.test(capacityText) || Number(capacityText) < 1 || Number(capacityText) > MAX_CAPACITY) {
      fail('Capacity must be a whole number from 1 to 8.', 'الـ capacity لازم يكون رقم صحيح من 1 لـ 8.');
    }
    const capacity = Number(capacityText);

    const initialText = westernDigits(initialRaw.trim());
    if (initialText && !/^[+-]?\d+(?:(?:\s*[,،]\s*|\s+)[+-]?\d+)*$/.test(initialText)) {
      fail('Starting values: integers separated by commas or spaces, bottom first.',
        'الأرقام اللي بنبدأ بيها: أرقام صحيحة بينها comma أو مسافة، واللي تحت خالص الأول.');
    }
    const initial = initialText ? initialText.split(/[,،\s]+/).map(Number) : [];
    if (!initial.every(isValue)) fail('Every value must be an integer from -99 to 999.', 'كل رقم لازم يكون صحيح ومن -99 لحد 999.');
    if (initial.length > capacity) {
      fail(`${initial.length} starting values do not fit in capacity ${capacity}.`,
        `عدد الأرقام اللي بنبدأ بيها ${initial.length}، ودي مش هتساع في capacity = ${capacity}.`);
    }

    const tokens = westernDigits(rawInput.operations).split(/[\n,،;]+/).map(token => token.trim()).filter(Boolean);
    if (!tokens.length) fail('Add at least one operation, for example push 5.', 'اكتب operation واحدة على الأقل، زي push 5.');
    if (tokens.length > MAX_OPS) fail('Use at most 12 operations.', 'اكتب 12 operation بالكتير.');
    const input = { capacity, initial, operations: tokens.map(parseOp) };
    validate(input);
    return input;
  }

  function build(input) {
    const { capacity, initial, operations } = validate(input);
    let nextId = 0;
    const state = {
      capacity,
      items: Array.from({ length: capacity }, (_, index) => index < initial.length ? initial[index] : null),
      ids: Array.from({ length: capacity }, (_, index) => index < initial.length ? `item-${nextId++}` : null),
      top: initial.length - 1,
      step: 0, op: null, value: null, condition: null, touched: null, error: null,
      outputs: [], accesses: 0, errors: 0, done: false, result: null,
    };
    const frames = [];
    const ops = operations.map(op => ({ ...op }));

    function emit(kind, lines, title, explanation, equation = '') {
      const size = state.top + 1;
      frames.push(copy({
        kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'op', value: state.op === null ? '—' : state.op },
          { name: 'top', value: state.top },
          { name: 'capacity', value: state.capacity },
          { name: 'value', value: state.value === null ? '—' : state.value },
        ],
        metrics: [
          { label: message('Size', 'عدد الأرقام'), value: size },
          { label: message('Operations run', 'الـ operations اللي خلصت'), value: `${state.step} / ${ops.length}` },
          { label: message('Array reads + writes', 'قراية وكتابة في الـ array'), value: state.accesses },
          { label: message('Handled errors', 'الـ errors اللي اتعاملنا معاها'), value: state.errors },
        ],
        scene: {
          rows: [{
            id: 'stack', label: message('Stack array · bottom → top', 'الـ array بتاعة الـ stack · من تحت لفوق'), layout: 'cards',
            cells: state.items.map((value, index) => {
              const live = index <= state.top;
              const stale = !live && value !== null;
              let tone = live ? 'default' : 'muted';
              if (index === state.touched) tone = state.error === 'overflow' ? 'pivot' : kind === 'pop-read' || kind === 'peek' ? 'found' : 'active';
              return {
                id: state.ids[index] ?? `slot-${index}`, value: value === null ? '—' : value, index, tone,
                marker: index === state.top ? 'top' : stale ? 'old' : '',
              };
            }),
          }],
          graph: null,
          collections: [
            { label: message('Returned', 'اللي رجع'), values: [...state.outputs] },
            { label: message('Next operations', 'الـ operations الجاية'), values: ops.slice(state.step).map(opText) },
          ],
          note: size === 0
            ? message(`Empty: top = -1. ${capacity} free slots.`, `الـ stack فاضي: top = -1، وفيه ${capacity} أماكن فاضية.`)
            : size === capacity
              ? message(`Full: top = ${state.top} = capacity - 1. Only items[${state.top}] is reachable.`, `الـ stack مليان: top = ${state.top} = capacity - 1. الوحيد اللي نقدر نوصله هو items[${state.top}].`)
              : message(`${size} of ${capacity} slots used. Only items[${state.top}], the top, is reachable.`, `${size} من ${capacity} أماكن مستخدمة. الوحيد اللي نقدر نوصله هو items[${state.top}]، الـ top.`),
        },
      }));
    }

    emit('ready', [], message('Last in, first out', 'اللي يدخل الآخر يطلع الأول'),
      initial.length
        ? message(`The stack already holds ${initial.length} values, bottom first, so top = ${state.top}. Every operation will touch only items[top].`,
          `الـ stack فيه ${initial.length} أرقام من الأول، واللي تحت خالص في index 0، فـ top = ${state.top}. كل operation هتلمس items[top] بس.`)
        : message(`An empty stack with room for ${capacity} values: top = -1. Every operation will touch only items[top].`,
          `stack فاضي وفيه مكان لـ ${capacity} أرقام، و top = -1. كل operation هتلمس items[top] بس.`));

    for (const op of ops) {
      state.op = opText(op); state.value = null; state.touched = null; state.error = null; state.condition = null;
      if (op.op === 'push') {
        state.condition = state.top === capacity - 1;
        emit('push-check', [2, 3], message(state.condition ? 'No room left' : 'There is room on top', state.condition ? 'مفيش مكان فاضي' : 'فيه مكان فوق'),
          state.condition
            ? message(`top is ${state.top}, the last index. A fixed array cannot grow, so push ${op.value} must fail.`,
              `top واقف على ${state.top}، ده آخر index. الـ array حجمها ثابت ومش هتكبر، يبقى push ${op.value} مش هينفع.`)
            : message(`top is ${state.top}, below the last index ${capacity - 1}. Slot ${state.top + 1} is free.`,
              `top واقف على ${state.top}، قبل آخر index اللي هو ${capacity - 1}. يعني المكان ${state.top + 1} فاضي.`),
          `top == capacity - 1 → ${state.top} == ${capacity - 1} → ${state.condition}`);
        if (state.condition) {
          state.error = 'overflow'; state.touched = state.top; state.errors++; state.step++;
          state.outputs.push(`${state.op} → overflow`); state.condition = null;
          emit('overflow', [4], message('Overflow: push refused', 'overflow: الـ push اترفض'),
            message(`The stack is full, so we report overflow and leave it unchanged. ${op.value} is not stored anywhere.`,
              `الـ stack مليان، فبنرجّع error اسمه overflow ومش بنغيّر أي حاجة. الـ ${op.value} مش هيتخزّن في أي مكان.`),
            'error "overflow"');
          continue;
        }
        state.top++; state.touched = state.top; state.condition = null;
        const stale = state.items[state.top];
        emit('push-top', [5], message('Move top up one slot', 'بنطلّع top مكان لفوق'),
          message(`top becomes ${state.top}. Nothing below moves; that is why push costs O(1).${stale !== null ? ` The old ${stale} still sits here and will be overwritten.` : ''}`,
            `top بقى ${state.top}. مفيش ولا element تحت اتحرّك، وعشان كده الـ push بياخد O(1).${stale !== null ? ` الـ ${stale} القديم لسه قاعد هنا، وهنكتب فوقه.` : ''}`),
          `top = ${state.top - 1} + 1 = ${state.top}`);
        state.items[state.top] = op.value; state.ids[state.top] = `item-${nextId++}`;
        state.value = op.value; state.accesses++; state.step++;
        emit('push', [6], message(`Write ${op.value} on top`, `بنحط الـ ${op.value} فوق`),
          message(`One write: items[${state.top}] = ${op.value}. ${op.value} is now the only value pop or peek can reach.`,
            `كتابة واحدة بس: items[${state.top}] = ${op.value}. دلوقتي الـ ${op.value} هو الوحيد اللي pop أو peek يقدروا يوصلوله.`),
          `items[${state.top}] = ${op.value}`);
      } else if (op.op === 'pop' || op.op === 'peek') {
        const pop = op.op === 'pop';
        state.condition = state.top === -1;
        emit(`${op.op}-check`, pop ? [7, 8] : [13, 14], message(state.condition ? 'Nothing on the stack' : 'There is a top value', state.condition ? 'الـ stack فاضي' : 'فيه رقم فوق'),
          state.condition
            ? message(`top is -1, so items[top] would be outside the array. ${op.op} must fail.`, `top = -1، يعني items[top] هيبقى برّه الـ array. الـ ${op.op} مش هينفع.`)
            : message(`top is ${state.top}, so items[${state.top}] holds a value we can ${pop ? 'take' : 'read'}.`, `top = ${state.top}، يعني items[${state.top}] فيه رقم نقدر ${pop ? 'ناخده' : 'نقراه'}.`),
          `top == -1 → ${state.top} == -1 → ${state.condition}`);
        if (state.condition) {
          state.error = 'underflow'; state.errors++; state.step++;
          state.outputs.push(`${op.op} → underflow`); state.condition = null;
          emit('underflow', pop ? [9] : [15], message(`Underflow: ${op.op} on an empty stack`, `underflow: عملنا ${op.op} على stack فاضي`),
            message(`We report underflow instead of reading items[-1]. The stack stays empty and the script goes on.`,
              `بنرجّع error اسمه underflow بدل ما نقرا items[-1]. الـ stack بيفضل فاضي، وبنكمّل باقي الـ operations.`),
            'error "underflow"');
          continue;
        }
        const value = state.items[state.top];
        state.value = value; state.touched = state.top; state.accesses++; state.condition = null;
        if (!pop) {
          state.step++; state.outputs.push(`peek → ${value}`);
          emit('peek', [16], message(`Peek sees ${value}`, `الـ peek شاف الـ ${value}`),
            message(`One read of items[${state.top}]. top stays ${state.top} and nothing is removed, so peek is O(1).`,
              `قراية واحدة لـ items[${state.top}]. top فاضل ${state.top} ومفيش حاجة اتشالت، فالـ peek بياخد O(1).`),
            `return items[${state.top}] → ${value}`);
          continue;
        }
        emit('pop-read', [10], message(`Read the top value ${value}`, `بنقرا الرقم اللي فوق: ${value}`),
          message(`value = items[${state.top}] = ${value}. It was the last value pushed, so it is the first to leave.`,
            `value = items[${state.top}] = ${value}. ده آخر رقم عملناله push، فهو أول واحد يطلع.`),
          `value = items[${state.top}] = ${value}`);
        state.top--; state.step++; state.outputs.push(`pop → ${value}`);
        emit('pop', [11, 12], message(`Pop returns ${value}`, `الـ pop بيرجّع ${value}`),
          message(`top drops to ${state.top}. The ${value} stays in memory but is above top, so it no longer counts. No element moves: O(1).`,
            `top نزل لـ ${state.top}. الـ ${value} لسه موجود في الـ memory، بس بقى فوق top فمبقاش محسوب. ومفيش ولا element اتحرّك، يعني O(1).`),
          `top = ${state.top + 1} - 1 = ${state.top}; return ${value}`);
      } else {
        state.condition = state.top === -1; state.value = state.condition; state.step++;
        state.outputs.push(`isEmpty → ${state.condition}`);
        emit('is-empty', [17, 18], message(state.condition ? 'Yes, it is empty' : 'No, it has values', state.condition ? 'أيوه، الـ stack فاضي' : 'لأ، الـ stack فيه أرقام'),
          message(`isEmpty only compares top with -1. It reads no slot, so it costs O(1).`,
            `isEmpty بتقارن top بـ -1 وبس، ومش بتقرا أي مكان في الـ array، فبتاخد O(1).`),
          `top == -1 → ${state.top} == -1 → ${state.condition}`);
      }
    }

    state.op = null; state.value = null; state.touched = null; state.error = null; state.condition = null;
    state.done = true;
    state.result = { stack: state.items.slice(0, state.top + 1), top: state.top, outputs: [...state.outputs] };
    const size = state.top + 1;
    emit('done', [], message('Script finished', 'الـ operations خلصت'),
      message(`${ops.length} operations, ${state.accesses} array accesses, ${state.errors} handled errors. ${size ? `${size} values remain; ${state.items[state.top]} is on top.` : 'The stack ended empty.'} Every operation touched at most one slot.`,
        `عدد الـ operations ${ops.length}، وقرينا أو كتبنا في الـ array ${state.accesses} مرات، والـ errors اللي اتعاملنا معاها ${state.errors}. ${size ? `فاضل ${size} أرقام، واللي فوق هو الـ ${state.items[state.top]}.` : 'الـ stack خلص فاضي.'} كل operation لمست مكان واحد بالكتير.`));
    return frames;
  }

  const defaults = { operations: 'push 5, push 3, push 8, peek, pop, push 1, pop, pop, isEmpty', capacity: '4', initial: '' };
  const lesson = {
    id: 'stack', name: 'Stack', theme: 'data-structures', category: 'structure', number: '13',
    label: 'STACK', cost: 'O(1)',
    description: message('Push and pop at one end only. An array and a top index make every operation O(1).',
      'بنعمل push و pop من ناحية واحدة بس. array ومعاها index اسمه top بيخلّوا كل operation تاخد O(1).'),
    note: message('Fixed-capacity array, index 0 is the bottom. Underflow and overflow are reported and the script continues.',
      'الـ array حجمها ثابت، و index 0 هو اللي تحت خالص. الـ underflow والـ overflow بيرجعوا error، وبنكمّل باقي الـ operations.'),
    code,
    keySteps: ['ready', 'push', 'pop', 'peek', 'is-empty', 'underflow', 'overflow', 'done'],
    fields: [
      {
        name: 'operations', label: message('Operations', 'الـ operations'), type: 'textarea', maxLength: OPS_LENGTH,
        help: message('1 to 12 operations, one per line or separated by commas: push 5, pop, peek, isEmpty. push takes an integer from -99 to 999; push(5) and pop() also work.',
          'من 1 لـ 12 operation، كل واحدة في سطر أو بينهم comma: push 5، pop، peek، isEmpty. الـ push محتاج رقم صحيح من -99 لـ 999، وكمان push(5) و pop() شغالين.'),
      },
      {
        name: 'capacity', label: message('Capacity', 'الـ capacity'), type: 'text', maxLength: CAPACITY_LENGTH,
        help: message('Size of the fixed array, from 1 to 8. A push on a full stack is an overflow.',
          'حجم الـ array الثابت، من 1 لـ 8. لو عملنا push والـ stack مليان، يبقى overflow.'),
      },
      {
        name: 'initial', label: message('Starting values', 'الأرقام اللي بنبدأ بيها'), type: 'text', maxLength: INITIAL_LENGTH,
        help: message('Optional. Values already on the stack, bottom first, separated by commas or spaces. They must fit within the capacity.',
          'اختياري. أرقام موجودة في الـ stack من الأول، اللي تحت خالص الأول، وبينهم comma أو مسافة. لازم يساعوا في الـ capacity.'),
      },
    ],
    defaults: { ...defaults },
    presets: [
      { id: 'default', label: message('Push, peek, and pop', 'push و peek و pop'), input: { ...defaults } },
      { id: 'reverse', label: message('Pop everything · order reverses', 'pop للكل · الترتيب بيتقلب'), input: { operations: 'pop, pop, pop, pop, isEmpty', capacity: '4', initial: '1, 2, 3, 4' } },
      { id: 'underflow', label: message('Empty stack · underflow', 'stack فاضي · underflow'), input: { operations: 'isEmpty, pop, peek, push 4, pop, pop', capacity: '3', initial: '' } },
      { id: 'overflow', label: message('Full stack · overflow', 'stack مليان · overflow'), input: { operations: 'push 3, push 4, pop, push 4, peek', capacity: '3', initial: '1, 2' } },
      { id: 'duplicates', label: message('Equal values, separate slots', 'أرقام زي بعض في أماكن مختلفة'), input: { operations: 'push 7, push 7, pop, peek, pop, peek', capacity: '4', initial: '7' } },
      { id: 'capacity-one', label: message('Capacity 1', 'capacity = 1'), input: { operations: 'push -99, push 999, pop, push 999, peek', capacity: '1', initial: '' } },
    ],
    parse, build,
    summary(input) {
      const { capacity, initial, operations } = validate(input);
      return message(`${operations.length} operations · capacity ${capacity} · starts with ${initial.length} values`,
        `${operations.length} operations · capacity = ${capacity} · بنبدأ بـ ${initial.length} أرقام`);
    },
    theory: {
      whenToUse: {
        use: [
          { en: "The last thing in must come out first: undo, the back button, nested function calls.", ar: "آخر حاجة دخلت لازم تطلع الأول: undo، زرار الـ back، الـ function calls اللي جوه بعض." },
          { en: "You match things that open and close: brackets, HTML tags.", ar: "بتطابق حاجات بتتفتح وتتقفل: الأقواس، الـ HTML tags." },
          { en: "You go deep and come back: DFS and backtracking keep their path on a stack.", ar: "بتنزل لتحت وترجع: DFS والـ backtracking بيحفظوا الطريق على stack." },
        ],
        avoid: [
          { en: "Items must leave in arrival order → use a queue.", ar: "الـ elements لازم تطلع بنفس ترتيب دخولها ← استخدم queue." },
          { en: "You need to see or remove items in the middle → a stack only shows its top; use an array or a list.", ar: "محتاج تشوف أو تشيل element من النص ← الـ stack بيوريك الـ top بس؛ استخدم array أو list." },
        ],
      },
      idea: message('A stack is a pile: you add to the top and take from the top. The last value pushed is always the first one popped.',
        'الـ stack زي رصّة أطباق: بتحط فوق وبتشيل من فوق. آخر رقم عملناله push هو دايمًا أول واحد يطلع بالـ pop.'),
      title: message('Only the top is ever touched', 'مفيش غير الـ top اللي بنلمسه'),
      intro: message('You only need arrays and indices. This stack stores values in one array, bottom at index 0, and keeps an index top that points at the newest value (-1 when empty). push, pop, peek, and isEmpty all work at top, so none of them looks at the rest of the array.',
        'محتاج بس تعرف الـ array والـ index. الـ stack ده بيخزّن الأرقام في array واحدة، واللي تحت خالص في index 0. ومعاه index اسمه top بيشاور على آخر رقم دخل، ولو الـ stack فاضي top = -1. الـ push والـ pop والـ peek والـ isEmpty كلهم شغالين عند top، فولا واحدة فيهم بتبص على باقي الـ array.'),
      invariant: message('items[0..top] are exactly the stack contents, oldest at index 0 and newest at index top, and -1 ≤ top ≤ capacity - 1. Slots above top may hold old values, but they are never read.',
        'items[0..top] هي بالظبط اللي في الـ stack، الأقدم في index 0 والأحدث في index top، و -1 ≤ top ≤ capacity - 1. الأماكن اللي فوق top ممكن يكون فيها أرقام قديمة، بس عمرنا ما بنقراها.'),
      steps: [
        { title: message('push: check, move top, write', 'الـ push: بنشيّك، بنطلّع top، بنكتب'), body: message('If top == capacity - 1 the array is full: report overflow. Otherwise increase top and write the value at items[top]. One write, no shifting.',
          'لو top == capacity - 1 يبقى الـ array مليانة، فبنرجّع overflow. غير كده بنزوّد top بواحد ونكتب الرقم في items[top]. كتابة واحدة، ومفيش أي element بيتحرّك.') },
        { title: message('pop: check, read, move top down', 'الـ pop: بنشيّك، بنقرا، بننزّل top'), body: message('If top == -1 there is nothing to take: report underflow. Otherwise read items[top], decrease top, and return the value. The old value is not erased; it just falls outside items[0..top].',
          'لو top == -1 يبقى مفيش حاجة ناخدها، فبنرجّع underflow. غير كده بنقرا items[top]، وننزّل top بواحد، ونعمل return للرقم. الرقم القديم مش بيتمسح، هو بس بيبقى برّه items[0..top].') },
        { title: message('peek and isEmpty: look without changing', 'الـ peek والـ isEmpty: بنبص من غير ما نغيّر'), body: message('peek returns items[top] (or underflow when empty) and leaves top alone. isEmpty just tests top == -1.',
          'الـ peek بيعمل return لـ items[top]، ولو الـ stack فاضي بيرجّع underflow، ومش بيغيّر top. والـ isEmpty بتشيّك top == -1 وبس.') },
      ],
      notes: [
        message('LIFO means the order comes out reversed: push 1, 2, 3, 4 and four pops return 4, 3, 2, 1. That is why stacks undo edits, run the call stack, and match brackets: the most recent open thing is the first one to close.',
          'الـ LIFO معناه إن الترتيب بيطلع مقلوب: لو عملنا push لـ 1 و 2 و 3 و 4، الأربع pops هيرجّعوا 4 و 3 و 2 و 1. وعشان كده الـ stack بيتستخدم في الـ undo، والـ call stack، ومطابقة الأقواس: آخر حاجة اتفتحت هي أول حاجة تتقفل.'),
        message('Underflow is a bug in the caller, not in the stack: check isEmpty before pop or peek when the stack may be empty. Here the error is reported and the script keeps going.',
          'الـ underflow غلطة من اللي بيستخدم الـ stack، مش من الـ stack نفسه: شيّك isEmpty قبل الـ pop أو الـ peek لو ممكن يكون فاضي. هنا بنرجّع الـ error ونكمّل باقي الـ operations.'),
        message('A fixed array gives overflow. A dynamic array (doubling when full) removes the limit: push is then O(1) amortized, with an occasional O(n) copy. A linked list also works, with O(1) push and pop but an extra pointer per value.',
          'الـ array الثابتة بتجيب overflow. لو استخدمنا dynamic array بتكبر للضعف لما تتملي، مبقاش فيه حد: الـ push بقى O(1) amortized، ومرة كل فين وفين بيحصل copy بـ O(n). والـ linked list كمان تنفع، فيها push و pop بـ O(1)، بس كل رقم محتاج pointer زيادة.'),
        message('A stack gives up random access on purpose: finding a value in the middle means popping down to it, O(n). Pick a stack when you only ever need the newest item; use a queue when you need the oldest first.',
          'الـ stack بيتنازل عن إنك توصل لأي مكان: لو عايز رقم في النص لازم تعمل pop لحد ما توصله، وده O(n). اختار stack لما تكون محتاج آخر حاجة دخلت بس، واستخدم queue لما تكون محتاج أقدم حاجة الأول.'),
        message('The reads + writes counter covers items[] only; comparisons of top are not counted. Slots marked old are values left above top after a pop.',
          'عداد القراية والكتابة بيعدّ items[] بس، والمقارنات بتاعة top مش محسوبة. الأماكن اللي عليها old دي أرقام فضلت فوق top بعد pop.'),
      ],
      costs: [
        { label: message('push / pop / peek', 'push / pop / peek'), value: 'O(1)' },
        { label: message('isEmpty', 'isEmpty'), value: 'O(1)' },
        { label: message('Find a value inside', 'ندوّر على رقم جوّه'), value: 'O(n)' },
        { label: message('Space', 'المساحة'), value: 'O(capacity)' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
