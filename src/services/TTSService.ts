import {
  ELEVENLABS_VOICE_ID,
  ELEVENLABS_MODEL_ID,
  ELEVENLABS_MAX_CHARS,
  TTS_FETCH_TIMEOUT_MS,
} from '../utils/constants';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1/text-to-speech';

interface SynthesizeOptions {
  apiKey: string;
  text: string;
  stability?: number;
  similarityBoost?: number;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Call ElevenLabs TTS API and return raw MP3 bytes.
 * Returns null on any network or API error — caller should skip playback gracefully.
 */
export async function synthesizeSpeech(opts: SynthesizeOptions): Promise<ArrayBuffer | null> {
  const url = `${ELEVENLABS_BASE}/${ELEVENLABS_VOICE_ID}`;

  const fetchPromise = fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': opts.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text: sanitizeText(opts.text),
      model_id: ELEVENLABS_MODEL_ID,
      voice_settings: {
        stability: opts.stability ?? 0.5,
        similarity_boost: opts.similarityBoost ?? 0.75,
        use_speaker_boost: true,
      },
    }),
  });

  // Hard timeout — don't let slow network stall the queue
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), TTS_FETCH_TIMEOUT_MS)
  );

  try {
    const result = await Promise.race([fetchPromise, timeoutPromise]);

    if (!result) {
      console.warn('[TTS] Request timed out after', TTS_FETCH_TIMEOUT_MS, 'ms');
      return null;
    }

    if (!result.ok) {
      console.warn('[TTS] ElevenLabs API error:', result.status, result.statusText);
      return null;
    }

    return await result.arrayBuffer();
  } catch (err) {
    console.warn('[TTS] Network error:', err);
    return null;
  }
}

/**
 * Truncate text to avoid excessive API cost and latency on very long inputs.
 * Cuts at the last word boundary before maxChars.
 */
export function sanitizeText(text: string, maxChars = ELEVENLABS_MAX_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const cut = trimmed.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '.';
}
