import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';

// Route audio to speaker even when phone is in silent mode,
// and automatically route to AirPods / BT headphones when connected.
Sound.setCategory('Playback', false);

let currentSound: Sound | null = null;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Write an MP3 ArrayBuffer to the device cache and play it.
 * Stops any currently playing audio first.
 * Cleans up the temp file after playback completes.
 */
export async function playAudioBuffer(buffer: ArrayBuffer): Promise<void> {
  // Stop any currently playing audio
  await stopAudio();

  // Write buffer to a temp file in the cache directory
  const path = `${RNFS.CachesDirectoryPath}/tts_${Date.now()}.mp3`;

  try {
    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(buffer);
    const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
    const base64 = btoa(binary);
    await RNFS.writeFile(path, base64, 'base64');
  } catch (err) {
    console.warn('[Audio] Failed to write temp file:', err);
    return;
  }

  // Load and play
  return new Promise((resolve) => {
    const sound = new Sound(path, '', (loadErr) => {
      if (loadErr) {
        console.warn('[Audio] Failed to load sound:', loadErr);
        RNFS.unlink(path).catch(() => {});
        resolve();
        return;
      }

      currentSound = sound;
      sound.play((success) => {
        sound.release();
        currentSound = null;
        // Clean up temp file after playback
        RNFS.unlink(path).catch(() => {});
        if (!success) console.warn('[Audio] Playback did not complete successfully');
        resolve();
      });
    });
  });
}

/**
 * Stop any currently playing TTS audio immediately.
 */
export function stopAudio(): Promise<void> {
  return new Promise((resolve) => {
    if (!currentSound) { resolve(); return; }
    currentSound.stop(() => {
      currentSound?.release();
      currentSound = null;
      resolve();
    });
  });
}
