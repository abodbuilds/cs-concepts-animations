// Injected into the built page for browser QA only; excluded from the app build.
(async function () {
  if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  if(window.__appReady)await window.__appReady;
  if(window.__fontReady)await window.__fontReady;
  await document.fonts.ready;
  const $=id=>document.getElementById(id),results=[];
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const check=(name,fn)=>{fn();results.push(name);};
  const select=id=>document.querySelector(`.algorithm-option[data-algorithm="${id}"]`).click();
  const seek=value=>{$('timeline').value=value;$('timeline').dispatchEvent(new Event('input',{bubbles:true}));};
  // The checks below walk the full trace, so leave the default key-steps view first.
  $('detail').value='all';$('detail').dispatchEvent(new Event('change',{bubbles:true}));
  const apply=(array,target='71')=>{if($('input-editor').hidden)$('edit-input').click();$('array-input').value=array;$('target-input').value=target;$('input-editor').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));};
  try{
    select('binary-search');apply('1, 3, 5, 7, 9','7');
    check('Custom input and code/variable synchronization',()=>{
      assert(document.querySelectorAll('.number-card').length===5,'input did not apply');$('next').click();
      assert($('stage').dataset.step==='1','next failed');assert(document.querySelector('.code-line.active').dataset.line==='2','wrong active line');
      assert(document.querySelector('[data-variable="left"]').textContent==='0','left variable mismatch');
    });
    check('Backward step restores the initial state',()=>{$('previous').click();assert($('stage').dataset.step==='0','previous failed');assert(document.querySelectorAll('.code-line.active').length===0,'highlight not rewound');});
    check('Seek finds the target, and rewind removes completion',()=>{seek($('timeline').max);assert(document.querySelector('.number-card.found>span').textContent==='7','wrong search result');assert($('next').disabled,'next remains enabled at end');$('previous').click();assert(!document.querySelector('.number-card.found'),'rewind did not undo found state');});
    check('Unsorted input is rejected until explicitly sorted',()=>{apply('3,1,2','2');assert(!$('input-error').hidden,'unsorted input accepted');assert(!$('sort-apply').hidden,'sort action missing');$('sort-apply').click();assert($('input-editor').hidden,'sort did not apply');assert(document.querySelectorAll('.number-card').length===3,'sorted input missing');});
    check('Empty arrays finish without an invalid read',()=>{apply('','4');assert(!$('empty-state').hidden,'empty state missing');seek($('timeline').max);assert($('stage').dataset.kind==='missing','empty search did not finish');assert(document.querySelectorAll('.number-card').length===0,'phantom cards');});
    check('Malformed input keeps the previous valid trace',()=>{apply('2, nope','4');assert(!$('input-error').hidden,'invalid input accepted');assert($('array-input').getAttribute('aria-invalid')==='true','error not accessible');$('cancel-input').click();});
    select('insertion-sort');
    check('Insertion uses value and produces sorted output',()=>{assert($('target-field').hidden,'target visible in sort');assert($('code-lines').textContent.includes('value'),'value name missing');seek($('timeline').max);const values=[...document.querySelectorAll('.array-slot')].map(el=>Number(el.getAttribute('aria-label').split(': ')[1]));assert(JSON.stringify(values)==='[2,3,5,6,7]','sort output wrong');assert(document.querySelectorAll('.number-card.found').length===5,'completion styling wrong');});
    check('The negative boundary skips the array comparison',()=>{seek(0);let count=0;while(!document.querySelector('.code-line.skipped')&&count++<60)$('next').click();assert(document.querySelector('.code-line.skipped'),'no short-circuit frame');assert(document.querySelector('[data-variable="compareIndex"]').textContent==='-1','boundary variable wrong');$('next').click();assert($('stage').dataset.kind==='insert','invalid read after negative boundary');});
    check('Theory tabs preserve the current execution step',()=>{const before=$('stage').dataset.step;$('theory-tab').click();assert(!$('theory-panel').hidden&&$('explore-panel').hidden,'theory view missing');assert($('theory-panel').textContent.includes('O(n²)'),'complexity content missing');$('theory-play').click();assert($('stage').dataset.step===before,'theory reset the trace');});
    check('Both languages update layout and controls',()=>{if(document.documentElement.lang!=='en')$('language').click();assert(document.documentElement.dir==='ltr','English direction wrong');assert($('play-label').textContent==='Play','English label missing');$('language').click();assert(document.documentElement.dir==='rtl','Arabic direction wrong');});
    const nativeTimeout=window.setTimeout,nativeClear=window.clearTimeout,scheduled=new Map();let timerId=10000;
    try{
      window.setTimeout=(fn,ms)=>{const id=++timerId;scheduled.set(id,{fn,ms});return id;};window.clearTimeout=id=>scheduled.delete(id);
      seek(0);$('speed').value='4';$('speed').dispatchEvent(new Event('change'));$('play').click();
      assert($('play').getAttribute('aria-pressed')==='true','play did not start');
      let [id,job]=[...scheduled][0];assert(job.ms===275,'speed does not change the interval');scheduled.delete(id);job.fn();
      assert(Number($('stage').dataset.step)>=2,'autoplay did not advance');
      $('speed').value='2';$('speed').dispatchEvent(new Event('change'));assert([...scheduled.values()][0].ms===550,'speed change did not reschedule playback');
      $('play').click();assert(!scheduled.size,'pause left a running timer');assert($('play').getAttribute('aria-pressed')==='false','pause state wrong');
      results.push('Autoplay, speed, and pause');
    }finally{window.setTimeout=nativeTimeout;window.clearTimeout=nativeClear;}
    check('Arrow keys step outside form controls',()=>{seek(0);document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));assert($('stage').dataset.step==='1','keyboard next failed');document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));assert($('stage').dataset.step==='0','keyboard previous failed');});
    select('binary-search');apply('4,9,14,21,28,35,43,50,57,64,71,78,85,92,99','71');$('speed').value='1';
    check('Responsive page has no horizontal overflow',()=>{assert(document.documentElement.scrollWidth<=innerWidth+1,`page overflow: ${document.documentElement.scrollWidth} > ${innerWidth}`);});
    check('All card destinations are finite and inside the stage',()=>{const bounds=$('stage').getBoundingClientRect();for(const card of document.querySelectorAll('.number-card')){assert(!card.style.transform.includes('NaN'),'invalid card position');const r=card.getBoundingClientRect();assert(r.left>=bounds.left-1&&r.right<=bounds.right+1,'card outside stage');}});
    window.__labQAChecks={passed:results.length,checks:results,width:innerWidth};console.log('ALGORITHM_LAB_QA '+JSON.stringify({passed:results.length,expected:14,width:innerWidth}));
  }catch(error){window.__labQAChecks={passed:results.length,checks:results,error:error.message,width:innerWidth};console.error('ALGORITHM_LAB_QA '+JSON.stringify({passed:results.length,error:error.message,width:innerWidth}));}
})();
