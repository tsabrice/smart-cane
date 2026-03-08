// ─── BLE ─────────────────────────────────────────────────────────────────────
export const BLE_DEVICE_NAME = 'SmartCane-001';

// Confirm these UUIDs with whoever writes ble_server.py on the Pi
export const BLE_SERVICE_UUID = '12345678-1234-1234-1234-123456789000';

export const BLE_UUIDS = {
  BATTERY:           '12345678-1234-1234-1234-123456789001',
  OBSTACLE_DISTANCE: '12345678-1234-1234-1234-123456789002',
  LAST_FACE:         '12345678-1234-1234-1234-123456789003',
  SOS_TRIGGER:       '12345678-1234-1234-1234-123456789004',
  GPS_LOCATION:      '12345678-1234-1234-1234-123456789005',
  DEVICE_STATUS:     '12345678-1234-1234-1234-123456789006',
  FACE_SYNC:         '12345678-1234-1234-1234-123456789007',
};

// ─── WiFi / Pi HTTP API ───────────────────────────────────────────────────────
export const PI_DEFAULT_IP = '192.168.1.100';
export const PI_PORT = 5000;

export const PI_ENDPOINTS = {
  PING:             '/ping',
  FACES_LIST:       '/faces/list',
  FACES_REGISTER:   '/faces/register',
  FACES_DELETE:     '/faces',   // DELETE /faces/:name
  FACES_STATUS:     '/faces/status',
};

// ─── Obstacle Thresholds (cm) ─────────────────────────────────────────────────
export const OBSTACLE_THRESHOLDS = {
  SAFE:    200,
  CAUTION: 50,
  // below CAUTION = danger
};

// ─── Data Staleness ───────────────────────────────────────────────────────────
export const STALE_THRESHOLD_MS = 30_000; // show "stale" warning after 30s

// ─── GPS / Movement ───────────────────────────────────────────────────────────
export const GPS_STATIONARY_THRESHOLD_M = 10;  // metres
export const GPS_STATIONARY_DURATION_S  = 60;  // seconds before marking stationary

// ─── Mock Mode ────────────────────────────────────────────────────────────────
// Set to true during development when no Pi hardware is available
export const MOCK_MODE = true;

// ─── BLE Reconnect ────────────────────────────────────────────────────────────
export const BLE_RECONNECT_INTERVAL_MS = 5_000;
export const BLE_SCAN_TIMEOUT_MS       = 10_000;
