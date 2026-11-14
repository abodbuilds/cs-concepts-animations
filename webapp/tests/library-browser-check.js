(async function(){
  if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  if(window.__appReady)await window.__appReady;
  if(window.__fontReady)await window.__fontReady;
  await document.fonts.ready;
  const $=id=>document.getElementById(id),results=[],failures=[];
  const click=id=>$(id).click();
  const check=(condition,message)=>{if(!condition)throw new Error(message);};
  const select=id=>{const el=$('algorithm-select');el.value=id;el.dispatchEvent(new Event('change',{bubbles:true}));};
  const seek=index=>{$('timeline').value=index;$('timeline').dispatchEvent(new Event('input',{bubbles:true}));};
  // The checks below walk the full trace, so leave the default key-steps view first.
  $('detail').value='all';$('detail').dispatchEvent(new Event('change',{bubbles:true}));
  const language=lang=>{if(document.documentElement.lang.startsWith(lang))return;click('language');};
  language('en');
  check($('algorithm-select').options.length===Object.keys(window.AlgorithmLessons).length+2,'every lesson in navigation');
  for(const lesson of Object.values(window.AlgorithmLessons).sort((a,b)=>a.number.localeCompare(b.number))){
    try{
      select(lesson.id);check($('lesson-title').textContent.includes(lesson.name),'correct title');
      check(document.querySelectorAll('.code-line').length===lesson.code.length,'pseudocode length');
      check($('stage').dataset.kind==='ready','ready frame');
      for(const preset of lesson.presets){
        click('edit-input');
        for(const field of lesson.fields){const el=$('field-'+field.name);check(el,'field '+field.name);el.value=preset.input[field.name]??'';}
        $('input-editor').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
        check($('input-error').hidden,'valid preset '+preset.id+': '+$('input-error').textContent);
        const frames=lesson.build(lesson.parse({...preset.input}));check(Number($('timeline').max)===frames.length-1,'trace length '+preset.id);
        const midpoint=Math.floor((frames.length-1)/2);seek(midpoint);
        check($('stage').dataset.kind===frames[midpoint].kind,'midpoint kind');
        const highlighted=[...document.querySelectorAll('.code-line.active')].map(el=>Number(el.dataset.line));
        check(JSON.stringify(highlighted)===JSON.stringify([...frames[midpoint].lines].sort((a,b)=>a-b)),'highlighted statements');
        check($('step-title').textContent===frames[midpoint].title.en,'step narration');
        const active=document.querySelector('.code-line.active');if(active){const line=active.getBoundingClientRect(),viewport=$('code-scroll').getBoundingClientRect();check(line.top>=viewport.top-1&&line.bottom<=viewport.bottom+1,'active line stays in code viewport');}
        click('theory-tab');check(!$('theory-panel').hidden&&$('theory-panel').textContent.includes(lesson.theory.title.en),'theory');
        click('explore-tab');check(Number($('timeline').value)===midpoint,'theory preserves playback');
        seek(frames.length-1);check($('stage').dataset.done==='true','completed state');
        check($('next').disabled,'next disabled at end');check($('play-label').textContent==='Replay','replay available');
        const endScene=frames.at(-1).scene;const view=lesson.view||{},onGraph=new Set([...(view.hideRows||[]),view.nodeBadge,view.treeRow]);const cells=(endScene.rows||[]).filter(row=>!onGraph.has(row.id)).filter(row=>!endScene.graph||row.cells.some(cell=>cell.value!==null&&cell.value!==undefined&&cell.value!=='—')).reduce((sum,row)=>sum+row.cells.length,0);
        check(document.querySelectorAll('#lesson-scene .scene-cell').length===cells,'complete scene cells');
        click('previous');check(Number($('timeline').value)===frames.length-2,'previous step');
        language('ar');check(document.documentElement.dir==='rtl','Arabic direction');check($('step-title').textContent===frames[frames.length-2].title.ar,'Arabic explanation');language('en');
        check(document.documentElement.scrollWidth<=window.innerWidth+1,'no page overflow');
        results.push(lesson.id+':'+preset.id);
      }
      // A two-frame trace (ready, done) finishes on the first tick, so only longer traces stay playing.
      click('reset');click('play');if(Number($('timeline').max)>1){check($('play').getAttribute('aria-pressed')==='true','autoplay starts');click('play');}check($('play').getAttribute('aria-pressed')==='false','pause');
      click('new-example');check($('stage').dataset.kind==='ready','new example resets');
    }catch(error){failures.push({lesson:lesson.id,message:error.message});console.error('LIBRARY_QA_FAILURE '+lesson.id+': '+error.message);}
  }
  select('binary-search');check($('lesson-title').textContent.includes('Binary Search'),'legacy navigation');check(!document.querySelector('.target-capsule').classList.contains('legacy-scene-hidden'),'legacy stage restored');
  select('insertion-sort');check(!$('stage').classList.contains('extended-stage'),'legacy sort stage restored');
  select('bfs');language('ar');
  window.__libraryQA={passedPresets:results.length,failures,width:innerWidth,lessons:Object.keys(window.AlgorithmLessons).length};
  console.log('LIBRARY_QA '+JSON.stringify(window.__libraryQA));
})();
