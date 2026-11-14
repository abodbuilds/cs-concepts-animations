(function () {
  'use strict';
  function init() {
    const A = window.AlgorithmLab, V = window.LessonView;
    const lessons = window.AlgorithmLessons || {};
    const $ = id => document.getElementById(id);
    const dictionaries = {
      ar: {
        visited:'اتزار',matched:'مطابق',chooseLesson:'اختار المفهوم',graphCategory:'خوارزميات الجراف',stringCategory:'البحث في النصوص',skip:'انتقل للتجربة',library:'المكتبة',searchCategory:'خوارزميات البحث',sortCategory:'خوارزميات الترتيب',
        sideNote:'الفكرة بتوضح لما تشوف كل خطوة.',sideDescription:'غيّر المدخلات. امشي مع الكود. وشوف اللي بيحصل.',local:'التجربة كلها على جهازك',
        interactive:'تجربة تفاعلية',explore:'جرّب بنفسك',theory:'افهم الفكرة',tabsNote:'خطوة واحدة. تغيير واضح.',newExample:'مثال جديد',editInput:'غيّر المدخلات',
        arrayLabel:'الأرقام',targetLabel:'المطلوب · target',inputHelp:'لحد 16 عدد صحيح من -999 لـ 999، بينهم فاصلة. سيبها فاضية لتجربة الصف الفاضي.',
        try:'جرّب:',presetDefault:'مثال الحلقة',duplicates:'قيم مكرّرة',empty:'صف فاضي',cancel:'إلغاء',sortApply:'رتّب وطبّق',apply:'طبّق',
        liveState:'الحالة دلوقتي',visualization:'شوف الفكرة بتتحرّك',available:'متاح',active:'الخطوة الحالية',savedValue:'القيمة المحفوظة',
        emptyArray:'الصف فاضي',emptyHint:'شغّل الكود وشوف بيتعامل مع الحالة دي إزاي.',behindScenes:'ورا الحركة',codeFollows:'السطر المضيء هو اللي بيتنفّذ',
        execution:'خطوات التنفيذ',speed:'السرعة',keyboard:'Space تشغيل / إيقاف · ← → خطوة بخطوة',whyWorks:'ليه الطريقة دي بتشتغل؟',footer:'الفهم الأول. الكود بعده.',
        play:'شغّل',pause:'إيقاف',replay:'من الأول',reset:'إعادة البداية',previous:'الخطوة السابقة',next:'الخطوة التالية',copy:'انسخ الكود',copied:'اتنسخ الكود',copyFailed:'حدّد الكود وانسخه يدويًا.',
        ready:'جاهز',running:'بيتنفّذ',complete:'اكتمل',notFound:'مش موجود',sorted:'مترتّب',discarded:'مستبعد',reverse:'ترتيب عكسي',
        comparisons:'مقارنات القيم',probes:'أماكن فحصناها',shifts:'نقلات لليمين',writeHere:'هنكتب هنا',remaining:'أماكن ممكنة',sortedPart:'كروت في الجزء المترتّب',
        invalid:'استخدم أعداد صحيحة من -999 لـ 999، وافصل بينها بفاصلة.',tooMany:'ممكن نعرض لحد 16 رقم عشان الخطوات تفضل واضحة.',invalidTarget:'اكتب target كعدد صحيح من -999 لـ 999.',
        unsorted:'Binary Search محتاجة أرقام مترتّبة من الصغير للكبير. رتّبها بنفسك، أو اختار «رتّب وطبّق».',
        cost:'تكلفة الخوارزمية',watchFor:'خلي بالك',best:'أفضل حالة',worst:'أسوأ حالة',average:'المتوسط',space:'مساحة إضافية',backToLab:'جرّب الفكرة',theoryCta:'جاهز تشوف الفكرة وهي بتشتغل؟',
        binaryDescription:'استغل الترتيب، واستبعد الجزء اللي مش ممكن يكون فيه المطلوب.',insertionDescription:'جزء مترتّب بيكبر كل مرة. كارت جديد، ومكان مناسب.',
        binaryNote:'الـ index بيبدأ من صفر. بنرجّع مكان القيمة؛ ولو مش موجودة، نرجّع NOT_FOUND.',
        insertionNote:'الخانة المعلّمة مكان للكتابة، مش حذف من الذاكرة. الرقم الباهت يفضل موجود لحد ما نكتب فوقه.',
      },
      en: {
        visited:'Visited',matched:'Matched',chooseLesson:'Choose a concept',graphCategory:'Graph algorithms',stringCategory:'String algorithms',skip:'Skip to the lab',library:'THE LIBRARY',searchCategory:'Search algorithms',sortCategory:'Sorting algorithms',
        sideNote:'A little movement. A lot more clarity.',sideDescription:'Change the input. Follow the code. See what happens.',local:'Runs entirely on your device',
        interactive:'Interactive lesson',explore:'Explore',theory:'The idea',tabsNote:'One step. One clear change.',newExample:'New example',editInput:'Edit input',
        arrayLabel:'Array',targetLabel:'Search target',inputHelp:'Up to 16 integers from -999 to 999, separated by commas. Leave blank to try an empty array.',
        try:'Try:',presetDefault:'Episode example',duplicates:'Duplicates',empty:'Empty array',cancel:'Cancel',sortApply:'Sort & apply',apply:'Apply',
        liveState:'THE LIVE STATE',visualization:'Watch the idea move',available:'Available',active:'Current operation',savedValue:'Saved value',
        emptyArray:'An empty array',emptyHint:'Run the code to see how this case is handled.',behindScenes:'BEHIND THE MOVEMENT',codeFollows:'The highlighted line is executing',
        execution:'Execution steps',speed:'Speed',keyboard:'Space to play / pause · ← → to step',whyWorks:'Why does this work?',footer:'Understand it. Then write it.',
        play:'Play',pause:'Pause',replay:'Replay',reset:'Reset',previous:'Previous step',next:'Next step',copy:'Copy pseudocode',copied:'Pseudocode copied',copyFailed:'Select the code to copy it manually.',
        ready:'Ready',running:'In progress',complete:'Complete',notFound:'Not found',sorted:'Sorted',discarded:'Discarded',reverse:'Reverse order',
        comparisons:'Value comparisons',probes:'Midpoint probes',shifts:'Right shifts',writeHere:'write here',remaining:'possible positions',sortedPart:'cards in the sorted part',
        invalid:'Use integers from -999 to 999, separated by commas.',tooMany:'Use up to 16 numbers so every operation stays visible.',invalidTarget:'Enter an integer target from -999 to 999.',
        unsorted:'Binary Search needs ascending order. Reorder your input, or choose “Sort & apply”.',
        cost:'Algorithm cost',watchFor:'Keep in mind',best:'Best case',worst:'Worst case',average:'Average case',space:'Extra space',backToLab:'Try it in the lab',theoryCta:'Ready to put the idea in motion?',
        binaryDescription:'Use sorted order to rule out the half that cannot contain your target.',insertionDescription:'Grow a sorted part, one card at a time. Make room, then insert.',
        binaryNote:'Indices start at zero. Return the position of the value, or NOT_FOUND when it is absent.',
        insertionNote:'The outlined slot marks a future write, not a memory deletion. Its faint value remains until it is overwritten.',
      },
    };
    const episodeValues = [4,9,14,21,28,35,43,50,57,64,71,78,85,92,99];
    const configs = {
      'binary-search':{number:'01',name:'Binary Search',label:'BINARY SEARCH',cost:'O(log n)',values:episodeValues,target:71},
      'insertion-sort':{number:'02',name:'Insertion Sort',label:'INSERT SORT',cost:'O(n²)',values:[7,3,5,2,6],target:71},
    };
    Object.values(lessons).sort((a,b)=>Number(a.number)-Number(b.number)).forEach(lesson=>{
      configs[lesson.id]=lesson;
      const button=document.createElement('button');button.className='algorithm-option';button.dataset.algorithm=lesson.id;button.setAttribute('aria-pressed','false');
      const category=lesson.category==='sort'?'sortCategory':lesson.category==='graph'?'graphCategory':'stringCategory';
      button.innerHTML=`<span class="nav-icon" aria-hidden="true">${lesson.category==='graph'?'⌘':lesson.category==='string'?'≋':'▤'}</span><span><b></b><small data-i18n="${category}"></small></span><span class="nav-arrow" aria-hidden="true">↗</span>`;
      button.querySelector('b').textContent=lesson.name;document.querySelector('.algorithm-nav').append(button);
    });
    document.querySelector('.library-count').textContent=String(Object.keys(configs).length).padStart(2,'0');
    Object.entries(configs).forEach(([id,c])=>{const option=document.createElement('option');option.value=id;option.textContent=c.name;$('algorithm-select').append(option);});
    let lang = 'ar'; try { const stored=localStorage.getItem('algorithm-lab-language'); if(stored==='en'||stored==='ar')lang=stored; } catch {}
    let algorithm = configs[location.hash.slice(1)] ? location.hash.slice(1) : 'binary-search';
    let inputs = Object.fromEntries(Object.entries(configs).map(([id,c])=>[id,lessons[id]?c.parse({...c.defaults}):{numbers:[...c.values],target:c.target}]));
    const rawInputs=Object.fromEntries(Object.entries(lessons).map(([id,c])=>[id,{...c.defaults}]));
    const presetPositions={};
    let frames=[],index=0,playing=false,timer=null,toastTimer=null,view='explore',cardEls=[],slotEls=[],lastWidth=0;
    const t=key=>dictionaries[lang][key]||key;
    const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const rich=s=>escape(s).replace(/\b(value|current|compareIndex|numbers|left|right|middle|target|NOT_FOUND|Binary Search|Insertion Sort)\b/g,'<bdi>$1</bdi>');
    const isBinary=()=>algorithm==='binary-search';
    const lesson=()=>lessons[algorithm];
    const code=()=>lesson()?.code||(isBinary()?A.binaryCode:A.insertionCode);
    const frame=()=>frames[index];
    const period=()=>1100/Number($('speed').value);
    function pause(){playing=false;clearTimeout(timer);timer=null;renderControls();}
    function notify(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,2300);}
    function setIndex(next,{jump=false}={}){
      index=Math.max(0,Math.min(frames.length-1,next));
      document.documentElement.style.setProperty('--move-time',jump?'0ms':`${Math.min(560,period()*.65)}ms`);
      if(index===frames.length-1){playing=false;clearTimeout(timer);timer=null;}
      renderState();
      if(jump&&cardEls.length)void cardEls[0].offsetWidth;
    }
    function tick(){if(!playing)return;setIndex(index+1);if(playing)timer=setTimeout(tick,period());}
    function togglePlay(){
      if(playing){pause();return;}
      if(index===frames.length-1)setIndex(0,{jump:true});
      playing=true;renderControls();tick();
    }
    function buildTrace(){
      pause();const input=inputs[algorithm];frames=lesson()?lesson().build(input):isBinary()?A.binarySearch(input.numbers,input.target):A.insertionSort(input.numbers);index=0;
      document.documentElement.style.setProperty('--move-time','0ms');
      buildCards();buildCode();$('timeline').max=frames.length-1;renderState();
      if(cardEls.length)void cardEls[0].offsetWidth;
    }
    function buildCards(){
      if(lesson()){cardEls=[];slotEls=[];$('card-layer').replaceChildren();$('slot-layer').replaceChildren();return;}
      const numbers=inputs[algorithm].numbers;
      $('card-layer').replaceChildren();$('slot-layer').replaceChildren();cardEls=[];slotEls=[];
      $('slot-layer').setAttribute('role','list');$('card-layer').setAttribute('aria-hidden','true');
      numbers.forEach((n,id)=>{
        const card=document.createElement('div');card.className='number-card';card.dataset.id=id;
        const val=document.createElement('span');val.textContent=n;card.append(val);
        if(numbers.filter(v=>v===n).length>1){const identity=document.createElement('small');identity.className='card-identity';identity.textContent=String.fromCharCode(65+id);card.append(identity);}
        $('card-layer').append(card);cardEls.push(card);
        const slot=document.createElement('div');slot.className='array-slot';slot.setAttribute('role','listitem');
        slot.innerHTML='<span class="ghost-value"></span><span class="gap-caption"></span><span class="slot-markers"></span><span class="slot-index"></span>';
        slot.querySelector('.slot-index').textContent=id;$('slot-layer').append(slot);slotEls.push(slot);
      });
    }
    function buildCode(){
      const lines=code();
      $('code-lines').innerHTML=lines.map((line,i)=>`<li class="code-line" data-line="${i+1}"><span class="line-number" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><code>${escape(line).replace(/\b(while|if|else|for|return|and)\b/g,'<span class="keyword">$1</span>')}</code></li>`).join('');
      $('code-scroll').scrollTop=0;
    }
    function renderControls(){
      if(!frames.length)return;
      $('play-label').textContent=t(playing?'pause':index===frames.length-1?'replay':'play');$('play-symbol').textContent=playing?'Ⅱ':'▶';
      $('play').setAttribute('aria-pressed',String(playing));$('previous').disabled=index===0;$('next').disabled=index===frames.length-1;
      $('reset').disabled=index===0&&!playing;$('timeline').value=index;
      $('step-count').textContent=`${String(index).padStart(2,'0')} / ${frames.length-1}`;
      $('timeline').setAttribute('aria-valuetext',`${index} / ${frames.length-1}: ${frame().title[lang]}`);
    }
    function renderStage(){
      if(!frames.length||view!=='explore')return;
      const stage=$('stage'),width=stage.clientWidth;if(!width)return;
      lastWidth=width;
      if(lesson()){V.renderScene(stage,frame().scene||{},lang,algorithm);return;}
      V.setActive(stage,false);
      const s=frame().state,n=s.numbers.length,binary=isBinary();
      const maxCols=Math.max(5,Math.floor((width-12)/(width>=420?57:77)));
      const cols=n?Math.ceil(n/Math.ceil(n/maxCols)):1;
      const gap=12,cw=Math.min(65,(width-24-(cols-1)*gap)/cols),ch=Math.round(cw*1.08+10);
      const used=cols*cw+(cols-1)*gap,start=(width-used)/2;
      const rows=Math.max(1,Math.ceil(n/cols)),base=binary?119:159,pitch=ch+48;
      stage.style.height=`${n?base+(rows-1)*pitch+ch+58:290}px`;
      stage.querySelector('.array-label').style.top=`${base-38}px`;
      $('target-capsule').hidden=!binary;$('target-display').textContent=inputs[algorithm].target;
      const heldX=Math.max(start,width-cw-25),heldY=53;
      $('held-label').hidden=binary||s.heldId===null;
      $('held-label').style.left=`${heldX+cw/2}px`;
      $('empty-state').hidden=n!==0;
      const position=i=>({x:start+(i%cols)*(cw+gap),y:base+Math.floor(i/cols)*pitch});
      for(let i=0;i<n;i++){
        const slot=slotEls[i],p=position(i),hole=!binary&&s.hole===i;
        Object.assign(slot.style,{left:`${p.x}px`,top:`${p.y}px`,width:`${cw}px`,height:`${ch}px`});
        slot.classList.toggle('hole',hole);slot.setAttribute('aria-label',`index ${i}: ${s.numbers[i]}`);
        slot.querySelector('.ghost-value').textContent=hole?s.numbers[i]:'';
        slot.querySelector('.gap-caption').textContent=hole?t('writeHere'):'';
        let pointers=[];
        if(binary){if(s.left===i)pointers.push(['L','left','']);if(s.middle===i)pointers.push(['M','middle','mid']);if(s.right===i)pointers.push(['R','right','']);}
        else{if(s.current===i)pointers.push(['C','current','current']);if(s.heldId!==null&&s.initialized&&s.compareIndex===i)pointers.push(['i','compareIndex','']);}
        slot.querySelector('.slot-markers').innerHTML=pointers.map(([symbol,name,style])=>`<span class="pointer ${style}" title="${name}" aria-label="${name}">${symbol}</span>`).join('');
      }
      cardEls.forEach((card,id)=>{
        const held=!binary&&s.heldId===id,pos=binary?id:s.slots.indexOf(id);
        const p=held?{x:heldX,y:heldY}:position(pos);
        const excluded=binary&&s.excluded.includes(id);
        const found=binary?s.found===id:s.done;
        const active=binary?s.middle===id&&!excluded&&!found:held||(!s.done&&s.heldId!==null&&s.initialized&&s.compareIndex===pos&&frame().kind==='compare')||(!s.done&&frame().kind==='current'&&pos===s.current);
        card.className=['number-card',held?'held':'',active?'active':'',excluded?'excluded':'',found?'found':'',!binary&&s.heldId===null&&pos<s.sortedCount?'sorted':''].filter(Boolean).join(' ');
        const lift=active&&!held?5:0;
        Object.assign(card.style,{width:`${cw}px`,height:`${ch}px`,transform:`translate(${p.x}px, ${p.y-lift}px)`,fontSize:`${String(inputs[algorithm].numbers[id]).length>=3?Math.max(15,cw*.31):Math.max(21,cw*.43)}px`});
      });
      if(binary){
        const remaining=s.left===null||s.right===null?n:Math.max(0,s.right-s.left+1);
        $('range-note').innerHTML=s.done?(s.found!==null?rich(frame().title[lang]):t('notFound')):`<b>${remaining}</b> ${t('remaining')}`;
      }else $('range-note').innerHTML=s.heldId!==null?(lang==='ar'?'الخانة المعلّمة هي مكان الإدخال':'The outlined slot is the insertion gap'):`<b>${s.sortedCount}</b> ${t('sortedPart')}`;
    }
    function renderState(){
      const f=frame(),s=f.state;
      $('workbench').dataset.algorithm=algorithm;$('stage').dataset.step=index;$('stage').dataset.kind=f.kind;
      $('step-title').textContent=f.title[lang];$('step-explanation').innerHTML=rich(f.explanation[lang]);
      $('step-equation').textContent=f.equation;$('step-equation').hidden=!f.equation;
      $('story-mark').textContent=s.done?(f.kind==='missing'?'∅':'✓'):'↳';
      $('phase-badge').textContent=t(s.done?'complete':index===0?'ready':'running');
      const vars=lesson()?frame().variables.map(v=>[v.name,V.display(v.value),'']):isBinary()?[['left',s.left,'L'],['middle',s.middle,'M'],['right',s.right,'R']]:[['current',s.current,'C'],['value',s.value,''],['compareIndex',s.compareIndex,'i']];
      const previous=index?frames[index-1].state:null;
      $('variables').innerHTML=vars.map(([name,value,marker])=>`<div class="variable ${previous&&(lesson()?V.display(frames[index-1].variables.find(v=>v.name===name)?.value)!==value:previous[name]!==value)?'changed':''}"><span class="variable-name">${marker?`<small class="pointer">${marker}</small>`:''}${escape(name)}</span><span class="variable-value ${value===null?'unset':''}" data-variable="${escape(name)}">${value===null?'—':escape(value)}</span></div>`).join('');
      const metrics=lesson()?frame().metrics.map(m=>[m.value,V.text(m.label,lang)]):isBinary()?[[s.probes,'probes'],[s.comparisons,'comparisons']]:[[s.comparisons,'comparisons'],[s.shifts,'shifts']];
      $('metrics').innerHTML=metrics.map(([count,label])=>`<div class="metric"><strong>${escape(String(count).padStart(2,'0'))}</strong><span>${escape(lesson()?label:t(label))}</span></div>`).join('');
      $('code-lines').querySelectorAll('.code-line').forEach(row=>{
        const number=Number(row.dataset.line),active=f.lines.includes(number);
        row.classList.toggle('active',active);row.classList.toggle('skipped',!lesson()&&!isBinary()&&f.kind==='bounds'&&!s.condition&&number===6);
        if(active)row.setAttribute('aria-current','step');else row.removeAttribute('aria-current');
      });
      const activeLine=$('code-lines').querySelector('.code-line.active'),scroll=$('code-scroll');
      if(activeLine&&scroll.clientHeight){const top=activeLine.getBoundingClientRect().top-scroll.getBoundingClientRect().top+scroll.scrollTop;if(top<scroll.scrollTop||top+activeLine.offsetHeight>scroll.scrollTop+scroll.clientHeight)scroll.scrollTop=Math.max(0,top-scroll.clientHeight/2);}
      renderStage();renderControls();
    }
    function renderCopy(){
      document.documentElement.lang=lang==='ar'?'ar-EG':'en';document.documentElement.dir=lang==='ar'?'rtl':'ltr';
      document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
      $('language').innerHTML=`${lang==='ar'?'EN':'AR'} <span aria-hidden="true">↗</span>`;
      $('language').setAttribute('aria-label',lang==='ar'?'Switch to English':'التغيير للعربية');
      ['reset','previous','next'].forEach(id=>{$(id).setAttribute('aria-label',t(id));$(id).title=t(id);});
      $('copy-code').setAttribute('aria-label',t('copy'));$('copy-code').title=t('copy');
      $('timeline').setAttribute('aria-label',t('execution'));$('speed').setAttribute('aria-label',t('speed'));
      document.querySelector('.visual-panel').classList.toggle('modular-panel',!!lesson());
      const c=configs[algorithm];document.title=`${c.name} · CS Concept Lab`;
      $('lesson-id').textContent=`${c.number} / ALGORITHMS / ${c.label}`;
      $('lesson-title').innerHTML=`${escape(c.name)}<span class="title-dot">.</span>`;
      $('lesson-description').textContent=lesson()?V.text(c.description,lang):t(isBinary()?'binaryDescription':'insertionDescription');
      $('complexity-badge').textContent=c.cost;$('complexity-badge').title=t('worst');
      $('legend-last').textContent=lesson()?t(c.category==='graph'?'visited':c.category==='string'?'matched':'sorted'):t(isBinary()?'discarded':'sorted');
      $('legend-last').previousElementSibling.className='legend-dot '+(isBinary()?'excluded':'completed');
      $('code-note').innerHTML=rich(lesson()?V.text(c.note,lang):t(isBinary()?'binaryNote':'insertionNote'));
      $('dataset-description').textContent=lesson()?V.text(c.summary(inputs[algorithm]),lang):lang==='ar'?`${inputs[algorithm].numbers.length} عنصر${isBinary()?' · بالترتيب':''}`:`${inputs[algorithm].numbers.length} elements${isBinary()?' · sorted ascending':''}`;
      $('edge-preset').textContent=t(isBinary()?'notFound':'reverse');$('target-field').hidden=!isBinary();
      $('legacy-input-fields').hidden=!!lesson();$('legacy-presets').hidden=!!lesson();$('input-help').hidden=!!lesson();
      $('lesson-input-fields').hidden=!lesson();$('lesson-presets').hidden=!lesson();$('algorithm-select').value=algorithm;
      if(lesson()&&!$('input-editor').hidden)renderLessonFields(readLessonFields());
      document.querySelectorAll('.algorithm-option[data-algorithm]').forEach(button=>{const selected=button.dataset.algorithm===algorithm;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',selected);});
      const nav=document.querySelector('.algorithm-nav'),selectedButton=nav.querySelector('.selected');
      if(selectedButton&&getComputedStyle(nav).display==='flex'){const box=selectedButton.getBoundingClientRect(),bounds=nav.getBoundingClientRect();if(box.left<bounds.left)nav.scrollLeft+=box.left-bounds.left;else if(box.right>bounds.right)nav.scrollLeft+=box.right-bounds.right;}
      renderTheory();if(frames.length)renderState();
    }
    function setView(next){
      pause();view=next;$('explore-panel').hidden=next!=='explore';$('theory-panel').hidden=next!=='theory';
      for(const name of ['explore','theory']){$(`${name}-tab`).setAttribute('aria-selected',String(name===next));$(`${name}-tab`).tabIndex=name===next?0:-1;}
      if(next==='explore')requestAnimationFrame(renderStage);
    }
    function selectAlgorithm(id){
      if(!configs[id])return;
      algorithm=id;closeEditor();buildTrace();renderCopy();
      try{history.replaceState(null,'',`#${id}`);}catch{}
    }
    function readLessonFields(){const raw={...rawInputs[algorithm]};$('lesson-input-fields').querySelectorAll('[data-field]').forEach(el=>{raw[el.dataset.field]=el.value;});return raw;}
    function renderLessonFields(raw=rawInputs[algorithm]){
      const c=lesson();$('lesson-input-fields').innerHTML=c.fields.map(field=>`<label><span>${escape(V.text(field.label,lang))}</span>${field.type==='textarea'?`<textarea rows="3" id="field-${escape(field.name)}" data-field="${escape(field.name)}" dir="ltr" spellcheck="false" aria-describedby="help-${escape(field.name)} input-error"${field.maxLength?` maxlength="${field.maxLength}"`:''}>${escape(raw[field.name]??'')}</textarea>`:`<input type="text" id="field-${escape(field.name)}" data-field="${escape(field.name)}" value="${escape(raw[field.name]??'')}" dir="ltr" autocomplete="off" spellcheck="false" aria-describedby="help-${escape(field.name)} input-error"${field.maxLength?` maxlength="${field.maxLength}"`:''}>`}<small id="help-${escape(field.name)}">${escape(V.text(field.help,lang))}</small></label>`).join('');
      $('lesson-presets').innerHTML=c.presets.map(preset=>`<button type="button" data-lesson-preset="${escape(preset.id)}">${escape(V.text(preset.label,lang))}</button>`).join('');
    }
    function openEditor(){pause();if(lesson())renderLessonFields();else{$('array-input').value=inputs[algorithm].numbers.join(', ');$('target-input').value=inputs[algorithm].target;}clearError();$('input-editor').hidden=false;$('edit-input').setAttribute('aria-expanded','true');(lesson()?$('lesson-input-fields').querySelector('input,textarea'):$('array-input')).focus();}
    function closeEditor(){$('input-editor').hidden=true;$('edit-input').setAttribute('aria-expanded','false');clearError();}
    function clearError(){$('input-error').hidden=true;$('sort-apply').hidden=true;$('array-input').removeAttribute('aria-invalid');$('target-input').removeAttribute('aria-invalid');}
    function applyInput(sort=false){
      clearError();
      if(lesson()){
        const raw=readLessonFields();
        try{const parsed=lesson().parse(raw);lesson().build(parsed);inputs[algorithm]=parsed;rawInputs[algorithm]=raw;}
        catch(error){showError(V.text(error.userMessage,lang)||error.message);return false;}
        closeEditor();buildTrace();renderCopy();return true;
      }
      let numbers,target=inputs[algorithm].target;
      try{numbers=A.parseNumbers($('array-input').value);}catch(error){$('array-input').setAttribute('aria-invalid','true');showError(t(error.message==='too-many'?'tooMany':'invalid'));return false;}
      if(isBinary()){
        try{target=A.parseTarget($('target-input').value);}catch{$('target-input').setAttribute('aria-invalid','true');showError(t('invalidTarget'));return false;}
        if(sort)numbers.sort((a,b)=>a-b);
        if(numbers.some((v,i)=>i&&v<numbers[i-1])){$('array-input').setAttribute('aria-invalid','true');showError(t('unsorted'));$('sort-apply').hidden=false;return false;}
      }
      inputs[algorithm]={numbers,target};closeEditor();buildTrace();renderCopy();return true;
    }
    function showError(message){$('input-error').textContent=message;$('input-error').hidden=false;}
    function preset(name){
      const binary=isBinary();let numbers=[...configs[algorithm].values],target=71;
      if(name==='edge'){if(binary)target=73;else numbers=[7,6,5,3,2];}
      if(name==='duplicates'){numbers=binary?[2,3,3,5,5,5,8]:[5,3,5,2,3];target=5;}
      if(name==='empty')numbers=[];
      $('array-input').value=numbers.join(', ');$('target-input').value=target;clearError();
    }
    function renderTheory(){
      if(lesson()){V.renderTheory($('theory-panel'),lesson(),lang,()=>{setView('explore');$('explore-tab').focus();});return;}
      const binary=isBinary(),ar=lang==='ar';
      const content=binary?{
        title:ar?'كل مرة، استبعد الجزء المستحيل.':'Rule out the impossible half.',
        intro:ar?'لما الأرقام تبقى مترتّبة، المقارنة مع النصّ بتقولنا أنهي ناحية نكمّل فيها. مش محتاجين نفحص كل عنصر.':'Sorted order turns one comparison into a decision about an entire interval. You do not need to inspect every element.',
        steps:ar?[['ابدأ بالحدود','left وright بيحدّدوا الجزء اللي لسه ممكن يكون فيه target. في البداية، ده الصف كله.'],['قارن باللي في النصّ','لو القيمة أصغر، استبعدها وكل اللي قبلها. لو أكبر، استبعدها وكل اللي بعدها.'],['كرّر لحدّ النتيجة','إمّا تلاقي القيمة وترجّع مكانها، أو الحدود تعدّي بعض وتعرف إن القيمة مش موجودة.']]:[['Bound the search','left and right describe every position that could still contain the target. Start with the entire array.'],['Compare with the middle','If it is too small, discard it and everything before it. If it is too large, discard it and everything after it.'],['Repeat until resolved','Return a matching index, or stop when the boundaries cross and no candidate remains.']],
        invariant:ar?'لو target موجودة، لازم تكون جوّه الحدود اللي فاضلة.':'If the target exists, it stays inside the remaining interval.',
        notes:ar?['لازم الأرقام تكون مترتّبة قبل البحث. تكلفة ترتيبها مش داخلة في O(log n).','بنفترض إن الوصول لأي index مباشر.','مع القيم المكرّرة، بنرجّع مكان مطابق، مش شرط الأول.','تحديث الحدود بيعدّي middle عشان البحث ما يعلقش.']:['The input must already be sorted. Sorting it is not included in O(log n).','This assumes constant-time access to an array index.','Duplicates may return any matching position, not necessarily the first.','Move past middle when updating a boundary so the interval always shrinks.'],
        costs:[['best','O(1)'],['average','O(log n)'],['worst','O(log n)'],['space','O(1)']],
      }:{
        title:ar?'جزء مترتّب، وكارت جديد يدخل مكانه.':'A sorted part. One new card.',
        intro:ar?'زي ترتيب الكروت في إيدك. بنحافظ على ترتيب اللي عالشمال، ونوسّعه بإضافة كارت جديد في المكان المناسب.':'Like arranging cards in your hand: keep the left part sorted, then make room for the next card in the right place.',
        steps:ar?[['احفظ القيمة','نحفظ الكارت الجديد في value قبل ما نحرّك أي قيمة تانية.'],['حرّك الأكبر يمين','نقارن باللي قبله ونرجع شمال. كل قيمة أكبر تتنقل مكان لليمين. نتأكد من الحدود قبل القراءة.'],['ادخل في المكان الفاضي','نقف عند قيمة أصغر أو مساوية، أو عند أول الصف. نكتب value بعد compareIndex.']]:[['Save the value','Store the next card in value before any other value overwrites its original position.'],['Shift larger neighbors','Walk left. Copy each larger neighbor one place right, checking the boundary before every array read.'],['Insert into the gap','Stop at a smaller or equal value, or at the beginning. Write value just after compareIndex.']],
        invariant:ar?'بعد كل إدخال، كل الكروت لحد current مترتّبة بالنسبة لبعض.':'After each insertion, the prefix through current is sorted.',
        notes:ar?['مناسبة لصف صغير أو قريب من الترتيب.','بنستخدم > مش >=، عشان القيم المتساوية تفضل بنفس ترتيبها.','الخانة المعلّمة في الرسم مكان للكتابة. الكود بينسخ القيم ومش بيمسحها.','الترتيب بيتم في نفس الصف، مع متغير إضافي لحفظ value.']:['A useful choice for small or nearly sorted arrays.','Use > rather than >= to preserve the relative order of equal values.','The outlined gap is a visual model of a future write. The code copies values rather than deleting them.','The array is sorted in place, with one extra variable holding value.'],
        costs:[['best','O(n)'],['average','O(n²)'],['worst','O(n²)'],['space','O(1)']],
      };
      const diagram=binary?`<div class="theory-diagram" aria-label="The search interval becomes smaller"><div class="mini-row">${Array.from({length:15},(_,i)=>`<i class="mini-bar ${i>=8?'bright':''}"></i>`).join('')}</div><span class="mini-arrow">↓</span><div class="mini-row">${Array.from({length:7},(_,i)=>`<i class="mini-bar ${i<3?'bright':''}"></i>`).join('')}</div><span class="diagram-note">15 → 7 → 3 → 1</span></div>`:`<div class="theory-diagram" aria-label="Insert 5 between 3 and 7"><div class="mini-row"><span class="mini-cell">3</span><span class="mini-cell">7</span><span class="mini-cell bright">5</span></div><span class="mini-arrow">↓</span><div class="mini-row"><span class="mini-cell">3</span><span class="mini-cell bright">5</span><span class="mini-cell">7</span></div><span class="diagram-note">compare → shift → insert</span></div>`;
      $('theory-panel').innerHTML=`<div class="theory-intro"><div><span class="eyebrow">${configs[algorithm].label}</span><h2>${content.title}</h2><p>${content.intro}</p></div>${diagram}</div><div class="theory-steps">${content.steps.map(([title,body],i)=>`<article class="theory-step"><span class="step-number">0${i+1}</span><h3>${title}</h3><p>${rich(body)}</p></article>`).join('')}</div><div class="theory-bottom"><article class="theory-card"><h3>${t('cost')}</h3>${content.costs.map(([label,cost])=>`<div class="complexity-row"><span>${t(label)}</span><code>${cost}</code></div>`).join('')}</article><article class="theory-card"><h3>${t('watchFor')}</h3><ul>${content.notes.map(note=>`<li>${rich(note)}</li>`).join('')}</ul></article></div><div class="theory-cta"><p>${rich(content.invariant)}</p><button class="primary-button" id="theory-play">${t('backToLab')} <span aria-hidden="true">↗</span></button></div>`;
      $('theory-play').addEventListener('click',()=>{setView('explore');$('explore-tab').focus();});
    }
    document.querySelectorAll('.algorithm-option[data-algorithm]').forEach(button=>button.addEventListener('click',()=>selectAlgorithm(button.dataset.algorithm)));
    $('algorithm-select').addEventListener('change',event=>selectAlgorithm(event.target.value));
    $('lesson-presets').addEventListener('click',event=>{const button=event.target.closest('[data-lesson-preset]');if(!button||!lesson())return;const preset=lesson().presets.find(p=>p.id===button.dataset.lessonPreset);if(preset){renderLessonFields(preset.input);clearError();}});
    $('play').addEventListener('click',togglePlay);$('next').addEventListener('click',()=>{pause();setIndex(index+1);});$('previous').addEventListener('click',()=>{pause();setIndex(index-1);});
    $('reset').addEventListener('click',()=>{pause();setIndex(0,{jump:true});});
    $('timeline').addEventListener('input',event=>{const next=Number(event.target.value);pause();setIndex(next,{jump:true});});
    $('speed').addEventListener('change',()=>{if(playing){clearTimeout(timer);timer=setTimeout(tick,period());}});
    $('language').addEventListener('click',()=>{lang=lang==='ar'?'en':'ar';try{localStorage.setItem('algorithm-lab-language',lang);}catch{}renderCopy();});
    $('edit-input').addEventListener('click',()=>{if($('input-editor').hidden)openEditor();else closeEditor();});
    $('cancel-input').addEventListener('click',()=>{closeEditor();$('edit-input').focus();});
    $('input-editor').addEventListener('submit',event=>{event.preventDefault();if(applyInput())$('play').focus();});
    $('sort-apply').addEventListener('click',()=>{if(applyInput(true))$('play').focus();});
    document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>preset(button.dataset.preset)));
    $('new-example').addEventListener('click',()=>{
      if(lesson()){const c=lesson(),position=((presetPositions[algorithm]||0)+1)%c.presets.length;presetPositions[algorithm]=position;const raw={...c.presets[position].input};inputs[algorithm]=c.parse(raw);rawInputs[algorithm]=raw;closeEditor();buildTrace();renderCopy();return;}
      let numbers=Array.from({length:isBinary()?10:6},()=>Math.floor(Math.random()*90)+1);
      if(isBinary())numbers.sort((a,b)=>a-b);
      inputs[algorithm]={numbers,target:numbers[Math.floor(Math.random()*numbers.length)]};closeEditor();buildTrace();renderCopy();
    });
    $('explore-tab').addEventListener('click',()=>setView('explore'));$('theory-tab').addEventListener('click',()=>setView('theory'));
    $('open-theory').addEventListener('click',()=>{setView('theory');$('theory-tab').focus();});
    document.querySelector('.view-tabs').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?'explore':event.key==='End'?'theory':view==='explore'?'theory':'explore';setView(next);$(`${next}-tab`).focus();}});
    document.addEventListener('keydown',event=>{
      if(view!=='explore'||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,select,textarea,button,a,[contenteditable=true]'))return;
      if(event.code==='Space'){event.preventDefault();togglePlay();}
      if(event.key==='ArrowRight'){event.preventDefault();pause();setIndex(index+1);}
      if(event.key==='ArrowLeft'){event.preventDefault();pause();setIndex(index-1);}
    });
    $('copy-code').addEventListener('click',async()=>{
      const codeText=code().join('\n');let copied=false;
      try{if(navigator.clipboard){await navigator.clipboard.writeText(codeText);copied=true;}}catch{}
      if(!copied){const area=document.createElement('textarea');area.value=codeText;area.style.position='fixed';area.style.left='-9999px';document.body.append(area);area.select();try{copied=document.execCommand('copy');}catch{}area.remove();$('copy-code').focus();}
      notify(t(copied?'copied':'copyFailed'));
    });
    window.addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(configs[id]&&id!==algorithm)selectAlgorithm(id);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width&&Math.abs(width-lastWidth)>1)renderStage();}).observe($('stage'));
    renderCopy();buildTrace();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
