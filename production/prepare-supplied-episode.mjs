import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { buildMotion } from './audio-driven-motion.mjs';

const dir='episodes/001-binary-search';
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const ep=await readJson(`${dir}/episode.json`);
const config=ep.voiceoverSource;
if(!['complete-recording','line-timed-recording'].includes(config?.mode)||config.playbackRate!==1)throw new Error('Expected the complete supplied voice recording at its original speed.');
const {sourceDir}=config;
const lineTimed=config.mode==='line-timed-recording';
const scriptFile=config.scriptFile??'script.json',audioFile=config.audioFile??'voiceover.mp3';
const supplied=await readJson(`${sourceDir}/${scriptFile}`);
const alignment=await readJson(`${sourceDir}/script-alignment.json`);
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
if(sha(await readFile(`${sourceDir}/${scriptFile}`))!==alignment.scriptSha256||sha(await readFile(`${sourceDir}/${audioFile}`))!==alignment.audioSha256)throw new Error('The supplied audio or text changed; recreate local alignment.');
if(config.preserveAudio&&config.lockedAudioSha256!==alignment.audioSha256)throw new Error('The locked original audio does not match the supplied recording.');
if((!lineTimed&&supplied.length!==1)||supplied[0].start!==0)throw new Error('Expected a complete source timeline beginning at zero.');
const source=lineTimed?{start:0,end:supplied.at(-1).end,text:supplied.map(line=>line.text).join('\n')}:supplied[0];
const paragraphs=lineTimed?supplied.map(line=>line.text):source.text.split(/\n+/).map(text=>text.trim()).filter(Boolean);
if(lineTimed){
 if(sha(await readFile(`${sourceDir}/graphics.json`))!==alignment.graphicsSha256)throw new Error('The graphics manifest changed after alignment.');
 supplied.forEach((line,i)=>{if(i&&Math.abs(line.start-supplied[i-1].end)>1e-8)throw new Error('Line timeline has a gap or overlap.');});
}
if(paragraphs.length!==ep.scenes.length||alignment.scenes.length!==ep.scenes.length)throw new Error('The script and storyboard scene counts disagree.');
const sr=config.sampleRate??48000;
const pcm=execFileSync('ffmpeg',['-v','error','-i',`${sourceDir}/${audioFile}`,'-f','s16le','-ac','1','-ar',String(sr),'pipe:1'],{maxBuffer:128*1024*1024});
const audioDuration=pcm.length/2/sr;
if(Math.abs(source.end-audioDuration)>.1)throw new Error('Source cue endpoint does not match the audio duration.');
ep.duration=Math.ceil(Math.max(source.end,audioDuration)*ep.fps)/ep.fps;
if(ep.duration>=180)throw new Error('The supplied recording exceeds the episode duration limit.');
const plain=text=>text.replace(/[\u064B-\u065F\u0670\u0640]/g,'');
const canon=text=>plain(text).replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
const captions=[];
const spoken={};
const connectors=new Set(['على','من','في','عند','مع','أو','اللي','قبل','بعد','بدل','رقم','واحد','تمانية','أربعة','تلاتة','بأربع','الواحد','التمانية','الأربعة','التلاتة','ال','binary','not']);
const required={
 '02-linear':['scanStart','scanEnd'], '07-discard':['discard'], '08-upper':['exclude'],
 '09-find':['discard','remaining','found'], '11-setup':['right'], '12-mid':['middle'],
 '13-equality':['else'], '14-lo':['update'], '15-hi':['update'],
 '16-return':['found','return'], '17-missing':['cross','absent'],
 '18-payoff':['found','binary','linear','sorted','closing']
};
for(const [i,s] of ep.scenes.entries()){
 const aligned=alignment.scenes[i];
 if(aligned.text!==paragraphs[i])throw new Error(`Source text mismatch in scene ${i+1}.`);
 if(lineTimed){
  if(aligned.start!==supplied[i].start||aligned.end!==supplied[i].end)throw new Error(`The supplied line boundary changed in scene ${i+1}.`);
  Object.assign(s,{lineNumber:supplied[i].index,lineID:aligned.lineID,takeID:aligned.takeID,sourceClip:aligned.clipFile,originalScriptText:aligned.originalScriptText,boundarySource:'Exact user-supplied line manifest',sourceLineEnd:supplied[i].end});
 }
 s.start=aligned.start;s.end=i===ep.scenes.length-1?ep.duration:aligned.end;s.duration=s.end-s.start;
 s.narration=paragraphs[i];s.tts=paragraphs[i];spoken[s.id]=paragraphs[i];
 s.sourceStart=s.start;s.sourceEnd=Math.min(s.end,audioDuration);s.voiceOffset=0;
 s.voiceLength=s.sourceEnd-s.sourceStart;s.voiceSource='user-supplied';
 s.words=aligned.words.map(({text,start,end})=>({text,start,end}));
 delete s.charStart;delete s.charEnd;delete s.minimum;
 s.sound='Original supplied voiceover, including its pauses; no added effects.';
 const anchors={exclude:'فنستبعد',discard:'نستبعد',remaining:'فاضل',found:'لقينا',larger:'أكبر',smaller:'أصغر',update:'بخطوة',notice:'كده',else:'غير',right:'right',left:'left',middle:'middle',return:'بنرجع',absent:'Found',cross:'هيعدي',unfold:'بالترتيب',...s.visualAnchors};
 if(s.mode==='payoff')Object.assign(anchors,{binary:'بأربع',linear:'بدل',sorted:'استغلينا',closing:'وديه'});
 s.events={};
 for(const [name,term] of Object.entries(anchors)){
  const matches=s.words.filter(word=>canon(word.text).includes(canon(term)));
  if(matches.length)s.events[name]=(name==='update'?matches.at(-1):matches[0]).start-s.start;
 }
 for(const name of required[s.id]??[])if(!Number.isFinite(s.events[name]))throw new Error(`Missing narration anchor ${s.id}:${name}.`);
 if(ep.visualTiming==='spoken-spans')s.motion=buildMotion(s);
 let group=[];
 const flush=()=>{
  if(!group.length)return;
  captions.push({scene:s.id,text:group.map(word=>word.text).join(' '),start:group[0].start,end:Math.min(s.end,group.at(-1).end+.18)});
  group=[];
 };
 for(const word of s.words){
  if(group.length&&(group.length>=8||group.map(w=>w.text).join(' ').length+word.text.length>56)){
   const carry=[];
   while(group.length>2&&connectors.has(canon(group.at(-1).text)))carry.unshift(group.pop());
   flush();group=carry;
  }
  group.push(word);
  if((/[.!؟؛…]$/.test(word.text)&&group.length>=2)||(/،$/.test(word.text)&&group.length>=3))flush();
 }
 flush();
 captions.at(-1).end=lineTimed?s.sourceLineEnd:s.end;
 const sceneCaptionText=captions.filter(cue=>cue.scene===s.id).map(cue=>cue.text).join(' ');
 if(canon(sceneCaptionText)!==canon(s.tts))throw new Error(`Caption text changed in scene ${s.id}.`);
}
for(let i=0;i<captions.length;i++){
 const cue=captions[i];
 if(i+1<captions.length)cue.end=Math.min(cue.end,captions[i+1].start);
 if(cue.end<=cue.start||cue.end>ep.duration)throw new Error(`Invalid caption timing: ${cue.text}`);
}
ep.captionCues=captions;
ep.pauseChecks=[];
for(const note of ep.delivery?.pauseNotes??[]){
 const scene=ep.scenes.find(s=>s.id===note.scene);
 const at=scene.words.findIndex((word,index)=>canon(word.text)===canon(note.after)&&canon(scene.words[index+1]?.text??'')===canon(note.before));
 if(at<0)continue;
 ep.pauseChecks.push({scene:scene.id,after:note.after,before:note.before,timelineStart:scene.words[at].end,timelineEnd:scene.words[at+1].start,gapSeconds:scene.words[at+1].start-scene.words[at].end,source:'Unmodified supplied recording; timing estimated locally.'});
}
const samples=Math.round(ep.duration*sr),wav=Buffer.alloc(44+samples*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(sr,24);wav.writeUInt32LE(sr*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples*2,40);
pcm.copy(wav,44);
if(!config.preserveAudio)await writeFile(`${dir}/audio/narration-timed.wav`,wav);
else{
 ep.audioPolicy={locked:true,sourceFile:`${sourceDir}/${audioFile}`,sourceSha256:alignment.audioSha256,decodedPcmSha256:sha(pcm),sampleRate:sr,channels:1,frames:pcm.length/2,duration:audioDuration,playbackRate:1,filters:[],master:'Copy original PCM stream into MOV',viewingCopy:'AAC encode only, source sample rate, no filters or timing edits'};
 await writeFile(`${dir}/audio/locked-source.json`,JSON.stringify(ep.audioPolicy,null,2)+'\n');
}
await writeFile(`${dir}/source/timeline.json`,JSON.stringify(ep,null,2)+'\n');
await writeFile(`${dir}/source/narration-ar-EG.json`,JSON.stringify(spoken,null,2)+'\n');
await writeFile(`${dir}/narration-with-tashkeel.txt`,source.text+'\n');
const manifest={revision:ep.revision,mode:config.mode,sourceDir,audioFile,sampleRate:sr,suppliedAudioSha256:alignment.audioSha256,suppliedScriptSha256:alignment.scriptSha256,sourceCueEnd:source.end,decodedAudioDuration:audioDuration,videoDuration:ep.duration,tailPaddingSeconds:config.preserveAudio?0:ep.duration-audioDuration,videoFrameTailSeconds:ep.duration-audioDuration,playbackRate:1,audioPolicy:ep.audioPolicy,timingMethod:alignment.method,scenes:ep.scenes.map(s=>({id:s.id,start:s.start,end:s.end,sourceLineEnd:s.sourceLineEnd,lineID:s.lineID,takeID:s.takeID,sourceClip:s.sourceClip,events:s.events,motion:s.motion})),captionCues:captions.length,generatedAt:new Date().toISOString()};
await writeFile(`${dir}/audio/user-voice-assembly.json`,JSON.stringify(manifest,null,2)+'\n');
const stamp=(time,separator=',')=>{
 const ms=Math.round(time*1000);
 return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}${separator}${String(ms%1000).padStart(3,'0')}`;
};
const srt=captions.map((cue,i)=>`${i+1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}\n`).join('\n');
const vtt='WEBVTT\n\n'+captions.map(cue=>`${stamp(cue.start,'.')} --> ${stamp(cue.end,'.')}\n${cue.text}\n`).join('\n');
for(const [suffix,content] of [['srt',srt],['vtt',vtt]]){
 await writeFile(`${dir}/output/binary-search.ar-EG.${suffix}`,content);
 await writeFile(`${dir}/output/binary-search-ar-EG-v${ep.revision}.${suffix}`,content);
}
const previousDoc=await readFile(`${config.baseRevision}/script.md`,'utf8');
const checkedCode=previousDoc.slice(previousDoc.indexOf('## Complete pseudocode'),previousDoc.indexOf('## Production'));
const timingDescription=lineTimed?'The 18 scene boundaries come directly from the supplied lines.json/graphics.json and are not moved. Word timings are extracted acoustically from the linked takes on this machine. The fast takes 6, 8 and 9 are slowed only during analysis; their acoustic timings are mapped back to the original timeline. No words are timed by dividing a line duration.':'The supplied JSON/SRT/VTT has one full-length cue. Internal scene cuts are placed in measured sentence pauses, and the exact supplied script is aligned locally against the recording.';
let doc=`# Episode 001 — Binary Search, revision ${ep.revision}\n\n**Audience:** beginner programmers. **Frame:** 1080 × 1920, 9:16, 30 fps. **Language:** Egyptian Arabic with English technical terms. **Style:** Logic Workshop, Alexandria, yellow ${ep.theme.text_color} on purple ${ep.theme.background_color}. **Brand:** ${ep.brand}.\n\n**Learning outcome:** ${ep.learningOutcome}\n\n**Narration:** The complete user-supplied ${audioFile} is used continuously, at its original speed. No previous voice clips, new TTS, sound effects, or inserted internal pauses are used. Spoken source text is preserved verbatim in [narration-with-tashkeel.txt](narration-with-tashkeel.txt). Captions omit diacritics and space Arabic articles before English terms for readability. Delivery tags remain in the original script and storyboard metadata; they are not shown as captions.\n\n**Runtime:** ${ep.duration.toFixed(3)} seconds; recording ${audioDuration.toFixed(3)} seconds. The source timeline ends at ${source.end.toFixed(3)} seconds. ${manifest.tailPaddingSeconds.toFixed(3)} seconds of silence align the end to a complete video frame.\n\n**Timing:** ${timingDescription}\n\n| Time | Exact spoken script | Visual state and action | On-screen headline |\n| --- | --- | --- | --- |\n`;
doc+=ep.scenes.map(s=>`| ${stamp(s.start,'.')}–${stamp(s.end,'.')} | ${s.tts} | ${s.visual} | ${s.headline} |`).join('\n');
if(config.preserveAudio)doc=doc.replace(`${manifest.tailPaddingSeconds.toFixed(3)} seconds of silence align the end to a complete video frame.`,`The video holds its final frame for ${(ep.duration-audioDuration).toFixed(6)} seconds beyond the audio endpoint to reach a complete video frame; the audio itself is neither padded nor trimmed.`);
doc+='\n\n'+checkedCode;
doc+=`## Production\n\nBlender ceramic modules feed the deterministic canvas renderer. Visual operations and code highlights are rebuilt from spoken-word spans. The video is rendered silently, then the original uploaded audio is attached at time zero. The MOV master copies the original PCM stream without filtering, resampling, gain changes, trimming, padding, or speed changes. The viewing MP4 uses AAC encoding only at the original sample rate. A decoded-PCM hash check verifies the MOV master against the uploaded WAV. The original uploaded files and their hashes are retained under ${sourceDir}.\n`;
await writeFile(`${dir}/script.md`,doc);
if(lineTimed){
 const shots=ep.scenes.map(s=>({
  scene:s.id,start:s.start,end:s.sourceLineEnd,lineNumber:s.lineNumber,lineID:s.lineID,takeID:s.takeID,clipFile:s.sourceClip,
  originalScript:s.originalScriptText,narration:s.tts,visualDescription:s.visual,headline:s.headline,
  onScreenArabic:captions.filter(cue=>cue.scene===s.id).map(({start,end,text})=>({start,end:Math.min(end,s.sourceLineEnd),text})),
  animationEvents:s.motion??Object.fromEntries(Object.entries(s.events).map(([name,time])=>[name,s.start+time])),
  motionTimeBasis:s.motion?'Motion values are seconds relative to shot start; references.absoluteTime is measured on the full recording.':'Event values are absolute seconds.',
  generationPrompt:`Create a ${s.duration.toFixed(3)}-second vertical 1080 × 1920 animation shot for a beginner Binary Search explainer in the established Logic Workshop style. Deep purple background ${ep.theme.background_color}, yellow text ${ep.theme.text_color}, matte plum ceramic modules, warm gold success marker, restrained contact shadows. Use Alexandria with properly shaped logical RTL Arabic; isolate English terms and keep code/numbers LTR. Keep @abodbuilds at top right. Use the same sorted values [${ep.values.join(', ')}], target ${s.target??ep.target}, and zero-based indices. ${s.visual} Headline: ${s.headline}. Preserve one- or two-line Arabic captions from the attached timed cue list in a separate lower panel. Use only the supplied narration; follow the line and acoustic event timings. No logo intro, filler, camera shake, or invented data.`
 }));
 const storyboard={revision:ep.revision,width:ep.width,height:ep.height,fps:ep.fps,sourceDuration:source.end,renderedDuration:ep.duration,style:'Logic Workshop',font:'Alexandria',theme:ep.theme,brand:ep.brand,timingDescription,shots};
 await writeFile(`${dir}/output/storyboard-v${ep.revision}.json`,JSON.stringify(storyboard,null,2)+'\n');
 let board=`# Binary Search — storyboard v${ep.revision}\n\n${timingDescription}\n\n18 shots, vertical 1080 × 1920. Source recording: ${source.end.toFixed(3)} seconds.\n`;
 for(const shot of shots){
  board+=`\n## ${shot.lineNumber}. ${shot.headline}\n\n**Start:** ${shot.start.toFixed(6)} s. **End:** ${shot.end.toFixed(6)} s. **Clip:** ${shot.clipFile}. **Take:** ${shot.takeID}.\n\n**Narration:** ${shot.narration}\n\n**Visual:** ${shot.visualDescription}\n\n**On-screen Arabic:** ${shot.onScreenArabic.map(cue=>cue.text).join(' / ')}\n\n**Image/video generation prompt:** ${shot.generationPrompt}\n`;
 }
 await writeFile(`${dir}/output/storyboard-v${ep.revision}.md`,board);
}
// Persist only the authoring spec; the generated timeline owns alignment fields.
const spec=await readJson(`${dir}/episode.json`);
spec.scenes.forEach((scene,i)=>{for(const key of ['narration','duration','sound'])scene[key]=ep.scenes[i][key];});
spec.targetDuration=ep.duration;
await writeFile(`${dir}/episode.json`,JSON.stringify(spec,null,2)+'\n');
console.log(JSON.stringify({revision:ep.revision,duration:ep.duration,audioDuration,scenes:ep.scenes.length,captions:captions.length,pauseChecks:ep.pauseChecks},null,2));
