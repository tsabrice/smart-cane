import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  BLEState,
  ObstacleState,
  FaceDetection,
  GPSLocation,
  SOSState,
  DeviceStatus,
  RegisteredFace,
  CaneContextType,
  Settings,
} from '../types';
import BLEService from '../services/BLEService';
import { triggerSOS } from '../services/SOSService';
import { loadSettings, saveSettings, appendGPSPoint } from '../services/StorageService';
import WebSocketService, { TTSMessage } from '../services/WebSocketService';
import { synthesizeSpeech } from '../services/TTSService';
import { playAudioBuffer } from '../services/AudioService';
import { TTS_DEDUP_WINDOW_MS, TTS_QUEUE_MAX } from '../utils/constants';

// ─── ElevenLabs API key ───────────────────────────────────────────────────────
// Set your key in .env as ELEVENLABS_API_KEY
// For hackathon demo: hardcode here if react-native-config isn't wired up yet
const ELEVENLABS_API_KEY = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-config').default.ELEVENLABS_API_KEY ?? '';
  } catch {
    return ''; // no key — TTS will be skipped silently
  }
})();

const CaneContext = createContext<CaneContextType | null>(null);

export function CaneProvider({ children }: { children: React.ReactNode }) {
  // ─── BLE State ───────────────────────────────────────────────────────────────
  const [ble, setBLE] = useState<BLEState>({
    connected: false,
    deviceName: null,
    deviceId: null,
  });

  // ─── Live Data ───────────────────────────────────────────────────────────────
  const [battery, setBattery] = useState<number | null>(null);
  const [obstacle, setObstacle] = useState<ObstacleState>({
    distance: null,
    severity: 'unknown',
    updatedAt: null,
  });
  const [lastFace, setLastFace] = useState<FaceDetection | null>(null);
  const [gps, setGPS] = useState<GPSLocation | null>(null);
  const [sos, setSOS] = useState<SOSState>({ active: false, triggeredAt: null, notified: [] });
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);

  // ─── App Data ────────────────────────────────────────────────────────────────
  const [registeredFaces, setRegisteredFaces] = useState<RegisteredFace[]>([]);
  const [settings, setSettingsState] = useState<Settings>({
    userName: 'User',
    emergencyContacts: [],
    geofences: [],
    piIP: '192.168.1.100',
  });

  const sosActiveRef      = useRef(false);
  const settingsRef       = useRef(settings); // always-current settings for async callbacks

  // ─── TTS state ───────────────────────────────────────────────────────────────
  const ttsQueue          = useRef<string[]>([]);
  const isProcessingTTS   = useRef(false);
  const lastSpokenText    = useRef('');
  const lastSpokenTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer         = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingTimer         = useRef<ReturnType<typeof setInterval> | null>(null);
  const pingAbortRef      = useRef<AbortController | null>(null);
  const pollAbortRef      = useRef<AbortController | null>(null);

  // ─── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadSettings().then(s => {
      setSettingsState(s);
      settingsRef.current = s;
      WebSocketService.init(s.piIP, handleTTSMessage);
      startWiFiPolling(s.piIP);
    });

    // BLE only used for obstacle mock + GPS (real face/battery come from WiFi)
    BLEService.init({
      onConnected: (deviceName, deviceId) => {
        setBLE({ connected: true, deviceName, deviceId });
      },
      onDisconnected: () => {
        setBLE(prev => ({ ...prev, connected: false }));
      },
      onBattery: () => {},                        // battery comes from HTTP polling
      onObstacle: (state) => setObstacle(state),  // mock only — not on Pi
      onFace: () => {},                           // face comes from WebSocket
      onSOS: (active) => {
        if (active && !sosActiveRef.current) {
          sosActiveRef.current = true;
          handleSOSTrigger();
        }
      },
      onGPS: (location) => {
        setGPS(location);
        appendGPSPoint({ lat: location.lat, lng: location.lng, timestamp: location.timestamp });
      },
      onDeviceStatus: (status) => setDeviceStatus(status),
    });

    // Mock obstacle cycling (obstacle detection not implemented on Pi)
    let mockDist = 350;
    const obstacleInterval = setInterval(() => {
      mockDist = mockDist > 15 ? mockDist - 5 : 350;
      setObstacle({
        distance: mockDist,
        severity: mockDist < 50 ? 'danger' : mockDist < 200 ? 'caution' : 'safe',
        updatedAt: Date.now(),
      });
    }, 1000);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startWiFiPolling(settingsRef.current.piIP);
      } else {
        if (pollTimer.current) clearInterval(pollTimer.current);
        if (pingTimer.current) clearInterval(pingTimer.current);
        pingAbortRef.current?.abort();
        pollAbortRef.current?.abort();
      }
    });

    return () => {
      BLEService.destroy();
      WebSocketService.destroy();
      if (pollTimer.current) clearInterval(pollTimer.current);
      if (pingTimer.current) clearInterval(pingTimer.current);
      clearInterval(obstacleInterval);
      appStateSub.remove();
    };
  }, []);

  // ─── WiFi Polling ─────────────────────────────────────────────────────────────

  function startWiFiPolling(ip: string) {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (pingTimer.current) clearInterval(pingTimer.current);

    const doPing = async () => {
      pingAbortRef.current?.abort();
      pingAbortRef.current = new AbortController();
      try {
        const res = await fetch(`http://${ip}:5000/ping`, {
          signal: pingAbortRef.current.signal,
        });
        if (res.ok) {
          setBLE(prev => ({ ...prev, connected: true, deviceName: prev.deviceName ?? 'SmartCane' }));
        } else {
          setBLE(prev => ({ ...prev, connected: false }));
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setBLE(prev => ({ ...prev, connected: false }));
        }
      }
    };

    const doPollStatus = async () => {
      pollAbortRef.current?.abort();
      pollAbortRef.current = new AbortController();
      try {
        const res = await fetch(`http://${ip}:5000/status`, {
          signal: pollAbortRef.current.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.battery === 'number') setBattery(data.battery);
        }
      } catch {}
    };

    doPing();
    doPollStatus();
    pingTimer.current = setInterval(doPing, 10_000);
    pollTimer.current = setInterval(doPollStatus, 30_000);
  }

  // ─── TTS Pipeline ────────────────────────────────────────────────────────────

  function handleTTSMessage(msg: TTSMessage): void {
    // Update last face from real Pi face detection
    if (msg.type === 'face_announcement' && msg.name) {
      setLastFace({
        name: msg.name,
        confidence: msg.confidence ?? 1.0,
        timestamp: msg.timestamp * 1000, // Pi sends Unix seconds → convert to ms
      });
    }

    if (!ELEVENLABS_API_KEY) return; // no key configured — skip TTS silently

    const text = msg.text.trim();
    if (!text) return;

    // Deduplicate: ignore the same text within TTS_DEDUP_WINDOW_MS
    if (text === lastSpokenText.current) return;
    lastSpokenText.current = text;
    if (lastSpokenTimer.current) clearTimeout(lastSpokenTimer.current);
    lastSpokenTimer.current = setTimeout(() => {
      lastSpokenText.current = '';
    }, TTS_DEDUP_WINDOW_MS);

    // Cap queue — drop oldest if burst arrives
    if (ttsQueue.current.length >= TTS_QUEUE_MAX) {
      ttsQueue.current.shift();
    }
    ttsQueue.current.push(text);
    processTTSQueue();
  }

  async function processTTSQueue(): Promise<void> {
    if (isProcessingTTS.current || ttsQueue.current.length === 0) return;
    isProcessingTTS.current = true;

    const text = ttsQueue.current.shift()!;

    try {
      const buffer = await synthesizeSpeech({
        apiKey: ELEVENLABS_API_KEY,
        text,
      });

      if (buffer) {
        await playAudioBuffer(buffer);
      }
    } catch (err) {
      console.warn('[TTS Pipeline] Error:', err);
    }

    isProcessingTTS.current = false;

    // Process next item if queue has more
    if (ttsQueue.current.length > 0) {
      processTTSQueue();
    }
  }

  // ─── SOS Trigger ─────────────────────────────────────────────────────────────
  async function handleSOSTrigger() {
    const triggeredAt = Date.now();
    setSOS({ active: true, triggeredAt, notified: [] });

    await triggerSOS(
      settingsRef.current.userName,
      gps,
      (contactName) => {
        setSOS(prev => ({ ...prev, notified: [...prev.notified, contactName] }));
      }
    );
  }

  function dismissSOS() {
    sosActiveRef.current = false;
    setSOS({ active: false, triggeredAt: null, notified: [] });
  }

  // ─── Settings ────────────────────────────────────────────────────────────────
  function updateSettings(patch: Partial<Settings>) {
    const updated = { ...settingsRef.current, ...patch };
    setSettingsState(updated);
    settingsRef.current = updated;
    saveSettings(updated);

    // Reconnect WebSocket + restart WiFi polling if Pi IP changed
    if (patch.piIP && patch.piIP !== settingsRef.current.piIP) {
      WebSocketService.updateIP(patch.piIP);
      startWiFiPolling(patch.piIP);
    }
  }

  const value: CaneContextType = {
    ble,
    battery,
    obstacle,
    lastFace,
    gps,
    sos,
    deviceStatus,
    registeredFaces,
    setRegisteredFaces,
    userName: settings.userName,
    emergencyContacts: settings.emergencyContacts,
    geofences: settings.geofences,
    piIP: settings.piIP,
    dismissSOS,
    updateSettings,
  };

  return <CaneContext.Provider value={value}>{children}</CaneContext.Provider>;
}

export function useCane(): CaneContextType {
  const ctx = useContext(CaneContext);
  if (!ctx) throw new Error('useCane must be used within CaneProvider');
  return ctx;
}
