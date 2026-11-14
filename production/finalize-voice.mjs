import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Preserve the reviewed opening performance and implement its requested pause.
const dir='episodes/001-binary-search',preview=`${dir}/drafts/v4`,sr=48000;
const ep=JSON.parse(await readFile(`${dir}/episode.json`,'utf8'));
if(ep.voiceReplacement||ep.voiceoverSource){
 console.log('Using supplied voiceover; prepare-timeline will assemble the replacement.');
 process.exit(0);
}
const spoken=JSON.parse(await readFile(`${dir}/source/narration-ar-EG.json`,'utf8'));
const fullText=ep.scenes.map(s=>spoken[s.id]).join('\n\n');
const prefixText=ep.scenes.slice(0,3).map(s=>spoken[s.id]).join('\n\n');
const full=JSON.parse(await readFile(`${dir}/audio/alignment.json`,'utf8'));
const opening=JSON.parse(await readFile(`${preview}/opening-alignment.json`,'utf8'));
const oldPrefix=opening.characters.join('');
if(full.characters.join('')!==fullText)throw new Error('Full narration text changed; regenerate it first.');
if(oldPrefix.replace('بس كده','بس… كده')!==prefixText)throw new Error('Reviewed opening no longer matches the approved words.');
const p=oldPrefix.indexOf('بس كده');
if(p<0)throw new Error('Missing opening pause location.');
const begin=opening.characterEndTimesSeconds[p+1],next=opening.characterStartTimesSeconds[p+3];
const kedaEnd=opening.characterEndTimesSeconds[p+5],neededStart=opening.characterStartTimesSeconds[p+7];
const insertAt=(begin+next)/2,added=.4-(next-begin);
const removeLength=(neededStart-kedaEnd)-.08;
if(added<0||removeLength<0)throw new Error('The reviewed opening has different pause timing; inspect before editing.');
const removeStart=(neededStart+kedaEnd-removeLength)/2,removeEnd=removeStart+removeLength;
const decode=path=>{
 const buffer=execFileSync('ffmpeg',['-v','error','-i',path,'-f','f32le','-ac','1','-ar',String(sr),'pipe:1'],{maxBuffer:128*1024*1024});
 return new Float32Array(buffer.buffer,buffer.byteOffset,buffer.length/4);
};
const originalPcm=decode(`${dir}/audio/narration-original.mp3`),openingPcm=decode(`${preview}/opening-preview.mp3`);
const actualPrefixDuration=openingPcm.length/sr;
const mapTime=t=>Math.min(t,actualPrefixDuration)+(t>=insertAt?added:0)-Math.max(0,Math.min(removeLength,t-removeStart));
const editParts=[openingPcm.subarray(0,Math.round(insertAt*sr)),new Float32Array(Math.round(added*sr)),openingPcm.subarray(Math.round(insertAt*sr),Math.round(removeStart*sr)),openingPcm.subarray(Math.round(removeEnd*sr))];
const prefixSamples=editParts.reduce((n,part)=>n+part.length,0),prefixDuration=prefixSamples/sr;
const tailIndex=prefixText.length+2;
const fullCut=(full.characterEndTimesSeconds[prefixText.length-1]+full.characterStartTimesSeconds[tailIndex])/2;
const tail=originalPcm.subarray(Math.round(fullCut*sr));
const joined=new Float32Array(prefixSamples+tail.length);let at=0;
for(const part of [...editParts,tail]){joined.set(part,at);at+=part.length;}
const alignment={characters:[],characterStartTimesSeconds:[],characterEndTimesSeconds:[]};
const add=(char,start,end)=>{alignment.characters.push(char);alignment.characterStartTimesSeconds.push(start);alignment.characterEndTimesSeconds.push(end);};
const ellipseEnd=mapTime(next)-.04;
for(let i=0;i<oldPrefix.length;i++){
 if(i===p+2)add('…',mapTime(begin),ellipseEnd);
 add(opening.characters[i],i===p+2?ellipseEnd:mapTime(opening.characterStartTimesSeconds[i]),mapTime(opening.characterEndTimesSeconds[i]));
}
const firstTailTime=prefixDuration+full.characterStartTimesSeconds[tailIndex]-fullCut;
add('\n',prefixDuration,(prefixDuration+firstTailTime)/2);add('\n',(prefixDuration+firstTailTime)/2,firstTailTime);
for(let i=tailIndex;i<full.characters.length;i++)add(full.characters[i],prefixDuration+full.characterStartTimesSeconds[i]-fullCut,prefixDuration+full.characterEndTimesSeconds[i]-fullCut);
if(alignment.characters.join('')!==fullText)throw new Error('Assembled alignment does not match the approved text.');
const wav=Buffer.alloc(44+joined.length*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(sr,24);wav.writeUInt32LE(sr*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(joined.length*2,40);
for(let i=0;i<joined.length;i++)wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,joined[i]))*32767),44+i*2);
await writeFile(`${dir}/audio/narration-final.wav`,wav);
await writeFile(`${dir}/audio/alignment-final.json`,JSON.stringify(alignment,null,2));
const generation=JSON.parse(await readFile(`${dir}/audio/generation.json`,'utf8'));
const previewGeneration=JSON.parse(await readFile(`${preview}/opening-generation.json`,'utf8'));
const manifest={fullSourceHash:generation.hash,reviewedOpeningHash:previewGeneration.hash,textHash:createHash('sha256').update(fullText).digest('hex'),modelId:'eleven_v4',duration:joined.length/sr,openingScenes:3,fullSourceCut:fullCut,edits:[{location:'بس → كده',originalGap:next-begin,finalGap:.4,addedSeconds:added},{location:'كده → احتجنا',originalGap:neededStart-kedaEnd,finalGap:.08,removedSeconds:removeLength}],generatedAt:new Date().toISOString()};
await writeFile(`${dir}/audio/assembly.json`,JSON.stringify(manifest,null,2));
console.log(JSON.stringify({seconds:manifest.duration,reviewedOpening:true,edits:manifest.edits},null,2));
