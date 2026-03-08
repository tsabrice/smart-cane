import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, MapPressEvent } from 'react-native-maps';
import { useCane } from '../context/CaneContext';
import { getMovementLog } from '../services/StorageService';
import { formatTimeAgo, haversineDistanceMeters } from '../utils/helpers';
import { GPS_STATIONARY_THRESHOLD_M, GPS_STATIONARY_DURATION_S } from '../utils/constants';
import { MovementEvent, Geofence } from '../types';
import { appendMovementEvent } from '../services/StorageService';
import { Colors, Spacing, Shadows, BorderRadius } from '../utils/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function TrackingScreen() {
  const { gps, geofences, updateSettings } = useCane();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [movementLog, setMovementLog] = useState<MovementEvent[]>([]);
  const [geofenceMode, setGeofenceMode] = useState(false);
  const [pendingFence, setPendingFence] = useState<{ lat: number; lng: number; radius: number } | null>(null);
  const [fenceName, setFenceName] = useState('');
  const lastGPSRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);

  useEffect(() => { loadLog(); }, []);

  useEffect(() => {
    if (!gps) return;
    classifyMovement(gps);
  }, [gps]);

  async function loadLog() {
    const log = await getMovementLog();
    setMovementLog(log.slice(-20).reverse());
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
    if (distM < GPS_STATIONARY_THRESHOLD_M && durationSec > GPS_STATIONARY_DURATION_S) label = 'Stationary';
    else if (distM >= GPS_STATIONARY_THRESHOLD_M) label = 'Moving';
    if (label) {
      await appendMovementEvent({ timestamp: location.timestamp, label, lat: location.lat, lng: location.lng });
      await loadLog();
    }
    lastGPSRef.current = { lat: location.lat, lng: location.lng, timestamp: location.timestamp };
  }

  function centerOnCane() {
    if (!gps) return;
    mapRef.current?.animateToRegion({ latitude: gps.lat, longitude: gps.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }, 500);
  }

  function handleMapPress(e: MapPressEvent) {
    if (!geofenceMode) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPendingFence({ lat: latitude, lng: longitude, radius: 200 });
  }

  function saveFence() {
    if (!pendingFence || !fenceName.trim()) {
      Alert.alert('Name required', 'Give this safe zone a name.');
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
    updateSettings({ geofences: [...geofences, newFence] });
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
      <View style={styles.mapWrap}>
        <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={initialRegion} onPress={handleMapPress}>
          {gps && (
            <Marker coordinate={{ latitude: gps.lat, longitude: gps.lng }}>
              <View style={styles.caneDot} />
            </Marker>
          )}
          {geofences.map(f => (
            <Circle
              key={f.id}
              center={{ latitude: f.lat, longitude: f.lng }}
              radius={f.radiusMeters}
              strokeColor={Colors.accent}
              fillColor={Colors.accent + '12'}
            />
          ))}
          {pendingFence && (
            <Circle
              center={{ latitude: pendingFence.lat, longitude: pendingFence.lng }}
              radius={pendingFence.radius}
              strokeColor={Colors.caution}
              fillColor={Colors.caution + '18'}
            />
          )}
        </MapView>

        {gps && (
          <View style={styles.gpsStamp}>
            <Text style={styles.gpsStampText}>GPS · {formatTimeAgo(gps.timestamp)}</Text>
          </View>
        )}

        <View style={styles.mapPills}>
          <TouchableOpacity style={styles.pill} onPress={centerOnCane} activeOpacity={0.8}>
            <Text style={styles.pillText}>◎ Center</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pill, geofenceMode && styles.pillActive]}
            onPress={() => { setGeofenceMode(!geofenceMode); setPendingFence(null); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, geofenceMode && styles.pillTextActive]}>⊕ Add Zone</Text>
          </TouchableOpacity>
        </View>

        {geofenceMode && !pendingFence && (
          <View style={styles.hintBanner}>
            <Text style={styles.hintText}>Tap the map to place a safe zone</Text>
          </View>
        )}

        {geofenceMode && pendingFence && (
          <View style={styles.fenceForm}>
            <TextInput
              style={styles.fenceInput}
              placeholder="Zone name  (e.g. Home)"
              placeholderTextColor={Colors.textMuted}
              value={fenceName}
              onChangeText={setFenceName}
            />
            <TouchableOpacity style={styles.fenceSaveBtn} onPress={saveFence} activeOpacity={0.85}>
              <Text style={styles.fenceSaveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom sheet */}
      <ScrollView style={styles.sheet} contentContainerStyle={[styles.sheetContent, { paddingBottom: 32 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.sheetHandle} />

        {geofences.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>SAFE ZONES</Text>
            <View style={styles.group}>
              {geofences.map((f, i) => (
                <View key={f.id} style={[styles.zoneRow, i === geofences.length - 1 && styles.rowLast]}>
                  <Text style={styles.zoneIcon}>◯</Text>
                  <Text style={styles.zoneName}>{f.name}</Text>
                  <Text style={styles.zoneRadius}>{f.radiusMeters}m</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>TODAY'S MOVEMENT</Text>
        {movementLog.length === 0 ? (
          <Text style={styles.empty}>No movement recorded yet.</Text>
        ) : (
          <View style={styles.timeline}>
            {movementLog.map((event, i) => (
              <View key={i} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, event.label === 'Moving' && styles.timelineDotActive]} />
                  {i < movementLog.length - 1 && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineLabel}>{event.label}</Text>
                  <Text style={styles.timelineTime}>{formatTimeAgo(event.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  mapWrap: { height: SCREEN_HEIGHT * 0.44, position: 'relative' },
  caneDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: Colors.accent,
    borderWidth: 2.5, borderColor: '#FFFFFF',
    shadowColor: Colors.accent, shadowOpacity: 0.5, shadowRadius: 6, elevation: 4,
  },
  gpsStamp: {
    position: 'absolute', top: 14, left: 14,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  gpsStampText: { color: '#FFFFFF', fontSize: 12, fontWeight: '500' },
  mapPills: { position: 'absolute', bottom: 14, right: 14, flexDirection: 'row', gap: 8 },
  pill: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingVertical: 8, paddingHorizontal: 14, ...Shadows.level1,
  },
  pillActive: { backgroundColor: Colors.textPrimary },
  pillText: { fontWeight: '600', color: Colors.textPrimary, fontSize: 13 },
  pillTextActive: { color: '#FFFFFF' },
  hintBanner: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFBEB', paddingVertical: 10, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  hintText: { color: Colors.caution, fontWeight: '500', fontSize: 13 },
  fenceForm: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    gap: 10, backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  fenceInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: BorderRadius.md,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border,
  },
  fenceSaveBtn: {
    backgroundColor: Colors.textPrimary, borderRadius: BorderRadius.md,
    paddingHorizontal: 18, justifyContent: 'center',
  },
  fenceSaveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  sheet: { flex: 1 },
  sheetContent: { paddingHorizontal: Spacing.xl },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border, alignSelf: 'center', marginVertical: Spacing.md,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: Spacing.sm,
  },
  group: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, overflow: 'hidden', ...Shadows.level1 },
  zoneRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.divider, gap: Spacing.md,
  },
  rowLast: { borderBottomWidth: 0 },
  zoneIcon: { fontSize: 16, color: Colors.accent, width: 20 },
  zoneName: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  zoneRadius: { fontSize: 13, color: Colors.textMuted },
  empty: { color: Colors.textMuted, fontSize: 14 },
  timeline: { paddingLeft: Spacing.sm },
  timelineRow: { flexDirection: 'row', gap: Spacing.md, minHeight: 52 },
  timelineLeft: { alignItems: 'center', width: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.divider, marginTop: 4 },
  timelineDotActive: { backgroundColor: Colors.accent },
  timelineLine: { flex: 1, width: 2, backgroundColor: Colors.divider, marginTop: 4 },
  timelineBody: { flex: 1, paddingBottom: Spacing.lg },
  timelineLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  timelineTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
