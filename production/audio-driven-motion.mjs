const canon=text=>text.replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();

// Semantic motion is scheduled from acoustic word spans. Interpolation inside
// a spoken span controls graphics only; it never changes audio or word times.
export function buildMotion(scene){
 const m={references:{}};
 const at=(name,term,edge='start',occurrence=0)=>{
  const matches=scene.words.filter(word=>canon(word.text).includes(canon(term)));
  const word=occurrence===-1?matches.at(-1):matches[occurrence];
  if(!word)throw new Error(`Missing spoken anchor ${scene.id}:${name} (${term})`);
  const time=word[edge]-scene.start;
  if(time<0||time>scene.duration)throw new Error(`Spoken anchor outside ${scene.id}: ${name}`);
  m.references[name]={word:word.text,edge,absoluteTime:word[edge]};m[name]=time;
  return time;
 };
 switch(scene.mode){
  case 'hero':at('scanStart','ونمشي');at('scanEnd','نلاقيه','end');break;
  case 'unfold':at('unfoldStart','بالترتيب');at('unfoldEnd','للكبير','end');break;
  case 'array':
   if(scene.id==='05-mechanism')at('selectMid','النص');
   else at('compare','أصغر');
   break;
  case 'discard':at('discard','نستبعد');break;
  case 'upper':at('selectMid','التمانية');at('compare','أكبر');at('discard','فنستبعد');break;
  case 'find':at('selectMid','الأربعة');at('compare','أصغر');at('discard','فنستبعد');at('remaining','فاضل');at('found','لقينا');break;
  case 'invariant':
   at('replayStart','بنكمل');at('replayEnd','الرقم','end');at('prerequisite','بشرط');
   m.replayStages=Array.from({length:4},(_,i)=>m.replayStart+i*(m.replayEnd-m.replayStart)/3);
   break;
  case 'code-setup':at('left','left');at('right','right');break;
  case 'code-mid':at('middle','middle');at('sum','نجمع');at('round','ونقرب');at('result','لتحت','end');break;
  case 'code-equality':at('else','غير');break;
  case 'code-lo':at('updateStart','نحرك');at('updateEnd','بخطوة','end');break;
  case 'code-hi':at('updateStart','نرجع');at('updateEnd','بخطوة','end');break;
  case 'code-return':
   at('updateStart','فنحرك');at('updateEnd','تاني','end');at('selectMid','لقينا');at('found','وسبعين','end');at('return','بنرجع');
   break;
  case 'missing':
   at('searchStart','التلاتة');at('nextProbe','مش');at('thirdProbe','الآخر');at('lastProbe','left');at('cross','right','end');at('return','نرجع');
   m.searchStages=[m.searchStart,m.nextProbe,m.thirdProbe,m.lastProbe,m.cross];
   break;
  case 'payoff':
   at('binaryStart','بأربع');at('binaryEnd','مقارنات','end');at('linearStart','بدل');at('linearEnd','حداشر','end');
   at('sortedStart','استغلينا');at('sortedEnd','الترتيب','end');
   at('closing','وديه');at('power','قوة');at('binaryName','Binary');at('searchName','Search');
   m.closingStages=[m.closing,m.power,m.binaryName,m.searchName];
   break;
 }
 for(const [a,b] of [['scanStart','scanEnd'],['unfoldStart','unfoldEnd'],['updateStart','updateEnd'],['binaryStart','binaryEnd'],['linearStart','linearEnd'],['sortedStart','sortedEnd']]){
  if(a in m&&!(m[a]<m[b]))throw new Error(`Invalid spoken motion span ${scene.id}:${a}–${b}`);
 }
 return m;
}

export const intervalStage=(time,stages)=>Math.max(-1,stages.findLastIndex(start=>time>=start));
