(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const MAX_CAPACITY = 8;
  const MAX_OPERATIONS = 12;
  const VALUE_MIN = -99, VALUE_MAX = 999;
  const INDEX_MIN = -99, INDEX_MAX = 99;
  const MAX_INITIAL_LENGTH = 64;
  const MAX_OPERATIONS_LENGTH = 240;
  const OPS = {
    get: ['index'], set: ['index', 'value'], append: ['value'],
    insert: ['index', 'value'], delete: ['index'], find: ['value'],
  };
  const code = [
    'get(i):',
    '  if i < 0 or i >= size: error "out of bounds"',
    '  return a[i]',
    'set(i, value):',
    '  if i < 0 or i >= size: error "out of bounds"',
    '  a[i] = value',
    'append(value):',
    '  if size == capacity: error "full"',
    '  a[size] = value',
    '  size = size + 1',
    'insert(i, value):',
    '  if size == capacity: error "full"',
    '  if i < 0 or i > size: error "out of bounds"',
    '  j = size',
    '  while j > i:',
    '    a[j] = a[j - 1]',
    '    j = j - 1',
    '  a[i] = value',
    '  size = size + 1',
    'delete(i):',
    '  if i < 0 or i >= size: error "out of bounds"',
    '  removed = a[i]',
    '  j = i',
    '  while j < size - 1:',
    '    a[j] = a[j + 1]',
    '    j = j + 1',
    '  size = size - 1',
    '  return removed',
    'find(value):',
    '  i = 0',
    '  while i < size:',
    '    if a[i] == value: return i',
    '    i = i + 1',
    '  return -1',
  ];
  // Line numbers of each routine, so frames and tests share one source of truth.
  const LINES = {
    get: { head: 1, check: 2, read: 3 },
    set: { head: 4, check: 5, write: 6 },
    append: { head: 7, full: 8, write: 9, grow: 10 },
    insert: { head: 11, full: 12, check: 13, start: 14, loop: 15, move: 16, step: 17, write: 18, grow: 19 },
    delete: { head: 20, check: 21, remove: 22, start: 23, loop: 24, move: 25, step: 26, shrink: 27, ret: 28 },
    find: { head: 29, start: 30, loop: 31, compare: 32, step: 33, missing: 34 },
  };

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  const isInt = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
  const label = operation => OPS[operation.op].map(arg => operation[arg]).join(', ');
  const call = operation => `${operation.op}(${label(operation)})`;

  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      fail('Expected an object with capacity, initial and operations.', 'محتاجين object جواه capacity و initial و operations.');
    }
    if (!isInt(input.capacity, 1, MAX_CAPACITY)) {
      fail(`Capacity must be an integer from 1 to ${MAX_CAPACITY}.`, `الـ capacity لازم تكون رقم صحيح من 1 لـ ${MAX_CAPACITY}.`);
    }
    if (!Array.isArray(input.initial)) fail('initial must be an array of integers.', 'initial لازم تكون array أرقام صحيحة.');
    if (input.initial.length > input.capacity) {
      fail('The starting values do not fit in the capacity.', 'الأرقام اللي في الأول أكتر من الـ capacity، مش هتساعهم.');
    }
    for (const value of input.initial) {
      if (!isInt(value, VALUE_MIN, VALUE_MAX)) {
        fail(`Every value must be an integer from ${VALUE_MIN} to ${VALUE_MAX}.`, `كل رقم لازم يكون صحيح ومن ${VALUE_MIN} لحد ${VALUE_MAX}.`);
      }
    }
    if (!Array.isArray(input.operations)) fail('operations must be an array.', 'operations لازم تكون array.');
    if (input.operations.length > MAX_OPERATIONS) {
      fail(`Use at most ${MAX_OPERATIONS} operations.`, `اكتب ${MAX_OPERATIONS} operations بالكتير.`);
    }
    for (const operation of input.operations) {
      if (!operation || typeof operation !== 'object' || !Object.hasOwn(OPS, operation.op)) {
        fail('Unknown operation. Use get, set, append, insert, delete or find.', 'الـ operation دي مش معروفة. استخدم get أو set أو append أو insert أو delete أو find.');
      }
      const args = OPS[operation.op];
      for (const key of Object.keys(operation)) {
        if (key !== 'op' && !args.includes(key)) fail(`${operation.op} does not take ${key}.`, `الـ ${operation.op} مش بياخد ${key}.`);
      }
      if (args.includes('index') && !isInt(operation.index, INDEX_MIN, INDEX_MAX)) {
        fail(`Indices must be integers from ${INDEX_MIN} to ${INDEX_MAX}.`, `الـ index لازم يكون رقم صحيح من ${INDEX_MIN} لـ ${INDEX_MAX}.`);
      }
      if (args.includes('value') && !isInt(operation.value, VALUE_MIN, VALUE_MAX)) {
        fail(`Every value must be an integer from ${VALUE_MIN} to ${VALUE_MAX}.`, `كل رقم لازم يكون صحيح ومن ${VALUE_MIN} لحد ${VALUE_MAX}.`);
      }
    }
    return input;
  }

  const westernDigits = text => text
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));

  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput)
      || typeof rawInput.capacity !== 'string' || typeof rawInput.initial !== 'string' || typeof rawInput.operations !== 'string') {
      fail('Enter capacity, starting values and operations as text.', 'اكتب الـ capacity والأرقام اللي في الأول والـ operations كـ text.');
    }
    const capacityText = westernDigits(rawInput.capacity.trim());
    if (!/^\d{1,2}$/.test(capacityText) || !isInt(Number(capacityText), 1, MAX_CAPACITY)) {
      fail(`Capacity must be a whole number from 1 to ${MAX_CAPACITY}.`, `الـ capacity لازم تكون رقم صحيح من 1 لـ ${MAX_CAPACITY}.`);
    }
    if (rawInput.initial.length > MAX_INITIAL_LENGTH) {
      fail(`Keep the starting values within ${MAX_INITIAL_LENGTH} characters.`, `خلّي الأرقام اللي في الأول في حدود ${MAX_INITIAL_LENGTH} حرف.`);
    }
    const initialText = westernDigits(rawInput.initial.trim());
    if (initialText && !/^[+-]?\d+(?:(?:\s*[,،]\s*|\s+)[+-]?\d+)*$/.test(initialText)) {
      fail('Starting values: integers separated by commas or spaces, or blank for an empty array.',
        'الأرقام اللي في الأول: أرقام صحيحة بينها comma أو مسافة. سيبها فاضية لو عايز array فاضية.');
    }
    const initial = initialText ? initialText.split(/[,،\s]+/).map(Number) : [];

    if (rawInput.operations.length > MAX_OPERATIONS_LENGTH) {
      fail(`Keep the operations within ${MAX_OPERATIONS_LENGTH} characters.`, `خلّي الـ operations في حدود ${MAX_OPERATIONS_LENGTH} حرف.`);
    }
    const parts = westernDigits(rawInput.operations).split(/[\n,;،؛]/).map(part => part.trim()).filter(Boolean);
    if (parts.length > MAX_OPERATIONS) {
      fail(`Use at most ${MAX_OPERATIONS} operations.`, `اكتب ${MAX_OPERATIONS} operations بالكتير.`);
    }
    const operations = parts.map(part => {
      const match = /^([a-z]+)((?:\s+[+-]?\d+)*)$/i.exec(part);
      const op = match && match[1].toLowerCase();
      if (!match || !Object.hasOwn(OPS, op)) {
        fail(`"${part.slice(0, 20)}" is not an operation. Use get, set, append, insert, delete or find.`,
          `"${part.slice(0, 20)}" مش operation معروفة. استخدم get أو set أو append أو insert أو delete أو find.`);
      }
      const numbers = match[2].trim() ? match[2].trim().split(/\s+/).map(Number) : [];
      const args = OPS[op];
      if (numbers.length !== args.length) {
        const usage = `${op} ${args.join(' ')}`;
        fail(`${op} takes ${args.length === 1 ? 'one number' : 'two numbers'}: ${usage}.`,
          `الـ ${op} محتاج ${args.length === 1 ? 'رقم واحد' : 'رقمين'}: ${usage}.`);
      }
      const operation = { op };
      args.forEach((arg, index) => { operation[arg] = numbers[index]; });
      return operation;
    });
    return validate({ capacity: Number(capacityText), initial, operations });
  }

  function build(input) {
    validate(input);
    const capacity = input.capacity;
    let nextItem = 0, nextFree = 0;
    const slots = [];
    for (let index = 0; index < capacity; index++) {
      slots.push(index < input.initial.length
        ? { id: `item-${nextItem++}`, value: input.initial[index] }
        : { id: `free-${nextFree++}`, value: null });
    }
    const state = {
      capacity, size: input.initial.length, slots,
      values: [...input.initial],
      step: 0, operation: null, i: null, j: null, value: null, output: null,
      focus: {}, opMoves: 0, moves: 0, comparisons: 0, rejected: 0, completed: 0,
      outputs: [], condition: null, done: false, result: null,
    };
    const frames = [];

    function sceneNote() {
      const { size } = state;
      if (size === 0) {
        return message(`Empty array: all ${capacity} slots are free.`, `الـ array فاضية: الـ ${capacity} خانات كلهم فاضيين.`);
      }
      if (size === capacity) {
        return message(`size ${size} = capacity: no free slot left.`, `الـ size ${size} = الـ capacity، يعني مفيش ولا خانة فاضية.`);
      }
      return message(`size ${size} of capacity ${capacity}. Indices ${size}…${capacity - 1} are free.`,
        `الـ size ${size} من capacity ${capacity}. الـ indices من ${size} لـ ${capacity - 1} فاضيين.`);
    }

    function emit(kind, lines, title, explanation, equation = '') {
      state.values = state.slots.slice(0, state.size).map(slot => slot.value);
      const show = value => (value === null ? '—' : value);
      frames.push(copy({
        kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'size', value: state.size },
          { name: 'capacity', value: capacity },
          { name: 'i', value: show(state.i) },
          { name: 'j', value: show(state.j) },
          { name: 'value', value: show(state.value) },
          { name: 'return', value: show(state.output) },
        ],
        metrics: [
          { label: message('Moves (this op)', 'نقلات الـ operation دي'), value: state.opMoves },
          { label: message('Moves (total)', 'كل النقلات'), value: state.moves },
          { label: message('Comparisons', 'المقارنات'), value: state.comparisons },
          { label: message('Rejected', 'operations اترفضت'), value: state.rejected },
        ],
        scene: {
          rows: [{
            id: 'array', label: message(`Array · capacity ${capacity}`, `الـ array · capacity ${capacity}`), layout: 'cards',
            cells: state.slots.map((slot, index) => {
              const markers = [];
              if (index === state.i) markers.push('i');
              if (index === state.j) markers.push('j');
              if (index === state.size) markers.push('size');
              return {
                id: slot.id, value: slot.value === null ? '' : slot.value, index,
                tone: state.focus[index] || (slot.value === null ? 'muted' : 'default'),
                marker: markers.join(' · '),
              };
            }),
          }],
          graph: null,
          collections: [{ label: message('Results', 'النتايج'), values: [...state.outputs] }],
          note: sceneNote(),
        },
      }));
    }

    function record(text) { state.outputs.push(`${state.step}. ${text}`); }

    function reject(kind, lines, operation, en, ar, equation) {
      state.rejected++; state.condition = false;
      const reason = kind === 'overflow' ? 'full' : 'out of bounds';
      state.output = `error: ${reason}`;
      record(`${call(operation)} ✗ ${reason}`);
      state.focus = {};
      for (let index = 0; index < (kind === 'overflow' ? capacity : state.size); index++) state.focus[index] = 'pivot';
      emit(kind, lines,
        kind === 'overflow' ? message('The array is full', 'الـ array مليانة')
          : message(`Index ${state.i} is out of bounds`, `الـ index ${state.i} برّه الحدود`),
        message(en, ar), equation);
    }

    // Shared bounds check for get, set and delete: 0 ≤ i < size.
    function checkLive(operation, line) {
      const { i, size } = state;
      state.condition = i >= 0 && i < size;
      const equation = `0 ≤ ${i} < ${size} → ${state.condition}`;
      if (!state.condition) {
        reject('out-of-bounds', [line], operation,
          size === 0 ? `The array is empty, so no index is valid. ${operation.op} stops with an error and nothing changes.`
            : `Valid indices are 0 to ${size - 1}. Touching a[${i}] would reach memory that is not a live element, so ${operation.op} stops with an error.`,
          size === 0 ? `الـ array فاضية، يعني مفيش ولا index مسموح. الـ ${operation.op} بيقف بـ error ومفيش حاجة بتتغيّر.`
            : `الـ indices المسموحة من 0 لـ ${size - 1}. لو لمسنا a[${i}] هنوصل لـ memory مش فيها element حقيقي، فالـ ${operation.op} بيقف بـ error.`,
          equation);
        return false;
      }
      state.focus = { [i]: 'active' };
      emit('check', [line], message(`Index ${i} is inside the array`, `الـ index ${i} جوّه الـ array`),
        message(`0 ≤ ${i} < size ${size}, so this slot holds a live element.`,
          `الـ ${i} بين 0 و size ناقص 1، يعني الخانة دي فيها element حقيقي.`), equation);
      return true;
    }

    function checkRoom(operation, line) {
      const { size } = state;
      state.condition = size === capacity;
      const equation = `${size} == ${capacity} → ${state.condition}`;
      if (state.condition) {
        reject('overflow', [line], operation,
          `All ${capacity} slots are taken. A fixed-capacity array cannot grow in place, because the memory right after it may belong to something else. ${operation.op} is rejected and the array stays as it was.`,
          `الـ ${capacity} خانات كلهم مليانين. الـ array اللي الـ capacity بتاعتها ثابتة مينفعش تكبر في مكانها، لأن الـ memory اللي بعدها على طول ممكن تكون تبع حاجة تانية. فبنرفض الـ ${operation.op} ده والـ array بتفضل زي ما هي.`,
          equation);
        return false;
      }
      state.focus = { [size]: 'active' };
      emit('check', [line], message('There is a free slot', 'فيه خانة فاضية'),
        message(`size ${size} < capacity ${capacity}, so index ${size} is free.`,
          `الـ size ${size} أقل من الـ capacity ${capacity}، يعني index ${size} فاضي.`), equation);
      return true;
    }

    function grow(line, index) {
      const before = state.size;
      state.size++; state.condition = null;
      state.focus = { [index]: 'found' };
      emit('grow', [line], message(`size grows to ${state.size}`, `الـ size بقى ${state.size}`),
        message(state.size === capacity ? 'size counts the slots in use. Every slot is used now, so the array is full.'
          : `size counts the slots in use. Indices from ${state.size} on are still free.`,
        state.size === capacity ? 'الـ size بيعدّ الخانات المستخدمة. كل الخانات اتملت، يعني الـ array بقت مليانة.'
          : `الـ size بيعدّ الخانات المستخدمة. الـ indices من ${state.size} لحد الآخر لسه فاضيين.`),
        `size = ${before} + 1 = ${state.size}`);
    }

    function runGet(operation) {
      const L = LINES.get;
      if (!checkLive(operation, L.check)) return;
      const { i } = state, value = state.slots[i].value;
      state.output = value; state.condition = null; state.focus = { [i]: 'found' };
      record(`get(${i}) → ${value}`);
      emit('read', [L.read], message(`a[${i}] is ${value}`, `a[${i}] قيمته ${value}`),
        message('One address calculation and one memory read, no matter how long the array is. That is why reading by index is O(1).',
          'حسبة address واحدة وقراية واحدة من الـ memory، مهما كانت الـ array طويلة. عشان كده القراية بالـ index بتاخد O(1).'),
        `address = base + ${i} × 4 bytes → ${value}`);
    }

    function runSet(operation) {
      const L = LINES.set;
      if (!checkLive(operation, L.check)) return;
      const { i } = state, old = state.slots[i].value;
      state.slots[i].value = operation.value; state.condition = null; state.focus = { [i]: 'found' };
      state.output = null;
      record(`set(${i}, ${operation.value}) ✓`);
      emit('write', [L.write], message(`Overwrite ${old} with ${operation.value}`, `الـ ${operation.value} بقى مكان الـ ${old}`),
        message('The same address math finds the slot directly. No other element moves, so writing by index is O(1) too.',
          'نفس حسبة الـ address بتوصّلنا للخانة على طول. ومفيش أي element تاني بيتحرّك، فالكتابة بالـ index كمان O(1).'),
        `a[${i}] = ${operation.value}  (was ${old})`);
    }

    function runAppend(operation) {
      const L = LINES.append;
      if (!checkRoom(operation, L.full)) return;
      const index = state.size;
      state.slots[index] = { id: `item-${nextItem++}`, value: operation.value };
      state.condition = null; state.focus = { [index]: 'found' };
      emit('write', [L.write], message(`Write ${operation.value} at index ${index}`, `بنكتب ${operation.value} في index ${index}`),
        message('The end is already free, so no element moves. Append is O(1) as long as there is room.',
          'آخر الـ array فاضي أصلًا، فمفيش element بيتحرّك. الـ append بياخد O(1) طول ما فيه مكان.'),
        `a[${index}] = ${operation.value}`);
      record(`append(${operation.value}) ✓`);
      grow(L.grow, index);
    }

    function runInsert(operation) {
      const L = LINES.insert;
      if (!checkRoom(operation, L.full)) return;
      const { i, size } = state;
      state.condition = i >= 0 && i <= size;
      const equation = `0 ≤ ${i} ≤ ${size} → ${state.condition}`;
      if (!state.condition) {
        reject('out-of-bounds', [L.check], operation,
          `For insert, valid positions are 0 to ${size}. Index ${i} would leave a gap or fall outside the array, so insert stops with an error.`,
          `في الـ insert، الأماكن المسموحة من 0 لـ ${size}. الـ index ${i} يا إما هيسيب خانة فاضية في النص يا إما هيطلع برّه الـ array، فالـ insert بيقف بـ error.`,
          equation);
        return;
      }
      state.focus = { [i]: 'active' };
      emit('check', [L.check], message(`Index ${i} is a valid position`, `الـ index ${i} مكان مسموح`),
        message(i === size ? `0 ≤ ${i} ≤ ${size}. Index ${i} is right after the last element, so this works like append.`
          : `0 ≤ ${i} ≤ ${size}, so ${operation.value} can go at index ${i}.`,
        i === size ? `الـ ${i} بين 0 و ${size}. الـ index ${i} بعد آخر element على طول، فده هيشتغل زي الـ append.`
          : `الـ ${i} بين 0 و ${size}، يعني ينفع نحط ${operation.value} في index ${i}.`), equation);

      const count = size - i;
      state.j = size; state.condition = null; state.focus = { [size]: 'active' };
      emit('shift-start', [L.start],
        count ? message(`${count} element${count === 1 ? '' : 's'} must move right`, `عدد الـ elements اللي هيتحرّكوا يمين: ${count}`)
          : message('Nothing to shift', 'مفيش حاجة تتحرّك'),
        message(count ? `Start j at size ${size}, the first free slot. We copy from right to left so no element is overwritten before it moves.`
          : `Start j at size ${size}. Index ${i} is already the first free slot, so nothing moves.`,
        count ? `بنبدأ j من الـ size، يعني ${size}، أول خانة فاضية. بننقل من اليمين للشمال عشان مفيش element يتمسح قبل ما يتنقل.`
          : `بنبدأ j من الـ size، يعني ${size}. الـ index ${i} هو أول خانة فاضية أصلًا، فمفيش حاجة تتحرّك.`),
        `j = size = ${size}`);

      while (state.j > i) {
        const j = state.j, moved = state.slots[j - 1];
        [state.slots[j - 1], state.slots[j]] = [state.slots[j], state.slots[j - 1]];
        state.opMoves++; state.moves++; state.j = j - 1;
        state.focus = { [j]: 'active' };
        emit('shift', [L.loop, L.move, L.step], message(`Move ${moved.value} from index ${j - 1} to ${j}`, `بننقل الـ ${moved.value} من index ${j - 1} لـ ${j}`),
          message(`j > i, so a[${j - 1}] is copied one slot right. Move ${state.opMoves} of ${count}: every element from index ${i} to the end pays one move, which is why insert is O(n).`,
            `j أكبر من i، فبننقل a[${j - 1}] خانة يمين. دي النقلة رقم ${state.opMoves} من ${count}. كل element من index ${i} لحد الآخر بياخد نقلة، وعشان كده الـ insert بياخد O(n).`),
          `${j} > ${i}: a[${j}] = a[${j - 1}] = ${moved.value}; j = ${j - 1}`);
      }

      state.condition = false; state.focus = { [i]: 'active' };
      emit('shift-end', [L.loop], message(`Index ${i} is free`, `الـ index ${i} فضي`),
        message(`j reached i, so the loop stops. Index ${i} holds no live element now and is ready for ${operation.value}.`,
          `j وصل لـ i، فالـ loop وقفت. الـ index ${i} دلوقتي فاضي ومستني الـ ${operation.value}.`),
        `${state.j} > ${i} → false`);

      state.slots[i] = { id: `item-${nextItem++}`, value: operation.value };
      state.condition = null; state.focus = { [i]: 'found' };
      emit('write', [L.write], message(`Write ${operation.value} at index ${i}`, `بنكتب ${operation.value} في index ${i}`),
        message(`The gap we opened takes the new value. Element moves for this insert: ${count}.`,
          `الخانة اللي فضّيناها خدت الرقم الجديد. عدد النقلات في الـ insert ده: ${count}.`),
        `a[${i}] = ${operation.value}`);
      record(`insert(${i}, ${operation.value}) ✓ moves: ${count}`);
      grow(L.grow, i);
    }

    function runDelete(operation) {
      const L = LINES.delete;
      if (!checkLive(operation, L.check)) return;
      const { i } = state, removed = state.slots[i].value;
      state.slots[i] = { id: `free-${nextFree++}`, value: null };
      state.value = removed; state.condition = null; state.focus = { [i]: 'active' };
      emit('remove', [L.remove], message(`Take out ${removed}`, `بنشيل الـ ${removed}`),
        message(`Save ${removed} to return it. Index ${i} is now a gap in the middle, and it must be closed so the elements stay side by side.`,
          `بنحفظ الـ ${removed} عشان نرجّعه. الـ index ${i} بقى خانة فاضية في النص، ولازم نقفلها عشان الـ elements تفضل ورا بعض.`),
        `removed = a[${i}] = ${removed}`);

      const count = state.size - 1 - i;
      state.j = i; state.focus = { [i]: 'active' };
      emit('shift-start', [L.start],
        count ? message(`${count} element${count === 1 ? '' : 's'} must move left`, `عدد الـ elements اللي هيتحرّكوا شمال: ${count}`)
          : message('Nothing to shift', 'مفيش حاجة تتحرّك'),
        message(count ? `Start j at ${i}. We copy from left to right, so each element moves into the slot that was just freed.`
          : `Start j at ${i}. It is the last index, so nothing has to move.`,
        count ? `بنبدأ j من ${i}. بننقل من الشمال لليمين، فكل element بيروح للخانة اللي لسه فاضية.`
          : `بنبدأ j من ${i}. ده آخر index، فمفيش حاجة تتحرّك.`),
        `j = i = ${i}`);

      while (state.j < state.size - 1) {
        const j = state.j, moved = state.slots[j + 1];
        [state.slots[j], state.slots[j + 1]] = [state.slots[j + 1], state.slots[j]];
        state.opMoves++; state.moves++; state.j = j + 1;
        state.focus = { [j]: 'active' };
        emit('shift', [L.loop, L.move, L.step], message(`Move ${moved.value} from index ${j + 1} to ${j}`, `بننقل الـ ${moved.value} من index ${j + 1} لـ ${j}`),
          message(`j < size − 1, so a[${j + 1}] is copied one slot left. Move ${state.opMoves} of ${count}: deleting near the front moves almost everything, which is why delete is O(n).`,
            `j أقل من size − 1، فبننقل a[${j + 1}] خانة شمال. دي النقلة رقم ${state.opMoves} من ${count}. لما نمسح من أول الـ array تقريبًا كل الـ elements بتتحرّك، وعشان كده الـ delete بياخد O(n).`),
          `${j} < ${state.size - 1}: a[${j}] = a[${j + 1}] = ${moved.value}; j = ${j + 1}`);
      }

      state.condition = false; state.focus = { [state.j]: 'active' };
      emit('shift-end', [L.loop], message('The gap reached the end', 'الخانة الفاضية وصلت للآخر'),
        message('j = size − 1, so the loop stops. The elements are side by side again, with the free slot at the end.',
          'j بقى size − 1، فالـ loop وقفت. الـ elements رجعت ورا بعض تاني، والخانة الفاضية بقت في الآخر.'),
        `${state.j} < ${state.size - 1} → false`);

      const before = state.size;
      state.size--; state.output = removed; state.condition = null; state.focus = {};
      record(`delete(${i}) → ${removed}`);
      emit('shrink', [L.shrink, L.ret], message(`size drops to ${state.size}; return ${removed}`, `الـ size بقى ${state.size}، وبنعمل return للـ ${removed}`),
        message(`The last used slot is free again. Element moves for this delete: ${count}.`,
          `آخر خانة كانت مستخدمة رجعت فاضية. عدد النقلات في الـ delete ده: ${count}.`),
        `size = ${before} - 1 = ${state.size}; return ${removed}`);
    }

    function runFind(operation) {
      const L = LINES.find, target = operation.value;
      let checked = 0;
      state.i = 0; state.focus = {};
      emit('scan-start', [L.start], message('Start at index 0', 'بنبدأ من index 0'),
        message('We know the value, not its index. The only way is to check the slots one by one.',
          'إحنا عارفين الرقم، بس مش عارفين الـ index بتاعه. مفيش طريقة غير إننا نبص على الخانات واحدة واحدة.'),
        'i = 0');
      while (state.i < state.size) {
        const i = state.i, value = state.slots[i].value;
        checked++; state.comparisons++;
        state.condition = value === target;
        state.focus = { [i]: state.condition ? 'found' : 'active' };
        emit('compare', [L.loop, L.compare], state.condition ? message(`a[${i}] is ${target}`, `a[${i}] هو الـ ${target}`)
          : message(`a[${i}] is ${value}, not ${target}`, `a[${i}] قيمته ${value}، مش ${target}`),
        message(`i < size, so compare a[${i}] with ${target}. Comparison ${checked}.`,
          `i أقل من الـ size، فبنقارن a[${i}] بـ ${target}. دي المقارنة رقم ${checked}.`),
        `${value} == ${target} → ${state.condition}`);
        if (state.condition) {
          const later = state.slots.slice(i + 1, state.size).some(slot => slot.value === target);
          state.output = i; state.condition = null;
          record(`find(${target}) → ${i}`);
          emit('found', [L.compare], message(`Found at index ${i}`, `لقيناه عند index ${i}`),
            message(`Return ${i} after ${checked} comparison${checked === 1 ? '' : 's'}. In the worst case the value is last or missing, so search by value is O(n).${later ? ' Later copies are never checked: find returns the first match.' : ''}`,
              `بنعمل return لـ ${i} بعد ${checked} مقارنات. في الـ worst case الرقم بيبقى في الآخر أو مش موجود، فالـ search بالقيمة بياخد O(n).${later ? ' وأي نسخة تانية بعده مش بنبص عليها: find بترجّع أول match.' : ''}`),
            `return ${i}`);
          return;
        }
        state.i++; state.condition = null; state.focus = {};
        emit('advance', [L.step], message(`Try index ${state.i}`, `بنروح لـ index ${state.i}`),
          message('No match yet, so move to the next slot.', 'لسه مالقيناش، فبنروح للخانة اللي بعدها.'),
          `i = ${state.i - 1} + 1 = ${state.i}`);
      }
      state.condition = false; state.output = -1; state.focus = {};
      record(`find(${target}) → -1`);
      emit('not-found', [L.loop, L.missing], message(`${target} is not in the array`, `الـ ${target} مش موجود في الـ array`),
        message(state.size === 0 ? 'The array is empty, so the loop never runs. Return -1.'
          : `i reached size ${state.size} after checking every element (${checked} comparison${checked === 1 ? '' : 's'}). Return -1.`,
        state.size === 0 ? 'الـ array فاضية، فالـ loop مش بتلف ولا مرة. بنعمل return لـ -1.'
          : `i وصل للـ size (${state.size}) بعد ما بصّينا على كل الـ elements، يعني ${checked} مقارنات. بنعمل return لـ -1.`),
        `${state.i} < ${state.size} → false; return -1`);
    }

    const intros = {
      get: o => message(`Read the element at index ${o.index}.`, `عايزين نقرا الـ element اللي عند index ${o.index}.`),
      set: o => message(`Overwrite the element at index ${o.index} with ${o.value}.`, `هنكتب ${o.value} مكان الـ element اللي عند index ${o.index}.`),
      append: o => message(`Add ${o.value} right after the last element.`, `هنحط ${o.value} بعد آخر element على طول.`),
      insert: o => message(`Put ${o.value} at index ${o.index}, keeping every element after it in the same order.`, `عايزين نحط ${o.value} في index ${o.index}، وكل اللي بعده يفضل بنفس ترتيبه.`),
      delete: o => message(`Remove the element at index ${o.index} and close the gap.`, `هنشيل الـ element اللي عند index ${o.index} ونقفل مكانه.`),
      find: o => message(`Search for the first ${o.value}. We know the value, not where it is.`, `بندوّر على أول ${o.value}. إحنا عارفين الرقم، بس مش عارفين هو فين.`),
    };
    const runners = { get: runGet, set: runSet, append: runAppend, insert: runInsert, delete: runDelete, find: runFind };

    emit('ready', [], message('Slots side by side in memory', 'خانات ورا بعض في الـ memory'),
      message(`The array reserves ${capacity} slots and ${state.size} are in use. a[i] lives at base + i × element size, so any index is one calculation away. ${input.operations.length ? `Next: ${input.operations.length} operation${input.operations.length === 1 ? '' : 's'}.` : 'There are no operations to run.'}`,
        `الـ array حاجزة ${capacity} خانات، والمستخدم منهم ${state.size}. a[i] مكانه base + i × حجم الـ element، فأي index بيوصله حسبة واحدة. ${input.operations.length ? `عدد الـ operations اللي جاية: ${input.operations.length}.` : 'مفيش operations نشغّلها.'}`),
      `capacity = ${capacity}, size = ${state.size}`);

    for (const operation of input.operations) {
      state.step++; state.opMoves = 0; state.output = null; state.condition = null;
      state.i = OPS[operation.op].includes('index') ? operation.index : null;
      state.j = null; state.value = OPS[operation.op].includes('value') ? operation.value : null;
      state.operation = call(operation); state.focus = {};
      emit('op', [LINES[operation.op].head], message(`Step ${state.step}: ${call(operation)}`, `خطوة ${state.step}: بنعمل ${call(operation)}`),
        intros[operation.op](operation), call(operation));
      const rejectedBefore = state.rejected;
      runners[operation.op](operation);
      if (state.rejected === rejectedBefore) state.completed++;
    }

    state.done = true; state.operation = null; state.i = null; state.j = null; state.value = null;
    state.output = null; state.condition = null; state.focus = {}; state.opMoves = 0;
    state.values = state.slots.slice(0, state.size).map(slot => slot.value);
    state.result = { values: [...state.values], size: state.size, capacity, outputs: [...state.outputs] };
    emit('done', [], message('All operations finished', 'خلّصنا كل الـ operations'),
      message(input.operations.length === 0 ? 'No operations to run. The array is unchanged.'
        : `${state.completed} ran and ${state.rejected} were rejected. Element moves in total: ${state.moves}. Only insert and delete move elements; get, set and append never do.`,
      input.operations.length === 0 ? 'مفيش operations نشغّلها. الـ array زي ما هي.'
        : `عدد الـ operations اللي اشتغلت: ${state.completed}، واللي اترفضت: ${state.rejected}. وعدد النقلات كلها: ${state.moves}. الـ insert والـ delete بس هما اللي بيحرّكوا elements، أما get و set و append عمرهم ما بيحرّكوا حاجة.`),
      `size = ${state.size}, moves = ${state.moves}`);
    return frames;
  }

  const lesson = {
    id: 'arrays', name: 'Arrays', theme: 'data-structures', category: 'structure', number: '11',
    label: 'ARRAYS', cost: 'O(n)',
    description: message('Read any index in O(1), and watch insert and delete shift elements one slot at a time.',
      'بنقرا أي index في O(1)، ونشوف الـ insert والـ delete بيزحزحوا الـ elements خانة خانة.'),
    note: message('Fixed capacity: when every slot is used, append and insert are rejected instead of growing the array.',
      'الـ capacity ثابتة: لما كل الخانات تتملي، الـ append والـ insert بيترفضوا بدل ما الـ array تكبر.'),
    code,
    keySteps: ['ready', 'read', 'write', 'shift', 'remove', 'overflow', 'out-of-bounds', 'compare', 'found', 'not-found', 'done'],
    fields: [
      {
        name: 'capacity', label: message('Capacity', 'الـ capacity'), type: 'text', maxLength: 2,
        help: message(`How many slots the array reserves: 1 to ${MAX_CAPACITY}.`, `عدد الخانات اللي الـ array حاجزاها: من 1 لـ ${MAX_CAPACITY}.`),
      },
      {
        name: 'initial', label: message('Starting values', 'الأرقام اللي في الأول'), type: 'text', maxLength: MAX_INITIAL_LENGTH,
        help: message(`Integers from ${VALUE_MIN} to ${VALUE_MAX}, separated by commas or spaces, no more than the capacity. Leave blank for an empty array.`,
          `أرقام صحيحة من ${VALUE_MIN} لـ ${VALUE_MAX}، بينها comma أو مسافة، ومش أكتر من الـ capacity. سيبها فاضية لو عايز array فاضية.`),
      },
      {
        name: 'operations', label: message('Operations', 'الـ operations'), type: 'textarea', maxLength: MAX_OPERATIONS_LENGTH,
        help: message(`One per line or comma-separated, up to ${MAX_OPERATIONS}:\nget i · set i value · append value\ninsert i value · delete i · find value\nIndices ${INDEX_MIN} to ${INDEX_MAX}; values ${VALUE_MIN} to ${VALUE_MAX}. Example: insert 1 23`,
          `كل operation في سطر أو بينهم comma، لحد ${MAX_OPERATIONS}:\nget i · set i value · append value\ninsert i value · delete i · find value\nالـ index من ${INDEX_MIN} لـ ${INDEX_MAX}، والرقم من ${VALUE_MIN} لـ ${VALUE_MAX}. مثال: insert 1 23`),
      },
    ],
    defaults: { capacity: '6', initial: '4, 8, 15, 16', operations: 'get 2\ninsert 1 23\ndelete 0\nappend 42\nfind 16' },
    presets: [
      { id: 'default', label: message('Read, insert, delete, append, find', 'قراية و insert و delete و append و find'),
        input: { capacity: '6', initial: '4, 8, 15, 16', operations: 'get 2\ninsert 1 23\ndelete 0\nappend 42\nfind 16' } },
      { id: 'front-vs-back', label: message('Insert at front vs append', 'insert في الأول ولا append'),
        input: { capacity: '8', initial: '3, 5, 7, 9, 11', operations: 'append 13\ninsert 0 1\ndelete 0\ndelete 5' } },
      { id: 'overflow', label: message('Full array · overflow', 'array مليانة · overflow'),
        input: { capacity: '4', initial: '1, 2, 3', operations: 'append 4\nappend 5\ninsert 0 0\ndelete 3\ninsert 0 0' } },
      { id: 'out-of-bounds', label: message('Out-of-bounds indices', 'indices برّه الحدود'),
        input: { capacity: '5', initial: '10, 20, 30', operations: 'get 3\nset -1 7\ninsert 4 9\ndelete 3\ninsert 3 40\nget 3' } },
      { id: 'empty', label: message('Start empty', 'نبدأ بـ array فاضية'),
        input: { capacity: '4', initial: '', operations: 'delete 0\nfind 5\nappend 7\ninsert 0 3\nget 1' } },
      { id: 'duplicates', label: message('Duplicates · find returns the first', 'أرقام مكرّرة · find بترجّع أول واحد'),
        input: { capacity: '6', initial: '5, 2, 5, 2', operations: 'find 5\ndelete 0\nfind 5\nfind 9\nset 0 9\nfind 2' } },
      { id: 'set-vs-insert', label: message('set overwrites, insert shifts', 'set بيكتب فوق، insert بيزحزح'),
        input: { capacity: '5', initial: '1, 2, 3', operations: 'set 1 99\ninsert 1 50' } },
    ],
    parse, build,
    summary(input) {
      validate(input);
      return message(`capacity ${input.capacity} · ${input.initial.length} starting values · ${input.operations.length} operations`,
        `capacity ${input.capacity} · عدد الأرقام في الأول: ${input.initial.length} · عدد الـ operations: ${input.operations.length}`);
    },
    theory: {
      whenToUse: {
        use: [
          { en: "You read by position a lot: items[i] is one step, wherever i is.", ar: "بتقرا بالـ index كتير: items[i] خطوة واحدة مهما كان i فين." },
          { en: "The size is known up front, or you mostly add at the end.", ar: "الحجم معروف من الأول، أو أغلب الإضافة بتبقى في الآخر." },
          { en: "You loop over everything in order: slots next to each other are fast to scan.", ar: "بتلف على كل الـ elements بالترتيب: الخانات اللي جنب بعض بتتقري بسرعة." },
        ],
        avoid: [
          { en: "You often insert or delete near the front → each one shifts the rest; use a linked list or a deque.", ar: "بتعمل insert أو delete قريب من الأول كتير ← كل مرة بنعمل shift للباقي؛ استخدم linked list أو deque." },
          { en: "You often search by value → that is a full scan; use a hash table, or keep the array sorted and use binary search.", ar: "بتدوّر بالـ value كتير ← ده scan على الـ array كلها؛ استخدم hash table، أو خليها sorted واعمل binary search." },
        ],
      },
      title: message('One block of memory, one formula', 'حتة memory واحدة ومعادلة واحدة'),
      idea: message('An array keeps its elements side by side in one block of memory, so a[i] is one calculation away. The price is that inserting or deleting in the middle has to slide every element after it.',
        'الـ array بتحط الـ elements ورا بعض في حتة memory واحدة، فـ a[i] بيوصله حسبة واحدة. التمن إن أي insert أو delete في النص لازم يزحزح كل الـ elements اللي بعده.'),
      intro: message('You only need indices and loops. This lesson uses a fixed-capacity array: memory for capacity slots is reserved up front, and size counts how many are in use. When it is full, append and insert are rejected. Dynamic arrays (a Python list, a JavaScript Array, a C++ vector) handle that case by allocating a bigger block and copying.',
        'محتاج بس تعرف الـ indices والـ loops. الدرس ده بيستخدم array الـ capacity بتاعتها ثابتة: بنحجز خانات قد الـ capacity من الأول، والـ size بيعدّ المستخدم منهم. لما تتملي، الـ append والـ insert بيترفضوا. الـ dynamic arrays (زي الـ list في Python والـ Array في JavaScript والـ vector في C++) بتحل الحتة دي إنها تحجز حتة memory أكبر وتنسخ فيها.'),
      invariant: message('The live elements are exactly a[0] … a[size − 1], packed with no gaps and in order, and 0 ≤ size ≤ capacity. Slots from size to capacity − 1 are free. Every operation either keeps this true or is rejected before it changes anything.',
        'الـ elements الحقيقية هي a[0] لحد a[size − 1] بالظبط، ورا بعض من غير فراغات وبنفس ترتيبها، و 0 ≤ size ≤ capacity. الخانات من size لحد capacity − 1 فاضية. وكل operation يا إما بتحافظ على ده، يا إما بتترفض قبل ما تغيّر أي حاجة.'),
      steps: [
        { title: message('Index → address in one step', 'من الـ index للـ address في خطوة'),
          body: message('All elements have the same size and sit back to back, so a[i] lives at base + i × elementSize. get and set do that one calculation after a bounds check: O(1), however long the array is.',
            'كل الـ elements ليهم نفس الحجم وورا بعض، فـ a[i] مكانه base + i × elementSize. الـ get والـ set بيعملوا الحسبة دي بس بعد ما يتأكدوا من الحدود: O(1) مهما كانت الـ array طويلة.') },
        { title: message('append writes at index size', 'الـ append بيكتب عند index size'),
          body: message('If size < capacity, slot size is free. Write there and add one to size. Nothing moves, so append is O(1) while there is room.',
            'لو size < capacity، يبقى خانة size فاضية. بنكتب فيها ونزوّد size واحد. مفيش حاجة بتتحرّك، فالـ append بياخد O(1) طول ما فيه مكان.') },
        { title: message('insert opens a gap from the back', 'الـ insert بيفضّي مكان من الآخر'),
          body: message('To put a value at index i, every element from i to size − 1 moves one slot right first. Copy from the back (j = size down to i + 1) so nothing is overwritten before it moves. That is size − i moves: O(n) at the front, O(1) at the end.',
            'عشان نحط رقم في index i، كل element من i لحد size − 1 لازم يتحرّك خانة يمين الأول. بننقل من الآخر (j من size لحد i + 1) عشان مفيش حاجة تتمسح قبل ما تتنقل. يعني size − i نقلة: O(n) لو في الأول، و O(1) لو في الآخر.') },
        { title: message('delete closes the gap from the front', 'الـ delete بيقفل المكان من الأول'),
          body: message('Removing a[i] leaves a hole. Every element after it moves one slot left, copying front to back. That is size − 1 − i moves, so deleting the first element is the worst case.',
            'لما نشيل a[i] بيفضل مكانه فاضي. كل element بعده بيتحرّك خانة شمال، وبننقل من الأول للآخر. يعني size − 1 − i نقلة، فمسح أول element هو الـ worst case.') },
        { title: message('find has to look', 'الـ find لازم يدوّر'),
          body: message('An index tells you where to go; a value does not. find compares a[0], a[1], … until it matches or reaches size, returning the first matching index or -1: O(n). A sorted array could use binary search instead, but keeping it sorted makes insert pay the shifting cost.',
            'الـ index بيقولك تروح فين، إنما الرقم لأ. الـ find بيقارن a[0] و a[1] وهكذا لحد ما يلاقي match أو يوصل لـ size، وبيرجّع أول index فيه match أو -1: يعني O(n). لو الـ array sorted ينفع نستخدم binary search، بس الحفاظ على الترتيب بيخلّي الـ insert يدفع تمن النقل.') },
      ],
      notes: [
        message('Overflow policy in this lesson: a full array rejects append and insert and stays unchanged. A dynamic array would instead allocate a block about twice as big and copy all n elements, an O(n) step that happens rarely enough that append averages O(1) (amortized).',
          'الدرس ده لما الـ array تتملي بيرفض الـ append والـ insert وبيسيبها زي ما هي. الـ dynamic array بدل كده بتحجز حتة memory تقريبًا ضعف الحجم وتنسخ فيها الـ n elements كلهم. ده O(n)، بس بيحصل قليل لدرجة إن الـ append في المتوسط بيفضل O(1) (amortized).'),
        message('Bounds checks matter. Some languages (C, C++) skip them for speed, so a[size] silently reads whatever is in memory. Here an invalid index stops the operation with an error before anything is touched.',
          'الـ bounds check مهم. فيه لغات زي C و C++ بتسيبه عشان السرعة، فـ a[size] بيقرا أي حاجة موجودة في الـ memory من غير ما يقول. هنا أي index غلط بيوقّف الـ operation بـ error قبل ما نلمس أي حاجة.'),
        message('The cost of insert and delete is the number of elements after the index, not the array length as such. Work near the end is cheap; work near the front is expensive.',
          'تمن الـ insert والـ delete هو عدد الـ elements اللي بعد الـ index، مش طول الـ array نفسها. الشغل قرب الآخر رخيص، والشغل قرب الأول غالي.'),
        message('If the order of elements does not matter, delete can be O(1): copy the last element into the hole and decrease size. This lesson keeps order, so it shifts.',
          'لو ترتيب الـ elements مش فارق، ينفع الـ delete يبقى O(1): بننقل آخر element مكان الخانة الفاضية ونقلّل size. الدرس ده بيحافظ على الترتيب، فبيزحزح.'),
        message('Pick an array when you read by index a lot, append at the end, or scan in order: neighbors in memory are fast to read together (cache-friendly). If you insert and delete in the middle all the time, a linked list avoids the shifting but loses O(1) indexing.',
          'اختار array لو بتقرا بالـ index كتير، أو بتعمل append في الآخر، أو بتلف على الـ elements بالترتيب: الحاجات اللي جنب بعض في الـ memory بتتقري بسرعة مع بعض (cache-friendly). لو بتعمل insert و delete في النص طول الوقت، الـ linked list بتوفّر النقل، بس بتخسر القراية بالـ index في O(1).'),
        message('In the picture, a freed slot is drawn empty. In real memory the old bits stay there until something overwrites them; they just stop counting because they are at or after size.',
          'في الرسمة، الخانة اللي فضيت بتظهر فاضية. في الـ memory الحقيقية الرقم القديم بيفضل موجود لحد ما حاجة تكتب فوقه، بس مبقاش بيتحسب لأنه عند size أو بعده.'),
        message('Moves counts element copies made by insert and delete. Comparisons counts value checks made by find. Loop guards are not counted.',
          'النقلات بتعدّ نسخ الـ elements اللي بيعملها الـ insert والـ delete. والمقارنات بتعدّ مقارنات الأرقام في الـ find. الـ conditions بتاعة الـ loops مش بتتعدّ.'),
      ],
      costs: [
        { label: message('get / set by index', 'get / set بالـ index'), value: 'O(1)' },
        { label: message('append (room left)', 'append (لو فيه مكان)'), value: 'O(1)' },
        { label: message('insert at i', 'insert عند i'), value: 'O(n − i)' },
        { label: message('delete at i', 'delete عند i'), value: 'O(n − 1 − i)' },
        { label: message('find by value', 'find بالقيمة'), value: 'O(n)' },
        { label: message('Extra space', 'المساحة الزيادة'), value: 'O(1)' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
