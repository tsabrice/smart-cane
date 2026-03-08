import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmergencyContact, Geofence, MovementEvent, Settings } from '../types';

const KEYS = {
  SETTINGS:       'settings',
  MOVEMENT_LOG:   'movement_log',
  GPS_HISTORY:    'gps_history',
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
  if (!raw) return defaultSettings();
  try {
    return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultSettings();
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

function defaultSettings(): Settings {
  return {
    userName: 'User',
    emergencyContacts: [],
    geofences: [],
    piIP: '192.168.1.100',
  };
}

// ─── Emergency Contacts ───────────────────────────────────────────────────────

export async function getEmergencyContacts(): Promise<EmergencyContact[]> {
  const settings = await loadSettings();
  return settings.emergencyContacts;
}

export async function saveEmergencyContacts(contacts: EmergencyContact[]): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({ ...settings, emergencyContacts: contacts });
}

// ─── Geofences ────────────────────────────────────────────────────────────────

export async function getGeofences(): Promise<Geofence[]> {
  const settings = await loadSettings();
  return settings.geofences;
}

export async function saveGeofences(geofences: Geofence[]): Promise<void> {
  const settings = await loadSettings();
  await saveSettings({ ...settings, geofences });
}

// ─── Movement Log ─────────────────────────────────────────────────────────────

export async function getMovementLog(): Promise<MovementEvent[]> {
  const raw = await AsyncStorage.getItem(KEYS.MOVEMENT_LOG);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function appendMovementEvent(event: MovementEvent): Promise<void> {
  const log = await getMovementLog();
  // Keep last 100 events
  const updated = [...log, event].slice(-100);
  await AsyncStorage.setItem(KEYS.MOVEMENT_LOG, JSON.stringify(updated));
}

export async function clearMovementLog(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.MOVEMENT_LOG);
}

// ─── GPS History ──────────────────────────────────────────────────────────────

export async function appendGPSPoint(point: { lat: number; lng: number; timestamp: number }): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.GPS_HISTORY);
  let history: any[] = [];
  if (raw) {
    try { history = JSON.parse(raw); } catch { history = []; }
  }
  const updated = [...history, point].slice(-500); // keep last 500 points
  await AsyncStorage.setItem(KEYS.GPS_HISTORY, JSON.stringify(updated));
}

export async function getGPSHistory(): Promise<{ lat: number; lng: number; timestamp: number }[]> {
  const raw = await AsyncStorage.getItem(KEYS.GPS_HISTORY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
