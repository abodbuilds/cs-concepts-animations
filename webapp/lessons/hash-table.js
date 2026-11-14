(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const BUCKETS = 7;
  const MAX_OPS = 12;
  const MAX_LENGTH = 240;
  const MAX_KEY = 8;
  const MIN_VALUE = -99;
  const MAX_VALUE = 999;
  const code = [
    'hash(key):',
    '  sum = 0',
    '  for each character c in key:',
    '    sum = sum + code(c)',
    '  return sum mod 7',
    'put(key, value):',
    '  b = hash(key)',
    '  for each entry e in buckets[b]:',
    '    if e.key == key:',
    '      e.value = value',
    '      return "updated"',
    '  append (key, value) to buckets[b]',
    '  size = size + 1',
    'get(key):',
    '  b = hash(key)',
    '  for each entry e in buckets[b]:',
    '    if e.key == key:',
    '      return e.value',
    '  return "not found"',
    'delete(key):',
    '  b = hash(key)',
    '  for each entry e in buckets[b]:',
    '    if e.key == key:',
    '      remove e from buckets[b]',
    '      size = size - 1',
    '      return "deleted"',
    '  return "not found"',
  ];
  // Line numbers of each operation, so every frame points at the routine it is tracing.
  const LINES = {
    put: { bucket: 7, loop: 8, test: 9, hit: [10, 11], miss: [12, 13] },
    get: { bucket: 15, loop: 16, test: 17, hit: [18], miss: [19] },
    delete: { bucket: 21, loop: 22, test: 23, hit: [24, 25, 26], miss: [27] },
  };

  function fail(en, ar) {
    const error = new Error(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  const charSum = key => [...key].reduce((total, c) => total + c.charCodeAt(0), 0);
  const hash = key => charSum(key) % BUCKETS;
  const opText = op => op.op === 'put' ? `put ${op.key} ${op.value}` : `${op.op} ${op.key}`;
  const loadText = size => `${size}/${BUCKETS} ≈ ${(size / BUCKETS).toFixed(2)}`;

  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || !Array.isArray(input.operations)) {
      fail('Expected an object with an operations array.', 'محتاجين object جواه operations، وتكون array.');
    }
    if (input.operations.length > MAX_OPS) {
      fail(`Use at most ${MAX_OPS} operations.`, `اكتب ${MAX_OPS} operations بالكتير.`);
    }
    for (let index = 0; index < input.operations.length; index++) {
      const op = input.operations[index], n = index + 1;
      if (!op || typeof op !== 'object' || !['put', 'get', 'delete'].includes(op.op)) {
        fail(`Operation ${n} must be put, get or delete.`, `الـ operation رقم ${n} لازم تكون put أو get أو delete.`);
      }
      if (typeof op.key !== 'string' || !/^[a-z]{1,8}$/.test(op.key)) {
        fail(`Operation ${n}: a key is 1 to ${MAX_KEY} lowercase English letters (a–z).`,
          `الـ operation رقم ${n}: الـ key لازم يكون من 1 لـ ${MAX_KEY} حروف إنجليزي small (a–z).`);
      }
      if (op.op === 'put') {
        if (!Number.isSafeInteger(op.value) || op.value < MIN_VALUE || op.value > MAX_VALUE) {
          fail(`Operation ${n}: put needs an integer value from ${MIN_VALUE} to ${MAX_VALUE}.`,
            `الـ operation رقم ${n}: الـ put محتاجة value رقم صحيح من ${MIN_VALUE} لـ ${MAX_VALUE}.`);
        }
      } else if (Object.hasOwn(op, 'value') && op.value !== undefined) {
        fail(`Operation ${n}: ${op.op} takes only a key.`, `الـ operation رقم ${n}: الـ ${op.op} بتاخد key بس.`);
      }
    }
    return input.operations;
  }

  function parse(rawInput) {
    if (!rawInput || typeof rawInput !== 'object' || Array.isArray(rawInput) || typeof rawInput.operations !== 'string') {
      fail('Enter the operations as text.', 'اكتب الـ operations كـ text.');
    }
    if (rawInput.operations.length > MAX_LENGTH) {
      fail(`Keep the script within ${MAX_LENGTH} characters and ${MAX_OPS} operations.`,
        `خلّي الـ operations في حدود ${MAX_LENGTH} حرف و ${MAX_OPS} operations.`);
    }
    const text = rawInput.operations
      .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
      .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776));
    const tokens = text.split(/[\n,،;]+/).map(token => token.trim()).filter(Boolean);
    if (tokens.length > MAX_OPS) fail(`Use at most ${MAX_OPS} operations.`, `اكتب ${MAX_OPS} operations بالكتير.`);
    const operations = tokens.map((token, index) => {
      const n = index + 1, parts = token.split(/\s+/), op = parts[0].toLowerCase();
      if (!['put', 'get', 'delete'].includes(op)) {
        fail(`Operation ${n} ("${token}") must start with put, get or delete.`,
          `الـ operation رقم ${n} ("${token}") لازم تبدأ بـ put أو get أو delete.`);
      }
      const expected = op === 'put' ? 3 : 2;
      if (parts.length !== expected) {
        fail(op === 'put' ? `Operation ${n}: write put key value, for example put cat 5.` : `Operation ${n}: write ${op} key, for example ${op} cat.`,
          op === 'put' ? `الـ operation رقم ${n}: اكتب put key value، زي put cat 5.` : `الـ operation رقم ${n}: اكتب ${op} key، زي ${op} cat.`);
      }
      if (op === 'put' && !/^[+-]?\d{1,4}$/.test(parts[2])) {
        fail(`Operation ${n}: put needs an integer value from ${MIN_VALUE} to ${MAX_VALUE}.`,
          `الـ operation رقم ${n}: الـ put محتاجة value رقم صحيح من ${MIN_VALUE} لـ ${MAX_VALUE}.`);
      }
      return op === 'put' ? { op, key: parts[1], value: Number(parts[2]) } : { op, key: parts[1] };
    });
    const input = { operations };
    validate(input);
    return input;
  }

  function build(input) {
    const operations = validate(input).map(op => ({ ...op }));
    const state = {
      buckets: Array.from({ length: BUCKETS }, () => []),
      size: 0, comparisons: 0, collisions: 0, results: [],
      opIndex: null, op: null, key: null, value: null, sum: null, b: null,
      cursor: null, passed: 0, hit: null, fresh: null, outcome: null,
      done: false, result: null,
    };
    const frames = [];
    const longest = () => Math.max(...state.buckets.map(bucket => bucket.length));

    function scene() {
      const rows = [];
      if (state.key !== null) {
        rows.push({
          id: 'key', label: message(`Key "${state.key}" · character codes`, `الـ key "${state.key}" · الـ character codes`), layout: 'cards',
          cells: [...state.key].map((c, index) => ({
            id: `char-${index}`, value: c, index, marker: String(c.charCodeAt(0)),
            tone: state.b === null ? 'active' : 'default',
          })),
        });
      }
      state.buckets.forEach((bucket, b) => {
        const focused = b === state.b;
        rows.push({
          id: `bucket-${b}`, label: message(`Bucket ${b}`, `الـ bucket ${b}`), layout: 'cards',
          cells: [{
            id: `head-${b}`, value: bucket.length ? '→' : '∅',
            tone: focused ? 'pivot' : 'default', marker: focused ? 'b' : '',
          }, ...bucket.map((entry, position) => {
            let tone = 'default', marker = '';
            if (focused) {
              if (position === state.hit || entry.key === state.fresh) { tone = 'found'; marker = position === state.hit ? 'e' : 'new'; }
              else if (position === state.cursor) { tone = 'active'; marker = 'e'; }
              else if (position < state.passed) tone = 'muted';
            }
            return { id: `entry-${entry.key}`, value: `${entry.key}:${entry.value}`, index: position, tone, marker };
          })],
        });
      });
      const results = state.results.map(item => item.text);
      return {
        rows, graph: null,
        collections: [{ label: message('Results', 'النتايج'), values: results }],
        note: message(
          `${state.size} ${state.size === 1 ? 'entry' : 'entries'} in ${BUCKETS} buckets. Load factor ${loadText(state.size)}, the average chain length; the longest chain has ${longest()}.`,
          `عدد الـ entries ${state.size} في ${BUCKETS} buckets. الـ load factor = ${loadText(state.size)}، يعني متوسط طول الـ chain. أطول chain فيها ${longest()}.`),
      };
    }

    function emit(kind, lines, title, explanation, equation = '') {
      const dash = value => value === null ? '—' : value;
      frames.push(copy({
        kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'operation', value: state.op ? opText(state.op) : '—' },
          { name: 'key', value: dash(state.key) },
          { name: 'sum', value: dash(state.sum) },
          { name: 'b', value: dash(state.b) },
          { name: 'e', value: state.cursor === null || state.b === null || !state.buckets[state.b][state.cursor] ? '—' : state.buckets[state.b][state.cursor].key },
          { name: 'size', value: state.size },
        ],
        metrics: [
          { label: message('Size', 'الـ size'), value: state.size },
          { label: message('Load factor', 'الـ load factor'), value: loadText(state.size) },
          { label: message('Key comparisons', 'مقارنات الـ keys'), value: state.comparisons },
          { label: message('Collisions', 'الـ collisions'), value: state.collisions },
          { label: message('Longest chain', 'أطول chain'), value: longest() },
        ],
        scene: scene(),
      }));
    }

    function record(op, en, value) {
      state.outcome = value;
      state.results.push({ op: op.op, key: op.key, value, text: `${opText(op)} → ${en}` });
    }

    emit('ready', [], message(`${BUCKETS} empty buckets`, `عندنا ${BUCKETS} buckets فاضيين`),
      operations.length
        ? message(`The table starts empty. We will run ${operations.length} ${operations.length === 1 ? 'operation' : 'operations'}. Each one hashes its key to pick a bucket, then searches only that bucket.`,
          `الـ hash table فاضي في الأول. هنشغّل operations عددها ${operations.length}. كل واحدة بتحسب الـ hash بتاع الـ key عشان تختار bucket، وبعدين بتدوّر في الـ bucket ده بس.`)
        : message('The table starts empty and the script has no operations, so nothing will be hashed.',
          'الـ hash table فاضي، ومفيش ولا operation، فمش هنحسب hash لأي حاجة.'));

    operations.forEach((op, opIndex) => {
      const L = LINES[op.op], key = op.key, chars = [...key];
      Object.assign(state, { opIndex, op, key, value: op.op === 'put' ? op.value : null, sum: null, b: null, cursor: null, passed: 0, hit: null, fresh: null, outcome: null });

      state.sum = charSum(key);
      const sumEquation = `${chars.join('+')} = ${chars.map(c => c.charCodeAt(0)).join('+')} = ${state.sum}`;
      emit('hash', [3, 4], message(`${opText(op)}: hash "${key}"`, `${opText(op)}: بنحسب الـ hash بتاع ${key}`),
        message(`First turn the key into a number: add the character codes of ${chars.join(', ')} (a = 97 … z = 122).`,
          `الأول بنحوّل الـ key لرقم: بنجمع الـ character codes بتاعة ${chars.join('، ')} (a = 97 … z = 122).`),
        sumEquation);

      state.b = state.sum % BUCKETS;
      const bucket = state.buckets[state.b], count = bucket.length;
      emit('bucket', [5, L.bucket], message(`"${key}" belongs in bucket ${state.b}`, `مكان ${key} هو الـ bucket ${state.b}`),
        count
          ? message(`${state.sum} mod ${BUCKETS} = ${state.b}. Bucket ${state.b} holds ${count} ${count === 1 ? 'entry' : 'entries'}, so we compare "${key}" with ${count === 1 ? 'that one' : 'those'} only, not with the whole table.`,
            `${state.sum} mod ${BUCKETS} = ${state.b}. عدد الـ entries في الـ bucket ${state.b} هو ${count}، فهنقارن ${key} بيهم هما بس، مش بالـ table كله.`)
          : message(`${state.sum} mod ${BUCKETS} = ${state.b}. Bucket ${state.b} is empty, so the loop over its chain has nothing to check.`,
            `${state.sum} mod ${BUCKETS} = ${state.b}. الـ bucket ${state.b} فاضي، فالـ loop على الـ chain بتاعته مش هتلف خالص.`),
        `${sumEquation} → ${state.sum} mod ${BUCKETS} = ${state.b}`);

      let found = -1;
      for (let position = 0; position < bucket.length; position++) {
        const entry = bucket[position], match = entry.key === key;
        state.cursor = position; state.comparisons++;
        if (match) { state.hit = position; found = position; }
        const anagram = !match && charSum(entry.key) === state.sum;
        const after = op.op === 'put'
          ? message(`put will overwrite its value instead of adding a second "${key}".`, `الـ put هتغيّر الـ value بتاعه بدل ما تضيف ${key} تاني.`)
          : op.op === 'get'
            ? message('get can return its value now.', 'الـ get تقدر تعمل return للـ value بتاعه دلوقتي.')
            : message('delete can unlink this entry now.', 'الـ delete تقدر تشيل الـ entry ده دلوقتي.');
        emit('compare', [L.loop, L.test],
          match ? message(`Found "${key}" in the chain`, `لقينا ${key} في الـ chain`)
            : message(`"${entry.key}" is not "${key}", keep walking`, `${entry.key} مش هو ${key}، بنكمّل`),
          match
            ? message(`Entry ${position} of bucket ${state.b} has key "${key}". ${after.en}`, `الـ entry رقم ${position} في الـ bucket ${state.b} الـ key بتاعه ${key}. ${after.ar}`)
            : message(`Same bucket, different key: a collision. ${anagram ? `"${entry.key}" has the same letters, so the same sum ${state.sum}. ` : ''}The hash only narrows where we look; comparing keys decides.`,
              `نفس الـ bucket بس key مختلف، ده collision. ${anagram ? `${entry.key} فيه نفس الـ characters، فمجموعه نفس الرقم ${state.sum}. ` : ''}الـ hash بيقلّل الأماكن اللي بندوّر فيها بس، والمقارنة هي اللي بتحسم.`),
          `"${entry.key}" == "${key}" → ${match}`);
        if (match) break;
        state.passed = position + 1;
      }
      state.cursor = null;
      const checked = found === -1 ? count : found + 1;

      if (op.op === 'put') {
        if (found !== -1) {
          const entry = bucket[found], old = entry.value;
          entry.value = op.value;
          record(op, 'updated', 'updated');
          emit('update', L.hit, message(`Update "${key}" to ${op.value}`, `بنغيّر الـ value بتاع ${key} لـ ${op.value}`),
            message(`The key already existed, so we replace ${old} with ${op.value} and return "updated". size stays ${state.size}: each key appears only once.`,
              `الـ key كان موجود، فبنحط ${op.value} مكان ${old} ونعمل return لـ "updated". الـ size فضل ${state.size}، لأن كل key بيظهر مرة واحدة بس.`),
            `e.value = ${op.value} (was ${old})`);
        } else {
          const collided = count > 0;
          if (collided) state.collisions++;
          bucket.push({ key, value: op.value });
          state.size++; state.fresh = key;
          record(op, 'inserted', 'inserted');
          emit('append', L.miss, message(`Append "${key}" to bucket ${state.b}`, `بنضيف ${key} في آخر الـ bucket ${state.b}`),
            collided
              ? message(`None of the ${count} ${count === 1 ? 'entry' : 'entries'} in bucket ${state.b} had key "${key}". We append it to the chain: that is a collision, and the chain grows to ${bucket.length}.`,
                `مفيش ولا entry في الـ bucket ${state.b} الـ key بتاعه ${key}. بنضيفه في آخر الـ chain، وده collision، وعدد الـ entries في الـ chain بقى ${bucket.length}.`)
              : message(`Bucket ${state.b} was empty, so "${key}" becomes its first entry with no key comparison at all.`,
                `الـ bucket ${state.b} كان فاضي، فـ ${key} بقى أول entry فيه من غير ولا مقارنة.`),
            `size = ${state.size - 1} + 1 = ${state.size} · load factor = ${loadText(state.size)}`);
        }
      } else if (found !== -1) {
        if (op.op === 'get') {
          const value = bucket[found].value;
          record(op, String(value), value);
          emit('found', L.hit, message(`get returns ${value}`, `الـ get بترجع ${value}`),
            message(`"${key}" was found in bucket ${state.b} after ${checked} key ${checked === 1 ? 'comparison' : 'comparisons'}. The other buckets were never touched.`,
              `لقينا ${key} في الـ bucket ${state.b}، وعدد المقارنات ${checked}. الـ buckets التانية ماقربناش منها خالص.`),
            `return ${value}`);
        } else {
          bucket.splice(found, 1);
          state.size--; state.hit = null; state.passed = 0;
          record(op, 'deleted', 'deleted');
          emit('remove', L.hit, message(`Remove "${key}" from bucket ${state.b}`, `بنشيل ${key} من الـ bucket ${state.b}`),
            message(`Unlink the entry from the chain; any entries after it stay in the same bucket, because their keys still hash to ${state.b}. size drops to ${state.size}.`,
              `بنشيل الـ entry من الـ chain، واللي بعده بيفضل في نفس الـ bucket لأن الـ hash بتاعه لسه ${state.b}. الـ size بقى ${state.size}.`),
            `size = ${state.size + 1} - 1 = ${state.size}`);
        }
      } else {
        record(op, 'not found', 'not found');
        emit('missing', L.miss, message(`"${key}" is not in the table`, `${key} مش موجود في الـ table`),
          message(`${count ? `All ${count} ${count === 1 ? 'entry' : 'entries'} in bucket ${state.b} were checked.` : `Bucket ${state.b} is empty.`} If "${key}" existed it would have to be in bucket ${state.b}, so it is nowhere. ${op.op} returns "not found" and changes nothing.`,
            `${count ? `قارنّا بكل الـ entries في الـ bucket ${state.b}.` : `الـ bucket ${state.b} فاضي.`} لو ${key} موجود كان لازم يبقى في الـ bucket ${state.b}، يبقى مش موجود خالص. الـ ${op.op} بترجع "not found" ومش بتغيّر حاجة.`),
          'return "not found"');
      }
    });

    Object.assign(state, { opIndex: null, op: null, key: null, value: null, sum: null, b: null, cursor: null, passed: 0, hit: null, fresh: null, outcome: null });
    state.done = true;
    state.result = {
      size: state.size,
      buckets: state.buckets.map(bucket => bucket.map(entry => ({ ...entry }))),
      results: state.results.map(item => item.value),
    };
    emit('done', [], message('All operations done', 'خلّصنا كل الـ operations'),
      message(`The table holds ${state.size} ${state.size === 1 ? 'entry' : 'entries'} in ${BUCKETS} buckets (load factor ${loadText(state.size)}). We made ${state.comparisons} key comparisons and ${state.collisions} collisions; the longest chain has ${longest()}.`,
        `الـ table فيه entries عددها ${state.size} في ${BUCKETS} buckets، والـ load factor = ${loadText(state.size)}. عدد مقارنات الـ keys ${state.comparisons}، وعدد الـ collisions ${state.collisions}، وأطول chain فيها ${longest()}.`));
    return frames;
  }

  const defaults = { operations: 'put cat 5\nput dog 3\nput act 9\nget act\nput dog 4\ndelete cat\nget cat' };

  const lesson = {
    id: 'hash-table', name: 'Hash Table', theme: 'data-structures', category: 'structure', number: '15',
    label: 'HASH TABLE', cost: 'O(n)',
    description: message('Hash each key to one of 7 buckets, then search only that bucket’s chain to put, get or delete.',
      'بنحسب الـ hash بتاع كل key عشان نعرف هو في أنهي bucket من الـ 7، وبعدين بندوّر في الـ chain بتاعة الـ bucket ده بس.'),
    note: message('Separate chaining, fixed 7 buckets, hash = sum of character codes mod 7. Average O(1) per operation; O(n) if every key collides.',
      'separate chaining بـ 7 buckets ثابتين، والـ hash = مجموع الـ character codes mod 7. كل operation في المتوسط O(1)، و O(n) لو كل الـ keys عملت collision.'),
    code,
    keySteps: ['ready', 'bucket', 'compare', 'update', 'append', 'found', 'remove', 'missing', 'done'],
    fields: [{
      name: 'operations', label: message('Operations', 'الـ operations'), type: 'textarea', maxLength: MAX_LENGTH,
      help: message(`One operation per line or separated by commas: put key value, get key, delete key. Keys are 1–${MAX_KEY} lowercase letters a–z; values are integers from ${MIN_VALUE} to ${MAX_VALUE}. Up to ${MAX_OPS} operations; blank runs none. The table starts empty.`,
        `operation في كل سطر أو افصل بينهم بـ comma: put key value، أو get key، أو delete key. الـ key من 1 لـ ${MAX_KEY} حروف إنجليزي small من a لـ z، والـ value رقم صحيح من ${MIN_VALUE} لـ ${MAX_VALUE}. لحد ${MAX_OPS} operations، ولو سبتها فاضية مش هيحصل حاجة. الـ table بيبدأ فاضي.`),
    }],
    defaults,
    presets: [
      { id: 'default', label: message('Insert, collide, update, delete', 'insert و collision و update و delete'), input: { ...defaults } },
      { id: 'anagrams', label: message('Anagrams · one long chain', 'نفس الحروف · chain واحدة طويلة'), input: { operations: 'put stop 1, put pots 2, put tops 3, put spot 4, get spot, get post' } },
      { id: 'spread', label: message('No collisions · load factor 1', 'من غير collisions · load factor 1'), input: { operations: 'put a 1, put b 2, put c 3, put d 4, put e 5, put f 6, put g 7, get d' } },
      { id: 'update', label: message('Same key again · update', 'نفس الـ key تاني · update'), input: { operations: 'put x 1, put x 2, put x -3, get x' } },
      { id: 'delete-head', label: message('Delete from a shared bucket', 'delete من bucket فيه أكتر من entry'), input: { operations: 'put a 1, put h 2, delete a, get h, delete a, get a' } },
      { id: 'empty-table', label: message('Search an empty table · not found', 'بندوّر في table فاضي · not found'), input: { operations: 'get cat, delete cat' } },
      { id: 'crowded', label: message('12 keys in 7 buckets', '12 key في 7 buckets'), input: { operations: 'put ant 1, put bee 2, put cat 3, put dog 4, put eel 5, put fox 6, put gnu 7, put hen 8, put owl 9, put pig 10, put rat 11, put yak 12' } },
      { id: 'empty', label: message('No operations', 'مفيش operations'), input: { operations: '' } },
    ],
    parse, build,
    summary(input) {
      const operations = validate(input);
      const count = kind => operations.filter(op => op.op === kind).length;
      return message(`${operations.length} operations (${count('put')} put · ${count('get')} get · ${count('delete')} delete) · ${BUCKETS} buckets · separate chaining`,
        `عدد الـ operations ${operations.length} (put: ${count('put')} · get: ${count('get')} · delete: ${count('delete')}) · ${BUCKETS} buckets · separate chaining`);
    },
    theory: {
      whenToUse: {
        use: [
          { en: "You look things up by key: usernames, ids, caches, word counts.", ar: "بتدوّر على حاجة بالـ key: usernames، ids، cache، عدّ الكلمات." },
          { en: "You need a fast \"have I seen this before?\" check, like removing duplicates.", ar: "محتاج تعرف بسرعة \"شفت ده قبل كده؟\"، زي إنك تشيل التكرار." },
          { en: "Average O(1) matters more to you than order.", ar: "الـ O(1) في المتوسط أهم عندك من الترتيب." },
        ],
        avoid: [
          { en: "You need keys in sorted order, or ranges like every key from a to m → use a balanced search tree.", ar: "محتاج الـ keys مترتّبة، أو range زي كل الـ keys من a لـ m ← استخدم balanced search tree." },
          { en: "Every lookup needs a guaranteed worst case → collisions can make one lookup O(n).", ar: "محتاج كل lookup يبقى مضمون في الـ worst case ← الـ collisions ممكن تخلّي lookup واحد O(n)." },
        ],
      },
      idea: message('A hash function turns each key into a bucket number, so put, get and delete look in one small bucket instead of the whole table. Keys that land in the same bucket share a chain and are told apart by comparing the keys.',
        'الـ hash function بتحوّل كل key لرقم bucket، فالـ put والـ get والـ delete بيدوّروا في bucket واحد صغير بدل الـ table كله. ولو كذا key وقعوا في نفس الـ bucket، بيتحطّوا في chain واحدة، وبنفرّق بينهم بإننا نقارن الـ keys.'),
      title: message('Jump straight to one bucket', 'بنروح على bucket واحد على طول'),
      intro: message(`You need arrays, lists, and the remainder operator mod. A hash table stores key–value entries in an array of m buckets. This lab uses m = ${BUCKETS} and separate chaining: each bucket points to a list (chain) of the entries that hash there. The hash is deliberately simple so you can check it by hand: add the character codes (a = 97 … z = 122) and take the sum mod ${BUCKETS}. The table never resizes here, so you can watch chains grow.`,
        `محتاج تعرف الـ arrays والـ lists والـ mod (باقي القسمة). الـ hash table بيخزّن entries كل واحد فيه key و value، جوّه array فيها m buckets. هنا m = ${BUCKETS}، وبنستخدم separate chaining: كل bucket بيشاور على list (chain) فيها الـ entries اللي الـ hash بتاعها طلع الرقم ده. الـ hash بسيط عن قصد عشان تقدر تحسبه بإيدك: بنجمع الـ character codes (a = 97 … z = 122) وناخد الـ mod ${BUCKETS}. الـ table هنا مش بيكبر خالص، عشان تشوف الـ chains وهي بتطول.`),
      invariant: message('Every entry with key k sits in buckets[hash(k)], and each key appears at most once in the whole table. That is why searching one bucket is enough: if k is not in its own bucket, it is not anywhere. size always equals the total number of entries.',
        'أي entry الـ key بتاعه k موجود في buckets[hash(k)]، وكل key بيظهر مرة واحدة بالكتير في الـ table كله. عشان كده كفاية ندوّر في bucket واحد: لو k مش في الـ bucket بتاعه، يبقى مش موجود خالص. والـ size دايمًا بيساوي عدد الـ entries كلها.'),
      steps: [
        { title: message('Hash the key to a bucket', 'بنحسب الـ hash ونعرف الـ bucket'),
          body: message(`Add the character codes of the key and take the remainder mod ${BUCKETS}: b = hash(key). The same key always gives the same b, which is what makes lookups possible. This costs O(L) for a key of length L.`,
            `بنجمع الـ character codes بتاعة الـ key وناخد باقي القسمة على ${BUCKETS}: b = hash(key). نفس الـ key دايمًا بيدّي نفس الـ b، وده اللي بيخلّينا نلاقيه تاني. ده بياخد O(L) لو طول الـ key هو L.`) },
        { title: message('Walk that bucket’s chain', 'بنمشي على الـ chain بتاعة الـ bucket ده'),
          body: message('Compare key with each entry’s key, front to back. Different keys in the same bucket are a collision; the comparison, not the hash, tells them apart. The walk stops at the first match or at the end of the chain.',
            'بنقارن الـ key بالـ key بتاع كل entry من الأول للآخر. لو فيه keys مختلفة في نفس الـ bucket يبقى ده collision، والمقارنة هي اللي بتفرّق بينهم، مش الـ hash. بنقف عند أول match أو لما الـ chain تخلص.') },
        { title: message('Act on what the walk found', 'بنتصرّف حسب اللي لقيناه'),
          body: message('put updates a matching entry or appends a new one (size + 1); get returns the matching value or "not found"; delete unlinks the match (size − 1) or reports "not found". put scans first so a key is never stored twice.',
            'الـ put بتغيّر الـ value لو لقت الـ key، أو بتضيف entry جديد في الآخر (size + 1). الـ get بترجع الـ value أو "not found". الـ delete بتشيل الـ entry (size − 1) أو بترجع "not found". الـ put بتدوّر الأول عشان الـ key مايتخزّنش مرتين.') },
      ],
      notes: [
        message(`Collisions are unavoidable: there are only ${BUCKETS} buckets but endlessly many keys. Chaining keeps colliding keys in one list, and the cost of an operation is the length of the chain it walks.`,
          `الـ collisions مش هنقدر نهرب منها: عندنا ${BUCKETS} buckets بس، والـ keys ملهاش آخر. الـ chaining بيحط الـ keys اللي عملت collision في list واحدة، وتمن أي operation هو طول الـ chain اللي بتمشي عليها.`),
        message('The load factor α = n / m is the average chain length. With a hash that spreads keys evenly, an operation costs O(1 + α) on average. Real tables resize when α passes a threshold (Java’s HashMap uses 0.75): they double m and rehash every entry, an O(n) step that keeps α bounded, so put stays O(1) amortized. This lab never resizes.',
          'الـ load factor α = n / m هو متوسط طول الـ chain. لو الـ hash بيوزّع الـ keys كويس، الـ operation بتاخد O(1 + α) في المتوسط. الـ hash tables الحقيقية بتكبر لما α يعدّي حد معيّن (الـ HashMap في Java بيستخدم 0.75): بتضاعف m وتعمل rehash لكل entry. ده O(n) مرة واحدة، بس بيخلّي α صغير، فالـ put بتفضل O(1) amortized. هنا الـ table مش بيكبر خالص.'),
        message('This sum hash is weak on purpose: anagrams (cat / act, stop / pots / tops / spot) always collide, and short words have sums in a narrow range. Real hash functions mix in each character’s position (a polynomial hash, SipHash).',
          'الـ hash اللي بيجمع الـ codes ده ضعيف عن قصد: الكلمات اللي فيها نفس الحروف (cat / act، stop / pots / tops / spot) دايمًا بتعمل collision، والكلمات القصيرة مجموعها قريب من بعض. الـ hash functions الحقيقية بتدخّل مكان كل character في الحساب (polynomial hash، SipHash).'),
        message('Worst case: if every key lands in one bucket, each operation walks all n entries, O(n), like a plain linked list. Attackers can force this when the hash is predictable, which is why many languages randomize their hash seed.',
          'الـ worst case: لو كل الـ keys وقعت في bucket واحد، كل operation هتمشي على الـ n entries كلها، يعني O(n)، كأنها linked list عادية. وممكن حد يعمل كده قصد لو الـ hash متوقّع، وعشان كده لغات كتير بتخلّي الـ hash seed عشوائي.'),
        message('The other common scheme, open addressing with linear probing, stores entries in the bucket array itself and steps to the next slot on a collision. It is cache-friendly, but deletion needs tombstones and it slows sharply as α approaches 1.',
          'الطريقة التانية المشهورة هي open addressing بـ linear probing: الـ entries بتتخزّن في الـ array نفسها، ولو حصل collision بنروح للمكان اللي بعده. ده أسرع مع الـ cache، بس الـ delete محتاج tombstones، والأداء بيقع جامد لما α يقرّب من 1.'),
        message('Pick a hash table for fast lookup by exact key when order does not matter. Pick a balanced BST or a sorted array when you need sorted order, min / max or range queries. For a handful of items a plain array scan is fine.',
          'استخدم hash table لو محتاج تدوّر بسرعة بالـ key بالظبط ومش فارق معاك الترتيب. لو محتاج ترتيب، أو min / max، أو range queries، استخدم balanced BST أو sorted array. ولو عندك كام element بس، الـ array العادية كفاية.'),
        message('Key comparisons counts every e.key == key test. Collisions counts puts that appended to a bucket that already had entries. Hashing a key costs O(L); here L ≤ 8, so we treat it as constant.',
          'عداد مقارنات الـ keys بيعدّ كل e.key == key. عداد الـ collisions بيعدّ كل put ضافت entry في bucket كان فيه entries قبل كده. حساب الـ hash بياخد O(L)، وهنا L ≤ 8، فبنعتبره ثابت.'),
      ],
      costs: [
        { label: message('put / get / delete · average, good hash, bounded α', 'put / get / delete · في المتوسط، مع hash كويس وα صغير'), value: 'O(1)' },
        { label: message('put / get / delete · worst case, every key in one bucket', 'put / get / delete · الـ worst case، كل الـ keys في bucket واحد'), value: 'O(n)' },
        { label: message('Space for m buckets and n entries', 'المساحة لـ m buckets و n entries'), value: 'O(m + n)' },
        { label: message('Resize and rehash (not done here)', 'الـ resize والـ rehash (مش موجودين هنا)'), value: 'O(n) · amortized O(1)' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
