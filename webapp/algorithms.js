(function (root) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const message = (en, ar) => ({ en, ar });
  const binaryCode = [
    'binarySearch(numbers, target):',
    '  left = 0',
    '  right = length(numbers) - 1',
    '  while left <= right:',
    '    middle = floor((left + right) / 2)',
    '    if numbers[middle] == target:',
    '      return middle',
    '    if numbers[middle] < target:',
    '      left = middle + 1',
    '    else:',
    '      right = middle - 1',
    '  return NOT_FOUND',
  ];
  const insertionCode = [
    'insertionSort(numbers):',
    '  for current = 1 .. length(numbers) - 1:',
    '    value = numbers[current]',
    '    compareIndex = current - 1',
    '    while compareIndex >= 0',
    '      and numbers[compareIndex] > value:',
    '      numbers[compareIndex + 1] =',
    '        numbers[compareIndex]',
    '      compareIndex = compareIndex - 1',
    '    numbers[compareIndex + 1] = value',
    '  return numbers',
  ];
  function validateNumbers(numbers) {
    if (!Array.isArray(numbers) || numbers.some(n => !Number.isSafeInteger(n)))
      throw new TypeError('Use an array of safe integers.');
  }
  function binarySearch(numbers, target) {
    validateNumbers(numbers);
    if (!Number.isSafeInteger(target)) throw new TypeError('Target must be an integer.');
    if (numbers.some((n, i) => i && n < numbers[i - 1])) throw new RangeError('Binary Search requires ascending order.');
    const state = { numbers: [...numbers], left: null, right: null, middle: null,
      target, probes: 0, comparisons: 0, excluded: [], found: null, result: null,
      done: false, condition: null, checked: false };
    const frames = [];
    function emit(kind, lines, title, explanation, equation = '', change = null) {
      frames.push({ kind, lines, title, explanation, equation, change, state: copy(state) });
    }
    emit('ready', [], message('A smaller search, every time.', 'كل خطوة بتصغّر مساحة البحث.'),
      message('The array is sorted. Find the target by keeping only the part that can contain it.', 'الأرقام مترتّبة. بندوّر على target، وكل مرة هنكمّل في الجزء اللي لسه ممكن يكون فيه.'));
    state.left = 0;
    emit('left', [2], message('Set the left boundary', 'نحدّد بداية البحث'), message('left starts at the first index.', 'left بيبدأ من أول مكان في الصف.'), 'left = 0');
    state.right = numbers.length - 1;
    emit('right', [3], message('Set the right boundary', 'نحدّد نهاية البحث'), message('right starts at the last index. An empty array has right = -1.', 'right بيبدأ من آخر مكان. لو الصف فاضي، هتكون قيمته سالب واحد.'), `right = ${state.right}`);
    while (true) {
      state.condition = state.left <= state.right;
      emit('bounds', [4], message(state.condition ? 'There is still a search interval' : 'The boundaries have crossed', state.condition ? 'لسه في جزء نقدر ندوّر فيه' : 'الحدود عدّت بعض'),
        message(state.condition ? 'Continue while left does not pass right.' : 'No candidates remain. The loop stops before another array access.', state.condition ? 'نكمّل طول ما left لسه معدّاش right.' : 'مفيش أماكن فاضلة. نوقف من غير ما نقرأ مكان برّه الصف.'), `${state.left} <= ${state.right}  →  ${state.condition}`);
      if (!state.condition) break;
      state.middle = Math.floor((state.left + state.right) / 2); state.probes++; state.checked = false;
      emit('middle', [5], message('Pick the middle', 'نختار النصّ'), message('Calculate the midpoint of the remaining interval, rounding down.', 'نحسب middle من حدود الجزء اللي فاضل، ونقرّب لتحت.'), `floor((${state.left} + ${state.right}) / 2) = ${state.middle}`);
      state.condition = numbers[state.middle] === target; state.comparisons++; state.checked = true;
      emit('equal', [6], message(state.condition ? 'The value matches' : 'Is this the target?', state.condition ? 'القيمة هي المطلوبة' : 'هل دي القيمة المطلوبة؟'),
        message(state.condition ? 'The equality test passes. The next line returns this index.' : 'The values differ. Check which half can still contain the target.', state.condition ? 'شرط المساواة اتحقّق. السطر الجاي بيرجّع المكان ده.' : 'القيم مختلفة. نحدّد أنهي جزء لسه ممكن يكون فيه المطلوب.'), `${numbers[state.middle]} == ${target}  →  ${state.condition}`);
      if (state.condition) {
        state.found = state.middle; state.result = state.middle; state.done = true;
        emit('found', [7], message(`Found at index ${state.middle}`, `لقيناه في المكان ${state.middle}`), message('Return the index, not the value. With duplicates, this returns a matching index, not necessarily the first.', 'بنرجّع المكان، مش القيمة. لو في قيم مكرّرة، ده مكان مطابق ومش شرط يكون أول واحد.'), `return ${state.middle}`);
        return frames;
      }
      state.condition = numbers[state.middle] < target; state.comparisons++;
      emit('less', [8], message(state.condition ? 'The target must be to the right' : 'The target must be to the left', state.condition ? 'المطلوب لازم يكون بعد النصّ' : 'المطلوب لازم يكون قبل النصّ'),
        message(state.condition ? 'This value and everything before it are too small.' : 'This value is too large. So is everything after it.', state.condition ? 'القيمة دي أصغر من المطلوب، وكل اللي قبلها أصغر كمان.' : 'القيمة دي أكبر من المطلوب، وكل اللي بعدها أكبر كمان.'), `${numbers[state.middle]} < ${target}  →  ${state.condition}`);
      if (state.condition) {
        const old = state.left; state.left = state.middle + 1;
        state.excluded = numbers.map((_, i) => i).filter(i => i < state.left || i > state.right);
        emit('move-left', [9], message('Keep the right-hand interval', 'نكمّل في الجزء اللي بعده'), message('Move left past middle. The discarded values stay visible, but cannot be the target.', 'نحرّك left بعد middle. الأرقام المستبعدة لسه ظاهرة، بس مش ممكن تكون المطلوبة.'), `left = ${state.middle} + 1 = ${state.left}`, { variable: 'left', from: old, to: state.left });
      } else {
        emit('else', [10], message('Take the other branch', 'نكمّل في الفرع التاني'), message('Equality and the less-than test are both false, so the middle value is greater than the target.', 'المساواة وشرط الأصغر طلعوا غلط، يبقى القيمة اللي في النصّ أكبر من المطلوب.'));
        const old = state.right; state.right = state.middle - 1;
        state.excluded = numbers.map((_, i) => i).filter(i => i < state.left || i > state.right);
        emit('move-right', [11], message('Keep the left-hand interval', 'نكمّل في الجزء اللي قبله'), message('Move right to the index before middle.', 'نرجّع right للمكان اللي قبل middle.'), `right = ${state.middle} - 1 = ${state.right}`, { variable: 'right', from: old, to: state.right });
      }
    }
    state.done = true; state.result = -1;
    emit('missing', [12], message('Target not found', 'القيمة مش موجودة'), message('The entire possible interval has been ruled out. Return NOT_FOUND.', 'استبعدنا كل الأماكن الممكنة. نرجّع NOT_FOUND.'), 'return NOT_FOUND');
    return frames;
  }
  function insertionSort(numbers) {
    validateNumbers(numbers);
    const state = { numbers: [...numbers], slots: numbers.map((_, i) => i), original: [...numbers],
      current: null, value: null, heldId: null, compareIndex: null, initialized: false,
      hole: null, sortedCount: Math.min(1, numbers.length), comparisons: 0, shifts: 0, done: false, condition: null };
    const frames = [];
    function emit(kind, lines, title, explanation, equation = '', change = null) {
      frames.push({ kind, lines, title, explanation, equation, change, state: copy(state) });
    }
    emit('ready', [], message('Build a sorted part.', 'نكبّر الجزء المترتّب.'), message('Keep the left part sorted. Save the next value, shift larger neighbors right, and insert it into the gap.', 'نخلّي الجزء اللي عالشمال مترتّب. نحفظ الكارت الجاي، ونحرّك الأكبر منه يمين، وندخّله في مكانه.'));
    for (let current = 1; ; current++) {
      state.current = current; state.initialized = false; state.condition = current < numbers.length;
      emit('current', [2], message(state.condition ? 'Choose the next card' : 'Every card has been processed', state.condition ? 'نختار الكارت الجاي' : 'كده خلّصنا كل الكروت'),
        message(state.condition ? 'The cards before current are already sorted relative to each other.' : 'There is no next card. The outer loop finishes.', state.condition ? 'الكروت اللي قبل current مترتّبة بالنسبة لبعض.' : 'مفيش كارت جديد. الحلقة الخارجية خلصت.'), `${current} < ${numbers.length}  →  ${state.condition}`);
      if (!state.condition) break;
      state.value = state.numbers[current]; state.heldId = state.slots[current]; state.slots[current] = null; state.hole = current;
      emit('save', [3], message('Save the value', 'نحتفظ بالقيمة'), message('Store the value before shifting. The faint number is still in memory; the outlined slot marks where a later write will happen.', 'نحفظ value قبل التحريك. الرقم الباهت لسه في الذاكرة؛ الخانة المعلّمة هي اللي هنكتب فيها بعدين.'), `value = numbers[${current}] = ${state.value}`);
      state.compareIndex = current - 1; state.initialized = true;
      emit('initialize', [4], message('Start with the previous card', 'نبدأ بالكارت اللي قبله'), message('compareIndex points to the neighbor immediately before current.', 'compareIndex بيشاور على المكان اللي قبل current مباشرة.'), `compareIndex = ${current} - 1 = ${state.compareIndex}`);
      while (true) {
        state.condition = state.compareIndex >= 0;
        emit('bounds', [5], message(state.condition ? 'Check the boundary first' : 'We reached the beginning', state.condition ? 'نتأكد من المكان الأول' : 'وصلنا لأول الصف'),
          message(state.condition ? 'The index is valid. Only now may we read and compare its value.' : 'The first condition is false. Skip the array read and insert at the beginning.', state.condition ? 'المكان لسه جوّه الصف. دلوقتي نقدر نقرأ قيمته ونقارن.' : 'أول شرط طلع غلط. مش هنقرأ برّه الصف، وهنحط القيمة في الأول.'), `${state.compareIndex} >= 0  →  ${state.condition}`);
        if (!state.condition) break;
        const index = state.compareIndex;
        state.condition = state.numbers[index] > state.value; state.comparisons++;
        emit('compare', [6], message(state.condition ? 'This neighbor is larger' : 'This is the stopping point', state.condition ? 'الكارت ده أكبر' : 'هنا نقف'),
          message(state.condition ? 'Shift the larger neighbor one place right.' : 'This neighbor is smaller or equal. Insert after it; equal values keep their relative order.', state.condition ? 'الكارت ده أكبر من value. هنحرّكه مكان لليمين.' : 'الكارت ده أصغر أو مساوي. نحط القيمة بعده، والقيم المتساوية تفضل بنفس ترتيبها.'), `${state.numbers[index]} > ${state.value}  →  ${state.condition}`);
        if (!state.condition) break;
        const movingId = state.slots[index];
        state.numbers[index + 1] = state.numbers[index]; state.slots[index + 1] = movingId;
        state.slots[index] = null; state.hole = index; state.shifts++;
        emit('shift', [7, 8], message('Shift right', 'نحرّك الكارت يمين'), message('Copy the larger value into the next slot. The insertion gap moves left.', 'ننقل القيمة الأكبر للمكان اللي بعدها. مكان الإدخال يتحرّك شمال.'), `numbers[${index + 1}] = numbers[${index}]`, { from: index, to: index + 1, id: movingId });
        state.compareIndex--;
        emit('retreat', [9], message('Move back one position', 'نرجع مكان لورا'), message('Decrement compareIndex, then check the boundary again before reading.', 'نقلّل compareIndex بواحد، ونتأكد من الحدود تاني قبل القراءة.'), `compareIndex = ${state.compareIndex}`);
      }
      const to = state.compareIndex + 1, id = state.heldId;
      state.numbers[to] = state.value; state.slots[to] = id; state.heldId = null; state.hole = null; state.sortedCount = current + 1;
      emit('insert', [10], message('Insert into the gap', 'نحط القيمة في مكانها'), message('Write the saved value after compareIndex. The sorted part has grown by one card.', 'نكتب value بعد compareIndex. كده الجزء المترتّب كبر كارت.'), `numbers[${to}] = value`, { from: 'held', to, id });
    }
    state.done = true;
    emit('done', [11], message('The array is sorted', 'كل الكروت اتّرتّبت'), message('Return the same array, now in ascending order.', 'بنرجّع نفس الصف بعد ما اترتّب من الصغير للكبير.'), 'return numbers');
    return frames;
  }
  function normalizeDigits(text) {
    return text.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776));
  }
  function parseNumbers(text, limit = 16) {
    text = normalizeDigits(text.trim());
    if (!text) return [];
    const tokens = text.split(/[,،\s]+/).filter(Boolean);
    if (tokens.length > limit) throw new RangeError('too-many');
    if (tokens.some(t => !/^[+-]?\d+$/.test(t) || Math.abs(Number(t)) > 999)) throw new RangeError('invalid-number');
    return tokens.map(Number);
  }
  function parseTarget(text) {
    const normalized = normalizeDigits(text.trim());
    if (!/^[+-]?\d+$/.test(normalized) || Math.abs(Number(normalized)) > 999) throw new RangeError('invalid-target');
    return Number(normalized);
  }
  const api = { binarySearch, insertionSort, binaryCode, insertionCode, parseNumbers, parseTarget };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlgorithmLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
