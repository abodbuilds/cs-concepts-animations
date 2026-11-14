import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Rebuild a supplied ending against the saved, approved prefix. Never stretch speech.
const dir='episodes/001-binary-search';
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const spec=await readJson(`${dir}/episode.json`);
const replacement=spec.voiceReplacement;
if(!replacement||replacement.playbackRate!==1)throw new Error('A supplied voice replacement at normal playback speed is required.');
const {baseRevision,sourceDir,scene:sceneId}=replacement;
const ep=await readJson(`${baseRevision}/source/timeline.json`);
const supplied=await readJson(`${sourceDir}/script.json`);
const recognition=await readJson(`${sourceDir}/local-word-timing.json`);
if(supplied.length!==1||supplied[0].start!==0)throw new Error('This replacement expects one complete clip beginning at zero.');
const source=supplied[0],scene=ep.scenes.at(-1);
if(scene.id!==sceneId)throw new Error('Only the final scene may be replaced by this edit.');
const sr=48000;
const decode=path=>{
 const buffer=execFileSync('ffmpeg',['-v','error','-i',path,'-f','f32le','-ac','1','-ar',String(sr),'pipe:1'],{maxBuffer:128*1024*1024});
 return new Float32Array(buffer.buffer,buffer.byteOffset,buffer.length/4);
};
const oldPcm=decode(`${baseRevision}/audio/narration-timed.wav`);
const suppliedPcm=decode(`${sourceDir}/voiceover.mp3`);
const audioDuration=suppliedPcm.length/sr;
if(Math.abs(source.end-audioDuration)>.1)throw new Error('The supplied timestamps disagree with the audio duration.');
const recognized=recognition.segments.flatMap(segment=>segment.words??[]);
const canonical=text=>text.replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
const startsWith=prefix=>{
 const match=recognized.find(word=>canonical(word.word).startsWith(prefix));
 if(!match)throw new Error(`The audio has no timing anchor for ${prefix}.`);
 return match.start;
};
// ASR often attaches a new sentence to the preceding pause. Anchor those
// sentence entries to the nearby measured silence exit in the actual MP3.
const detection=spawnSync('ffmpeg',['-hide_banner','-nostats','-i',`${sourceDir}/voiceover.mp3`,'-af','silencedetect=noise=-35dB:d=0.12','-f','null','-'],{encoding:'utf8'});
if(detection.status!==0)throw new Error('Could not inspect pauses in supplied audio.');
const pauses=[...detection.stderr.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map(match=>({start:Number(match[1]),end:Number(match[2])}));
const afterPause=time=>pauses.find(p=>p.start>=time-.05&&p.end-time<.85)?.end??time;
const phraseTimes=[0,startsWith('بأربع'),afterPause(startsWith('استغل')),afterPause(recognized.find(w=>canonical(w.word)==='بدل'&&w.start>4)?.start),afterPause(startsWith('ودي')),source.end];
if(phraseTimes.some((time,i)=>!Number.isFinite(time)||(i&&time<=phraseTimes[i-1])))throw new Error('Invalid phrase boundaries.');
const phrases=['وبكده لقينا الواحد وسبعين','بأربع مقارنات بدل حداشر.','استغلّينا الترتيب،','بدل ما نفتّش في كل الأرقام.','وديه قوة الBinary Search'];
if(canonical(phrases.join(' '))!==canonical(source.text))throw new Error('Caption phrases do not preserve the supplied script.');
ep.revision=spec.revision;
ep.voiceReplacement=replacement;
ep.duration=Math.ceil((scene.start+Math.max(source.end,audioDuration))*ep.fps)/ep.fps;
if(ep.duration>=180)throw new Error('The rebuilt episode exceeds three minutes.');
Object.assign(scene,{
 duration:ep.duration-scene.start,end:ep.duration,narration:source.text,tts:source.text,
 voiceOffset:0,sourceStart:0,sourceEnd:audioDuration,voiceLength:audioDuration,
 minimum:Math.max(source.end,audioDuration),voiceSource:'user-supplied',
 headline:'لقينا 71',
 visual:'Restore target 71; reveal four Binary Search checks with the spoken comparison, then eleven Linear Search checks. Restore the sorted array as the narrator names order. On the closing Binary Search phrase, replay the retained intervals 15 → 7 → 3 → 1, ending on value 71 at index 10.',
 sound:'Use the supplied voice recording, without speed changes or new sound effects.',
 events:{found:startsWith('لقينا'),binary:phraseTimes[1],linear:recognized.find(w=>canonical(w.word)==='بدل').start,sorted:phraseTimes[2],closing:phraseTimes[4]},
 words:recognized.map(word=>({text:word.word.trim(),start:scene.start+word.start,end:scene.start+word.end})),
 timingSource:'Supplied cue bounds; local Whisper word estimates for internal visual and caption anchors.'
});
delete scene.charStart;delete scene.charEnd;
ep.captionCues=ep.captionCues.filter(cue=>cue.scene!==sceneId);
const endingCues=phrases.map((text,i)=>({scene:sceneId,text:text.replace(/[\u064B-\u065F\u0670\u0640]/g,'').replace(/ال(?=[A-Za-z])/g,'الـ '),start:scene.start+phraseTimes[i],end:scene.start+phraseTimes[i+1]}));
ep.captionCues.push(...endingCues);
const mix=new Float32Array(Math.round(ep.duration*sr));
const cut=Math.round(scene.start*sr);
mix.set(oldPcm.subarray(0,cut));mix.set(suppliedPcm,cut);
// The short padding aligns the original cue endpoint and the final video frame.
const wav=Buffer.alloc(44+mix.length*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(sr,24);wav.writeUInt32LE(sr*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(mix.length*2,40);
for(let i=0;i<mix.length;i++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,mix[i]))*32768-Number(mix[i]>=1)),44+i*2);
await writeFile(`${dir}/audio/narration-timed.wav`,wav);
await writeFile(`${dir}/source/timeline.json`,JSON.stringify(ep,null,2)+'\n');
const spoken=await readJson(`${baseRevision}/source/narration-ar-EG.json`);
spoken[sceneId]=source.text;
await writeFile(`${dir}/source/narration-ar-EG.json`,JSON.stringify(spoken,null,2)+'\n');
await writeFile(`${dir}/narration-with-tashkeel.txt`,ep.scenes.map(s=>spoken[s.id]).join('\n\n')+'\n');
const updatedScene=spec.scenes.find(s=>s.id===sceneId);
for(const key of ['duration','narration','headline','visual','sound'])updatedScene[key]=scene[key];
await writeFile(`${dir}/episode.json`,JSON.stringify(spec,null,2)+'\n');
const stamp=(t,separator=',')=>{
 const ms=Math.round(t*1000);
 return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}${separator}${String(ms%1000).padStart(3,'0')}`;
};
const srt=ep.captionCues.map((cue,i)=>`${i+1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}\n`).join('\n');
const vtt='WEBVTT\n\n'+ep.captionCues.map(cue=>`${stamp(cue.start,'.')} --> ${stamp(cue.end,'.')}\n${cue.text}\n`).join('\n');
await writeFile(`${dir}/output/binary-search.ar-EG.srt`,srt);
await writeFile(`${dir}/output/binary-search.ar-EG.vtt`,vtt);
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const manifest={revision:ep.revision,scene:sceneId,sceneStart:scene.start,sourceDir,suppliedAudioSha256:sha(await readFile(`${sourceDir}/voiceover.mp3`)),suppliedScriptSha256:sha(await readFile(`${sourceDir}/script.json`)),sourceCueEnd:source.end,decodedAudioDuration:audioDuration,videoDuration:ep.duration,tailPaddingSeconds:ep.duration-scene.start-audioDuration,playbackRate:1,captionPhraseTimes:phraseTimes,measuredPauses:pauses,timingSource:scene.timingSource+' Sentence onsets refined to nearby measured pause endings.',baseRevision,generatedAt:new Date().toISOString()};
await writeFile(`${dir}/audio/user-voice-assembly.json`,JSON.stringify(manifest,null,2)+'\n');
let doc=await readFile(`${baseRevision}/script.md`,'utf8');
doc=doc.replace(/\*\*Runtime:\*\*[^\n]*/,`**Runtime:** ${ep.duration.toFixed(2)} seconds. The supplied ${audioDuration.toFixed(2)}-second ending starts at ${stamp(scene.start,'.')}; the preceding 17 scenes retain their approved timing.`);
doc=doc.replace(/\*\*Narrator:\*\*[^\n]*/,`**Narration:** Scenes 1–17 use the approved ElevenLabs v4 recording. Scene 18 uses the user's supplied MP3 verbatim, with no speed changes. The supplied JSON/SRT/VTT contains one cue; internal phrase timing is estimated locally from that recording.`);
const row=`| ${stamp(scene.start,'.')}–${stamp(scene.end,'.')} | ${source.text} | ${scene.visual} | ${scene.headline} → 4 مقارنات بدل 11 → الترتيب هو المفتاح → قوة Binary Search | ${scene.sound} |`;
doc=doc.split('\n').map(line=>line.startsWith('| ')&&line.includes('وبكده لقينا')?row:line).join('\n');
doc=doc.replace(/Each scene has[^\n]*/,`Scenes 1–17 retain their approved voice lead-ins and reading holds. The supplied closing audio begins exactly at scene 18's start. Its original cue runs from 0 to ${source.end.toFixed(3)} seconds; only ${manifest.tailPaddingSeconds.toFixed(3)} seconds of tail padding align it to a complete video frame.`);
doc=doc.replace(/The remaining scenes use the final v4 generation\./,'Scenes 4–17 use the final v4 generation. Scene 18 uses the supplied recording and source script, including “وديه قوة الBinary Search”. Its graphics and readable caption phrases follow locally estimated audio anchors within the supplied cue.');
await writeFile(`${dir}/script.md`,doc);
console.log(JSON.stringify(manifest,null,2));
