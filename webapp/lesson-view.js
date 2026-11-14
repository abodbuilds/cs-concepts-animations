(function(root){
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=(value,lang)=>value&&typeof value==='object'?(value[lang]??value.en??''):String(value??'');
  const tone=value=>['active','sorted','muted','pivot','found'].includes(value)?value:'default';
  const display=value=>value===null||value===undefined?'—':Array.isArray(value)?value.join(', '):typeof value==='object'?JSON.stringify(value):String(value);
  let active=false,sceneRoot=null,lastLesson=null;
  const rowCache=new Map(),cellCache=new Map();
  function setActive(stage,next){
    if(!sceneRoot){sceneRoot=document.createElement('div');sceneRoot.id='lesson-scene';sceneRoot.dir='ltr';stage.append(sceneRoot);}
    active=next;stage.classList.toggle('extended-stage',next);sceneRoot.hidden=!next;
    [...stage.children].forEach(child=>{if(child!==sceneRoot)child.classList.toggle('legacy-scene-hidden',next);});
    if(next)stage.style.height='auto';
  }
  function renderScene(stage,scene,lang,lessonId){
    setActive(stage,true);
    if(lastLesson!==lessonId){sceneRoot.replaceChildren();rowCache.clear();cellCache.clear();lastLesson=lessonId;}
    const oldPositions=new Map();
    cellCache.forEach((el,key)=>{if(el.isConnected)oldPositions.set(key,el.getBoundingClientRect());});
    const seenRows=new Set(),seenCells=new Set();
    function part(id,className){let el=rowCache.get(id);if(!el){el=document.createElement('div');rowCache.set(id,el);}el.className=className;sceneRoot.append(el);seenRows.add(id);return el;}
    if(scene.graph){
      const graph=scene.graph,nodes=graph.nodes||[],edges=graph.edges||[],positions=new Map();
      const n=nodes.length,centerX=220,centerY=180,radius=n>5?135:120;
      nodes.forEach((node,i)=>{const angle=-Math.PI/2+i*2*Math.PI/Math.max(1,n);positions.set(String(node.id),{x:n===1?centerX:centerX+radius*Math.cos(angle),y:n===1?centerY:centerY+radius*Math.sin(angle)});});
      const graphPart=part('graph','lesson-graph');
      if(!nodes.length)graphPart.innerHTML=`<div class="scene-empty">${lang==='ar'?'الجراف فاضي':'An empty graph'}</div>`;
      else graphPart.innerHTML=`<svg viewBox="0 0 440 370" role="img" aria-label="${lang==='ar'?'حالة الجراف الحالية':'Current graph state'}"><defs><marker id="edge-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="currentColor" stroke="none"/></marker></defs>${edges.map(edge=>{
        const a=positions.get(String(edge.from)),b=positions.get(String(edge.to));if(!a||!b)return '';
        const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,sx=a.x+dx/len*26,sy=a.y+dy/len*26,ex=b.x-dx/len*29,ey=b.y-dy/len*29;
        const w=edge.weight===undefined?'':`<g class="edge-weight"><rect x="${(a.x+b.x)/2-15}" y="${(a.y+b.y)/2-12}" width="30" height="24" rx="7"/><text x="${(a.x+b.x)/2}" y="${(a.y+b.y)/2+4}">${escape(edge.weight)}</text></g>`;
        return `<g class="graph-edge tone-${tone(edge.tone)}"><path d="M${sx} ${sy}L${ex} ${ey}"${edge.directed?' marker-end="url(#edge-arrow)"':''}/>${w}</g>`;
      }).join('')}${nodes.map(node=>{const p=positions.get(String(node.id));return `<g class="graph-node tone-${tone(node.tone)}" transform="translate(${p.x},${p.y})" data-node="${escape(node.id)}"><circle r="24"/><text y="5" class="node-label">${escape(node.label??node.id)}</text>${node.detail!==undefined?`<text y="44" class="node-detail">${escape(text(node.detail,lang))}</text>`:''}</g>`;}).join('')}</svg>`;
    }
    for(const row of scene.rows||[]){
      const rowKey='row:'+row.id,el=part(rowKey,'scene-row'+(row.layout==='aligned'?' aligned-row':''));
      let heading=el.querySelector('.scene-row-label'),container=el.querySelector('.scene-row-cells');
      if(!heading){heading=document.createElement('div');heading.className='scene-row-label';container=document.createElement('div');container.className='scene-row-cells';container.setAttribute('role','list');el.append(heading,container);}
      heading.textContent=text(row.label,lang);heading.dir=lang==='ar'?'rtl':'ltr';
      const cells=row.cells||[];el.classList.toggle('row-empty',cells.length===0);
      for(const cell of cells){
        const key=rowKey+':'+cell.id;let card=cellCache.get(key);
        if(!card){card=document.createElement('div');cellCache.set(key,card);card.innerHTML='<span class="scene-cell-value"></span><span class="scene-cell-index"></span><span class="scene-cell-marker"></span>';card.setAttribute('role','listitem');card.dataset.cell=cell.id;}
        seenCells.add(key);container.append(card);card.className='scene-cell tone-'+tone(cell.tone);
        card.querySelector('.scene-cell-value').textContent=display(cell.value);
        card.querySelector('.scene-cell-index').textContent=cell.index===undefined?'':display(cell.index);
        card.querySelector('.scene-cell-marker').textContent=cell.marker??'';
        card.setAttribute('aria-label',[cell.index===undefined?'':`index ${cell.index}`,display(cell.value),cell.marker||''].filter(Boolean).join(': '));
      }
      let empty=el.querySelector('.scene-empty');if(!empty){empty=document.createElement('div');empty.className='scene-empty';el.append(empty);}empty.hidden=cells.length>0;empty.textContent=lang==='ar'?'فاضي · [ ]':'Empty · [ ]';
    }
    if(scene.collections?.length){const el=part('collections','scene-collections');el.innerHTML=scene.collections.map(collection=>`<div class="scene-collection"><span dir="${lang==='ar'?'rtl':'ltr'}">${escape(text(collection.label,lang))}</span><div class="collection-values">${collection.values?.length?collection.values.map(v=>`<span>${escape(display(v))}</span>`).join(''):'<i>∅</i>'}</div></div>`).join('');}
    if(scene.note){const el=part('note','scene-note');el.dir=lang==='ar'?'rtl':'ltr';el.textContent=text(scene.note,lang);}
    for(const [key,el] of rowCache)if(!seenRows.has(key)){el.remove();rowCache.delete(key);}
    for(const [key,el] of cellCache)if(!seenCells.has(key)){el.remove();cellCache.delete(key);}
    const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--move-time'))||0;
    if(!reduced&&duration>0)for(const [key,el] of cellCache){const old=oldPositions.get(key);if(!old||!el.animate)continue;const now=el.getBoundingClientRect(),dx=old.left-now.left,dy=old.top-now.top;if(Math.abs(dx)+Math.abs(dy)>1){el.getAnimations().forEach(a=>a.cancel());el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration,easing:'cubic-bezier(.25,.85,.25,1)'});}}
  }
  function renderTheory(panel,lesson,lang,onExplore){
    const c=lesson.theory,tr=v=>escape(text(v,lang));
    panel.innerHTML=`<div class="theory-intro extension-theory"><div><span class="eyebrow">${escape(lesson.label)}</span><h2>${tr(c.title)}</h2><p>${tr(c.intro)}</p></div><div class="theory-invariant"><span>${lang==='ar'?'الفكرة اللي بنحافظ عليها':'THE INVARIANT'}</span><p>${tr(c.invariant)}</p></div></div><div class="theory-steps">${c.steps.map((step,i)=>`<article class="theory-step"><span class="step-number">${String(i+1).padStart(2,'0')}</span><h3>${tr(step.title)}</h3><p>${tr(step.body)}</p></article>`).join('')}</div><div class="theory-bottom"><article class="theory-card"><h3>${lang==='ar'?'تكلفة الخوارزمية':'Algorithm cost'}</h3>${c.costs.map(cost=>`<div class="complexity-row"><span>${tr(cost.label)}</span><code>${escape(cost.value)}</code></div>`).join('')}</article><article class="theory-card"><h3>${lang==='ar'?'خلي بالك':'Keep in mind'}</h3><ul>${c.notes.map(note=>`<li>${tr(note)}</li>`).join('')}</ul></article></div><div class="theory-cta"><p>${lang==='ar'?'غيّر المدخلات، وامشي مع كل خطوة.':'Change the input, then follow every operation.'}</p><button class="primary-button" id="theory-play">${lang==='ar'?'جرّب الفكرة':'Back to the lab'} ↗</button></div>`;
    panel.querySelector('#theory-play').addEventListener('click',onExplore);
  }
  root.LessonView={setActive,renderScene,renderTheory,escape,text,display};
})(globalThis);
