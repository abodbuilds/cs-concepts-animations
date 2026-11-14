(function (root) {
  'use strict';

  const message = (en, ar) => ({ en, ar });
  const copy = value => JSON.parse(JSON.stringify(value));
  const code = [
    'naiveFirstMatch(text, pattern):',
    '  text = codePoints(text); pattern = codePoints(pattern)',
    '  n = length(text); m = length(pattern)',
    '  if m == 0:',
    '    return 0',
    '  if m > n:',
    '    return -1',
    '  shift = 0',
    '  while shift <= n - m:',
    '    j = 0',
    '    while j < m:',
    '      if text[shift + j] != pattern[j]:',
    '        break',
    '      j = j + 1',
    '    if j == m:',
    '      return shift',
    '    shift = shift + 1',
    '  return -1',
  ];

  function fail(en, ar, ErrorType = TypeError) {
    const error = new ErrorType(en);
    error.userMessage = message(en, ar);
    throw error;
  }

  // Both public entry points accept strings and enforce the same constraints.
  // Do not trim, normalize, or case-fold: every code point is part of the input.
  function validate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      fail('Provide text and pattern as strings.', 'اكتب text وpattern كنصوص.');
    }
    for (const [name, limit] of [['text', 24], ['pattern', 10]]) {
      if (typeof input[name] !== 'string') {
        fail(`${name} must be a string; use "" for an empty input.`,
          `${name} لازم يكون نص؛ استخدم "" لو عايزه فاضي.`);
      }
      const points = Array.from(input[name]);
      if (points.length > limit) {
        fail(`${name} must contain at most ${limit} Unicode code points.`,
          `${name} ينفع فيه لحد ${limit} Unicode code points بس.`, RangeError);
      }
      if (points.some(point => {
        const value = point.codePointAt(0);
        return value >= 0xD800 && value <= 0xDFFF;
      })) {
        fail(`${name} contains an unpaired Unicode surrogate. Use valid Unicode text.`,
          `${name} فيه جزء Unicode ناقص. استخدم نص Unicode سليم.`);
      }
    }
    return { text: input.text, pattern: input.pattern };
  }

  function makeScene(state, kind, note) {
    const offset = state.shift === null ? 0 : state.shift;
    const validCandidate = state.candidateActive;
    const finalMatch = state.done && state.result >= 0 && state.pattern.length > 0;
    const focused = (kind === 'compare' || kind === 'mismatch') && state.comparison;
    function tone(patternIndex) {
      if (finalMatch && patternIndex >= 0 && patternIndex < state.pattern.length) return 'found';
      if (focused && patternIndex === state.comparison.patternIndex) {
        return state.comparison.equal ? 'active' : 'pivot';
      }
      if (validCandidate && patternIndex >= 0 && patternIndex < state.matchedLength) return 'sorted';
      if (validCandidate && patternIndex === state.j && state.j < state.pattern.length) return 'active';
      if (state.done || (validCandidate && (patternIndex < 0 || patternIndex >= state.pattern.length))) return 'muted';
      return 'default';
    }
    const textCells = state.text.map((value, index) => ({
      id: `text-${index}`, value, index, tone: tone(index - offset),
      marker: focused && index === state.comparison.textIndex ? 'shift + j' : '',
    }));
    const patternCells = Array.from({ length: offset }, (_, index) => ({
      id: `pattern-gap-${index}`, value: '', tone: 'muted',
    }));
    for (const [index, value] of state.pattern.entries()) {
      patternCells.push({
        id: `pattern-${index}`, value, index, tone: tone(index),
        marker: focused && index === state.comparison.patternIndex ? 'j' : '',
      });
    }
    return {
      rows: [
        { id: 'text', label: message('Text · code-point indices', 'text · أماكن الـ code points'), layout: 'aligned', cells: textCells },
        { id: 'pattern', label: state.pattern.length ? message('Pattern', 'pattern') : message('Pattern (empty)', 'pattern فاضي'), layout: 'aligned', cells: patternCells },
      ],
      graph: null,
      collections: [],
      note,
    };
  }

  function build(input) {
    const parsed = validate(input);
    const text = Array.from(parsed.text), pattern = Array.from(parsed.pattern);
    const state = {
      text, pattern, n: null, m: null, shift: null, j: null,
      candidateActive: false, matchedLength: 0, comparison: null,
      condition: null, comparisons: 0, candidates: 0, shifts: 0,
      done: false, result: null,
    };
    const frames = [];
    function emit(kind, lines, title, explanation, equation = '') {
      const currentIndex = state.candidateActive && state.j < state.m ? state.shift + state.j : null;
      frames.push(copy({
        kind, lines, title, explanation, equation, state,
        variables: [
          { name: 'n', value: state.n }, { name: 'm', value: state.m },
          { name: 'shift', value: state.shift }, { name: 'j', value: state.j },
          { name: 'shift + j', value: currentIndex },
          { name: 'matchedLength', value: state.matchedLength },
          { name: 'result', value: state.result },
        ],
        metrics: [
          { label: message('Character comparisons', 'مقارنات الحروف'), value: state.comparisons },
          { label: message('Candidates tried', 'أماكن جرّبناها'), value: state.candidates },
          { label: message('One-position shifts', 'تحريكات بمكان واحد'), value: state.shifts },
        ],
        scene: makeScene(state, kind, explanation),
      }));
    }

    emit('ready', [], message('Try each possible start', 'نجرّب كل بداية ممكنة'),
      message('Naive first-match search compares left to right, then shifts the pattern by one after a mismatch. Indices start at zero and count Unicode code points.',
        'بندور على أول تطابق بالطريقة البسيطة: نقارن من الأول، ولو حرف اختلف نحرّك pattern مكان واحد. الأماكن بتبدأ من صفر وبنعدّ Unicode code points.'));
    emit('code-points', [2], message('Use code-point positions', 'نعدّ الـ code points'),
      message('Each card holds one Unicode code point. Case, spaces, and combining marks are preserved; a visible symbol can contain several code points.',
        'كل كارت فيه Unicode code point واحد. بنحتفظ بحالة الحروف والمسافات والتشكيل؛ الرمز اللي شايفه ممكن يتكوّن من أكتر من code point.'));
    state.n = text.length; state.m = pattern.length;
    emit('lengths', [3], message('Measure both inputs', 'نحسب طول النصّين'),
      message(`The text has ${state.n} code points and the pattern has ${state.m}. A full candidate must fit inside the text.`,
        `طول text هو ${state.n} وطول pattern هو ${state.m} code points. لازم pattern كله يدخل جوّه text.`), `n = ${state.n}; m = ${state.m}`);
    state.condition = state.m === 0;
    emit('empty-check', [4], message(state.condition ? 'The pattern is empty' : 'The pattern has characters', state.condition ? 'pattern فاضي' : 'pattern فيه حروف'),
      message(state.condition ? 'The empty pattern matches the boundary before the first code point, even when the text is empty.' : 'The empty-pattern shortcut does not apply. Check whether the pattern can fit.',
        state.condition ? 'pattern الفاضي بيطابق البداية قبل أول code point، حتى لو text كمان فاضي.' : 'pattern مش فاضي، فنشوف هل طوله يسمح إنه يدخل جوّه text.'), `${state.m} == 0 → ${state.condition}`);
    if (state.condition) {
      state.done = true; state.result = 0;
      emit('empty-found', [5], message('Empty pattern: return 0', 'pattern فاضي: نرجّع 0'),
        message('Return the start boundary, index 0. No character was read or compared.', 'بنرجّع بداية النص، index 0. مقريناش ولا قارنّا أي حرف.'), 'return 0');
      return frames;
    }
    state.condition = state.m > state.n;
    emit('fit-check', [6], message(state.condition ? 'The pattern cannot fit' : 'A full alignment can fit', state.condition ? 'pattern أطول من text' : 'في مكان يساع pattern كله'),
      message(state.condition ? `A length-${state.m} pattern cannot fit in ${state.n} code points. No candidate or character comparison is needed.` : `Candidate starts run from 0 through ${state.n - state.m}, inclusive.`,
        state.condition ? `pattern طوله ${state.m} مش هيدخل في text طوله ${state.n}. مش محتاجين نجرّب مكان أو نقارن حروف.` : `البدايات الممكنة من 0 لحد ${state.n - state.m}، والمكان الأخير ده محسوب.`), `${state.m} > ${state.n} → ${state.condition}`);
    if (state.condition) {
      state.done = true; state.result = -1;
      emit('too-long', [7], message('No possible match', 'مفيش تطابق ممكن'),
        message('Return -1 because the pattern is longer than the text. This also covers an empty text with a nonempty pattern.',
          'بنرجّع -1 عشان pattern أطول من text. ده كمان بيغطّي text الفاضي مع pattern مش فاضي.'), 'return -1');
      return frames;
    }
    state.shift = 0;
    emit('start', [8], message('Start at index 0', 'نبدأ من المكان 0'),
      message('Align the first pattern card with the first text card.', 'نحط أول كارت في pattern تحت أول كارت في text.'), 'shift = 0');
    while (true) {
      state.condition = state.shift <= state.n - state.m;
      if (state.condition) state.candidates++;
      emit('candidate', [9], message(state.condition ? `Try start ${state.shift}` : 'No complete alignment remains', state.condition ? `نجرّب البداية ${state.shift}` : 'مفيش مكان يساع pattern كله'),
        message(state.condition ? `The pattern fits at ${state.shift}. Every earlier start has already failed; restart comparisons at pattern index 0.` : `Start ${state.shift} is past the last valid start, ${state.n - state.m}. Stop before reading a character.`,
          state.condition ? `pattern ينفع يبدأ عند ${state.shift}. كل بداية قبل كده فشلت؛ نبدأ المقارنة من أول pattern تاني.` : `البداية ${state.shift} عدّت آخر مكان ينفع، وهو ${state.n - state.m}. نوقف قبل ما نقرأ أي حرف.`), `${state.shift} <= ${state.n - state.m} → ${state.condition}`);
      if (!state.condition) break;
      state.j = 0; state.candidateActive = true;
      emit('reset', [10], message('Restart at pattern index 0', 'نبدأ من أول pattern'),
        message(`At start ${state.shift}, no characters have been verified yet. Naive search does not reuse the previous candidate's matching prefix.`,
          `عند البداية ${state.shift} لسه متأكدناش من أي حرف. الطريقة البسيطة مش بتستفيد من الحروف اللي طابقت في المحاولة اللي فاتت.`), 'j = 0');
      while (true) {
        state.condition = state.j < state.m;
        emit('pattern-bounds', [11], message(state.condition ? 'There is a character to check' : 'The whole pattern matched', state.condition ? 'لسه في حرف نقارنه' : 'pattern كله طابق'),
          message(state.condition ? `Pattern index ${state.j} is valid. The first ${state.j} code points of this candidate already match.` : `All ${state.m} code points matched. Do not read pattern[${state.m}].`,
            state.condition ? `المكان ${state.j} جوّه pattern. أول ${state.j} code points في المحاولة دي مطابقين.` : `كل الـ ${state.m} code points طابقوا. مش هنقرأ pattern[${state.m}].`), `${state.j} < ${state.m} → ${state.condition}`);
        if (!state.condition) break;
        const textIndex = state.shift + state.j;
        const textValue = text[textIndex], patternValue = pattern[state.j];
        const equal = textValue === patternValue;
        state.comparison = { textIndex, patternIndex: state.j, textValue, patternValue, equal };
        state.comparisons++; state.condition = !equal;
        if (equal) state.matchedLength = state.j + 1;
        emit('compare', [12], message(equal ? 'These code points match' : 'These code points differ', equal ? 'الـ code points دول مطابقين' : 'الـ code points دول مختلفين'),
          message(equal ? `text[${textIndex}] and pattern[${state.j}] both hold ${JSON.stringify(textValue)}. The verified prefix now has ${state.matchedLength} code points.` : `text[${textIndex}] holds ${JSON.stringify(textValue)}, but pattern[${state.j}] needs ${JSON.stringify(patternValue)}. Start ${state.shift} cannot be a full match.`,
            equal ? `text[${textIndex}] وpattern[${state.j}] فيهم ${JSON.stringify(textValue)}. كده اتأكدنا من أول ${state.matchedLength} code points.` : `text[${textIndex}] فيه ${JSON.stringify(textValue)}، بس pattern[${state.j}] محتاج ${JSON.stringify(patternValue)}. البداية ${state.shift} مش هتدي تطابق كامل.`),
          `text[${textIndex}] ${JSON.stringify(textValue)} != pattern[${state.j}] ${JSON.stringify(patternValue)} → ${!equal}`);
        if (!equal) {
          emit('mismatch', [13], message(`Reject start ${state.shift}`, `نستبعد البداية ${state.shift}`),
            message(`One different code point is enough to reject this start. Stop this candidate after ${state.matchedLength} matching code points.`,
              `حرف مختلف واحد كفاية نستبعد البداية دي. نوقف المحاولة بعد ${state.matchedLength} code points مطابقين.`), 'break');
          break;
        }
        state.j++;
        emit('advance', [14], message('Advance within the pattern', 'نكمّل جوّه pattern'),
          message(`Increase j to ${state.j} because the previous pair matched. Keep shift at ${state.shift}.`,
            `نزوّد j لحد ${state.j} عشان الحرفين اللي فاتوا طابقوا. shift بيفضل ${state.shift}.`), `j = ${state.j - 1} + 1 = ${state.j}`);
      }
      state.condition = state.j === state.m;
      emit('match-check', [15], message(state.condition ? 'A full match is confirmed' : 'This candidate stopped early', state.condition ? 'اتأكدنا من التطابق الكامل' : 'المحاولة دي وقفت قبل الآخر'),
        message(state.condition ? `j reached ${state.m}, so every pattern code point matched at start ${state.shift}.` : `j is ${state.j}, below ${state.m}; the mismatch ended this attempt. Try the next start.`,
          state.condition ? `j وصل لـ ${state.m}، يبقى كل pattern طابق عند البداية ${state.shift}.` : `j بيساوي ${state.j}، أقل من ${state.m}؛ الاختلاف وقّف المحاولة. نجرّب البداية اللي بعدها.`), `${state.j} == ${state.m} → ${state.condition}`);
      if (state.condition) {
        state.done = true; state.result = state.shift;
        emit('found', [16], message(`First match at index ${state.shift}`, `أول تطابق عند المكان ${state.shift}`),
          message(`Return ${state.shift}, measured in code points. All earlier starts failed; later matches, including overlaps, are not needed.`,
            `بنرجّع ${state.shift} بعدّ الـ code points. كل البدايات اللي قبله فشلت؛ مش محتاجين ندوّر على تطابقات بعده، حتى لو متداخلة.`), `return ${state.shift}`);
        return frames;
      }
      state.shift++; state.shifts++; state.candidateActive = false;
      state.matchedLength = 0; state.comparison = null;
      const canFit = state.shift <= state.n - state.m;
      emit('shift', [17], message('Shift by exactly one', 'نحرّك مكان واحد بس'),
        message(canFit ? `Move the same pattern cards from start ${state.shift - 1} to ${state.shift}. ${state.m > 1 ? 'The candidate windows overlap, so skipping ahead could miss a match.' : 'Every text position is a possible one-character match.'}` : `Move shift to ${state.shift}, beyond the last valid start. The next loop check will stop; no out-of-bounds character is read.`,
          canFit ? `نحرّك نفس كروت pattern من البداية ${state.shift - 1} لـ ${state.shift}. ${state.m > 1 ? 'الأماكن اللي بنجرّبها بتتداخل، ولو نطّينا لقدّام ممكن نفوّت تطابق.' : 'كل مكان في text ممكن يطابق الحرف الوحيد.'}` : `shift بقى ${state.shift}، بعد آخر بداية تنفع. شرط الحلقة الجاي هيوقّفنا؛ مش هنقرأ حرف برّه الحدود.`), `shift = ${state.shift - 1} + 1 = ${state.shift}`);
    }
    state.done = true; state.result = -1;
    emit('missing', [18], message('Pattern not found', 'pattern مش موجود'),
      message(`All ${state.candidates} possible starts failed after ${state.comparisons} character comparisons. Return -1.`,
        `جرّبنا كل الـ ${state.candidates} بدايات الممكنة وفشلوا بعد ${state.comparisons} مقارنة حروف. بنرجّع -1.`), 'return -1');
    return frames;
  }

  const lesson = {
    id: 'string-matching', name: 'String Matching', theme: 'algorithms', category: 'string', number: '10',
    label: 'NAIVE STRING MATCHING', cost: 'O((n − m + 1)m)',
    description: message('Find the first exact occurrence by sliding the pattern one code point at a time.', 'نلاقي أول تطابق بالظبط، ونحرّك pattern كل مرة code point واحد.'),
    note: message('Zero-based code-point indices. Empty pattern → 0; no match → -1. Case and whitespace matter.', 'الأماكن بتبدأ من صفر وبنعدّ code points. pattern فاضي → 0؛ مفيش تطابق → -1. حالة الحروف والمسافات بتفرق.'),
    code,
    keySteps: ['ready', 'candidate', 'compare', 'mismatch', 'found', 'missing', 'empty-found', 'too-long'],
    fields: [
      { name: 'text', type: 'textarea', maxLength: 48, label: message('Text', 'النص · text'),
        help: message('Up to 24 Unicode code points. Spaces and line breaks are kept.', 'لحد 24 Unicode code points. المسافات والسطر الجديد بيتحسبوا.') },
      { name: 'pattern', type: 'textarea', maxLength: 20, label: message('Pattern', 'الجزء المطلوب · pattern'),
        help: message('Up to 10 Unicode code points. Leave empty to match index 0. Matching is case-sensitive.', 'لحد 10 Unicode code points. سيبه فاضي عشان يطابق المكان 0. حالة الحروف بتفرق.') },
    ],
    defaults: { text: 'ABABABAC', pattern: 'ABAC' },
    presets: [
      { id: 'default', label: message('Retry overlapping starts', 'نجرّب بدايات متداخلة'), input: { text: 'ABABABAC', pattern: 'ABAC' } },
      { id: 'overlap', label: message('A match one shift later', 'تطابق بعد تحريكة واحدة'), input: { text: 'aaab', pattern: 'aab' } },
      { id: 'first-only', label: message('Stop at the first match', 'نقف عند أول تطابق'), input: { text: 'bananana', pattern: 'ana' } },
      { id: 'worst-case', label: message('Repeated near-matches', 'محاولات بتفشل في آخر حرف'), input: { text: 'aaaaaaaaab', pattern: 'aaaac' } },
      { id: 'exact', label: message('The whole text matches', 'النص كله مطابق'), input: { text: 'hello', pattern: 'hello' } },
      { id: 'unicode', label: message('Emoji code-point indices', 'أماكن الإيموجي بالـ code points'), input: { text: '🙂a🙂b', pattern: '🙂b' } },
      { id: 'whitespace', label: message('Spaces are characters', 'المسافات بتتحسب'), input: { text: 'a a b', pattern: ' a' } },
      { id: 'empty-pattern', label: message('An empty pattern', 'pattern فاضي'), input: { text: 'abc', pattern: '' } },
      { id: 'longer-pattern', label: message('Pattern longer than text', 'pattern أطول من text'), input: { text: 'ab', pattern: 'abab' } },
      { id: 'empty-text', label: message('An empty text', 'text فاضي'), input: { text: '', pattern: 'a' } },
      { id: 'both-empty', label: message('Both inputs empty', 'الاتنين فاضيين'), input: { text: '', pattern: '' } },
    ],
    parse: validate,
    build,
    summary(input) {
      const parsed = validate(input);
      const n = Array.from(parsed.text).length, m = Array.from(parsed.pattern).length;
      return message(`${n} text code points · ${m} pattern code points · ${m === 0 ? 'empty pattern returns 0' : `${Math.max(0, n - m + 1)} possible starts`}`,
        `${n} code points في text · ${m} في pattern · ${m === 0 ? 'pattern الفاضي بيرجّع 0' : `${Math.max(0, n - m + 1)} بدايات ممكنة`}`);
    },
    theory: {
      idea: message('Slide the pattern along the text one position at a time. At each position compare character by character; at the first mismatch, move one position over and start again.',
        'حرّك الـ pattern على الـ text مكان مكان. في كل مكان قارن حرف حرف؛ ومع أول اختلاف، اتحرّك مكان واحد وابدأ من الأول.'),
      title: message('Naive first-match string search', 'البحث البسيط عن أول تطابق'),
      intro: message('You need zero-based indexing, equality tests, and nested loops. No sorting or preprocessing is required. n and m count Unicode code points, not JavaScript UTF-16 code units.',
        'محتاج تفهم الأماكن اللي بتبدأ من صفر، مقارنة المساواة، وحلقة جوّه حلقة. مش محتاج ترتيب ولا تجهيز للـ pattern. n وm بيعدّوا Unicode code points، مش وحدات UTF-16 بتاعة JavaScript.'),
      invariant: message('Before each comparison, pattern[0..j) equals text[shift..shift+j), and every start before shift has failed. A mismatch disproves this start. Increasing shift by exactly one examines every possible start, including overlaps. Reaching j = m proves a match; because starts increase, the first returned index is the earliest.',
        'قبل كل مقارنة، أول j code points في pattern مطابقين للجزء اللي بيبدأ عند shift، وكل بداية قبل shift فشلت. أي اختلاف يستبعد البداية دي. لما نزوّد shift بواحد بنجرّب كل البدايات، حتى المتداخلة. لو j وصل لـ m يبقى لقينا تطابق؛ وبما إننا ماشيين بالترتيب، أول مكان بنرجّعه هو أول تطابق فعلاً.'),
      steps: [
        { title: message('Handle the boundaries', 'نظبط الحالات الخاصة'), body: message('Return 0 for an empty pattern, including two empty inputs. A nonempty pattern longer than the text returns -1 without comparing characters.', 'لو pattern فاضي نرجّع 0، حتى لو الاتنين فاضيين. لو pattern أطول من text نرجّع -1 من غير مقارنة حروف.') },
        { title: message('Align and compare', 'نحط pattern ونقارن'), body: message('Try shift = 0 through n − m inclusive. Reset j to 0 at each start and compare text[shift + j] to pattern[j]. Only a successful equality advances j.', 'نجرّب shift من 0 لحد n − m شامل آخر مكان. كل مرة نرجّع j لصفر ونقارن text[shift + j] مع pattern[j]. بنزوّد j بس لما الحرفين يطابقوا.') },
        { title: message('Reject or return', 'نستبعد أو نرجّع النتيجة'), body: message('On a mismatch, stop that candidate and shift one position. On a full match, return shift immediately. If the last candidate fails, return -1. This finds one match, not all occurrences.', 'لو حرف اختلف نوقف المحاولة ونحرّك مكان واحد. لو pattern كله طابق نرجّع shift فوراً. لو آخر بداية فشلت نرجّع -1. إحنا بندوّر على أول تطابق بس.') },
      ],
      notes: [
        message('For 1 ≤ m ≤ n, at most n − m + 1 starts each compare m code points. Repeated prefixes can force every comparison, for example a text of a characters against a pattern ending in b. The metric counts character comparisons only, not loop or length checks.', 'لما 1 ≤ m ≤ n، عندنا n − m + 1 بدايات بالكتير، وكل بداية ممكن تحتاج m مقارنات. تكرار نفس الحروف ممكن يجبرنا نعملهم كلهم، زي text كله a وpattern آخره b. العداد بيحسب مقارنات الحروف بس، مش شروط الحلقات أو الأطوال.'),
        message('Empty and longer-pattern shortcuts take O(1) matching work after lengths are known. This module first validates and converts strings to code-point arrays in O(n + m) time and space, even on those shortcuts.', 'حالة pattern الفاضي أو الأطول بتاخد O(1) في البحث بعد ما نعرف الأطوال. الموديول الأول بيتأكد من النصوص ويحوّلهم لصفوف code points في وقت ومساحة O(n + m)، حتى في الحالات دي.'),
        message('The search itself needs O(1) extra space on code-point arrays.', 'البحث نفسه محتاج مساحة إضافية O(1) لما الصفوف جاهزة.'),
        message('This simple approach works well for small inputs, but repeats prefix work after a failure. KMP reuses prefix information to achieve O(n + m) search including preprocessing, with O(m) extra space. This lesson deliberately shows the naive approach.', 'الطريقة دي بسيطة ومناسبة للنصوص الصغيرة، بس بتعيد شغل الحروف اللي طابقت بعد الفشل. KMP بيستفيد من معلومات الـ prefix عشان يوصل لوقت O(n + m) شامل التجهيز، بمساحة إضافية O(m). هنا بنشرح الطريقة البسيطة.'),
        message('Matching is exact: no case folding or Unicode normalization. Combining accents and joined emoji can span several cards. Returned indices count code points, so they can differ from String.indexOf indices. Inputs are capped at 24 text and 10 pattern code points to keep playback manageable.', 'التطابق حرفي: مش بنغيّر حالة الحروف ولا بنعمل Unicode normalization. التشكيل والإيموجي المركّب ممكن ياخدوا أكتر من كارت. المكان الراجع بعدّ الـ code points، فممكن يختلف عن String.indexOf. الحد 24 لـ text و10 لـ pattern عشان العرض يفضل سهل المتابعة.'),
      ],
      costs: [
        { label: message('Worst search time · 1 ≤ m ≤ n', 'أسوأ وقت للبحث · 1 ≤ m ≤ n'), value: 'O((n − m + 1)m)' },
        { label: message('Immediate full match · m > 0', 'تطابق كامل من أول بداية · m > 0'), value: 'Θ(m)' },
        { label: message('Empty or longer pattern · after lengths', 'pattern فاضي أو أطول · بعد حساب الأطوال'), value: 'O(1)' },
        { label: message('Code-point input preparation', 'تجهيز الـ code points'), value: 'O(n + m) time / space' },
        { label: message('Search auxiliary space', 'المساحة الإضافية للبحث'), value: 'O(1)' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
