import { RegisteredFace } from '../types';
import { PI_ENDPOINTS, PI_PORT } from '../utils/constants';

let piBaseUrl = 'http://192.168.1.100:5000';

export function setPiIP(ip: string): void {
  piBaseUrl = `http://${ip}:${PI_PORT}`;
}

function url(endpoint: string): string {
  return `${piBaseUrl}${endpoint}`;
}

// ─── Connectivity ─────────────────────────────────────────────────────────────

export async function checkPiReachable(): Promise<boolean> {
  try {
    const res = await fetch(url(PI_ENDPOINTS.PING), { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Faces ────────────────────────────────────────────────────────────────────

export async function getRegisteredFaces(): Promise<RegisteredFace[]> {
  const res = await fetch(url(PI_ENDPOINTS.FACES_LIST));
  if (!res.ok) throw new Error(`Failed to fetch faces: ${res.status}`);
  return res.json();
}

export interface UploadFacePayload {
  name: string;
  relationship: string;
  photos: string[]; // base64 encoded JPEG
}

export interface UploadFaceResult {
  success: boolean;
  encodingId?: string;
  error?: string;
}

export async function uploadFacePhotos(payload: UploadFacePayload): Promise<UploadFaceResult> {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('relationship', payload.relationship);

  payload.photos.forEach((b64, i) => {
    formData.append(`photo_${i}`, {
      uri: `data:image/jpeg;base64,${b64}`,
      name: `photo_${i}.jpg`,
      type: 'image/jpeg',
    } as any);
  });

  const res = await fetch(url(PI_ENDPOINTS.FACES_REGISTER), {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    return { success: false, error: `Upload failed: ${res.status}` };
  }
  return res.json();
}

export async function deleteFace(name: string): Promise<boolean> {
  const res = await fetch(`${url(PI_ENDPOINTS.FACES_DELETE)}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
  return res.ok;
}

export async function getFaceRegistrationStatus(): Promise<'idle' | 'processing' | 'done' | 'error'> {
  try {
    const res = await fetch(url(PI_ENDPOINTS.FACES_STATUS));
    if (!res.ok) return 'error';
    const data = await res.json();
    return data.status;
  } catch {
    return 'error';
  }
}

// ─── Poll until Pi finishes encoding ─────────────────────────────────────────

export async function waitForEncodingComplete(timeoutMs = 30_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = await getFaceRegistrationStatus();
    if (status === 'done') return true;
    if (status === 'error') return false;
    await new Promise(r => setTimeout(r, 2000));
  }
  return false;
}
