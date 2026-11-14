import { writeFile, mkdir } from 'node:fs/promises';
import { elevenlabs } from './elevenlabs-client.mjs';

const response = await elevenlabs.voices.getAll();
const voices = response.voices.map(v => ({
  id: v.voiceId, name: v.name, category: v.category,
  labels: v.labels, description: v.description,
}));
await mkdir('episodes/001-binary-search/source', { recursive: true });
await writeFile('episodes/001-binary-search/source/voice-options.json', JSON.stringify(voices, null, 2));
const relevant = voices.filter(v => /arabic|egypt|عرب|مصر/i.test(JSON.stringify(v)));
console.log(JSON.stringify({ totalVoices: voices.length, arabicVoices: relevant,
  premadeFallbacks: voices.filter(v => v.category === 'premade').slice(0, 5) }, null, 2));
