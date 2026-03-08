import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert,
} from 'react-native';
import MapView, { Marker, Circle, MapPressEvent } from 'react-native-maps';
import { useCane } from '../context/CaneContext';
import { getMovementLog } from '../services/StorageService';
import { formatTimeAgo, haversineDistanceMeters } from '../utils/helpers';
import { GPS_STATIONARY_THRESHOLD_M, GPS_STATIONARY_DURATION_S } from '../utils/constants';
import { MovementEvent, Geofence } from '../types';
import { appendMovementEvent, saveGeofences } from '../services/StorageService';

export default function TrackingScreen() {
  const { gps, geofences, updateSettings } = useCane();
  const mapRef = useRef<MapView>(null);
  const [movementLog, setMovementLog] = useState<MovementEvent[]>([]);
  const [geofenceMode, setGeofenceMode] = useState(false);
  const [pendingFence, setPendingFence] = useState<{ lat: number; lng: number; radius: number } | null>(null);
  const [fenceName, setFenceName] = useState('');
  const lastGPSRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  useEffect(() => {
    loadLog();
  }, []);

  useEffect(() => {
    if (!gps) return;
    classifyMovement(gps);
  }, [gps]);

  async function loadLog() {
    const log = await getMovementLog();
    setMovementLog(log.slice(-20).reverse()); // show newest first, last 20
  }

  async function classifyMovement(location: typeof gps) {
    if (!location) return;
    const prev = lastGPSRef.current;

    if (!prev) {
      lastGPSRef.current = { lat: location.lat, lng: location.lng, timestamp: location.timestamp };
      return;
    }

    const distM = haversineDistanceMeters(
      { lat: prev.lat, lng: prev.lng, accuracy: 0, timestamp: prev.timestamp },
      location
    );
    const durationSec = (location.timestamp - prev.timestamp) / 1000;

    let label = '';
    if (distM < GPS_STATIONARY_THRESHOLD_M && durationSec > GPS_STATIONARY_DURATION_S) {
      label = 'Stationary';
    } else if (distM >= GPS_STATIONARY_THRESHOLD_M) {
      label = 'Moving';
    }

    if (label) {
      const event: MovementEvent = {
        timestamp: location.timestamp,
        label,
        lat: location.lat,
        lng: location.lng,
      };
      await appendMovementEvent(event);
      await loadLog();
    }

    lastGPSRef.current = { lat: location.lat, lng: location.lng, timestamp: location.timestamp };
  }

  function centerOnCane() {
    if (!gps) return;
    mapRef.current?.animateToRegion({
      latitude: gps.lat,
      longitude: gps.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 500);
  }

  function handleMapPress(e: MapPressEvent) {
    if (!geofenceMode) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPendingFence({ lat: latitude, lng: longitude, radius: 200 });
  }

  function saveFence() {
    if (!pendingFence || !fenceName.trim()) {
      Alert.alert('Name required', 'Give this zone a name.');
      return;
    }
    const newFence: Geofence = {
      id: Date.now().toString(),
      name: fenceName.trim(),
      lat: pendingFence.lat,
      lng: pendingFence.lng,
      radiusMeters: pendingFence.radius,
      enabled: true,
    };
    const updated = [...geofences, newFence];
    updateSettings({ geofences: updated });
    setPendingFence(null);
    setFenceName('');
    setGeofenceMode(false);
  }

  const initialRegion = gps
    ? { latitude: gps.lat, longitude: gps.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }
    : { latitude: 45.4215, longitude: -75.6972, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onPress={handleMapPress}
        >
          {gps && (
            <Marker coordinate={{ latitude: gps.lat, longitude: gps.lng }}>
              <View style={styles.caneDot} />
            </Marker>
          )}

          {geofences.map(fence => (
            <Circle
              key={fence.id}
              center={{ latitude: fence.lat, longitude: fence.lng }}
              radius={fence.radiusMeters}
              strokeColor="#3b82f6"
              fillColor="rgba(59,130,246,0.1)"
            />
          ))}

          {pendingFence && (
            <Circle
              center={{ latitude: pendingFence.lat, longitude: pendingFence.lng }}
              radius={pendingFence.radius}
              strokeColor="#f59e0b"
              fillColor="rgba(245,158,11,0.15)"
            />
          )}
        </MapView>

        {/* Map action buttons */}
        <TouchableOpacity style={[styles.mapBtn, styles.centerBtn]} onPress={centerOnCane}>
          <Text style={styles.mapBtnText}>Center</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mapBtn, styles.fenceBtn, geofenceMode && styles.mapBtnActive]}
          onPress={() => { setGeofenceMode(!geofenceMode); setPendingFence(null); }}
        >
          <Text style={[styles.mapBtnText, geofenceMode && styles.mapBtnTextActive]}>Fence</Text>
        </TouchableOpacity>

        {/* GPS staleness indicator */}
        {gps && (
          <View style={styles.gpsStamp}>
            <Text style={styles.gpsStampText}>GPS {formatTimeAgo(gps.timestamp)}</Text>
          </View>
        )}
      </View>

      {/* Geofence name input */}
      {geofenceMode && pendingFence && (
        <View style={styles.fenceForm}>
          <TextInput
            style={styles.fenceInput}
            placeholder="Zone name (e.g. Home)"
            value={fenceName}
            onChangeText={setFenceName}
          />
          <TouchableOpacity style={styles.fenceSaveBtn} onPress={saveFence}>
            <Text style={styles.fenceSaveBtnText}>Save Zone</Text>
          </TouchableOpacity>
        </View>
      )}

      {geofenceMode && !pendingFence && (
        <View style={styles.fenceHint}>
          <Text style={styles.fenceHintText}>Tap the map to place a safe zone</Text>
        </View>
      )}

      {/* Movement Log */}
      <ScrollView style={styles.log} contentContainerStyle={styles.logContent}>
        <Text style={styles.logTitle}>Today's Movement</Text>
        {movementLog.length === 0 && (
          <Text style={styles.logEmpty}>No movement recorded yet.</Text>
        )}
        {movementLog.map((event, i) => (
          <View key={i} style={styles.logRow}>
            <View style={styles.logDot} />
            <View>
              <Text style={styles.logLabel}>{event.label}</Text>
              <Text style={styles.logTime}>{formatTimeAgo(event.timestamp)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  mapContainer: { height: 340, position: 'relative' },
  caneDot: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#3b82f6',
    borderWidth: 2.5, borderColor: '#fff',
    shadowColor: '#3b82f6', shadowOpacity: 0.5, shadowRadius: 6,
  },
  mapBtn: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  centerBtn: { bottom: 14, left: 14 },
  fenceBtn:  { bottom: 14, right: 14 },
  mapBtnActive: { backgroundColor: '#3b82f6' },
  mapBtnText: { fontWeight: '600', color: '#1e293b', fontSize: 13 },
  mapBtnTextActive: { color: '#fff' },
  gpsStamp: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  gpsStampText: { color: '#fff', fontSize: 11, fontWeight: '500' },
  fenceForm: {
    flexDirection: 'row', padding: 12, gap: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0',
  },
  fenceInput: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
  },
  fenceSaveBtn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  fenceSaveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  fenceHint: { padding: 12, backgroundColor: '#fef9c3', alignItems: 'center' },
  fenceHintText: { color: '#854d0e', fontWeight: '500' },
  log: { flex: 1 },
  logContent: { padding: 16 },
  logTitle: { fontSize: 14, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  logEmpty: { color: '#94a3b8', fontSize: 14 },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6', marginTop: 5 },
  logLabel: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  logTime: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
});
