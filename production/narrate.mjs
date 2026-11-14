import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { elevenlabs } from './elevenlabs-client.mjs';

const dir = 'episodes/001-binary-search';
const episode = JSON.parse(await readFile(`${dir}/episode.json`, 'utf8'));
const spoken = JSON.parse(await readFile(`${dir}/source/narration-ar-EG.json`, 'utf8'));
const text = episode.scenes.map(s => spoken[s.id]).join('\n\n');
if (episode.voice.modelId !== 'eleven_v4') throw new Error('This episode requires ElevenLabs v4.');
if (!episode.voice.voiceId) throw new Error('Choose an available ElevenLabs voice first.');
for (const scene of episode.scenes) {
  if (!spoken[scene.id]) {
    throw new Error(`Missing narration: ${scene.id}`);
  }
}
const request = {
  text, modelId: 'eleven_v4', languageCode: 'ar',
  outputFormat: 'mp3_44100_128',
  voiceSettings: { stability: 0.5, similarityBoost: 0.75 },
  applyTextNormalization: 'off',
};
const hash = createHash('sha256').update(JSON.stringify({ voiceId: episode.voice.voiceId, request })).digest('hex');
await mkdir(`${dir}/audio`, { recursive: true });
await writeFile(`${dir}/narration-with-tashkeel.txt`, text + '\n');
let cached;
try { cached = JSON.parse(await readFile(`${dir}/audio/generation.json`, 'utf8')); } catch {}
if (cached?.hash === hash) {
  await access(`${dir}/audio/narration-original.mp3`);
  console.log('Using the existing ElevenLabs v4 narration; no new speech request.');
} else {
  if (cached) {
    if (!process.argv.includes('--replace')) throw new Error('Narration inputs changed. Use --replace to archive the current generation before requesting its replacement.');
    const { cp } = await import('node:fs/promises');
    const archive = `${dir}/audio/history/${cached.hash.slice(0,12)}`;
    await mkdir(archive, { recursive: true });
    for (const name of ['generation.json','narration-original.mp3','alignment.json']) await cp(`${dir}/audio/${name}`, `${archive}/${name}`);
    console.log('Archived the previous narration before generating its revision.');
  }
  console.log(`Generating the episode narration with ElevenLabs v4: ${text.length} characters, voice ${episode.voice.voiceName}.`);
  try {
    const result = await elevenlabs.textToSpeech.convertWithTimestamps(episode.voice.voiceId, request);
    await writeFile(`${dir}/audio/narration-original.mp3`, Buffer.from(result.audioBase64, 'base64'));
    const alignment = result.alignment ?? result.normalizedAlignment;
    if (!alignment) throw new Error('ElevenLabs did not return narration alignment.');
    await writeFile(`${dir}/audio/alignment.json`, JSON.stringify(alignment, null, 2));
    await writeFile(`${dir}/audio/generation.json`, JSON.stringify({
      hash, provider: 'ElevenLabs', modelId: 'eleven_v4', voiceId: episode.voice.voiceId,
      voiceName: episode.voice.voiceName, characters: text.length, generatedAt: new Date().toISOString(),
    }, null, 2));
    console.log('Saved the narration audio and character timing.');
  } catch (error) {
    const message = String(error.body?.detail?.message ?? error.message ?? 'Unknown error')
      .replaceAll(process.env.ELEVENLABS_API_KEY, '[redacted]');
    console.error(`ElevenLabs ${error.statusCode ?? ''}: ${message}`);
    process.exitCode = 1;
  }
}
