import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { log } from '../utils/logger.js';

/**
 * Generates an MP3 voice note from text using ElevenLabs API.
 * Returns the absolute path to the saved audio file, or null if it fails.
 */
export async function generateVoiceNote(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    log.warn('TTS', 'ELEVENLABS_API_KEY is not set. Skipping voice note generation.');
    return null;
  }

  // Choose a hyped, energetic male voice. Brian or George work well.
  // Replace this voice_id with any specific one if preferred.
  const voiceId = 'ErXwobaYiN019PkySvjV'; // Antoni (Default ElevenLabs voice)

  try {
    const response = await axios({
      method: 'POST',
      url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      data: {
        text: text,
        model_id: 'eleven_turbo_v2_5', // Fastest, lowest latency model
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      responseType: 'arraybuffer'
    });

    const tmpPath = path.join(os.tmpdir(), `huginn_tts_${Date.now()}.mp3`);
    fs.writeFileSync(tmpPath, response.data);
    log.info('TTS', `Voice note generated and saved to ${tmpPath}`);
    return tmpPath;
  } catch (error) {
    log.error('TTS', `Failed to generate voice note: ${error.message}`);
    return null;
  }
}
