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
      fail('Provide text and pattern as strings.', 'لازم تبعت الـ text والـ pattern كـ strings.');
    }
    for (const [name, limit] of [['text', 24], ['pattern', 10]]) {
      if (typeof input[name] !== 'string') {
        fail(`${name} must be a string; use "" for an empty input.`,
          `الـ ${name} لازم يكون string. لو عايزه فاضي اكتب "".`);
      }
      const points = Array.from(input[name]);
      if (points.length > limit) {
        fail(`${name} must contain at most ${limit} Unicode code points.`,
          `الـ ${name} مينفعش يزيد عن ${limit} Unicode code points.`, RangeError);
      }
      if (points.some(point => {
        const value = point.codePointAt(0);
        return value >= 0xD800 && value <= 0xDFFF;
      })) {
        fail(`${name} contains an unpaired Unicode surrogate. Use valid Unicode text.`,
          `الـ ${name} فيه unpaired Unicode surrogate. اكتب Unicode text سليم.`);
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
        { id: 'text', label: message('Text · code-point indices', 'الـ text · الـ indices بالـ code points'), layout: 'aligned', cells: textCells },
        { id: 'pattern', label: state.pattern.length ? message('Pattern', 'الـ pattern') : message('Pattern (empty)', 'الـ pattern (فاضي)'), layout: 'aligned', cells: patternCells },
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
          { label: message('Character comparisons', 'مقارنات الـ characters'), value: state.comparisons },
          { label: message('Candidates tried', 'بدايات جرّبناها'), value: state.candidates },
          { label: message('One-position shifts', 'shifts بمكان واحد'), value: state.shifts },
        ],
        scene: makeScene(state, kind, explanation),
      }));
    }

    emit('ready', [], message('Try each possible start', 'هنجرّب كل بداية ممكنة'),
      message('Naive first-match search compares left to right, then shifts the pattern by one after a mismatch. Indices start at zero and count Unicode code points.',
        'الطريقة الـ naive بتدوّر على أول match. بنقارن من الشمال لليمين، ولو لقينا mismatch بنعمل shift للـ pattern مكان واحد. الـ indices بتبدأ من 0 وبتعدّ Unicode code points.'));
    emit('code-points', [2], message('Use code-point positions', 'بنعدّ بالـ code points'),
      message('Each card holds one Unicode code point. Case, spaces, and combining marks are preserved; a visible symbol can contain several code points.',
        'كل كارت فيه Unicode code point واحد. الـ case والمسافات والتشكيل بيفضلوا زي ما هم. والرمز اللي بتشوفه ممكن يكون أكتر من code point.'));
    state.n = text.length; state.m = pattern.length;
    emit('lengths', [3], message('Measure both inputs', 'بنحسب طول الـ text والـ pattern'),
      message(`The text has ${state.n} code points and the pattern has ${state.m}. A full candidate must fit inside the text.`,
        `الـ text فيه ${state.n} code points، والـ pattern فيه ${state.m}. الـ pattern لازم يدخل كله جوّه الـ text.`), `n = ${state.n}; m = ${state.m}`);
    state.condition = state.m === 0;
    emit('empty-check', [4], message(state.condition ? 'The pattern is empty' : 'The pattern has characters', state.condition ? 'الـ pattern فاضي' : 'الـ pattern فيه characters'),
      message(state.condition ? 'The empty pattern matches the boundary before the first code point, even when the text is empty.' : 'The empty-pattern shortcut does not apply. Check whether the pattern can fit.',
        state.condition ? 'الـ pattern الفاضي بيعمل match عند البداية، قبل أول code point، حتى لو الـ text نفسه فاضي.' : 'الـ shortcut بتاع الـ pattern الفاضي مش هينفع هنا. هنشوف الـ pattern يدخل في الـ text ولا لأ.'), `${state.m} == 0 → ${state.condition}`);
    if (state.condition) {
      state.done = true; state.result = 0;
      emit('empty-found', [5], message('Empty pattern: return 0', 'الـ pattern فاضي، يبقى return 0'),
        message('Return the start boundary, index 0. No character was read or compared.', 'بنعمل return للبداية، index 0. مقريناش ولا قارنّا أي character.'), 'return 0');
      return frames;
    }
    state.condition = state.m > state.n;
    emit('fit-check', [6], message(state.condition ? 'The pattern cannot fit' : 'A full alignment can fit', state.condition ? 'الـ pattern مش هيدخل' : 'فيه مكان يساع الـ pattern كله'),
      message(state.condition ? `A length-${state.m} pattern cannot fit in ${state.n} code points. No candidate or character comparison is needed.` : `Candidate starts run from 0 through ${state.n - state.m}, inclusive.`,
        state.condition ? `pattern طوله ${state.m} مش هيدخل في ${state.n} code points. مش محتاجين نجرّب أي بداية ولا نقارن أي character.` : `البدايات اللي هنجرّبها من 0 لحد ${state.n - state.m}، والـ ${state.n - state.m} نفسها محسوبة.`), `${state.m} > ${state.n} → ${state.condition}`);
    if (state.condition) {
      state.done = true; state.result = -1;
      emit('too-long', [7], message('No possible match', 'مفيش match ممكن'),
        message('Return -1 because the pattern is longer than the text. This also covers an empty text with a nonempty pattern.',
          'بنعمل return -1 عشان الـ pattern أطول من الـ text. ودي كمان بتغطّي حالة الـ text الفاضي مع pattern مش فاضي.'), 'return -1');
      return frames;
    }
    state.shift = 0;
    emit('start', [8], message('Start at index 0', 'هنبدأ من index 0'),
      message('Align the first pattern card with the first text card.', 'بنحط أول character في الـ pattern تحت أول character في الـ text.'), 'shift = 0');
    while (true) {
      state.condition = state.shift <= state.n - state.m;
      if (state.condition) state.candidates++;
      emit('candidate', [9], message(state.condition ? `Try start ${state.shift}` : 'No complete alignment remains', state.condition ? `بنجرّب البداية ${state.shift}` : 'مفيش مكان تاني يساع الـ pattern كله'),
        message(state.condition ? `The pattern fits at ${state.shift}. Every earlier start has already failed; restart comparisons at pattern index 0.` : `Start ${state.shift} is past the last valid start, ${state.n - state.m}. Stop before reading a character.`,
          state.condition ? `الـ pattern بيدخل لو بدأ من ${state.shift}. كل البدايات اللي قبلها فشلت، فهنبدأ نقارن من أول الـ pattern تاني.` : `البداية ${state.shift} بعد آخر بداية تنفع، اللي هي ${state.n - state.m}. هنقف قبل ما نقرا أي character.`), `${state.shift} <= ${state.n - state.m} → ${state.condition}`);
      if (!state.condition) break;
      state.j = 0; state.candidateActive = true;
      emit('reset', [10], message('Restart at pattern index 0', 'بنرجع لأول الـ pattern'),
        message(`At start ${state.shift}, no characters have been verified yet. Naive search does not reuse the previous candidate's matching prefix.`,
          `عند البداية ${state.shift} لسه متأكدناش من ولا character. الطريقة الـ naive مش بتستفيد من الـ prefix اللي عمل match في المحاولة اللي فاتت.`), 'j = 0');
      while (true) {
        state.condition = state.j < state.m;
        emit('pattern-bounds', [11], message(state.condition ? 'There is a character to check' : 'The whole pattern matched', state.condition ? 'لسه فيه character نقارنه' : 'الـ pattern كله عمل match'),
          message(state.condition ? `Pattern index ${state.j} is valid. The first ${state.j} code points of this candidate already match.` : `All ${state.m} code points matched. Do not read pattern[${state.m}].`,
            state.condition ? `الـ index ${state.j} لسه جوّه الـ pattern. أول ${state.j} code points في المحاولة دي عملوا match خلاص.` : `الـ ${state.m} code points كلهم عملوا match. مش هنقرا pattern[${state.m}].`), `${state.j} < ${state.m} → ${state.condition}`);
        if (!state.condition) break;
        const textIndex = state.shift + state.j;
        const textValue = text[textIndex], patternValue = pattern[state.j];
        const equal = textValue === patternValue;
        state.comparison = { textIndex, patternIndex: state.j, textValue, patternValue, equal };
        state.comparisons++; state.condition = !equal;
        if (equal) state.matchedLength = state.j + 1;
        emit('compare', [12], message(equal ? 'These code points match' : 'These code points differ', equal ? 'الـ characters دول زي بعض، يبقى match' : 'الـ characters دول مش زي بعض، يبقى mismatch'),
          message(equal ? `text[${textIndex}] and pattern[${state.j}] both hold ${JSON.stringify(textValue)}. The verified prefix now has ${state.matchedLength} code points.` : `text[${textIndex}] holds ${JSON.stringify(textValue)}, but pattern[${state.j}] needs ${JSON.stringify(patternValue)}. Start ${state.shift} cannot be a full match.`,
            equal ? `text[${textIndex}] و pattern[${state.j}] الاتنين فيهم ${JSON.stringify(textValue)}. كده اتأكدنا من أول ${state.matchedLength} code points.` : `text[${textIndex}] فيه ${JSON.stringify(textValue)}، بس pattern[${state.j}] محتاج ${JSON.stringify(patternValue)}. يبقى البداية ${state.shift} مش هتدّي match كامل.`),
          `text[${textIndex}] ${JSON.stringify(textValue)} != pattern[${state.j}] ${JSON.stringify(patternValue)} → ${!equal}`);
        if (!equal) {
          emit('mismatch', [13], message(`Reject start ${state.shift}`, `بنستبعد البداية ${state.shift}`),
            message(`One different code point is enough to reject this start. Stop this candidate after ${state.matchedLength} matching code points.`,
              `code point واحد مختلف كفاية عشان نستبعد البداية دي. بنوقف المحاولة دي بعد ${state.matchedLength} code points عملوا match.`), 'break');
          break;
        }
        state.j++;
        emit('advance', [14], message('Advance within the pattern', 'بنكمّل في الـ pattern'),
          message(`Increase j to ${state.j} because the previous pair matched. Keep shift at ${state.shift}.`,
            `بنزوّد j لـ ${state.j} عشان المقارنة اللي فاتت طلعت match. و shift بيفضل ${state.shift}.`), `j = ${state.j - 1} + 1 = ${state.j}`);
      }
      state.condition = state.j === state.m;
      emit('match-check', [15], message(state.condition ? 'A full match is confirmed' : 'This candidate stopped early', state.condition ? 'اتأكدنا إن فيه match كامل' : 'المحاولة دي وقفت بدري'),
        message(state.condition ? `j reached ${state.m}, so every pattern code point matched at start ${state.shift}.` : `j is ${state.j}, below ${state.m}; the mismatch ended this attempt. Try the next start.`,
          state.condition ? `j وصل لـ ${state.m}، يعني الـ pattern كله عمل match عند البداية ${state.shift}.` : `j لسه ${state.j}، أقل من ${state.m}. الـ mismatch وقّف المحاولة دي، فهنجرّب البداية اللي بعدها.`), `${state.j} == ${state.m} → ${state.condition}`);
      if (state.condition) {
        state.done = true; state.result = state.shift;
        emit('found', [16], message(`First match at index ${state.shift}`, `أول match عند index ${state.shift}`),
          message(`Return ${state.shift}, measured in code points. All earlier starts failed; later matches, including overlaps, are not needed.`,
            `بنعمل return ${state.shift}، والعدّ بالـ code points. كل البدايات اللي قبلها فشلت. ومش محتاجين أي match بعد كده، حتى لو متداخل.`), `return ${state.shift}`);
        return frames;
      }
      state.shift++; state.shifts++; state.candidateActive = false;
      state.matchedLength = 0; state.comparison = null;
      const canFit = state.shift <= state.n - state.m;
      emit('shift', [17], message('Shift by exactly one', 'بنعمل shift مكان واحد بس'),
        message(canFit ? `Move the same pattern cards from start ${state.shift - 1} to ${state.shift}. ${state.m > 1 ? 'The candidate windows overlap, so skipping ahead could miss a match.' : 'Every text position is a possible one-character match.'}` : `Move shift to ${state.shift}, beyond the last valid start. The next loop check will stop; no out-of-bounds character is read.`,
          canFit ? `بنحرّك نفس الـ pattern من البداية ${state.shift - 1} لـ ${state.shift}. ${state.m > 1 ? 'البدايات اللي بنجرّبها متداخلة، فلو نطّينا أكتر من مكان ممكن يفوتنا match.' : 'أي مكان في الـ text ممكن يعمل match مع الـ character الوحيد.'}` : `shift بقى ${state.shift}، يعني عدّى آخر بداية تنفع. الـ check الجاي بتاع الـ loop هيوقّفنا، ومش هنقرا أي character برّه الـ text.`), `shift = ${state.shift - 1} + 1 = ${state.shift}`);
    }
    state.done = true; state.result = -1;
    emit('missing', [18], message('Pattern not found', 'الـ pattern مش موجود'),
      message(`All ${state.candidates} possible starts failed after ${state.comparisons} character comparisons. Return -1.`,
        `جرّبنا الـ ${state.candidates} بدايات كلهم وفشلوا، بعد ${state.comparisons} مقارنة بين characters. بنعمل return -1.`), 'return -1');
    return frames;
  }

  const lesson = {
    id: 'string-matching', name: 'String Matching', theme: 'algorithms', category: 'string', number: '10',
    label: 'NAIVE STRING MATCHING', cost: 'O((n − m + 1)m)',
    description: message('Find the first exact occurrence by sliding the pattern one code point at a time.', 'بندوّر على أول مكان الـ pattern موجود فيه بالظبط، وبنحرّكه code point واحد كل مرة.'),
    note: message('Zero-based code-point indices. Empty pattern → 0; no match → -1. Case and whitespace matter.', 'الـ indices بتبدأ من 0 وبتعدّ code points. pattern فاضي → 0، مفيش match → -1. الـ case والمسافات بيفرقوا.'),
    code,
    keySteps: ['ready', 'candidate', 'compare', 'mismatch', 'found', 'missing', 'empty-found', 'too-long'],
    fields: [
      { name: 'text', type: 'textarea', maxLength: 48, label: message('Text', 'الـ text'),
        help: message('Up to 24 Unicode code points. Spaces and line breaks are kept.', 'لحد 24 Unicode code points. المسافات والسطور الجديدة بتفضل زي ما هي.') },
      { name: 'pattern', type: 'textarea', maxLength: 20, label: message('Pattern', 'الـ pattern'),
        help: message('Up to 10 Unicode code points. Leave empty to match index 0. Matching is case-sensitive.', 'لحد 10 Unicode code points. لو سبته فاضي هيعمل match عند index 0. الـ matching هنا case-sensitive.') },
    ],
    defaults: { text: 'ABABABAC', pattern: 'ABAC' },
    presets: [
      { id: 'default', label: message('Retry overlapping starts', 'بدايات متداخلة بنجرّبها تاني'), input: { text: 'ABABABAC', pattern: 'ABAC' } },
      { id: 'overlap', label: message('A match one shift later', 'match بعد shift واحد'), input: { text: 'aaab', pattern: 'aab' } },
      { id: 'first-only', label: message('Stop at the first match', 'بنقف عند أول match'), input: { text: 'bananana', pattern: 'ana' } },
      { id: 'worst-case', label: message('Repeated near-matches', 'محاولات كتير قرّبت تعمل match'), input: { text: 'aaaaaaaaab', pattern: 'aaaac' } },
      { id: 'exact', label: message('The whole text matches', 'الـ text كله بيعمل match'), input: { text: 'hello', pattern: 'hello' } },
      { id: 'unicode', label: message('Emoji code-point indices', 'الـ indices مع الإيموجي (code points)'), input: { text: '🙂a🙂b', pattern: '🙂b' } },
      { id: 'whitespace', label: message('Spaces are characters', 'المسافة character برضه'), input: { text: 'a a b', pattern: ' a' } },
      { id: 'empty-pattern', label: message('An empty pattern', 'pattern فاضي'), input: { text: 'abc', pattern: '' } },
      { id: 'longer-pattern', label: message('Pattern longer than text', 'الـ pattern أطول من الـ text'), input: { text: 'ab', pattern: 'abab' } },
      { id: 'empty-text', label: message('An empty text', 'text فاضي'), input: { text: '', pattern: 'a' } },
      { id: 'both-empty', label: message('Both inputs empty', 'الاتنين فاضيين'), input: { text: '', pattern: '' } },
    ],
    parse: validate,
    build,
    summary(input) {
      const parsed = validate(input);
      const n = Array.from(parsed.text).length, m = Array.from(parsed.pattern).length;
      return message(`${n} text code points · ${m} pattern code points · ${m === 0 ? 'empty pattern returns 0' : `${Math.max(0, n - m + 1)} possible starts`}`,
        `${n} code points في الـ text · ${m} في الـ pattern · ${m === 0 ? 'الـ pattern الفاضي بيرجّع 0' : `${Math.max(0, n - m + 1)} بدايات ممكنة`}`);
    },
    theory: {
      idea: message('Slide the pattern along the text one position at a time. At each position compare character by character; at the first mismatch, move one position over and start again.',
        'بنحرّك الـ pattern على الـ text مكان مكان. في كل مكان بنقارن character character، وأول ما نلاقي mismatch بنتحرّك مكان واحد ونبدأ من الأول.'),
      title: message('Naive first-match string search', 'الـ naive string search: أول match'),
      intro: message('You need zero-based indexing, equality tests, and nested loops. No sorting or preprocessing is required. n and m count Unicode code points, not JavaScript UTF-16 code units.',
        'محتاج تكون فاهم الـ indices اللي بتبدأ من 0، والمقارنة بـ ==، والـ nested loops. مفيش sorting ولا preprocessing. n و m بيعدّوا Unicode code points، مش الـ UTF-16 code units بتاعة JavaScript.'),
      invariant: message('Before each comparison, pattern[0..j) equals text[shift..shift+j), and every start before shift has failed. A mismatch disproves this start. Increasing shift by exactly one examines every possible start, including overlaps. Reaching j = m proves a match; because starts increase, the first returned index is the earliest.',
        'قبل كل مقارنة، pattern[0..j) زي text[shift..shift+j) بالظبط، وكل البدايات اللي قبل shift فشلت. أي mismatch بيستبعد البداية دي. ولما نزوّد shift بواحد بالظبط، بنجرّب كل البدايات، حتى المتداخلة. لو j وصل لـ m يبقى لقينا match. وعشان البدايات بتزيد بالترتيب، أول index بنرجّعه هو أول match فعلاً.'),
      steps: [
        { title: message('Handle the boundaries', 'الحالات الخاصة الأول'), body: message('Return 0 for an empty pattern, including two empty inputs. A nonempty pattern longer than the text returns -1 without comparing characters.', 'لو الـ pattern فاضي بنعمل return 0، حتى لو الاتنين فاضيين. ولو الـ pattern مش فاضي وأطول من الـ text بنعمل return -1 من غير ما نقارن أي character.') },
        { title: message('Align and compare', 'بنحط الـ pattern ونقارن'), body: message('Try shift = 0 through n − m inclusive. Reset j to 0 at each start and compare text[shift + j] to pattern[j]. Only a successful equality advances j.', 'بنجرّب shift من 0 لحد n − m، والـ n − m نفسها محسوبة. مع كل بداية بنرجّع j لـ 0 ونقارن text[shift + j] بـ pattern[j]. j بيزيد بس لما يكون فيه match.') },
        { title: message('Reject or return', 'بنستبعد أو بنعمل return'), body: message('On a mismatch, stop that candidate and shift one position. On a full match, return shift immediately. If the last candidate fails, return -1. This finds one match, not all occurrences.', 'لو فيه mismatch بنوقف المحاولة دي ونعمل shift مكان واحد. لو الـ pattern كله عمل match بنعمل return لـ shift على طول. لو آخر بداية فشلت بنعمل return -1. كده بنلاقي match واحد بس، مش كل الأماكن.') },
      ],
      notes: [
        message('For 1 ≤ m ≤ n, at most n − m + 1 starts each compare m code points. Repeated prefixes can force every comparison, for example a text of a characters against a pattern ending in b. The metric counts character comparisons only, not loop or length checks.', 'لما 1 ≤ m ≤ n، فيه n − m + 1 بداية بالكتير، وكل بداية بتقارن لحد m code points. لو الـ prefix بيتكرّر ممكن نضطر نعمل كل المقارنات دي، زي text كله a و pattern آخره b. العدّاد بيحسب مقارنات الـ characters بس، مش الـ checks بتاعة الـ loop أو الطول.'),
        message('Empty and longer-pattern shortcuts take O(1) matching work after lengths are known. This module first validates and converts strings to code-point arrays in O(n + m) time and space, even on those shortcuts.', 'حالة الـ pattern الفاضي أو الأطول بتاخد O(1) في الـ matching بعد ما نعرف الأطوال. بس الـ module ده بيعمل validate الأول وبيحوّل الـ strings لـ arrays من code points في O(n + m) time و space، حتى في الحالات دي.'),
        message('The search itself needs O(1) extra space on code-point arrays.', 'البحث نفسه محتاج O(1) extra space لما الـ code-point arrays تكون جاهزة.'),
        message('This simple approach works well for small inputs, but repeats prefix work after a failure. KMP reuses prefix information to achieve O(n + m) search including preprocessing, with O(m) extra space. This lesson deliberately shows the naive approach.', 'الطريقة دي سهلة وكويسة للـ inputs الصغيرة، بس بعد كل فشل بتعيد شغل الـ prefix من الأول. الـ KMP بيستفيد من معلومات الـ prefix ويوصل لـ O(n + m) شامل الـ preprocessing، بـ O(m) extra space. هنا بنشرح الطريقة الـ naive عن قصد.'),
        message('Matching is exact: no case folding or Unicode normalization. Combining accents and joined emoji can span several cards. Returned indices count code points, so they can differ from String.indexOf indices. Inputs are capped at 24 text and 10 pattern code points to keep playback manageable.', 'الـ match لازم يكون بالظبط: مفيش case folding ولا Unicode normalization. التشكيل والإيموجي المركّب ممكن ياخدوا أكتر من كارت. الـ index اللي بنرجّعه بيعدّ code points، فممكن يختلف عن String.indexOf. الـ text أقصاه 24 code point والـ pattern أقصاه 10، عشان العرض يفضل سهل تتابعه.'),
      ],
      costs: [
        { label: message('Worst search time · 1 ≤ m ≤ n', 'الـ worst case للبحث · 1 ≤ m ≤ n'), value: 'O((n − m + 1)m)' },
        { label: message('Immediate full match · m > 0', 'match كامل من أول بداية · m > 0'), value: 'Θ(m)' },
        { label: message('Empty or longer pattern · after lengths', 'pattern فاضي أو أطول · بعد ما نعرف الأطوال'), value: 'O(1)' },
        { label: message('Code-point input preparation', 'تحويل الـ input لـ code points'), value: 'O(n + m) time / space' },
        { label: message('Search auxiliary space', 'الـ extra space بتاعة البحث'), value: 'O(1)' },
      ],
    },
  };

  root.AlgorithmLessons = root.AlgorithmLessons || {};
  root.AlgorithmLessons[lesson.id] = lesson;
  if (typeof module !== 'undefined' && module.exports) module.exports = lesson;
})(typeof globalThis !== 'undefined' ? globalThis : this);
