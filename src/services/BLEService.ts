import { BleManager, Device, Characteristic, BleError } from 'react-native-ble-plx';
import { BLE_DEVICE_NAME, BLE_SERVICE_UUID, BLE_UUIDS, BLE_RECONNECT_INTERVAL_MS, BLE_SCAN_TIMEOUT_MS, MOCK_MODE } from '../utils/constants';
import {
  decodeUint8,
  decodeUint16LE,
  decodeString,
  decodeBool,
  getObstacleSeverity,
} from '../utils/helpers';
import { ObstacleState, FaceDetection, GPSLocation, SOSState, DeviceStatus } from '../types';
import { Buffer } from 'buffer';

export type BLECallbacks = {
  onConnected: (deviceName: string, deviceId: string) => void;
  onDisconnected: () => void;
  onBattery: (percent: number) => void;
  onObstacle: (state: ObstacleState) => void;
  onFace: (detection: FaceDetection) => void;
  onSOS: (active: boolean) => void;
  onGPS: (location: GPSLocation) => void;
  onDeviceStatus: (status: DeviceStatus) => void;
};

class BLEService {
  private manager: BleManager | null = null;
  private device: Device | null = null;
  private callbacks: BLECallbacks | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;

  init(callbacks: BLECallbacks): void {
    this.callbacks = callbacks;
    if (MOCK_MODE) {
      this.startMockMode();
      return;
    }
    this.manager = new BleManager();
    this.scanAndConnect();
  }

  destroy(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.device?.cancelConnection();
    this.manager?.destroy();
  }

  // ─── Scan & Connect ──────────────────────────────────────────────────────────

  scanAndConnect(): void {
    if (this.isConnecting || !this.manager) return;
    this.isConnecting = true;

    const scanTimeout = setTimeout(() => {
      this.manager?.stopDeviceScan();
      this.isConnecting = false;
      this.scheduleReconnect();
    }, BLE_SCAN_TIMEOUT_MS);

    this.manager.startDeviceScan(null, null, async (error, device) => {
      if (error) {
        clearTimeout(scanTimeout);
        this.isConnecting = false;
        this.scheduleReconnect();
        return;
      }
      if (device?.name !== BLE_DEVICE_NAME) return;

      clearTimeout(scanTimeout);
      this.manager?.stopDeviceScan();

      try {
        const connected = await device.connect();
        await connected.discoverAllServicesAndCharacteristics();
        this.device = connected;
        this.isConnecting = false;

        this.callbacks?.onConnected(device.name ?? BLE_DEVICE_NAME, device.id);
        this.subscribeAll();
        this.watchDisconnect();
      } catch {
        this.isConnecting = false;
        this.scheduleReconnect();
      }
    });
  }

  private watchDisconnect(): void {
    this.device?.onDisconnected(() => {
      this.device = null;
      this.callbacks?.onDisconnected();
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.scanAndConnect(), BLE_RECONNECT_INTERVAL_MS);
  }

  // ─── Subscribe to All Characteristics ───────────────────────────────────────

  private subscribeAll(): void {
    this.subscribe(BLE_UUIDS.BATTERY, (bytes) => {
      const percent = decodeUint8(bytes);
      this.callbacks?.onBattery(percent);
    });

    this.subscribe(BLE_UUIDS.OBSTACLE_DISTANCE, (bytes) => {
      const cm = decodeUint16LE(bytes);
      this.callbacks?.onObstacle({
        distance: cm,
        severity: getObstacleSeverity(cm),
        updatedAt: Date.now(),
      });
    });

    this.subscribe(BLE_UUIDS.LAST_FACE, (bytes) => {
      try {
        const json = decodeString(bytes);
        const data = JSON.parse(json);
        this.callbacks?.onFace({
          name: data.name,
          confidence: data.confidence,
          timestamp: data.timestamp ?? Date.now(),
        });
      } catch {}
    });

    this.subscribe(BLE_UUIDS.SOS_TRIGGER, (bytes) => {
      const active = decodeBool(bytes);
      this.callbacks?.onSOS(active);
    });

    this.subscribe(BLE_UUIDS.GPS_LOCATION, (bytes) => {
      try {
        const json = decodeString(bytes);
        const data = JSON.parse(json);
        this.callbacks?.onGPS({
          lat: data.lat,
          lng: data.lng,
          accuracy: data.accuracy,
          timestamp: data.timestamp ?? Date.now(),
        });
      } catch {}
    });

    this.subscribe(BLE_UUIDS.DEVICE_STATUS, (bytes) => {
      try {
        const json = decodeString(bytes);
        const data = JSON.parse(json);
        this.callbacks?.onDeviceStatus(data);
      } catch {}
    });
  }

  private subscribe(uuid: string, handler: (bytes: number[]) => void): void {
    if (!this.device) return;
    this.device.monitorCharacteristicForService(
      BLE_SERVICE_UUID,
      uuid,
      (error: BleError | null, char: Characteristic | null) => {
        if (error || !char?.value) return;
        const bytes = Array.from(Buffer.from(char.value, 'base64'));
        handler(bytes);
      }
    );
  }

  // ─── Write ───────────────────────────────────────────────────────────────────

  async writeFaceSync(data: Uint8Array): Promise<void> {
    if (!this.device) return;
    const b64 = Buffer.from(data).toString('base64');
    await this.device.writeCharacteristicWithResponseForService(
      BLE_SERVICE_UUID,
      BLE_UUIDS.FACE_SYNC,
      b64
    );
  }

  // ─── Mock Mode ───────────────────────────────────────────────────────────────

  private startMockMode(): void {
    setTimeout(() => {
      this.callbacks?.onConnected('SmartCane-001 (Mock)', 'mock-device-id');

      // Battery
      setInterval(() => this.callbacks?.onBattery(78), 5000);
      this.callbacks?.onBattery(78);

      // Obstacle — simulates walking toward something
      let dist = 350;
      setInterval(() => {
        dist = dist > 15 ? dist - 5 : 350;
        this.callbacks?.onObstacle({
          distance: dist,
          severity: getObstacleSeverity(dist),
          updatedAt: Date.now(),
        });
      }, 1000);

      // Face detection every 15s
      setInterval(() => {
        this.callbacks?.onFace({
          name: 'Sarah',
          confidence: 0.92,
          timestamp: Date.now(),
        });
      }, 15_000);

      // GPS updates
      setInterval(() => {
        this.callbacks?.onGPS({
          lat: 45.4215 + (Math.random() - 0.5) * 0.001,
          lng: -75.6972 + (Math.random() - 0.5) * 0.001,
          accuracy: 5,
          timestamp: Date.now(),
        });
      }, 10_000);
      this.callbacks?.onGPS({ lat: 45.4215, lng: -75.6972, accuracy: 5, timestamp: Date.now() });

    }, 1500); // simulate connection delay
  }
}

export default new BLEService();
