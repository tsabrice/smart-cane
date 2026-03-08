import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

  const sosActiveRef = useRef(false);

  // ─── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadSettings().then(s => setSettingsState(s));

    BLEService.init({
      onConnected: (deviceName, deviceId) => {
        setBLE({ connected: true, deviceName, deviceId });
      },
      onDisconnected: () => {
        setBLE({ connected: false, deviceName: null, deviceId: null });
      },
      onBattery: (percent) => setBattery(percent),
      onObstacle: (state) => setObstacle(state),
      onFace: (detection) => setLastFace(detection),
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

    return () => BLEService.destroy();
  }, []);

  // ─── SOS Trigger ─────────────────────────────────────────────────────────────
  async function handleSOSTrigger() {
    const triggeredAt = Date.now();
    setSOS({ active: true, triggeredAt, notified: [] });

    await triggerSOS(
      settings.userName,
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
    const updated = { ...settings, ...patch };
    setSettingsState(updated);
    saveSettings(updated);
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
