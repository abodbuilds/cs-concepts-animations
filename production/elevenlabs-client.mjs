import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

// Run commands with node --env-file=.env.local. The SDK reads the key itself.
if (!process.env.ELEVENLABS_API_KEY) {
  throw new Error('ElevenLabs is not configured. Run the ElevenLabs onboarding CLI.');
}
export const elevenlabs = new ElevenLabsClient();
