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
              strokeColor="#FF385C"
              fillColor="rgba(255,56,92,0.07)"
            />
          ))}
          {pendingFence && (
            <Circle
              center={{ latitude: pendingFence.lat, longitude: pendingFence.lng }}
              radius={pendingFence.radius}
              strokeColor="#FC642D"
              fillColor="rgba(252,100,45,0.1)"
            />
          )}
        </MapView>

        {/* GPS stamp */}
        {gps && (
          <View style={styles.gpsStamp}>
            <Text style={styles.gpsStampText}>GPS · {formatTimeAgo(gps.timestamp)}</Text>
          </View>
        )}

        {/* Map pills */}
        <View style={styles.mapPills}>
          <TouchableOpacity style={styles.pill} onPress={centerOnCane} activeOpacity={0.8}>
            <Text style={styles.pillText}>◎ Center</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, geofenceMode && styles.pillActive]}
            onPress={() => { setGeofenceMode(!geofenceMode); setPendingFence(null); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, geofenceMode && styles.pillTextActive]}>⊕ Safe Zone</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Geofence input */}
      {geofenceMode && pendingFence && (
        <View style={styles.fenceForm}>
          <TextInput
            style={styles.fenceInput}
            placeholder="Zone name  (e.g. Home)"
            placeholderTextColor="#BBBBBB"
            value={fenceName}
            onChangeText={setFenceName}
          />
          <TouchableOpacity style={styles.fenceSaveBtn} onPress={saveFence} activeOpacity={0.85}>
            <Text style={styles.fenceSaveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {geofenceMode && !pendingFence && (
        <View style={styles.fenceHint}>
          <Text style={styles.fenceHintText}>Tap the map to place a safe zone</Text>
        </View>
      )}

      {/* Movement log — bottom sheet style */}
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Today's Movement</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {movementLog.length === 0 && (
            <Text style={styles.logEmpty}>No movement recorded yet.</Text>
          )}
          {movementLog.map((event, i) => (
            <View key={i} style={styles.logRow}>
              <View style={[styles.logDot, event.label === 'Moving' && styles.logDotMoving]} />
              <View style={styles.logInfo}>
                <Text style={styles.logLabel}>{event.label}</Text>
                <Text style={styles.logTime}>{formatTimeAgo(event.timestamp)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  mapContainer: { height: '55%' as any, position: 'relative' },
  caneDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#FF385C',
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: '#FF385C', shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
  },
  gpsStamp: {
    position: 'absolute', top: 14, left: 14,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  gpsStampText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  mapPills: {
    position: 'absolute', bottom: 14, right: 14,
    flexDirection: 'row', gap: 8,
  },
  pill: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  pillActive: { backgroundColor: '#222222' },
  pillText: { fontWeight: '600', color: '#222222', fontSize: 13 },
  pillTextActive: { color: '#FFFFFF' },
  fenceForm: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEBEB',
  },
  fenceInput: {
    flex: 1, backgroundColor: '#F7F7F7', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#222222',
    borderWidth: 1, borderColor: '#EBEBEB',
  },
  fenceSaveBtn: {
    backgroundColor: '#222222', borderRadius: 10,
    paddingHorizontal: 18, justifyContent: 'center',
  },
  fenceSaveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  fenceHint: {
    paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center',
    backgroundColor: '#FFF8F0', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EBEBEB',
  },
  fenceHintText: { color: '#FC642D', fontWeight: '500', fontSize: 13 },
  sheet: {
    flex: 1, backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 24, paddingTop: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: -3 },
    elevation: 5,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#DDDDDD', alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 11, fontWeight: '600', color: '#AAAAAA',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16,
  },
  logEmpty: { color: '#AAAAAA', fontSize: 14 },
  logRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F0F0',
  },
  logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DDDDDD' },
  logDotMoving: { backgroundColor: '#00A699' },
  logInfo: { flex: 1 },
  logLabel: { fontSize: 15, fontWeight: '600', color: '#222222' },
  logTime: { fontSize: 12, color: '#AAAAAA', marginTop: 2 },
});
