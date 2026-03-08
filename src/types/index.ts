export interface BLEState {
  connected: boolean;
  deviceName: string | null;
  deviceId: string | null;
}

export interface ObstacleState {
  distance: number | null; // cm
  severity: 'safe' | 'caution' | 'danger' | 'unknown';
  updatedAt: number | null; // timestamp ms
}

export interface FaceDetection {
  name: string;
  confidence: number; // 0–1
  timestamp: number; // ms
}

export interface GPSLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface SOSState {
  active: boolean;
  triggeredAt: number | null;
  notified: string[]; // contact names confirmed sent
}

export interface DeviceStatus {
  uptime: string;
  wifi: boolean;
  ip: string | null;
  mode: string;
}

export interface RegisteredFace {
  name: string;
  relationship: string;
  thumbnail: string | null; // base64
  addedAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  isPrimary: boolean;
}

export interface Geofence {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  enabled: boolean;
}

export interface MovementEvent {
  timestamp: number;
  label: string;
  lat: number;
  lng: number;
}

export interface CaneContextType {
  ble: BLEState;
  battery: number | null;
  obstacle: ObstacleState;
  lastFace: FaceDetection | null;
  gps: GPSLocation | null;
  sos: SOSState;
  deviceStatus: DeviceStatus | null;

  // Face management
  registeredFaces: RegisteredFace[];
  setRegisteredFaces: (faces: RegisteredFace[]) => void;

  // Settings
  userName: string;
  emergencyContacts: EmergencyContact[];
  geofences: Geofence[];
  piIP: string;

  // Actions
  dismissSOS: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

export interface Settings {
  userName: string;
  emergencyContacts: EmergencyContact[];
  geofences: Geofence[];
  piIP: string;
}

export type FaceRegistrationStep =
  | 'idle'
  | 'camera'
  | 'capturing'
  | 'form'
  | 'uploading'
  | 'done'
  | 'error';
