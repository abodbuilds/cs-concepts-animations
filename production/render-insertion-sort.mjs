import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import assert from 'node:assert/strict';

const dir='episodes/002-insertion-sort';
const ep=JSON.parse(await readFile(`${dir}/source/timeline.json`,'utf8'));
assert.ok(GlobalFonts.registerFromPath('skills/cs-concept-script/assets/fonts/Alexandria-Variable.ttf','Workshop Alexandria'));
assert.ok(GlobalFonts.registerFromPath('/System/Library/Fonts/Menlo.ttc','Workshop Mono'));
const canvas=createCanvas(ep.width,ep.height),guide=createCanvas(ep.width,ep.height);
let c=canvas.getContext('2d');
const P={bg:'#2D123F',gold:'#F4D35E',warm:'#E8B953',plum:'#563269',panel:'#3C1D50',
  line:'#775186',muted:'#C4ADCE',inverse:'#2D123F',shadow:'#1C082A',pale:'#F5EBFF'};
const X=[188,364,540,716,892],rowY=748,valueY=470,cardW=144,cardH=182;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},lerp=(a,b,t)=>a+(b-a)*t;
const iso=s=>s.replace(/[A-Za-z_][A-Za-z0-9_]*(?:[ \t]+[A-Za-z0-9_]+)*/g,w=>'\u2066'+w+'\u2069');
const stats={revision:ep.revision,framesChecked:0,maxCaptionLines:0,maxCodeLines:0,textOverflow:[],font:'Alexandria',events:ep.events.length};
const chapterLabels={problem:'المشكلة',theory:'الفكرة',application:'التطبيق'};
const chapters=Object.entries(chapterLabels).map(([id,label])=>{
  const scenes=ep.scenes.filter(s=>s.section===id);
  return {id,label,start:scenes[0].start,end:scenes.at(-1).end};
});
const runtimeLabel=`${String(Math.floor(ep.duration/60)).padStart(2,'0')}:${String(ep.duration%60).padStart(2,'0')}`;
const checkedText=new Set();

function font(size,weight=400,mono=false){c.font=`${weight} ${size}px "${mono?'Workshop Mono':'Workshop Alexandria'}"`;}
function text(s,x,y,size=42,color=P.gold,align='center',weight=400,mono=false,maxWidth=null){
  s=String(s);c.save();font(size,weight,mono);c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';
  const ar=/[\u0600-\u06ff]/.test(s);c.direction=ar?'rtl':'ltr';const shaped=ar?iso(s):s;
  const k=`${s}|${size}|${maxWidth}`;
  if(maxWidth!==null&&!checkedText.has(k)){
    checkedText.add(k);const width=c.measureText(shaped).width;
    if(width>maxWidth+.5){stats.textOverflow.push({s,size,width,maxWidth});throw new Error(`Text overflow: ${s} (${width} > ${maxWidth})`);}
  }
  c.fillText(shaped,x,y);c.restore();
}
function rect(x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function strokeRect(x,y,w,h,r,color=P.line,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.roundRect(x,y,w,h,r);c.stroke();}
function line(x1,y1,x2,y2,color=P.line,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function pill(label,x,y,w,color=P.panel,ink=P.gold,size=28){rect(x-w/2,y,w,55,14,color);text(label,x,y+38,size,ink,'center',500,false,w-18);}
function arrow(x1,y1,x2,y2,color=P.gold,width=3){
  line(x1,y1,x2,y2,color,width);const a=Math.atan2(y2-y1,x2-x1);
  line(x2,y2,x2-12*Math.cos(a-.5),y2-12*Math.sin(a-.5),color,width);
  line(x2,y2,x2-12*Math.cos(a+.5),y2-12*Math.sin(a+.5),color,width);
}

const bg=createCanvas(1080,1920),b=bg.getContext('2d');
b.fillStyle=P.bg;b.fillRect(0,0,1080,1920);
const glow=b.createRadialGradient(540,800,20,540,820,950);
glow.addColorStop(0,'#462052');glow.addColorStop(1,P.bg);b.fillStyle=glow;b.fillRect(0,0,1080,1920);
let seed=204;for(let i=0;i<18000;i++){
  seed=(seed*1664525+1013904223)>>>0;const x=seed%1080;seed=(seed*1664525+1013904223)>>>0;
  b.fillStyle=i%2?'#ffffff06':'#00000010';b.fillRect(x,seed%1920,1,1);
}

const cards=new Map();
function cardSprite(value,role){
  const id=`${value}/${role}`;if(cards.has(id))return cards.get(id);
  const s=createCanvas(184,232),q=s.getContext('2d');
  const selected=role==='active',finished=role==='found';
  const front=selected?P.gold:finished?P.warm:P.plum,ink=selected||finished?P.inverse:P.gold;
  q.shadowColor='#11031c70';q.shadowBlur=13;q.shadowOffsetY=12;
  q.fillStyle=selected?'#96772c':finished?'#8c611d':'#341a44';
  q.beginPath();q.roundRect(20,27,144,186,20);q.fill();q.shadowColor='transparent';
  const g=q.createLinearGradient(20,20,164,202);
  g.addColorStop(0,selected?'#FFE799':finished?'#F6D176':'#704983');g.addColorStop(.35,front);g.addColorStop(1,selected?'#E8C552':finished?'#D59C3B':'#49275E');
  q.fillStyle=g;q.beginPath();q.roundRect(20,20,144,182,20);q.fill();
  q.strokeStyle=selected||finished?'#fff3b440':'#B992CD50';q.lineWidth=2;q.stroke();
  q.strokeStyle=selected||finished?'#80632825':'#DDB1F21A';q.lineWidth=1;q.beginPath();q.moveTo(37,42);q.lineTo(146,42);q.stroke();
  q.font='500 77px "Workshop Alexandria"';q.textAlign='center';q.textBaseline='middle';q.fillStyle=ink;q.fillText(String(value),92,113);
  q.fillStyle=selected||finished?'#6e542440':'#B287C840';q.beginPath();q.roundRect(69,174,46,3,1.5);q.fill();
  cards.set(id,s);return s;
}
for(const value of ep.values)for(const role of ['normal','active','found'])cardSprite(value,role);
function card(value,x,y,role='normal',{alpha=1,scale=1,angle=0,lift=0}={}){
  c.save();c.globalAlpha=alpha;c.translate(x,y+cardH/2-lift);c.rotate(angle);c.scale(scale,scale);
  c.drawImage(cardSprite(value,role),-92,-cardH/2-20);c.restore();
}
function getState(time){
  const scene=ep.scenes.find(s=>time>=s.start&&time<s.end)??ep.scenes.at(-1);
  const event=ep.events.findLast(e=>e.start<=time);
  const state=event?event.after:ep.initial;
  return {scene,event,state,progress:event?ease((time-event.start)/event.duration):1,
    inMotion:event?time<event.end:false,flat:ease((time-ep.scenes[1].start)/1.5)};
}
function header(time,s){
  const identity=`${String(ep.number).padStart(2,'0')} / ${ep.theme.toUpperCase()} / ${ep.conceptLabel.toUpperCase()}`;
  text(identity,94,100,24,P.muted,'left',400,true,620);
  text(ep.brand,986,100,32,P.gold,'right',500,false,350);
  line(94,139,986,139,'#77518688',1.5);
  text(s.title,540,250,s.title==='Insertion Sort'?70:60,P.gold,'center',600,false,920);
  text(s.subtitle,540,327,34,P.muted,'center',400,false,900);
  const labels={problem:'المشكلة',theory:'الفكرة',application:'التطبيق'};
  pill(labels[s.section],540,365,160,P.panel,P.muted,25);
}
function stage(time,{scene:s,event:e,state:st,progress:p,inMotion,flat}){
  const code=s.section==='application',showMemory=code;
  const depth=1-flat;
  if(depth>.001){
    c.save();c.globalAlpha=.65*depth;c.fillStyle='#170621';c.beginPath();c.ellipse(540,978,473,69,0,0,Math.PI*2);c.fill();
    c.fillStyle='#3F1E50';c.beginPath();c.moveTo(79,708);c.lineTo(960,708);c.lineTo(1002,970);c.lineTo(111,970);c.closePath();c.fill();
    for(let i=0;i<6;i++)line(98+i*174,713,127+i*174,956,'#7B55822C',2);
    c.restore();
  }
  if(code)text('numbers',109,706,29,P.muted,'left',400,true,250);
  for(let i=0;i<5;i++){
    const xx=X[i];
    c.save();c.globalAlpha=.3+.7*flat;
    rect(xx-cardW/2-7,rowY-7,cardW+14,cardH+20,23,'#220D32');
    strokeRect(xx-cardW/2-7,rowY-7,cardW+14,cardH+20,23,'#79548950',1.5);
    c.restore();
    if(code)text(i,xx,975,29,P.muted,'center',400,true);
  }
  // The old contents of the conceptual gap remain visible in code mode.
  if(st.hole!==null){
    const xx=X[st.hole],a=(inMotion&&e.kind==='save')?p:1;
    c.save();c.globalAlpha=a;
    c.setLineDash([9,8]);strokeRect(xx-cardW/2,rowY,cardW,cardH,20,P.gold,2.5);c.setLineDash([]);
    if(showMemory){text(st.numbers[st.hole],xx,rowY+104,58,'#C4ADCE70','center',400);text('هنكتب هنا',xx,rowY+155,22,P.muted,'center',400,false,135);}
    else text('مكان فاضي',xx,rowY+105,23,P.muted,'center',400,false,135);
    c.restore();
  }
  for(let i=0;i<st.slots.length;i++){
    const id=st.slots[i];if(id===null)continue;
    if(inMotion&&['shift','insert'].includes(e.kind)&&id===e.movingId)continue;
    let role=st.done?'found':'normal';
    if(s.id==='07'&&i===3)role='active';
    if(st.value!==null&&st.compareIndex===i&&['compare','shift'].includes(e?.kind))role='active';
    if(st.current===i&&st.value===null&&e?.kind==='select')role='active';
    let tilt=depth*(i-2)*.025,yy=rowY+depth*(i-2)*8;
    if(time<8&&i<2){const pulse=Math.sin(Math.PI*clamp((time-1)/1.2));tilt+=(i===0?-1:1)*.065*pulse;yy-=pulse*15;}
    card(ep.values[id],X[i],yy,role,{angle:tilt});
  }
  if(inMotion&&e.kind==='shift'){
    card(e.value,lerp(X[e.from],X[e.to],p),rowY,'active',{lift:Math.sin(p*Math.PI)*31});
  }
  const stored=inMotion&&e.kind==='insert'?e.before:st;
  if(stored.value!==null){
    const xx=826;let x=xx,y=valueY;
    if(inMotion&&e.kind==='save'){x=lerp(X[stored.current],xx,p);y=lerp(rowY,valueY,p)-Math.sin(p*Math.PI)*25;}
    if(inMotion&&e.kind==='insert'){
      x=lerp(xx,X[e.to],p);y=lerp(valueY,rowY,p)-Math.sin(p*Math.PI)*24;
    }
    if(!(inMotion&&e.kind==='save'&&p<.25)){
      const opacity=inMotion&&e.kind==='insert'?1-p:inMotion&&e.kind==='save'?p:1;
      c.save();c.globalAlpha=opacity;
      text(code?'value':'الكارت الجديد',xx,valueY-25,code?31:27,P.gold,'center',500,code,220);c.restore();
    }
    card(stored.value,x,y,'active',{scale:1});
  }
  if(s.id==='01'){
    const alpha=ease((time-1.5)/.8);c.save();c.globalAlpha=alpha;
    text('7 > 3',540,1154,72,P.gold,'center',500,true);
    text('الترتيب لسه محتاج يتظبّط',540,1230,38,P.muted,'center',400,false,860);
    c.restore();
  }
  // Comparisons are displayed only after their evaluation event starts.
  const lastCompare=ep.events.findLast(x=>x.start<=time&&['compare','bound'].includes(x.kind));
  if(st.value!==null&&st.condition!==null&&lastCompare?.pass===st.current){
    const comp=lastCompare;
    const formula=comp.kind==='bound'?'−1 >= 0':`${comp.left} > ${comp.right}`;
    const answer=comp.kind==='bound'?false:comp.result;
    const xx=code?310:430;
    pill(formula,xx,573,comp.kind==='bound'?268:230,P.panel,P.gold,code?35:39);
    pill(answer?'صح':'لأ',xx,637,94,answer?P.gold:P.panel,answer?P.inverse:P.muted,28);
  }
  if(code&&st.value!==null&&st.compareIndex!==null){
    const index=st.compareIndex,xx=index<0?79:X[index];
    arrow(xx,1035,xx,992,P.gold,3);
    const labelX=Math.max(255,Math.min(825,xx));
    pill(`compareIndex = ${index}`,labelX,1050,390,P.panel,P.gold,27);
  }else if(st.value===null&&flat>.5&&!(inMotion&&e?.kind==='insert')){
    const count=st.sortedCount;
    const x1=X[0]-cardW/2,x2=X[count-1]+cardW/2;
    const bracketY=code?1020:997;
    line(x1,bracketY,x2,bracketY,P.gold,3);
    line(x1,bracketY-12,x1,bracketY+1,P.gold,3);line(x2,bracketY-12,x2,bracketY+1,P.gold,3);
    text(st.done?'كل الأرقام مترتّبة':'جزء مترتّب',(x1+x2)/2,bracketY+53,31,P.gold,'center',500,false,Math.max(x2-x1+90,250));
    if(code&&st.current!==null){arrow(X[st.current],rowY-48,X[st.current],rowY-14);text(`current = ${st.current}`,X[st.current],rowY-64,26,P.gold,'center',400,true,260);}
  }
  if(!code&&st.value!==null){
    arrow(X[st.hole],1000,X[st.hole],948);
    text('مكان الإدخال',X[st.hole],1047,28,P.gold,'center',500,false,240);
  }
}

function codePanel({scene:s,event:e,state:st}){
  const kind=e?.kind;
  let rows=[],active=[],dim=[];
  if(s.id==='08'||s.id==='09'||(s.id==='14'&&['select','save','init'].includes(kind))){
    rows=['for current from 1','  to length(numbers) - 1:','    value = numbers[current]','    compareIndex = current - 1'];
    active=kind==='select'?[0,1]:kind==='save'?[2]:kind==='init'?[3]:[];
  }else if(s.id==='15'){
    rows=['return numbers'];active=kind==='return'?[0]:[];
  }else if(kind==='insert'){
    rows=['numbers[compareIndex + 1] = value'];active=[0];
  }else{
    rows=['while compareIndex >= 0','  and numbers[compareIndex] > value:','    numbers[compareIndex + 1] =','      numbers[compareIndex]','    compareIndex -= 1'];
    active=kind==='compare'?[0,1]:kind==='shift'?[2,3]:kind==='retreat'?[4]:kind==='bound'?[0]:[];
    if(kind==='bound')dim=[1];
  }
  stats.maxCodeLines=Math.max(stats.maxCodeLines,rows.length);
  const x=86,y=1174,w=908,lineH=54;
  text('Pseudocode',x+16,y-23,27,P.muted,'left',400,true,300);
  if(kind==='bound')text('من غير قراءة خارج الصف',x+w-15,y-23,26,P.gold,'right',500,false,530);
  rect(x,y,w,Math.max(rows.length*lineH+35,174),22,P.panel);
  strokeRect(x,y,w,Math.max(rows.length*lineH+35,174),22,'#78528550',1.5);
  for(const [i,row] of rows.entries()){
    if(active.includes(i)){rect(x+13,y+17+i*lineH,w-26,lineH-2,8,'#684277');rect(x+13,y+17+i*lineH,5,lineH-2,2,P.gold);}
    text(row,x+32,y+55+i*lineH,35,dim.includes(i)?'#9D82AC70':P.gold,'left',400,true,w-64);
  }
  if(kind==='insert'){
    const dest=e.to;
    text(`${e.before.compareIndex} + 1 = ${dest}`,540,y+128,35,P.muted,'center',400,true,780);
  }
  if(s.id==='15')text('[2, 3, 5, 6, 7]',540,y+130,39,P.muted,'center',400,true,780);
}
function theoryPanel(time,{scene:s,event:e,state:st}){
  if(s.id==='01')return;
  const x=100,y=1170,w=880;
  rect(x,y,w,250,24,P.panel);strokeRect(x,y,w,250,24,'#78528550',1);
  if(s.id==='06'){
    text('كل مرة، الجزء المترتّب يكبر',540,y+69,39,P.gold,'center',500,false,800);
    [1,2,3].forEach((n,i)=>{const xx=340+i*200;pill(n,xx,y+110,90,i===2?P.gold:'#4C2C60',i===2?P.inverse:P.gold,32);if(i<2)text('→',xx+100,y+149,34,P.muted,'center',400,true);});
  }else if(s.id==='07'){
    text('كل اللي قبله أكبر منه',540,y+84,41,P.gold,'center',500,false,800);
    text('نحوّل الفكرة لخطوات يقدر الكود ينفّذها',540,y+162,31,P.muted,'center',400,false,800);
  }else if(s.id==='02'){
    text('كارت لوحده = جزء مترتّب',540,y+90,42,P.gold,'center',500,false,800);
    text('بعده نختار الكارت اللي لسه مترتّبش',540,y+163,33,P.muted,'center',400,false,800);
  }else{
    let title='نحتفظ بالكارت، ونقارن باللي قبله',subtitle='القيمة تفضل محفوظة لحدّ ما نلاقي مكانها';
    if(e?.kind==='shift'){title='الأكبر يتحرّك مكان لليمين';subtitle='ده بيفتح مكان للكارت اللي معانا';}
    else if(e?.kind==='compare'){title=e.result?'الرقم اللي بنقارن بيه أكبر':'لقينا رقم أصغر، يبقى نقف';subtitle=e.result?'نحرّكه يمين، وبعدين نرجع خطوة':'نحطّ الكارت المحفوظ بعده';}
    else if(e?.kind==='bound'){title='وصلنا لأول الصف';subtitle='يبقى مكان الكارت هنا';}
    else if(e?.kind==='insert'){title='دخلنا الكارت في مكانه';subtitle='والجزء المترتّب كبر كارت';}
    text(title,540,y+91,39,P.gold,'center',500,false,800);
    text(subtitle,540,y+165,32,P.muted,'center',400,false,800);
  }
}
function limitationPanel(time){
  rect(100,1170,880,310,24,P.panel);
  text('مناسبة للقليل أو القريب من الترتيب',540,1237,38,P.gold,'center',500,false,800);
  if(time>=ep.scenes.at(-1).start+5){
    text('مثال عكسي: محتاج تحريك أكتر',540,1300,30,P.muted,'center',400,false,800);
    [7,6,5,3,2].forEach((n,i)=>{const xx=306+i*117;rect(xx-44,1335,88,79,12,'#563269');text(n,xx,1390,38,P.gold,'center',500);});
  }else text('Insertion Sort',540,1371,48,P.muted,'center',500,false,800);
}
function steps({scene:s,event:e},time){
  if(s.section==='problem')return;
  const labels=['نقارن','نحرّك','ندخل'],kind=e?.kind;
  let active=['compare','bound'].includes(kind)?0:['shift','retreat'].includes(kind)?1:kind==='insert'||kind==='return'?2:-1;
  if(s.id==='16'){
    text('Insertion Sort',540,1650,49,P.gold,'center',500,false,850);return;
  }
  for(let i=0;i<3;i++){
    const x=800-i*260;
    pill(labels[i],x,1590,205,i===active?P.gold:P.panel,i===active?P.inverse:P.muted,31);
    if(i<2)text('←',x-130,1629,29,P.muted,'center',400,true);
  }
}
function footer(time,s){
  chapters.forEach((q,i)=>{
    const x=100+(2-i)*300;
    rect(x,1789,270,4,2,'#77518666');
    const fraction=clamp((time-q.start)/(q.end-q.start));if(fraction>0)rect(x+270*(1-fraction),1789,270*fraction,4,2,P.gold);
    text(q.label,x+135,1840,27,s.section===q.id?P.gold:P.muted,'center',s.section===q.id?500:400,false,260);
  });
}
function draw(time){
  c=canvas.getContext('2d');c.drawImage(bg,0,0);
  const state=getState(time);header(time,state.scene);stage(time,state);
  if(state.scene.id==='16')limitationPanel(time);
  else if(state.scene.section==='application')codePanel(state);
  else theoryPanel(time,state);
  steps(state,time);footer(time,state.scene);stats.framesChecked++;
  return state;
}
function drawGuide(time,state){
  c=guide.getContext('2d');c.drawImage(canvas,0,0);
  c.drawImage(bg,0,1505,1080,252,0,1505,1080,252);
  text(`دليل التسجيل · مشهد ${state.scene.id}`,980,1545,25,P.muted,'right',400,false,650);
  const mm=String(Math.floor(time/60)).padStart(2,'0'),ss=String(Math.floor(time%60)).padStart(2,'0');
  text(`${mm}:${ss} / ${runtimeLabel}`,102,1545,23,P.muted,'left',400,true,290);
  const cue=ep.captions.find(q=>time>=q.start&&time<q.end);
  rect(86,1574,908,172,20,'#432456');
  if(cue){
    assert.ok(cue.lines.length<=2);stats.maxCaptionLines=Math.max(stats.maxCaptionLines,cue.lines.length);
    const y=cue.lines.length===1?1678:1644;
    cue.lines.forEach((s,i)=>text(s,540,y+i*65,43,P.gold,'center',400,false,838));
  }else text('وقفة قصيرة للصورة',540,1676,31,P.muted,'center',400,false,838);
  c=canvas.getContext('2d');
}

await mkdir(`${dir}/review`,{recursive:true});await mkdir(`${dir}/output`,{recursive:true});
const mode=process.argv[2]??'video';
if(mode==='stills'){
  const times=[2.5,14,25.5,31.4,36,44.2,48,55,63,71,82,90,95.4,103.6,106.1,112.1,115,118.5,125.2,127,131.5,133.7,137,143,158];
  const thumbs=[];
  for(const time of times){
    const st=draw(time);drawGuide(time,st);
    const name=`${String(Math.round(time*10)).padStart(4,'0')}`;
    await writeFile(`${dir}/review/frame-${name}.png`,canvas.toBuffer('image/png'));
    const phone=createCanvas(540,960);phone.getContext('2d').drawImage(guide,0,0,540,960);
    await writeFile(`${dir}/review/guide-phone-${name}.png`,phone.toBuffer('image/png'));
    const thumb=createCanvas(270,500),t=thumb.getContext('2d');t.drawImage(guide,0,0,270,480);t.fillStyle='#2D123F';t.fillRect(0,480,270,20);t.fillStyle='#F4D35E';t.font='14px sans-serif';t.fillText(`${time.toFixed(1)}s  ·  ${st.scene.id}`,12,495);thumbs.push(thumb);
  }
  for(let k=0;k<Math.ceil(thumbs.length/8);k++){
    const sheet=createCanvas(1080,1000),q=sheet.getContext('2d');q.fillStyle=P.bg;q.fillRect(0,0,1080,1000);
    thumbs.slice(k*8,k*8+8).forEach((s,i)=>q.drawImage(s,(i%4)*270,Math.floor(i/4)*500));
    await writeFile(`${dir}/review/contact-${k+1}.png`,sheet.toBuffer('image/png'));
  }
  // Inspect every frame's state and every caption layout before a long encode.
  for(let frame=0;frame<ep.duration*ep.fps;frame++){
    const st=draw(frame/ep.fps);drawGuide(frame/ep.fps,st);
  }
  await writeFile(`${dir}/review/layout-check.json`,JSON.stringify(stats,null,2)+'\n');
  console.log(JSON.stringify(stats));
}else if(mode==='frame'){
  const time=Number(process.argv[3]??1),st=draw(time);drawGuide(time,st);
  await writeFile(`${dir}/review/frame.png`,canvas.toBuffer('image/png'));
  await writeFile(`${dir}/review/guide-frame.png`,guide.toBuffer('image/png'));
}else{
  const outputs=[`${dir}/output/insertion-sort-silent-v${ep.revision}.mp4`,`${dir}/output/insertion-sort-recording-guide-v${ep.revision}.mp4`];
  const encoders=outputs.map(output=>{
    const child=spawn('ffmpeg',['-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pixel_format','rgba','-video_size','1080x1920','-framerate',String(ep.fps),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','19','-threads','4','-pix_fmt','yuv420p','-movflags','+faststart',output],{stdio:['pipe','inherit','inherit']});
    child.stdin.on('error',error=>{console.error(error.message);});
    return {child,completed:once(child,'close')};
  });
  const frames=Math.round(ep.duration*ep.fps);
  try{
    for(let frame=0;frame<frames;frame++){
      const time=frame/ep.fps,st=draw(time);drawGuide(time,st);
      const buffers=[canvas.data(),guide.data()];
      await Promise.all(encoders.map(async({child},i)=>{if(!child.stdin.write(buffers[i]))await once(child.stdin,'drain');}));
      if(frame%(ep.fps*10)===0)console.log(`Rendered ${Math.round(time)} / ${ep.duration} seconds (clean + guide)`);
    }
    for(const {child} of encoders)child.stdin.end();
    for(const {completed} of encoders){const [code]=await completed;assert.equal(code,0,'FFmpeg encode failed');}
  }catch(error){for(const {child} of encoders)child.kill();throw error;}
  await writeFile(`${dir}/review/render-check.json`,JSON.stringify({...stats,frames,duration:ep.duration,outputs,audioStreams:0,timingStatus:ep.timingStatus},null,2)+'\n');
  console.log(JSON.stringify({outputs,...stats,frames}));
}
