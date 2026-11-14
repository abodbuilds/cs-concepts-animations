import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createCanvas,GlobalFonts} from '@napi-rs/canvas';
import {episode,scenes,schedule,pseudocode} from '../episodes/002-insertion-sort/source/episode.mjs';
import {traceInsertionSort,verifyAlgorithm} from '../episodes/002-insertion-sort/source/algorithm.mjs';

const dir='episodes/002-insertion-sort';
for(const sub of ['source','output','review'])await mkdir(`${dir}/${sub}`,{recursive:true});
const trace=traceInsertionSort(episode.values);
assert.equal(trace.events.length,schedule.length);
const events=trace.events.map((event,i)=>{
  const [pass,kind,start,duration]=schedule[i];
  assert.equal(event.pass,pass,`Pass mismatch at event ${i}`);
  assert.equal(event.kind,kind,`Operation mismatch at event ${i}`);
  if(i)assert.ok(start>=schedule[i-1][2]+schedule[i-1][3]);
  return {...event,start,duration,end:start+duration};
});
assert.equal(scenes[0].start,0);
assert.equal(scenes.at(-1).end,episode.duration);
assert.ok(episode.duration<180);
scenes.forEach((s,i)=>{
  if(i)assert.equal(s.start,scenes[i-1].end);
  for(const [j,cue] of s.cues.entries()){
    assert.ok(cue[0]>=0&&cue[1]<=s.end-s.start&&cue[1]>cue[0]);
    if(j)assert.ok(cue[0]>=s.cues[j-1][1]);
  }
});

GlobalFonts.registerFromPath('skills/cs-concept-script/assets/fonts/Alexandria-Variable.ttf','Workshop Alexandria');
const ctx=createCanvas(1,1).getContext('2d');
ctx.font='400 43px "Workshop Alexandria"';
const clean=s=>s.replace(/[\u064B-\u065F\u0670\u0640]/g,'');
const iso=s=>s.replace(/[A-Za-z_][A-Za-z0-9_]*(?:[ \t]+[A-Za-z0-9_]+)*/g,w=>'\u2066'+w+'\u2069');
const wrap=s=>{
  const lines=[];let line='';
  for(const word of s.split(/\s+/)){
    const next=line?`${line} ${word}`:word;
    if(line&&ctx.measureText(iso(next)).width>820){lines.push(line);line=word;}else line=next;
  }
  if(line)lines.push(line);return lines;
};
const captions=[];
for(const s of scenes)for(const [start,end,text] of s.cues){
  const lines=wrap(clean(text));
  const groups=[];
  for(let i=0;i<lines.length;i+=2)groups.push(lines.slice(i,i+2));
  const weight=groups.map(g=>g.join(' ').split(/\s+/).length),total=weight.reduce((a,b)=>a+b,0);
  let offset=0;
  groups.forEach((g,i)=>{
    const duration=(end-start)*weight[i]/total;
    captions.push({scene:s.id,start:s.start+start+offset,end:s.start+start+offset+duration,text:g.join(' '),lines:g});
    offset+=duration;
  });
}
const timestamp=seconds=>{
  const ms=Math.round(seconds*1000),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;
};
const short=seconds=>timestamp(seconds).slice(3,8);
const narration=scenes.map(s=>s.cues.map(c=>c[2]).join(' '));
const wordCount=narration.join(' ').split(/\s+/).length;
const spokenSeconds=scenes.reduce((sum,s)=>sum+s.cues.reduce((a,c)=>a+c[1]-c[0],0),0);
const holds=[];
for(const s of scenes){let previous=0;for(const cue of s.cues){if(cue[0]>previous)holds.push([s.start+previous,s.start+cue[0],s.id]);previous=cue[1];}if(s.end-s.start>previous)holds.push([s.start+previous,s.end,s.id]);}
const pace={wordCount,estimatedSpokenSeconds:+spokenSeconds.toFixed(2),silentHoldSeconds:+(episode.duration-spokenSeconds).toFixed(2),estimatedWordsPerMinute:+(wordCount/spokenSeconds*60).toFixed(1),verifiedAgainstRecordedVoice:false};
const timeline={...episode,scenes:scenes.map((s,i)=>({...s,narration:narration[i]})),initial:trace.initial,events,captions,pace};
await writeFile(`${dir}/episode.json`,JSON.stringify({...episode,theme:'Algorithms',status:'Ready for voice-over recording'},null,2)+'\n');
await writeFile(`${dir}/source/timeline.json`,JSON.stringify(timeline,null,2)+'\n');
await writeFile(`${dir}/source/trace.json`,JSON.stringify(trace,null,2)+'\n');
await writeFile(`${dir}/narration-ar-EG.txt`,narration.join('\n\n')+'\n');
await writeFile(`${dir}/output/insertion-sort-recording-guide.srt`,captions.map((c,i)=>`${i+1}\n${timestamp(c.start).replace('.',',')} --> ${timestamp(c.end).replace('.',',')}\n${c.lines.join('\n')}\n`).join('\n'));

let guide=`# Insertion Sort voice-over recording guide\n\nRecord in conversational Egyptian Arabic, keeping the English terms as written. Read only the narration paragraphs, not the headings. Each numbered block can be a separate take; keep a brief natural pause between blocks.\n\nThe silent preview is **${short(episode.duration)}** at 1080 × 1920. Its timings are approximate, not a required speaking speed. Record comfortably; the animation should be retimed to your recording, preserving your voice and pauses. The guide video burns in the proposed narration; the clean video leaves the caption area free.\n\n**Script:** ${wordCount} whitespace-delimited words, approximately ${pace.estimatedWordsPerMinute} words/minute during speech, with ${pace.silentHoldSeconds} seconds of visual and reading holds. Mixed Arabic/English delivery still needs checking against your actual recording.\n\n**English terms:** Insertion Sort, numbers, index, current, value, compareIndex, Sorting. Say “compare index” naturally for compareIndex. The English words name the concept or variable; the Arabic sentences explain what it does.\n\n`;
guide+=scenes.map((s,i)=>`## ${s.id} · ${short(s.start)}–${short(s.end)} · ${s.title}\n\n${narration[i]}\n`).join('\n');
await writeFile(`${dir}/voiceover-guide.md`,guide);

let doc=`# Episode 002 — Insertion Sort\n\n**Theme:** Algorithms. **Audience:** beginner programmers who know variables, conditions, and loops. **Learning outcome:** grow a sorted prefix by saving the next value, shifting larger values right, and inserting the saved value after the stopping position.\n\n**Language:** conversational Egyptian Arabic with English technical terms. **Frame:** 1080 × 1920, 9:16, 30 fps. **Style:** Logic Workshop, Alexandria; yellow #F4D35E on deep purple #2D123F. **Brand:** @abodbuilds.\n\n**Opening question:** How can we sort [7, 3, 5, 2, 6] by repeating one simple operation? **Estimated runtime:** ${episode.duration} seconds. **Narration budget:** ${wordCount} words at about ${pace.estimatedWordsPerMinute} words/minute during speech, plus ${pace.silentHoldSeconds} seconds of explicit silent holds. No recorded voice or synthetic voice is included; these are planned timings, not verified speech alignment.\n\nThe narration declares the visible state and explains the operations; it does not read out the input, intermediate arrays, or final sequence. Say individual values only when they explain a comparison or boundary. The first two insertions establish the idea. The code walkthrough continues from the same state with value = 2, then finishes with value = 6. Gold brackets mean sorted relative to the current prefix, not final fixed positions.\n\n## Timecoded storyboard\n\n| Time | Exact narration | Visual state and action | On-screen text and code | Transition and sound |\n| --- | --- | --- | --- | --- |\n`;
doc+=scenes.map((s,i)=>{
  const code=s.section==='application'?'Progressive pseudocode, at most five lines. Active operation follows the algorithm trace.':'No code.';
  const sceneHolds=holds.filter(h=>h[2]===s.id).map(h=>`${short(h[0])}.${String(Math.round(h[0]*10)%10)}–${short(h[1])}.${String(Math.round(h[1]*10)%10)}`).join(', ');
  return `| ${timestamp(s.start)}–${timestamp(s.end)} | ${narration[i]} | ${s.visual} | ${s.title}. ${s.subtitle}. ${code} | Silent export. Reading holds: ${sceneHolds}. |`;
}).join('\n');
doc+=`\n\n## Complete pseudocode\n\n\`\`\`text\n${pseudocode}\n\`\`\`\n\nThe loop endpoint is inclusive. For an empty or one-element array the loop does not run. Evaluate the bounds check first with short-circuit AND, so a negative compareIndex never accesses the array. Use a strict greater-than comparison: equal values do not move past each other. The algorithm sorts in place and returns the same array.\n\n## Checked trace\n\n| Inserted value | Larger values shifted, in order | Stop | Array after insertion |\n| --- | --- | --- | --- |\n`;
for(const e of events.filter(e=>e.kind==='insert')){
  const steps=events.filter(x=>x.pass===e.pass);
  const shifted=steps.filter(x=>x.kind==='shift').map(x=>x.value).join(', ');
  const stop=steps.find(x=>x.kind==='bound')?'compareIndex = -1; no array read':`${steps.filter(x=>x.kind==='compare').at(-1).left} <= ${e.value}`;
  doc+=`| ${e.value} | ${shifted||'None'} | ${stop} | [${e.after.numbers.join(', ')}] |\n`;
}
doc+=`\nThis example performs 8 value comparisons and 6 shifts. These counts exclude loop-bound checks and insertion writes; they are not a wall-clock benchmark and are not narrated as a speed claim.\n\n## Visual model and code accuracy\n\nThe lifted card illustrates the saved value. The marked slot is a conceptual insertion gap, not a deleted array element. In the code section, its old value remains faintly visible because assignment copies values; value and stale slot values can coexist. The executable trace stores both the real numeric memory state and the physical card identities. Comparisons, copies, pointer decrements, bounds checks, and insertions have distinct timings.\n\nBest-case work is linear for an already sorted array. Average and worst-case work are quadratic; additional storage is constant. The spoken episode explains the practical limitation without introducing Big O before viewers know it. The reverse-order miniature in the final scene is separately labeled and uses the same set of values.\n\n## Production and recording handoff\n\nUse the installed @napi-rs/canvas renderer for procedural matte ceramic cards, the physical-to-diagram transition, shaped Alexandria Arabic, and progressive code panels. FFmpeg encodes the silent H.264 MP4 at 1080 × 1920, 30 fps. No downloaded assets, AI images, music, or synthetic voice are needed.\n\n- [Plain narration](narration-ar-EG.txt)\n- [Recording guide](voiceover-guide.md)\n- [Clean silent animation](output/insertion-sort-silent-v${episode.revision}.mp4)\n- [Video with recording prompts](output/insertion-sort-recording-guide-v${episode.revision}.mp4)\n- [Estimated guide subtitles](output/insertion-sort-recording-guide.srt)\n- Editable narration and action times: source/episode.mjs\n- Executable algorithm: source/algorithm.mjs\n\nRebuild: \`node production/prepare-insertion-sort.mjs\`, then \`node production/render-insertion-sort.mjs\`. For stills, use \`node production/render-insertion-sort.mjs stills\`. After the user records, derive acoustic anchors and retime the graphics to the unmodified source audio.\n`;
await writeFile(`${dir}/script.md`,doc);
const verification={algorithmCases:verifyAlgorithm(),scheduledOperations:events.length,traceResult:trace.result,comparisons:events.at(-1).after.comparisons,shifts:events.at(-1).after.shifts,continuousSceneTimes:true,nonOverlappingActions:true,allCaptionCuesInsideScenes:true,pace};
await writeFile(`${dir}/review/algorithm-check.json`,JSON.stringify(verification,null,2)+'\n');
console.log(JSON.stringify(verification,null,2));
