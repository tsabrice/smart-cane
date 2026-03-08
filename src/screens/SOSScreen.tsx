import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, ScrollView, Linking, Alert,
} from 'react-native';
import { useCane } from '../context/CaneContext';
import { buildMapsUrl, formatSOSTime } from '../utils/helpers';
import { callPrimaryContact } from '../services/SOSService';

export default function SOSScreen() {
  const { sos, gps, userName, emergencyContacts, dismissSOS } = useCane();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    return () => pulseAnim.stopAnimation();
  }, []);

  function openMap() {
    if (!gps) return;
    Linking.openURL(buildMapsUrl(gps.lat, gps.lng));
  }

  function handleCall() {
    callPrimaryContact(emergencyContacts);
  }

  function handleDismiss() {
    Alert.alert(
      'Dismiss SOS?',
      'The cane will continue alarming until physically reset. Only dismiss if the situation is resolved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Dismiss', style: 'destructive', onPress: dismissSOS },
      ]
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: pulseAnim }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Top badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>SOS ACTIVATED</Text>
        </View>

        <Text style={styles.userName}>{userName}</Text>
        {sos.triggeredAt && (
          <Text style={styles.time}>{formatSOSTime(sos.triggeredAt)}</Text>
        )}

        {/* Location block */}
        {gps ? (
          <View style={styles.locationBlock}>
            <Text style={styles.locationLabel}>Last known location</Text>
            <Text style={styles.locationCoords}>
              {gps.lat.toFixed(5)},  {gps.lng.toFixed(5)}
            </Text>
            <TouchableOpacity style={styles.mapBtn} onPress={openMap} activeOpacity={0.8}>
              <Text style={styles.mapBtnText}>View on Map  →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.locationBlock}>
            <Text style={styles.locationLabel}>Location</Text>
            <Text style={styles.noGPS}>GPS unavailable</Text>
          </View>
        )}

        {/* Notified contacts */}
        {sos.notified.length > 0 && (
          <View style={styles.notifiedBlock}>
            <Text style={styles.notifiedLabel}>Notified</Text>
            {sos.notified.map(n => (
              <Text key={n} style={styles.notifiedName}>{n}</Text>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.85}>
            <Text style={styles.callBtnText}>Call Primary Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss} activeOpacity={0.7}>
            <Text style={styles.dismissBtnText}>Dismiss Alert</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#CC0000' },
  content: { paddingHorizontal: 28, paddingTop: 80, paddingBottom: 48, alignItems: 'center' },
  badge: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 32,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  time: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 40 },
  locationBlock: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 18,
    padding: 22,
    marginBottom: 20,
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  locationCoords: {
    fontSize: 17, fontWeight: '600', color: '#FFFFFF',
    fontVariant: ['tabular-nums'], marginBottom: 14,
  },
  mapBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  mapBtnText: { color: '#CC0000', fontWeight: '700', fontSize: 14 },
  noGPS: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  notifiedBlock: { alignItems: 'center', marginBottom: 20 },
  notifiedLabel: {
    fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  notifiedName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  actions: { width: '100%', marginTop: 20, gap: 12 },
  callBtn: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingVertical: 17, alignItems: 'center',
  },
  callBtnText: { color: '#CC0000', fontSize: 16, fontWeight: '700' },
  dismissBtn: {
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  dismissBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500' },
});
