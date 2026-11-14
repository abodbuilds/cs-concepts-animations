const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../algorithms.js');

test('Binary Search matches linear membership across targets and edge cases',()=>{
  for(const numbers of [[],[4],[-8,-1,0,4,9],[2,2,2,2],[1,3,5,7,9,12]]){
    const unchanged=[...numbers];
    for(let target=-10;target<=15;target++){
      const frames=A.binarySearch(numbers,target),result=frames.at(-1).state.result;
      if(numbers.includes(target))assert.equal(numbers[result],target);else assert.equal(result,-1);
      assert.ok(frames.at(-1).state.done);
      for(const f of frames.filter(f=>f.kind==='middle')){
        assert.ok(f.state.middle>=f.state.left&&f.state.middle<=f.state.right);
        assert.ok(f.state.middle>=0&&f.state.middle<numbers.length);
      }
      assert.equal(frames[0].state.left,null,'later steps must not mutate earlier snapshots');
    }
    assert.deepEqual(numbers,unchanged);
  }
});
test('The episode search takes four probes and returns index ten',()=>{
  const values=[4,9,14,21,28,35,43,50,57,64,71,78,85,92,99];
  const found=A.binarySearch(values,71).at(-1);
  assert.equal(found.state.result,10);assert.equal(found.state.probes,4);
  assert.equal(found.state.comparisons,7);assert.deepEqual(found.lines,[7]);
  const missing=A.binarySearch(values,73).at(-1);
  assert.equal(missing.state.result,-1);assert.deepEqual(missing.lines,[12]);
  assert.ok(missing.state.left>missing.state.right);
  assert.throws(()=>A.binarySearch([3,1,2],2),RangeError);
});
test('Insertion Sort preserves cards, sorts stably, and shifts exactly the inversions',()=>{
  let seed=12;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return (seed%21)-10;};
  const inputs=[[],[2],[1,2,3,4],[7,6,5,3,2],[7,3,5,2,6],[3,2,3,1,2]];
  for(let i=0;i<35;i++)inputs.push(Array.from({length:i%17},random));
  for(const input of inputs){
    const original=[...input],frames=A.insertionSort(input),end=frames.at(-1).state;
    assert.deepEqual(end.numbers,[...input].sort((a,b)=>a-b));assert.deepEqual(input,original);
    let inversions=0;for(let i=0;i<input.length;i++)for(let j=i+1;j<input.length;j++)if(input[i]>input[j])inversions++;
    assert.equal(end.shifts,inversions);
    for(let i=1;i<end.numbers.length;i++)if(end.numbers[i]===end.numbers[i-1])assert.ok(end.slots[i]>end.slots[i-1]);
    for(const [i,f] of frames.entries()){
      const s=f.state,ids=s.slots.filter(id=>id!==null);if(s.heldId!==null)ids.push(s.heldId);
      assert.deepEqual(ids.sort((a,b)=>a-b),input.map((_,j)=>j),'card identity is conserved, including the saved value');
      for(let j=0;j<s.slots.length;j++)if(s.slots[j]!==null)assert.equal(s.numbers[j],input[s.slots[j]]);
      if(f.kind==='compare'){assert.ok(s.compareIndex>=0);assert.equal(s.condition,s.numbers[s.compareIndex]>s.value);}
      if(f.kind==='bounds'&&!s.condition)assert.equal(frames[i+1].kind,'insert','negative index short-circuits without reading');
      if(f.kind==='insert')assert.deepEqual(s.numbers.slice(0,s.sortedCount),input.slice(0,s.sortedCount).sort((a,b)=>a-b));
    }
    assert.deepEqual(frames[0].state.numbers,input,'rewind snapshots remain unchanged');
  }
});
test('Each highlighted line belongs to the operation being performed',()=>{
  const binary=A.binarySearch([1,3,5,7],7),insertion=A.insertionSort([7,3,5,2,6]);
  for(const [trace,length] of [[binary,A.binaryCode.length],[insertion,A.insertionCode.length]])
    for(const f of trace)assert.ok(f.lines.every(line=>line>=1&&line<=length));
  for(const f of insertion.filter(f=>f.kind==='save'))assert.deepEqual(f.lines,[3]);
  for(const f of insertion.filter(f=>f.kind==='shift'))assert.deepEqual(f.lines,[7,8]);
  for(const f of insertion.filter(f=>f.kind==='insert'))assert.deepEqual(f.lines,[10]);
  assert.equal(insertion.at(-1).state.comparisons,8);assert.equal(insertion.at(-1).state.shifts,6);
});
test('Input parsing handles Arabic digits, empty arrays, and invalid input',()=>{
  assert.deepEqual(A.parseNumbers('٧، ٣، ۵، -٢'),[7,3,5,-2]);
  assert.deepEqual(A.parseNumbers(''),[]);assert.equal(A.parseTarget('٧١'),71);
  for(const input of ['1,cat,2','1.5,2','Infinity','1000','-1000','<script>'])assert.throws(()=>A.parseNumbers(input));
  assert.throws(()=>A.parseNumbers(Array(17).fill(1).join(',')));
  for(const input of ['', '2 3','12.5','NaN'])assert.throws(()=>A.parseTarget(input));
});
