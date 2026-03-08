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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.icon}>!</Text>
        <Text style={styles.title}>SOS ACTIVATED</Text>
        <Text style={styles.userName}>{userName}</Text>

        {sos.triggeredAt && (
          <Text style={styles.time}>{formatSOSTime(sos.triggeredAt)}</Text>
        )}

        {gps ? (
          <View style={styles.gpsBlock}>
            <Text style={styles.gpsLabel}>Last Known Location</Text>
            <Text style={styles.gpsCoords}>
              {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
            </Text>
            <TouchableOpacity style={styles.mapBtn} onPress={openMap}>
              <Text style={styles.mapBtnText}>View on Map</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.noGPS}>GPS location unavailable</Text>
        )}

        {/* Notified Contacts */}
        {sos.notified.length > 0 && (
          <View style={styles.notifiedBlock}>
            <Text style={styles.notifiedLabel}>Notified</Text>
            {sos.notified.map(name => (
              <Text key={name} style={styles.notifiedName}>{name}</Text>
            ))}
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <Text style={styles.callBtnText}>Call Primary Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
          <Text style={styles.dismissBtnText}>Dismiss Alert</Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#dc2626',
  },
  content: {
    padding: 32,
    alignItems: 'center',
    paddingTop: 80,
  },
  icon: {
    fontSize: 64,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fecaca',
    marginTop: 8,
  },
  time: {
    fontSize: 14,
    color: '#fca5a5',
    marginTop: 6,
  },
  gpsBlock: {
    marginTop: 32,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    padding: 20,
    width: '100%',
  },
  gpsLabel: {
    fontSize: 12,
    color: '#fca5a5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
  },
  gpsCoords: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  mapBtn: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapBtnText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 14,
  },
  noGPS: {
    marginTop: 24,
    color: '#fca5a5',
    fontSize: 14,
  },
  notifiedBlock: {
    marginTop: 24,
    alignItems: 'center',
  },
  notifiedLabel: {
    fontSize: 12,
    color: '#fca5a5',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '600',
    marginBottom: 6,
  },
  notifiedName: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
  callBtn: {
    marginTop: 40,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  callBtnText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '700',
  },
  dismissBtn: {
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  dismissBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
