import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { intervalStage } from './audio-driven-motion.mjs';

const dir='episodes/001-binary-search';
const ep=JSON.parse(await readFile(`${dir}/source/timeline.json`,'utf8'));
GlobalFonts.registerFromPath('skills/cs-concept-script/assets/fonts/Alexandria-Variable.ttf','Workshop Alexandria');
GlobalFonts.registerFromPath('/System/Library/Fonts/Menlo.ttc','Workshop Mono');
const sprites={};
for(const name of ['neutral','active','found'])sprites[name]=await loadImage(`${dir}/source/ceramic/${name}.png`);
const canvas=createCanvas(ep.width,ep.height),c=canvas.getContext('2d');
const P={paper:ep.theme.background_color,ink:ep.theme.text_color,muted:'#C4ADCE',line:'#63426F',active:'#F4D35E',found:'#E8A84B',neutral:'#563269',panel:'#3C1D50',highlight:'#674078',shadow:'#1B0A27',inverse:'#2D123F',caption:'#432456',edge:'#8D659C'};
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},lerp=(a,b,t)=>a+(b-a)*t;
const iso=s=>s.replace(/[A-Za-z_][A-Za-z0-9_]*(?:[ \t]+[A-Za-z0-9_]+)*/g,w=>'\u2066'+w+'\u2069');
const clean=s=>s.replace(/[\u064B-\u065F\u0670\u0640]/g,'');
const stats={maxCaptionLines:0,maxHeadlineLines:0,checkedFrames:0,stateTransitions:[]};
let previousStateSignature='';
function font(size=42,weight=400,mono=false){c.font=`${weight} ${size}px "${mono?'Workshop Mono':'Workshop Alexandria'}"`;}
function text(str,x,y,size=42,color=P.ink,align='center',weight=400,mono=false){
 c.save();font(size,weight,mono);c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';
 const ar=/[\u0600-\u06ff]/.test(str);c.direction=ar?'rtl':'ltr';c.fillText(ar?iso(str):str,x,y);c.restore();
}
function wrapped(str,x,y,width,size=54,color=P.ink,weight=500,lineHeight=size*1.5){
 font(size,weight);const words=str.split(/\s+/),lines=[];let line='';
 for(const word of words){const trial=line?`${line} ${word}`:word;if(line&&c.measureText(iso(trial)).width>width){lines.push(line);line=word;}else line=trial;}if(line)lines.push(line);
 lines.forEach((s,i)=>text(s,x,y+i*lineHeight,size,color,'center',weight));return lines.length;
}
function rect(x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function line(x1,y1,x2,y2,color=P.line,width=2){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function event(s,key,fraction){return s.events[key]??s.duration*fraction;}
function wordTime(s,part,fallback){const w=s.words.find(w=>clean(w.text).includes(part));return w?w.start-s.start:fallback;}

const bg=createCanvas(1080,1920),b=bg.getContext('2d');
b.fillStyle=P.paper;b.fillRect(0,0,1080,1920);
let seed=14;for(let i=0;i<6000;i++){seed=(seed*1664525+1013904223)>>>0;const x=seed%1080;seed=(seed*1664525+1013904223)>>>0;const y=seed%1920;b.fillStyle=i%2?'rgba(40,54,44,.018)':'rgba(255,255,255,.09)';b.fillRect(x,y,1,1);}

function state(s,t){
 const m=s.motion;
 let st={lo:s.lo??0,hi:s.hi??14,mid:s.mid??null,probe:s.probe??0,target:s.target??71,found:false,code:s.section==='application',flat:['challenge','hero','cost'].includes(s.mode)?0:1,empty:false,compared:true,showLeft:true,showRight:true};
 if(s.mode==='hero'){
  const begin=m?.scanStart??event(s,'scanStart',.1);
  const end=m?.scanEnd??Math.max(begin+.4,event(s,'scanEnd',.6)+.15);
  const progress=clamp((t-begin)/(end-begin));
  const count=Math.min(s.endProbe,Math.floor(lerp(s.startProbe,s.endProbe,progress)));
  st.mid=count>0?Math.min(10,count-1):null;st.probe=count;st.found=count===11;
 }
 if(s.mode==='cost'){st.mid=10;st.probe=11;st.found=true;}
 if(s.mode==='unfold'){st.flat=ease((t-(m?.unfoldStart??event(s,'unfold',.05)))/(m?m.unfoldEnd-m.unfoldStart:2.5));st.mid=null;}
 if(s.mode==='array'&&m){
  if(s.id==='05-mechanism')st.mid=t<m.selectMid?null:7;
  if(s.id==='06-compare')st.compared=t>=m.compare;
 }
 if(s.mode==='discard'){st.lo=t<(m?.discard??event(s,'discard',.25))?0:8;st.mid=null;}
 if(s.mode==='upper'){
  if(m){st.mid=t<m.selectMid?null:11;st.probe=t<m.selectMid?1:2;st.compared=t>=m.compare;}
  if(t>=(m?.discard??event(s,'exclude',.65))){st.hi=10;st.mid=null;}
 }
 if(s.mode==='find'){
  if(m){st.mid=t<m.selectMid?null:9;st.probe=t<m.selectMid?2:3;st.compared=t>=m.compare;}
  if(t>=(m?.discard??event(s,'discard',.38))){st.lo=10;st.mid=null;}
  if(t>=(m?.remaining??event(s,'remaining',.58))){st.mid=10;st.probe=4;st.compared=true;}
  if(t>=(m?.found??wordTime(s,'لقينا',s.duration*.77)))st.found=true;
 }
 if(s.mode==='invariant'){
  const k=m?Math.max(0,intervalStage(t,m.replayStages)):Math.min(3,Math.floor(t/1.5));[st.lo,st.hi]=[[0,14],[8,14],[8,10],[10,10]][k];st.mid=10;st.found=true;
 }
 if(s.mode==='code-setup'&&m){st.showLeft=t>=m.left;st.showRight=t>=m.right;}
 if(s.mode==='code-lo'&&t>=(m?.updateEnd??event(s,'update',.65)+.35)){st.lo=8;st.mid=null;}
 if(s.mode==='code-hi'&&t>=(m?.updateEnd??event(s,'update',.65)+.35)){st.hi=10;st.mid=null;}
 if(s.mode==='code-mid')st.mid=t<(m?.result??event(s,'middle',.4))?null:7;
 if(s.mode==='code-return'){
  const hit=wordTime(s,'لقينا',s.duration*.55);
  if(t>=(m?.updateEnd??hit-.9)){st.lo=10;st.mid=null;}
  if(t>=(m?.selectMid??hit-.9)){st.mid=10;st.probe=4;}
  if(t>=(m?.found??hit+.25))st.found=true;
 }
 if(s.mode==='missing'){
  const stop=event(s,'cross',.65)+.25;
  const k=m?intervalStage(t,m.searchStages):Math.min(4,Math.floor(clamp((t-.2)/Math.max(1,stop-.5))*4.99));
  if(k<0){st.lo=0;st.hi=14;st.mid=null;st.probe=0;}
  else{[st.lo,st.hi,st.mid]=[[0,14,7],[8,14,11],[8,10,9],[10,10,10],[11,10,null]][k];st.probe=Math.min(4,k+1);st.empty=k===4;}
 }
 if(s.mode==='payoff'){
  st.found=true;
  if(s.voiceSource==='user-supplied'){
   if(t>=(m?.sortedStart??s.events.sorted)){st.lo=0;st.hi=14;}
   if(t>=(m?.closing??s.events.closing)){
    const k=m?intervalStage(t,m.closingStages):Math.min(3,Math.floor((t-s.events.closing)/.44));
    [st.lo,st.hi,st.mid]=[[0,14,7],[8,14,11],[8,10,9],[10,10,10]][k];
    st.summaryStep=k;st.found=k===3;
   }
  }
 }
 return st;
}
function ground(alpha){
 c.save();c.globalAlpha=alpha*.65;
 for(let i=-6;i<=6;i++){
  line(540+i*100-350,700-i*25,540+i*100+350,1260-i*25,P.line,1.5);
  line(540+i*100+350,700+i*25,540+i*100-350,1260+i*25,P.line,1.5);
 }
 c.restore();
}
function module(i,st,t,s){
 const col=i%3,row=Math.floor(i/3),flatCol=i%5,flatRow=Math.floor(i/5);
 const code=st.code,flat=st.flat;
 const ix=540+(col-1)*250-(row-2)*30,iy=925+(col-1)*45+(row-2)*140;
 const fx=180+flatCol*180,fy=(code?585:720)+flatRow*170;
 const x=lerp(ix,fx,flat),y=lerp(iy,fy,flat);
 const rejected=i<st.lo||i>st.hi;
 const active=i===st.mid&&!rejected,found=st.found&&i===10;
 const float=(1-flat)*Math.sin(t*.85+i*.41)*3.5;
 let size=lerp(210,205,flat);
 const reveal=s.id==='01-hook'?ease((t-.025*i)/.65):1;
 const intro=.75+.25*reveal;
 const yy=y+(1-reveal)*24+float-(active?10:0);
 c.save();c.globalAlpha=intro*st.visibility[i];
 // Contact shadows are drawn independently so the same asset can lift and unfold.
 if(flat<1){
  c.save();c.globalAlpha*=(1-flat)*.26;c.translate(x+8,yy+92);c.scale(1,.22);
  const shadow=c.createRadialGradient(0,0,0,0,0,105);shadow.addColorStop(0,'#13081C');shadow.addColorStop(1,'rgba(19,8,28,0)');c.fillStyle=shadow;c.beginPath();c.arc(0,0,105,0,Math.PI*2);c.fill();c.restore();
  c.save();c.globalAlpha*=1-flat;c.drawImage(sprites[found?'found':active?'active':'neutral'],x-size/2,yy-size/2,size,size);c.restore();
 }
 if(flat>0){
  c.save();c.globalAlpha*=flat;
  rect(x-72,yy-58+7,144,116,13,rejected?P.neutral:P.shadow);
  rect(x-72,yy-58,144,116,13,found?P.found:active?P.active:P.neutral);
  line(x-56,yy-49,x+56,yy-49,active||found?'#FFF1AE':P.edge,2);c.restore();
 }
 c.save();c.translate(x-(1-flat)*size*.085,yy+(1-flat)*size*.085);c.transform(1,(1-flat)*.23,0,1,0,0);
 text(String(ep.values[i]),0,18,lerp(42,52,flat),active||found?P.inverse:P.ink,'center',500);c.restore();
 if(flat>.85){text(String(i),x,yy+88,27,P.muted,'center',400,true);}
 if((active||found)&&flat>.8){
  c.strokeStyle=P.ink;c.lineWidth=3;c.beginPath();c.roundRect(x-76,yy-62,152,124,16);c.stroke();
  if(found){line(x+43,yy-36,x+49,yy-30,P.inverse,3);line(x+49,yy-30,x+60,yy-44,P.inverse,3);}
 }
 c.restore();
}
function codePanel(s,t,st){
 const m=s.motion;
 let rows=[],active=0;
 const branches=['if numbers[middle] == target:','    return middle','elif numbers[middle] < target:','    left = middle + 1','else:','    right = middle - 1'];
 if(s.mode==='code-setup'){
  rows=['left = 0','right = length(numbers) - 1','while left <= right:','    ...'];active=m?(t<m.left?-1:t<m.right?0:1):(t<event(s,'right',.55)?0:1);
 }else if(s.mode==='code-mid'){
  rows=['while left <= right:','    middle = floor(','        (left + right) / 2', '    )','','middle = floor(14 / 2) = 7'];active=t<event(s,'middle',.4)?0:t<wordTime(s,'نجمع',s.duration*.5)?1:t<wordTime(s,'ونقرب',s.duration*.8)?2:5;
  if(m){active=t<m.middle?0:t<m.sum?1:t<m.round?2:t<m.result?1:5;rows[5]=t<m.sum?'':t<m.result?'middle = floor(14 / 2)':'middle = floor(14 / 2) = 7';}
 }else if(s.mode==='missing'){
  rows=['while left <= right:','    ...','','return NOT_FOUND'];active=(m?t>=m.return:st.empty)?3:0;
 }else{
  rows=branches;
  if(s.mode==='code-equality')active=t<event(s,'else',.65)?0:2;
  if(s.mode==='code-lo')active=t<wordTime(s,'نحرك',s.duration*.35)?2:3;
  if(s.mode==='code-hi')active=t<wordTime(s,'نرجع',s.duration*.35)?4:5;
  if(s.mode==='code-return')active=st.found?(t<wordTime(s,'بنرجع',s.duration*.8)?0:1):st.mid===10?0:3;
  if(m){
   if(s.mode==='code-equality')active=t<m.else?0:2;
   if(s.mode==='code-lo')active=t<m.updateStart?2:3;
   if(s.mode==='code-hi')active=t<m.updateStart?4:5;
   if(s.mode==='code-return')active=t<m.updateStart?2:t<m.selectMid?3:t<m.return?0:1;
  }
 }
 const x=85,y=1150,w=910,lineH=54;
 text('Pseudocode',x+8,y-22,29,P.muted,'left',500);
 rect(x,y,w,Math.max(270,rows.length*lineH+32),18,P.panel);
 if(active>=0){const hl=y+20+active*lineH;rect(x+12,hl-1,w-24,lineH-2,6,P.highlight);rect(x+12,hl-1,5,lineH-2,2,P.ink);}
 rows.forEach((row,i)=>{font(39,400,true);if(c.measureText(row).width>w-64)throw new Error(`Code line overflows: ${row}`);text(row,x+32,y+56+i*lineH,39,P.ink,'left',400,true);});
}
function header(s,st,t){
 text(ep.brand,965,116,34,P.ink,'right',500);
 text('01 / BINARY SEARCH',105,116,24,P.muted,'left',400,true);
 line(105,150,975,150,P.line,2);
 const titleY=260;
 let headline=s.headline;
 if((s.id==='06-compare'||s.mode==='upper')&&!st.compared)headline='نقارن بالمطلوب';
 if(s.mode==='payoff'&&s.voiceSource==='user-supplied'){
  if(t>=s.events.binary)headline='4 مقارنات بدل 11';
  if(t>=s.events.sorted)headline='الترتيب هو المفتاح';
  if(t>=s.events.closing)headline='قوة Binary Search';
 }
 stats.maxHeadlineLines=Math.max(stats.maxHeadlineLines,wrapped(headline,540,titleY,890,64,P.ink,600,92));
 rect(409,382,262,125,20,st.target===73?P.found:P.panel);
 text('target',540,418,26,st.target===73?P.inverse:P.muted,'center',400,true);text(String(st.target),540,481,58,st.target===73?P.inverse:P.ink,'center',500);
}
function details(s,t,st){
 if(st.flat<.99){
  if(s.mode==='challenge'){
   c.strokeStyle=P.ink;c.lineWidth=3;
   for(let i=0;i<4;i++){c.beginPath();c.arc(435+i*70,1400,18,0,Math.PI*2);c.stroke();}
   text('4 خطوات؟',540,1490,38,P.ink,'center',500);
  }else if(s.mode==='cost'){
   text('كل ما تكبر، هنفحص عناصر أكتر',540,1430,40,P.ink);
  }else if(s.mode!=='unfold'){
   text(`${st.probe} / 11`,540,1390,64,P.ink,'center',500,true);
   text('element checks',540,1442,28,P.muted);
   text('Array = مجموعة قيم',540,1500,32,P.muted);
  }
  return;
 }
 if(st.code&&s.mode!=='payoff'){
  text(st.showLeft?`left = ${st.lo}`:'left = —',220,1072,35,P.ink,'center',500,true);
  text(st.mid===null?'middle = —':`middle = ${st.mid}`,540,1072,35,P.ink,'center',500,true);
  text(st.showRight?`right = ${st.hi}`:'right = —',860,1072,35,P.ink,'center',500,true);
  codePanel(s,t,st);
 }else if(s.mode==='payoff'){
  const y=1195;
  const supplied=s.voiceSource==='user-supplied';
  const m=s.motion;
  const binary=m?ease((t-m.binaryStart)/(m.binaryEnd-m.binaryStart)):supplied?ease((t-s.events.binary)/.65):1;
  const linear=m?ease((t-m.linearStart)/(m.linearEnd-m.linearStart)):supplied?ease((t-s.events.linear)/.38):1;
  text('Linear Search',110,y,33,P.muted,'left');text(String(Math.ceil(11*linear)),965,y,48,P.ink,'right',500);
  rect(110,y+25,855,32,6,P.panel);
  if(linear>0)rect(110,y+25,855*linear,32,6,P.muted);
  text('Binary Search',110,y+125,33,P.ink,'left');text(String(Math.ceil(4*binary)),965,y+125,48,P.ink,'right',500);
  rect(110,y+150,855,32,6,P.panel);
  if(binary>0)rect(110,y+150,855*4/11*binary,32,6,P.active);
  text('بنعدّ العناصر اللي فحصناها',540,y+235,31,P.muted);
  if(supplied&&t>=s.events.sorted&&t<s.events.closing){
   text('الأرقام مترتّبة من الصغير للكبير',540,1100,33,P.ink,'center',500);
   for(let row=0;row<3;row++)for(let col=0;col<4;col++){
    const x=270+180*col,yy=585+170*row;
    c.save();c.globalAlpha=m?ease((t-m.sortedStart)/(m.sortedEnd-m.sortedStart)*2-(row*4+col)/11):ease((t-s.events.sorted-(row*4+col)*.045)/.35);
    line(x-8,yy,x+8,yy,P.ink,2);line(x+2,yy-6,x+8,yy,P.ink,2);line(x+2,yy+6,x+8,yy,P.ink,2);c.restore();
   }
  }
  if(supplied&&t>=s.events.closing){
   for(const [i,count] of [15,7,3,1].entries()){
    const x=330+i*140,selected=i===st.summaryStep;
    rect(x-44,1051,88,60,12,selected?P.active:P.panel);
    text(String(count),x,1093,32,selected?P.inverse:P.muted,'center',500,true);
    if(i<3)text('→',x+70,1090,28,P.muted,'center',400,true);
   }
  }
 }else{
  const remaining=Math.max(0,st.hi-st.lo+1);
  if(s.mode==='invariant'){
   rect(175,1250,730,110,16,P.panel);text(s.motion&&t<s.motion.prerequisite?'الرقم لسه ممكن يكون هنا':'شرط أساسي: الأرقام مترتّبة',540,1320,38,P.ink,'center',500);
  }else if(st.found){
   text('71 = 71',540,1288,67,P.ink,'center',500,true);
   text('4 element checks',540,1400,38,P.muted);
  }else if(s.mode==='unfold'){
   text('index: 0 → 14',540,1288,40,P.muted,'center',400,true);
   text('من الصغير للكبير',540,1390,42,P.ink);
   text('من الشمال لليمين، والصفوف مكمّلة بعض',540,1460,29,P.muted);
  }else{
   const equation=st.mid===null?`${remaining} elements`:!st.compared?`${ep.values[st.mid]} ? 71`:st.mid===11?'78 > 71':st.mid===10?'71 = 71':st.mid===9?'64 < 71':'50 < 71';
   text(equation,540,1288,66,P.ink,'center',500,true);
   if(st.probe>0)text(`comparison ${st.probe}  ·  ${remaining} elements`,540,1400,33,P.muted,'center',400,true);
  }
 }
}
function captions(time){
 const cue=ep.captionCues.find(q=>time>=q.start&&time<q.end);
 if(!cue)return;
 rect(95,1583,890,176,18,P.caption);
 font(45,400);const words=cue.text.split(/\s+/),lines=[];let row='';
 for(const word of words){const trial=row?row+' '+word:word;if(row&&c.measureText(iso(trial)).width>812){lines.push(row);row=word;}else row=trial;}if(row)lines.push(row);
 if(lines.length===2&&words.length>=4){
  let best=null;
  const carry=new Set(['الـ','ال','في','من','على','عند','الواحد','الأربعة','التمانية','التلاتة','بأربع','أربع','رقم','Binary','Not']);
  for(let i=2;i<=words.length-2;i++){
   const candidate=[words.slice(0,i).join(' '),words.slice(i).join(' ')];
   const widths=candidate.map(line=>c.measureText(iso(line)).width);
   const score=Math.abs(widths[0]-widths[1])+(carry.has(words[i-1])?1000:0);
   if(widths.every(w=>w<=812)&&(!best||score<best.score))best={lines:candidate,score};
  }
  if(best)lines.splice(0,2,...best.lines);
 }
 stats.maxCaptionLines=Math.max(stats.maxCaptionLines,lines.length);
 if(lines.length>2)throw new Error(`Caption too long at ${time}: ${cue.text}`);
 const y=lines.length===1?1685:1645;
 lines.forEach((row,i)=>text(row,540,y+i*77,45,P.ink,'center',400));
}
function footer(time,s){
 const labels=['المشكلة','الفكرة','التطبيق'],sections=['problem','theory','application'];
 labels.forEach((label,i)=>{
  const x=100+(2-i)*305;
  line(x,1830,x+265,1830,s.section===sections[i]?P.ink:P.line,4);
  text(label,x+132,1878,26,s.section===sections[i]?P.ink:P.muted,'center',s.section===sections[i]?500:400);
 });
}
function draw(time){
 const s=ep.scenes.find(s=>time>=s.start&&time<s.end)??ep.scenes.at(-1),t=time-s.start,st=state(s,t);
 const observable={scene:s.id,left:st.lo,right:st.hi,middle:st.mid,probe:st.probe,found:st.found,empty:st.empty,compared:st.compared};
 const signature=JSON.stringify(observable);
 if(signature!==previousStateSignature){stats.stateTransitions.push({time,...observable});previousStateSignature=signature;}
 const recent=Array.from({length:8},(_,i)=>state(s,Math.max(0,t-i/30)));
 st.visibility=ep.values.map((_,i)=>recent.reduce((sum,p)=>sum+(i<p.lo||i>p.hi?.14:1),0)/recent.length);
 c.clearRect(0,0,1080,1920);c.drawImage(bg,0,0);
 if(s.mode==='cost'){
  c.save();c.globalAlpha=.12;
  for(let j=0;j<4;j++)for(let i=0;i<6;i++)rect(85+i*175,540+j*180,115,100,12,P.neutral);
  c.restore();
 }
 header(s,st,t);ground(1-st.flat);
 for(let i=0;i<15;i++)module(i,st,t,s);
 details(s,t,st);captions(time);footer(time,s);stats.checkedFrames++;
}

await mkdir(`${dir}/output`,{recursive:true});
await mkdir(`${dir}/review`,{recursive:true});
const arg=process.argv[2]??'video';
if(arg==='stills'){
 for(const [i,s] of ep.scenes.entries()){
  draw(s.start+Math.min(s.duration*.65,s.duration-.5));
  await writeFile(`${dir}/review/${String(i+1).padStart(2,'0')}-${s.mode}.png`,canvas.toBuffer('image/png'));
 }
 console.log(JSON.stringify(stats));
}else if(arg==='frame'){
 draw(Number(process.argv[3]??1));await writeFile(`${dir}/review/frame.png`,canvas.toBuffer('image/png'));console.log(stats);
}else{
 const output=`${dir}/output/binary-search-ar-EG-vertical-v${ep.revision}.mp4`;
 const silent=`${dir}/output/binary-search-ar-EG-vertical-v${ep.revision}-graphics.mp4`;
 const master=`${dir}/output/binary-search-ar-EG-vertical-v${ep.revision}-original-audio.mov`;
 const audioSource=ep.audioPolicy?.sourceFile??`${dir}/audio/narration-timed.wav`;
 const sourceHash=createHash('sha256').update(await readFile(audioSource)).digest('hex');
 if(ep.audioPolicy?.locked&&sourceHash!==ep.audioPolicy.sourceSha256)throw new Error('Original audio hash changed; export stopped.');
 if(ep.audioPolicy?.locked&&ep.scenes.some(s=>!s.motion))throw new Error('Locked audio requires spoken-span visual timing for every scene.');
 const ff=spawn('ffmpeg',['-hide_banner','-loglevel','warning','-y','-f','rawvideo','-pixel_format','rgba','-video_size','1080x1920','-framerate',String(ep.fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',silent],{stdio:['pipe','inherit','inherit']});
 const completed=once(ff,'close');
 ff.stdin.on('error',error=>{console.error(error.message);process.exitCode=1;});
 const frames=Math.round(ep.duration*ep.fps);
 for(let frame=0;frame<frames;frame++){
  draw(frame/ep.fps);
  if(!ff.stdin.write(canvas.data()))await once(ff.stdin,'drain');
  if(frame%(ep.fps*10)===0)console.log(`Rendered ${Math.round(frame/ep.fps)} / ${ep.duration.toFixed(1)} seconds`);
 }
 ff.stdin.end();const [code]=await completed;
 if(code!==0)throw new Error(`FFmpeg exited ${code}`);
 if(createHash('sha256').update(await readFile(audioSource)).digest('hex')!==sourceHash)throw new Error('Original audio changed while rendering.');
 const mux=['-v','error','-y','-i',silent,'-i',audioSource,'-map','0:v:0','-map','1:a:0','-c:v','copy','-metadata:s:a:0','language=ara'];
 execFileSync('ffmpeg',[...mux,'-c:a','copy','-movflags','+faststart',master]);
 execFileSync('ffmpeg',[...mux,'-c:a','aac','-b:a','192k','-movflags','+faststart',output]);
 if(ep.audioPolicy?.locked){
  const decoded=execFileSync('ffmpeg',['-v','error','-i',master,'-map','0:a:0','-f','s16le','pipe:1'],{maxBuffer:128*1024*1024});
  const hash=createHash('sha256').update(decoded).digest('hex');
  if(hash!==ep.audioPolicy.decodedPcmSha256||decoded.length!==ep.audioPolicy.frames*2)throw new Error('The master audio is not sample-identical to the original WAV.');
  await writeFile(`${dir}/review/original-audio-verification.json`,JSON.stringify({source:audioSource,sourceSha256:sourceHash,master,decodedPcmSha256:hash,sourcePcmSha256:ep.audioPolicy.decodedPcmSha256,identical:true,sampleCount:decoded.length/2,sampleRate:ep.audioPolicy.sampleRate,filters:[],audioSpeed:1,audioPadded:false,audioTrimmed:false},null,2));
 }
 await writeFile(`${dir}/review/render-check.json`,JSON.stringify({...stats,frames,duration:ep.duration,output,master,silent,audioSource,audioSourceSha256:sourceHash,audioFilters:[]},null,2));
 console.log(`Video exported: ${output}`);
}
