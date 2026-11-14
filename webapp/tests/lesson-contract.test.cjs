const test=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
// Every module in lessons/ must honour the contract, so new lessons are checked without editing this file.
const ids=fs.readdirSync(path.join(__dirname,'..','lessons')).filter(name=>name.endsWith('.js')).map(name=>name.slice(0,-3)).sort();
function bilingual(value,where){assert.ok(value&&typeof value.en==='string'&&value.en.length&&typeof value.ar==='string'&&value.ar.length,where+' must have English and Arabic text');}
for(const id of ids)test(id+' follows the shared lesson contract for every preset',()=>{
 const lesson=require(path.join('..','lessons',id+'.js'));
 assert.equal(lesson.id,id);assert.equal(globalThis.AlgorithmLessons[id],lesson);
 assert.ok(lesson.fields.length);assert.ok(lesson.code.length);assert.ok(lesson.presets.length>=2);
 bilingual(lesson.description,'description');bilingual(lesson.note,'note');
 ['title','intro','invariant'].forEach(key=>bilingual(lesson.theory[key],'theory '+key));
 for(const step of lesson.theory.steps){bilingual(step.title,'step title');bilingual(step.body,'step body');}
 lesson.theory.notes.forEach(note=>bilingual(note,'theory note'));
 lesson.theory.costs.forEach(cost=>{bilingual(cost.label,'cost label');assert.equal(typeof cost.value,'string');});
 if(lesson.theme==='data-structures')assert.ok(lesson.theory.whenToUse,'data structures say when to use them');
 if(lesson.theory.whenToUse)for(const key of ['use','avoid']){assert.ok(lesson.theory.whenToUse[key].length>=2,'whenToUse.'+key);lesson.theory.whenToUse[key].forEach(item=>bilingual(item,'whenToUse '+key));}
 for(const preset of [{id:'defaults',input:lesson.defaults},...lesson.presets]){
  const input=lesson.parse({...preset.input}),before=structuredClone(input);
  bilingual(lesson.summary(input),'summary');
  const frames=lesson.build(input);assert.deepEqual(input,before,'input not mutated');
  assert.ok(frames.length>1&&frames.length<20000,preset.id+' bounded trace');assert.equal(frames[0].kind,'ready');assert.equal(frames.at(-1).state.done,true);
  for(const [i,frame] of frames.entries()){
   bilingual(frame.title,'frame title');bilingual(frame.explanation,'frame explanation');assert.ok(Array.isArray(frame.lines));
   assert.ok(frame.lines.every(line=>Number.isInteger(line)&&line>=1&&line<=lesson.code.length),preset.id+' line bounds at '+i);
   assert.equal(typeof frame.state.done,'boolean');assert.ok(Array.isArray(frame.variables));assert.ok(Array.isArray(frame.metrics));
   for(const variable of frame.variables){assert.equal(typeof variable.name,'string');assert.ok(Object.hasOwn(variable,'value'));}
   for(const metric of frame.metrics){bilingual(metric.label,'metric label');assert.ok(Object.hasOwn(metric,'value'));}
   assert.ok(frame.scene&&typeof frame.scene==='object');
   for(const row of frame.scene.rows||[]){
    assert.ok(row.id!==undefined);bilingual(row.label,'row label');assert.ok(Array.isArray(row.cells));
    assert.equal(new Set(row.cells.map(cell=>String(cell.id))).size,row.cells.length,'unique cell identities within row');
    for(const cell of row.cells){assert.ok(Object.hasOwn(cell,'id'));assert.ok(Object.hasOwn(cell,'value'));assert.ok(!cell.tone||['default','active','sorted','muted','pivot','found'].includes(cell.tone));}
   }
   if(frame.scene.graph){const graph=frame.scene.graph,nodeIds=new Set(graph.nodes.map(node=>node.id));assert.equal(nodeIds.size,graph.nodes.length);assert.ok(graph.nodes.length<=8);assert.ok(graph.edges.length<=20);for(const edge of graph.edges){assert.ok(nodeIds.has(edge.from)&&nodeIds.has(edge.to),'edges refer to displayed nodes');}}
   for(const collection of frame.scene.collections||[]){bilingual(collection.label,'collection label');assert.ok(Array.isArray(collection.values));}
   if(frame.scene.note)bilingual(frame.scene.note,'scene note');
  }
 }
});
test('every lesson module is included in the production build',()=>{
 const build=fs.readFileSync(path.join(__dirname,'..','build.mjs'),'utf8');assert.match(build,/lessonScripts/);assert.match(build,/readdir/);
 assert.ok(ids.length>=8);
});
test('lessons use known themes and unique numbers',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),numbers=new Set(['01','03']);
 for(const id of ids){const lesson=require(path.join('..','lessons',id+'.js'));assert.match(app,new RegExp(`id:'${lesson.theme||'algorithms'}'`),id+' theme registered');assert.ok(!numbers.has(lesson.number),id+' number is unique');numbers.add(lesson.number);}
});
