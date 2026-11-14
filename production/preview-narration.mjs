import { readFile, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { elevenlabs } from './elevenlabs-client.mjs';

// Review a short script passage without replacing the episode's approved audio.
const dir = process.argv[2] ?? 'episodes/001-binary-search/drafts/v4';
const draft = JSON.parse(await readFile(`${dir}/script.json`, 'utf8'));
const text = (await readFile(`${dir}/opening-with-tashkeel.txt`, 'utf8')).trim();
if (draft.voice.modelId !== 'eleven_v4') throw new Error('Use the requested ElevenLabs v4 model.');
const request = {
  text, modelId: 'eleven_v4', languageCode: 'ar', outputFormat: 'mp3_44100_128',
  voiceSettings: { stability: 0.5, similarityBoost: 0.75 }, applyTextNormalization: 'off',
};
const hash = createHash('sha256').update(JSON.stringify({ voiceId: draft.voice.voiceId, request })).digest('hex');
let cached;
try { cached = JSON.parse(await readFile(`${dir}/opening-generation.json`, 'utf8')); } catch {}
if (cached?.hash === hash) {
  await access(`${dir}/opening-preview.mp3`);
  console.log('Using the saved opening preview; no new speech request.');
} else {
  if (cached) {
    if (!process.argv.includes('--replace')) throw new Error('Use --replace to archive the previous preview before regenerating changed text.');
    const { cp, mkdir } = await import('node:fs/promises');
    const archive = `${dir}/voice-history/${cached.hash.slice(0,12)}`;
    await mkdir(archive, { recursive: true });
    for (const file of ['opening-generation.json','opening-alignment.json','opening-preview.mp3']) await cp(`${dir}/${file}`,`${archive}/${file}`);
  }
  const result = await elevenlabs.textToSpeech.convertWithTimestamps(draft.voice.voiceId, request);
  const alignment = result.alignment ?? result.normalizedAlignment;
  if (!alignment) throw new Error('The preview is missing its speech alignment.');
  await writeFile(`${dir}/opening-preview.mp3`, Buffer.from(result.audioBase64, 'base64'));
  await writeFile(`${dir}/opening-alignment.json`, JSON.stringify(alignment, null, 2));
  await writeFile(`${dir}/opening-generation.json`, JSON.stringify({ hash, provider: 'ElevenLabs',
    modelId: request.modelId, voiceName: draft.voice.voiceName, voiceId: draft.voice.voiceId,
    characters: text.length, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`Saved the v4 opening preview (${text.length} characters).`);
}
