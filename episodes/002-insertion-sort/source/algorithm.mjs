import assert from 'node:assert/strict';

// The numeric array is the real copied memory state. Slots track the physical
// card model and its conceptual insertion gap; a gap is never an array delete.
export function traceInsertionSort(input) {
  const state = {numbers:[...input], slots:input.map((_,i)=>i), current:null,
    value:null, valueId:null, compareIndex:null, hole:null, sortedCount:Math.min(1,input.length),
    comparisons:0, shifts:0, condition:null, done:false};
  const initial = structuredClone(state), events=[];
  const emit=(kind,pass,mutate,extra={})=>{
    const before=structuredClone(state); mutate();
    events.push({kind,pass,before,after:structuredClone(state),...extra});
  };
  for(let current=1;current<input.length;current++) {
    emit('select',current,()=>{state.current=current;state.compareIndex=null;state.condition=null;});
    emit('save',current,()=>{
      state.value=state.numbers[current];state.valueId=state.slots[current];
      state.hole=current;state.slots[current]=null;
    });
    emit('init',current,()=>{state.compareIndex=current-1;});
    while(true) {
      if(state.compareIndex<0) {
        emit('bound',current,()=>{state.condition=false;},{arrayAccess:false});break;
      }
      const index=state.compareIndex;
      const comparison=state.numbers[index]>state.value;
      emit('compare',current,()=>{state.condition=comparison;state.comparisons++;},
        {left:state.numbers[index],right:state.value,result:comparison});
      if(!comparison)break;
      const movingId=state.slots[index];
      emit('shift',current,()=>{
        state.numbers[index+1]=state.numbers[index];
        state.slots[index+1]=state.slots[index];state.slots[index]=null;
        state.hole=index;state.shifts++;
      },{from:index,to:index+1,movingId,value:state.numbers[index]});
      emit('retreat',current,()=>{state.compareIndex--;state.condition=null;});
    }
    const to=state.compareIndex+1;
    emit('insert',current,()=>{
      state.numbers[to]=state.value;state.slots[to]=state.valueId;
      state.value=null;state.valueId=null;state.hole=null;state.sortedCount=current+1;
      state.condition=null;
    },{to,value:state.value,movingId:state.valueId});
    assert.deepEqual(state.numbers.slice(0,current+1),input.slice(0,current+1).sort((a,b)=>a-b));
  }
  emit('return',input.length,()=>{state.done=true;state.current=null;state.compareIndex=null;});
  return {input,initial,events,result:[...state.numbers],identityOrder:[...state.slots]};
}

export function verifyAlgorithm() {
  const inputs=[[],[5],[1,2,3,4,5],[7,6,5,3,2],[7,3,5,2,6],[2,2,1,2,1],[-4,3,0,-4]];
  const results=inputs.map(input=>{
    const t=traceInsertionSort(input);
    assert.deepEqual(t.result,[...input].sort((a,b)=>a-b));
    for(const e of t.events) {
      if(e.kind==='compare')assert.ok(e.before.compareIndex>=0&&e.before.compareIndex<input.length);
      if(e.kind==='bound')assert.equal(e.arrayAccess,false);
      const ids=e.after.slots.filter(x=>x!==null);
      if(e.after.valueId!==null)ids.push(e.after.valueId);
      assert.deepEqual(ids.sort((a,b)=>a-b),input.map((_,i)=>i));
      for(let i=0;i<e.after.slots.length;i++)if(e.after.slots[i]!==null)
        assert.equal(e.after.numbers[i],input[e.after.slots[i]]);
    }
    for(let i=1;i<t.result.length;i++)if(t.result[i]===t.result[i-1])
      assert.ok(t.identityOrder[i]>t.identityOrder[i-1], 'equal values preserve original order');
    return {input,output:t.result,passed:true};
  });
  return results;
}
