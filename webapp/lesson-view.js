(function(root){
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const text=(value,lang)=>value&&typeof value==='object'?(value[lang]??value.en??''):String(value??'');
  const shortLabel=(value,lang)=>text(value,lang).split(' · ')[0];
  const rowLabels={
    'bfs-current':{en:'Current',ar:'الـ current'},
    'bfs-distance':{en:'Distances',ar:'الـ distances'},
    'distances':{en:'Distances',ar:'الـ distances'},
    'predecessors':{en:'Predecessors',ar:'الـ predecessors'},
  };
  const tone=value=>['active','sorted','muted','pivot','found'].includes(value)?value:'default';
  const display=value=>value===null||value===undefined?'—':Array.isArray(value)?value.join(', '):typeof value==='object'?JSON.stringify(value):String(value);
  let active=false,sceneRoot=null,lastLesson=null;
  // Order the nodes around the circle so that as few edges as possible cross. The first node stays
  // on top, ties keep the given order, and the result is cached because a trace never changes its graph.
  const orderCache=new Map();
  function circleOrder(nodes,edges){
    const ids=nodes.map(node=>String(node.id)),n=ids.length;
    if(n<4||n>8)return ids;
    const key=ids.join(',')+'|'+edges.map(edge=>edge.from+'>'+edge.to).join(',');
    if(orderCache.has(key))return orderCache.get(key);
    const at=new Map(ids.map((id,i)=>[id,i])),seen=new Set(),pairs=[];
    for(const edge of edges){
      const a=at.get(String(edge.from)),b=at.get(String(edge.to));if(a===undefined||b===undefined||a===b)continue;
      const code=Math.min(a,b)*8+Math.max(a,b);if(!seen.has(code)){seen.add(code);pairs.push([a,b]);}
    }
    const order=ids.map((_,i)=>i),slot=new Array(n),used=new Array(n).fill(false);let best=order.slice(),bestScore=Infinity;used[0]=true;
    const score=()=>{
      for(let i=0;i<n;i++)slot[order[i]]=i;
      let crossings=0,span=0;
      for(let i=0;i<pairs.length;i++){
        const lo=Math.min(slot[pairs[i][0]],slot[pairs[i][1]]),hi=Math.max(slot[pairs[i][0]],slot[pairs[i][1]]);span+=Math.min(hi-lo,n-hi+lo);
        for(let j=i+1;j<pairs.length;j++){const c=slot[pairs[j][0]],d=slot[pairs[j][1]];if((c>lo&&c<hi)!==(d>lo&&d<hi)&&c!==lo&&c!==hi&&d!==lo&&d!==hi)crossings++;}
      }
      return crossings*1000+span;
    };
    (function place(position){
      if(position===n){const value=score();if(value<bestScore){bestScore=value;best=order.slice();}return;}
      for(let i=1;i<n;i++)if(!used[i]){used[i]=true;order[position]=i;place(position+1);used[i]=false;}
    })(1);
    const result=best.map(i=>ids[i]);orderCache.set(key,result);return result;
  }
  const rowCache=new Map(),cellCache=new Map();
  function setActive(stage,next){
    if(!sceneRoot){sceneRoot=document.createElement('div');sceneRoot.id='lesson-scene';sceneRoot.dir='ltr';stage.append(sceneRoot);}
    active=next;stage.classList.toggle('extended-stage',next);sceneRoot.hidden=!next;
    [...stage.children].forEach(child=>{if(child!==sceneRoot)child.classList.toggle('legacy-scene-hidden',next);});
    if(next)stage.style.height='auto';
  }
  function renderScene(stage,scene,lang,lessonId,kind,view={}){
    setActive(stage,true);sceneRoot.classList.toggle('graph-scene',!!scene.graph);sceneRoot.dataset.lesson=lessonId;
    const rowById=id=>(scene.rows||[]).find(row=>row.id===id),hiddenRows=new Set([...(view.hideRows||[]),view.nodeBadge,view.treeRow].filter(Boolean));
    sceneRoot.style.setProperty('--aligned-cell-count',Math.max(0,...(scene.rows||[]).filter(row=>row.layout==='aligned').map(row=>row.cells.length)));
    if(lastLesson!==lessonId){sceneRoot.replaceChildren();rowCache.clear();cellCache.clear();lastLesson=lessonId;}
    const oldPositions=new Map();
    cellCache.forEach((el,key)=>{if(el.isConnected)oldPositions.set(key,el.getBoundingClientRect());});
    const seenRows=new Set(),seenCells=new Set();
    function part(id,className){let el=rowCache.get(id);if(!el){el=document.createElement('div');rowCache.set(id,el);}el.className=className;sceneRoot.append(el);seenRows.add(id);return el;}
    if(scene.graph){
      const graph=scene.graph,nodes=graph.nodes||[],edges=graph.edges||[],positions=new Map();
      const n=nodes.length,centerX=220,centerY=168,radius=n>5?124:n>2?108:70;
      circleOrder(nodes,edges).forEach((id,i)=>{const angle=-Math.PI/2+i*2*Math.PI/Math.max(1,n);positions.set(id,{x:n===1?centerX:centerX+radius*Math.cos(angle),y:n===1?centerY:centerY+radius*Math.sin(angle)});});
      // Lessons can move per-node tables onto the picture: a badge beside each node and the
      // "came from" links drawn as tree edges, instead of separate rows the student has to cross-reference.
      const cellsByNode=id=>new Map((rowById(id)?.cells||[]).map(cell=>[String(cell.marker),cell.value]));
      const badges=view.nodeBadge?cellsByNode(view.nodeBadge):new Map(),parents=view.treeRow?cellsByNode(view.treeRow):new Map();
      const roles=new Map((view.legend||[]).filter(item=>item.tone).map(item=>[item.tone,item.role]));
      const graphPart=part('graph','lesson-graph');
      if(!nodes.length)graphPart.innerHTML=`<div class="scene-empty">${lang==='ar'?'الـ graph فاضي':'An empty graph'}</div>`;
      else graphPart.innerHTML=`<svg viewBox="0 0 440 336" role="img" aria-label="${lang==='ar'?'الـ graph دلوقتي':'Current graph state'}"><defs><marker id="edge-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="context-stroke" stroke="none"/></marker></defs>${edges.map(edge=>{
        const a=positions.get(String(edge.from)),b=positions.get(String(edge.to));if(!a||!b)return '';
        const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,sx=a.x+dx/len*24,sy=a.y+dy/len*24,ex=b.x-dx/len*27,ey=b.y-dy/len*27;
        const loop=String(edge.from)===String(edge.to),reciprocal=edge.directed&&edges.some(other=>other!==edge&&other.from===edge.to&&other.to===edge.from);
        const qx=(a.x+b.x)/2-dy/len*32,qy=(a.y+b.y)/2+dx/len*32;
        const path=loop?`M${a.x-16} ${a.y-15}C${a.x-48} ${a.y-50} ${a.x+48} ${a.y-50} ${a.x+16} ${a.y-15}`:reciprocal?`M${sx} ${sy}Q${qx} ${qy} ${ex} ${ey}`:`M${sx} ${sy}L${ex} ${ey}`;
        // Weights sit nearer the edge's source so labels of edges that meet mid-graph stay apart.
        const wx=loop?a.x+38:reciprocal?(a.x+b.x)/4+qx/2:a.x+dx*.4,wy=loop?a.y-28:reciprocal?(a.y+b.y)/4+qy/2:a.y+dy*.4;
        const w=edge.weight===undefined?'':`<g class="edge-weight"><rect x="${wx-13}" y="${wy-11}" width="26" height="22" rx="7"/><text x="${wx}" y="${wy+4}">${escape(edge.weight)}</text></g>`;
        const tree=tone(edge.tone)==='default'&&parents.get(String(edge.to))===String(edge.from);
        return `<g class="graph-edge tone-${tone(edge.tone)}${tree?' edge-tree':''}"><path d="${path}"${edge.directed?' marker-end="url(#edge-arrow)"':''}/>${w}</g>`;
      }).join('')}${nodes.map(node=>{
        const p=positions.get(String(node.id)),role=roles.get(tone(node.tone)),badge=badges.get(String(node.id));
        const ox=n===1?0:(p.x-centerX)/radius,oy=n===1?-1:(p.y-centerY)/radius;
        const badgeMark=badge===undefined||badge===null?'':`<g class="node-badge${badge==='—'||badge==='∞'?' unset':''}" transform="translate(${ox*39},${oy*39})"><rect x="-13" y="-10" width="26" height="20" rx="10"/><text y="4">${escape(display(badge))}</text></g>`;
        return `<g class="graph-node tone-${tone(node.tone)}${role?' role-'+escape(role):''}" transform="translate(${p.x},${p.y})" data-node="${escape(node.id)}"><circle r="22"/><text y="5" class="node-label">${escape(node.label??node.id)}</text>${badgeMark}${node.detail!==undefined?`<title>${escape(text(node.detail,lang))}</title>`:''}</g>`;
      }).join('')}</svg>`;
      const legend=(view.legend||[]).filter(item=>item.label);
      if(nodes.length&&legend.length)graphPart.insertAdjacentHTML('beforeend',`<div class="graph-legend" dir="${lang==='ar'?'rtl':'ltr'}">${legend.map(item=>`<span><i class="${item.badge?'legend-badge':'legend-node role-'+escape(item.role)}"></i>${escape(text(item.label,lang))}</span>`).join('')}</div>`);
    }
    for(const row of scene.rows||[]){
      const meaningful=row.cells?.some(cell=>cell.value!==null&&cell.value!==undefined&&cell.value!=='—');
      const emptyQueueOrStack=['bfs-queue','dfs-stack'].includes(row.id)&&kind!=='ready'&&!row.cells?.length;
      if(hiddenRows.has(row.id)||(scene.graph&&!meaningful&&!emptyQueueOrStack))continue;
      const rowKey='row:'+row.id,el=part(rowKey,'scene-row'+(row.layout==='aligned'?' aligned-row':''));
      let heading=el.querySelector('.scene-row-label'),container=el.querySelector('.scene-row-cells');
      if(!heading){heading=document.createElement('div');heading.className='scene-row-label';container=document.createElement('div');container.className='scene-row-cells';container.setAttribute('role','list');el.append(heading,container);el.addEventListener('scroll',()=>{if(el.classList.contains('aligned-row'))sceneRoot.querySelectorAll('.aligned-row').forEach(row=>{if(row!==el&&Math.abs(row.scrollLeft-el.scrollLeft)>1)row.scrollLeft=el.scrollLeft;});},{passive:true});}
      heading.textContent=shortLabel(rowLabels[row.id]||row.label,lang);heading.lang=lang;heading.dir=lang==='ar'?'rtl':'ltr';
      const cells=row.cells||[];el.classList.toggle('row-empty',cells.length===0);
      for(const cell of cells){
        const key=rowKey+':'+cell.id;let card=cellCache.get(key);
        if(!card){card=document.createElement('div');cellCache.set(key,card);card.innerHTML='<span class="scene-cell-value"></span><small class="scene-cell-identity"></small><span class="scene-cell-index"></span><span class="scene-cell-marker"></span>';card.setAttribute('role','listitem');card.dataset.cell=cell.id;}
        seenCells.add(key);container.append(card);card.className='scene-cell tone-'+tone(cell.tone);
        card.querySelector('.scene-cell-value').textContent=row.layout==='aligned'?({' ':'␠','\n':'↵','\t':'⇥'}[cell.value]??display(cell.value)):display(cell.value);card.title=String(cell.id);const duplicate=lessonId.endsWith('-sort')&&cells.some(other=>other.id!==cell.id&&other.value===cell.value),identity=String(cell.id).match(/(?:item|card)-(\d+)$/);card.querySelector('.scene-cell-identity').textContent=duplicate&&identity?String.fromCharCode(65+Number(identity[1])):'';
        card.querySelector('.scene-cell-index').textContent=cell.index===undefined?'':display(cell.index);
        const marker=view.markers?.[row.id]&&!view.markers[row.id].includes(cell.marker)?'':cell.marker??'';
        card.querySelector('.scene-cell-marker').textContent=marker;card.querySelector('.scene-cell-marker').title=marker;
        card.setAttribute('aria-label',[cell.index===undefined?'':`index ${cell.index}`,display(cell.value),cell.marker||''].filter(Boolean).join(': '));
      }
      let empty=el.querySelector('.scene-empty');if(!empty){empty=document.createElement('div');empty.className='scene-empty';el.append(empty);}empty.hidden=cells.length>0;empty.textContent=lang==='ar'?'فاضي · [ ]':'Empty · [ ]';
    }
    const collections=view.hideCollections?[]:(scene.collections||[]).filter(collection=>collection.values?.length);
    if(collections.length){const el=part('collections','scene-collections');el.innerHTML=collections.map(collection=>`<div class="scene-collection"><span dir="${lang==='ar'?'rtl':'ltr'}">${escape(shortLabel(collection.label,lang))}</span><div class="collection-values">${collection.values?.length?collection.values.map(v=>`<span>${escape(display(v))}</span>`).join(''):'<i>∅</i>'}</div></div>`).join('');}

    for(const [key,el] of rowCache)if(!seenRows.has(key)){el.remove();rowCache.delete(key);}
    for(const [key,el] of cellCache)if(!seenCells.has(key)){el.remove();cellCache.delete(key);}
    const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const duration=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--move-time'))||0;
    if(!reduced&&duration>0)for(const [key,el] of cellCache){const old=oldPositions.get(key);if(!old||!el.animate)continue;const now=el.getBoundingClientRect(),dx=old.left-now.left,dy=old.top-now.top;if(Math.abs(dx)+Math.abs(dy)>1){el.getAnimations().forEach(a=>a.cancel());el.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration,easing:'cubic-bezier(.25,.85,.25,1)'});}}
  }
  function renderTheory(panel,lesson,lang,onExplore){
    const c=lesson.theory,tr=v=>escape(text(v,lang));
    panel.innerHTML=`<div class="theory-intro extension-theory"><div><h2>${tr(c.title)}</h2>${c.idea?`<p class="theory-idea">${tr(c.idea)}</p>`:''}<p>${tr(c.intro)}</p></div><div class="theory-invariant"><span>${lang==='ar'?'الـ invariant':'THE INVARIANT'}</span><p>${tr(c.invariant)}</p></div></div><div class="theory-steps">${c.steps.map((step,i)=>`<article class="theory-step"><span class="step-number">${String(i+1).padStart(2,'0')}</span><h3>${tr(step.title)}</h3><p>${tr(step.body)}</p></article>`).join('')}</div><div class="theory-bottom"><article class="theory-card"><h3>${lang==='ar'?'الـ complexity':'Algorithm cost'}</h3>${c.costs.map(cost=>`<div class="complexity-row"><span>${tr(cost.label)}</span><code>${escape(cost.value)}</code></div>`).join('')}</article><article class="theory-card"><h3>${lang==='ar'?'خلي بالك':'Keep in mind'}</h3><ul>${c.notes.map(note=>`<li>${tr(note)}</li>`).join('')}</ul></article></div><div class="theory-cta"><button class="primary-button" id="theory-play">${lang==='ar'?'ارجع للتجربة':'Back to animation'}</button></div>`;
    panel.querySelector('#theory-play').addEventListener('click',onExplore);
  }
  root.LessonView={setActive,renderScene,renderTheory,escape,text,display};
})(globalThis);
