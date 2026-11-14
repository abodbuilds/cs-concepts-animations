import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const dir='episodes/001-binary-search';
const ep=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
if(['complete-recording','line-timed-recording'].includes(ep.voiceoverSource?.mode)){
 await import('./prepare-supplied-episode.mjs');
 process.exit(0);
}
if(ep.voiceReplacement){
 await import('./prepare-user-voice.mjs');
 process.exit(0);
}
const spoken=JSON.parse(await readFile(`${dir}/source/narration-ar-EG.json`,'utf8'));
const full=ep.scenes.map(s=>spoken[s.id]).join('\n\n');
const generation=JSON.parse(await readFile(`${dir}/audio/generation.json`,'utf8'));
const assembly=JSON.parse(await readFile(`${dir}/audio/assembly.json`,'utf8'));
if(assembly.fullSourceHash!==generation.hash||assembly.textHash!==createHash('sha256').update(full).digest('hex'))throw new Error('Narration assembly is stale; run production/finalize-voice.mjs.');
const voiceFile=`${dir}/audio/narration-final.wav`;
const a=JSON.parse(await readFile(`${dir}/audio/alignment-final.json`,'utf8'));
if(a.characters.join('')!==full)throw new Error('Narration alignment does not match the approved synthesis text.');
const starts=a.characterStartTimesSeconds, ends=a.characterEndTimesSeconds;
const originalDuration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',voiceFile],{encoding:'utf8'}).trim());
const plain=s=>s.replace(/[\u064B-\u065F\u0670\u0640]/g,'');
const canon=s=>plain(s).replace(/[^\p{L}\p{N}_]/gu,'').toLowerCase();
let offset=0;
for(const s of ep.scenes){s.tts=spoken[s.id];s.charStart=offset;s.charEnd=offset+s.tts.length-1;offset+=s.tts.length+2;}
ep.pauseChecks=[];
for(const note of ep.delivery?.pauseNotes??[]){
 const scene=ep.scenes.find(s=>s.id===note.scene);
 if(!scene)throw new Error(`Unknown pause scene: ${note.scene}`);
 const tokens=[...scene.tts.matchAll(/\S+/g)];
 const i=tokens.findIndex((word,index)=>canon(word[0])===canon(note.after)&&canon(tokens[index+1]?.[0]??'')===canon(note.before));
 if(i<0)throw new Error(`Requested pause phrase is missing: ${note.after} → ${note.before}`);
 const before=tokens[i],after=tokens[i+1],core=before[0].replace(/[^\p{L}\p{N}\p{M}]+$/gu,'');
 const beforeEnd=ends[scene.charStart+before.index+core.length-1],afterStart=starts[scene.charStart+after.index];
 const gap=afterStart-beforeEnd;
 if(gap<(note.minimumGapSeconds??.3))throw new Error(`Requested pause is too short: ${gap.toFixed(3)} seconds.`);
 ep.pauseChecks.push({scene:scene.id,after:note.after,before:note.before,sourceStart:beforeEnd,sourceEnd:afterStart,gapSeconds:gap});
}
const cuts=[0];
for(let i=1;i<ep.scenes.length;i++)cuts.push((ends[ep.scenes[i-1].charEnd]+starts[ep.scenes[i].charStart])/2);
cuts.push(originalDuration);
ep.scenes.forEach((s,i)=>{s.sourceStart=cuts[i];s.sourceEnd=cuts[i+1];s.voiceLength=cuts[i+1]-cuts[i];s.voiceOffset=.3;s.minimum=s.voiceLength+1;});
const minimum=ep.scenes.reduce((n,s)=>n+s.minimum,0);
const target=Math.max(150,minimum);
if(target>=179)throw new Error(`Narration plus reading holds would take ${target}s; shorten the script.`);
const weights=ep.scenes.map(s=>Math.max(.1,s.duration-s.minimum));
const weightSum=weights.reduce((x,y)=>x+y,0);
let cursor=0;
const captions=[];
for(let i=0;i<ep.scenes.length;i++){
 const s=ep.scenes[i];
 s.duration=Math.round((s.minimum+(target-minimum)*weights[i]/weightSum)*ep.fps)/ep.fps;
 s.start=cursor;s.end=cursor+s.duration;cursor=s.end;
 const words=[...s.tts.matchAll(/\S+/g)].map(m=>({
  text:plain(m[0]),start:s.start+s.voiceOffset+starts[s.charStart+m.index]-s.sourceStart,
  end:s.start+s.voiceOffset+ends[s.charStart+m.index+m[0].length-1]-s.sourceStart,
 }));
 s.words=words;
 s.events={};
 for(const [key,term] of Object.entries({exclude:'فنستبعده',discard:'نستبعد',remaining:'فاضل',found:'لقينا',larger:'أكبر',smaller:'أصغر',update:'بخطوة',notice:'كده',else:'غير',right:'right',left:'left',middle:'middle',return:'بنرجع',absent:'Found',...s.visualAnchors})){
  const matches=words.filter(w=>canon(w.text).includes(canon(term)));
  if(matches.length)s.events[key]=(key==='update'?matches.at(-1):matches[0]).start-s.start;
 }
 let group=[];
 const flush=()=>{if(group.length){captions.push({scene:s.id,text:group.map(w=>w.text).join(' '),start:group[0].start,end:group.at(-1).end+.18});group=[];}};
 const connectors=new Set(['على','من','في','عند','مع','أو','اللي','قبل','بعد','بدل','رقم','واحد','تمانية','أربعة','تلاتة','بأربع','الواحد','التمانية','الأربعة','التلاتة']);
 for(const word of words){
  if(group.length&&(group.length>=8||group.map(w=>w.text).join(' ').length+word.text.length>56)){
   const carry=[];
   while(group.length>2&&connectors.has(canon(group.at(-1).text)))carry.unshift(group.pop());
   flush();group=carry;
  }
  group.push(word);
  if((/[.!؟؛…]$/.test(word.text)&&group.length>=2)||(/،$/.test(word.text)&&group.length>=3))flush();
 }
 flush();
 const last=captions.at(-1);last.end=s.end-.2;
}
ep.duration=Math.round(cursor*ep.fps)/ep.fps;
for(const pause of ep.pauseChecks){const scene=ep.scenes.find(s=>s.id===pause.scene);pause.timelineStart=scene.start+scene.voiceOffset+pause.sourceStart-scene.sourceStart;pause.timelineEnd=pause.timelineStart+pause.gapSeconds;}
for(let i=0;i<captions.length-1;i++)captions[i].end=Math.min(captions[i].end,captions[i+1].start);
ep.captionCues=captions;
await mkdir(`${dir}/output`,{recursive:true});
await writeFile(`${dir}/source/timeline.json`,JSON.stringify(ep,null,2));

// Decode once, then insert real pauses between complete speech segments.
const pcm=execFileSync('ffmpeg',['-v','error','-i',voiceFile,'-f','f32le','-ac','1','-ar','48000','pipe:1'],{maxBuffer:128*1024*1024});
const input=new Float32Array(pcm.buffer,pcm.byteOffset,pcm.length/4);
const sr=48000,mix=new Float32Array(Math.ceil(ep.duration*sr));
for(const s of ep.scenes){
 const begin=Math.round(s.sourceStart*sr),end=Math.min(input.length,Math.round(s.sourceEnd*sr));
 mix.set(input.subarray(begin,end),Math.round((s.start+s.voiceOffset)*sr));
}
function click(time,success=false){
 const start=Math.round(time*sr),length=Math.round((success?.24:.045)*sr);
 for(let i=0;i<length&&start+i<mix.length;i++){
  const t=i/sr,envelope=Math.exp(-t*(success?18:105));
  const wave=success?Math.sin(2*Math.PI*660*t)+.45*Math.sin(2*Math.PI*990*t):Math.sin(2*Math.PI*820*t)+.4*Math.sin(2*Math.PI*1430*t);
  mix[start+i]+=wave*envelope*.012;
 }
}
for(const s of ep.scenes){
 if(s.mode==='hero'){
  const begin=s.events.scanStart??s.duration*.1;
  const end=Math.max(begin+.4,(s.events.scanEnd??s.duration*.6)+.15);
  for(let k=s.startProbe+1;k<=s.endProbe;k++)click(s.start+begin+(k-s.startProbe)*(end-begin)/(s.endProbe-s.startProbe));
 }
 else if(['upper','code-hi','code-lo','discard'].includes(s.mode))click(s.start+(s.events.exclude??s.events.notice??s.duration*.6));
 else if(['find','code-return','payoff'].includes(s.mode))click(s.start+(s.events.found??s.duration*.6),true);
}
const wav=Buffer.alloc(44+mix.length*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(sr,24);wav.writeUInt32LE(sr*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(mix.length*2,40);
for(let i=0;i<mix.length;i++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,mix[i]))*32767),44+i*2);
await writeFile(`${dir}/audio/narration-timed.wav`,wav);
function stamp(t,sep=','){const ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}${sep}${String(ms%1000).padStart(3,'0')}`;}
await writeFile(`${dir}/output/binary-search.ar-EG.srt`,captions.map((c,i)=>`${i+1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n'));
const short=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const pseudocode=`binary_search(numbers, target):\n    left = 0\n    right = length(numbers) - 1\n    while left <= right:\n        middle = floor((left + right) / 2)\n        if numbers[middle] == target:\n            return middle\n        elif numbers[middle] < target:\n            left = middle + 1\n        else:\n            right = middle - 1\n    return NOT_FOUND`;
let doc=`# Episode 001 — Binary Search\n\n**Audience:** beginner programmers. **Frame:** 1080 × 1920, 9:16, 30 fps. **Language:** Egyptian Arabic with English technical terms. **Style:** Logic Workshop, Alexandria, yellow ${ep.theme.text_color} on deep purple ${ep.theme.background_color}. **Brand:** @abodbuilds.\n\n**Learning outcome:** ${ep.learningOutcome}\n\n**Narrator:** ElevenLabs v4, ${ep.voice.voiceName}. Selectively vowelled, conversational synthesis input is in [narration-with-tashkeel.txt](narration-with-tashkeel.txt). Captions omit vowel marks for readability.\n\n**Runtime:** ${ep.duration.toFixed(2)} seconds, timed against ${originalDuration.toFixed(2)} seconds of generated narration with pauses for animation and reading.\n\n| Time | Exact spoken script | Visual state and action | On-screen headline | Transition / sound |\n| --- | --- | --- | --- | --- |\n`;
doc+=ep.scenes.map(s=>`| ${short(s.start)}–${short(s.end)} | ${s.tts} | ${s.visual} | ${s.headline} | ${s.sound} |`).join('\n');
doc+=`\n\n${ep.pauseChecks.map(p=>`Requested pause after “${p.after}” and before “${p.before}”: ${p.gapSeconds.toFixed(2)} seconds, in the final audio at ${stamp(p.timelineStart,'.')}–${stamp(p.timelineEnd,'.')}.`).join('\n')}`;
doc+=`\n\nEach scene has 0.3 seconds of visual lead-in. Its remaining silent hold is ${(ep.duration-originalDuration).toFixed(2)} seconds in total across the episode, including lead-ins. These are real timeline gaps; narration is not sped up.\n\n## Complete pseudocode\n\n\`\`\`text\n${pseudocode}\n\`\`\`\n\n## Checked trace\n\n| Probe | left | right | middle | Value | Next action |\n| --- | --- | --- | --- | --- | --- |\n| 1 | 0 | 14 | 7 | 50 | left = 8 |\n| 2 | 8 | 14 | 11 | 78 | right = 10 |\n| 3 | 8 | 10 | 9 | 64 | left = 10 |\n| 4 | 10 | 10 | 10 | 71 | return 10 |\n\nThe absent-target replay uses 73 and ends at left = 11, right = 10 after the same four midpoint probes, then returns NOT_FOUND. The scan for 71 inspects 11 elements; Binary Search uses 4 midpoint probes. These are operation counts in this example, not a wall-clock benchmark. The Array is already sorted; sorting cost is not included.\n\n## Production\n\nBlender renders the ceramic modules; a deterministic Skia canvas compositor animates those assets, the diagram, code highlights, and captions. FFmpeg assembles the 1080 × 1920 H.264/AAC master. The opening retains the reviewed ElevenLabs v4 performance. A 0.40-second gap separates بس from كده, and كده احتجنا stays connected. The remaining scenes use the final v4 generation. Speech is not sped up; the timeline adds reading holds between scenes.\n`;
await writeFile(`${dir}/script.md`,doc);
console.log(JSON.stringify({duration:ep.duration,narrationSeconds:originalDuration,scenes:ep.scenes.length,captions:captions.length},null,2));
