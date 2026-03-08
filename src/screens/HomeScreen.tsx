import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useCane } from '../context/CaneContext';
import ConnectionBadge from '../components/ConnectionBadge';
import StatusCard from '../components/StatusCard';
import SOSBanner from '../components/SOSBanner';
import { formatDistance, formatTimeAgo, formatConfidence, isStale } from '../utils/helpers';
import { STALE_THRESHOLD_MS } from '../utils/constants';

export default function HomeScreen() {
  const { ble, battery, obstacle, lastFace, sos } = useCane();

  const distanceStale = isStale(obstacle.updatedAt, STALE_THRESHOLD_MS);
  const distanceLabel = ble.connected && !distanceStale
    ? formatDistance(obstacle.distance)
    : '--';

  const severityLabel: Record<string, string> = {
    safe:    'Clear path',
    caution: 'Caution ahead',
    danger:  'Obstacle close',
    unknown: 'No signal',
  };

  const faceValue = lastFace ? lastFace.name : '--';
  const faceSubtitle = lastFace
    ? `${formatConfidence(lastFace.confidence)} match · ${formatTimeAgo(lastFace.timestamp)}`
    : 'No face detected yet';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.headline}>Smart Cane</Text>
        </View>
        <View style={styles.headerRight}>
          <ConnectionBadge connected={ble.connected} deviceName={ble.deviceName} />
          {battery !== null && <Text style={styles.battery}>{battery}%</Text>}
        </View>
      </View>

      <SOSBanner active={sos.active} />

      <Text style={styles.sectionLabel}>Obstacle Detection</Text>
      <StatusCard
        title="Distance"
        value={distanceLabel}
        subtitle={severityLabel[obstacle.severity]}
        severity={ble.connected ? obstacle.severity : 'unknown'}
      />

      <Text style={styles.sectionLabel}>Face Recognition</Text>
      <StatusCard
        title="Last Detected"
        value={faceValue}
        subtitle={faceSubtitle}
        severity="neutral"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40, gap: 8 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  greeting: { fontSize: 13, color: '#AAAAAA', fontWeight: '400', marginBottom: 2 },
  headline: { fontSize: 28, fontWeight: '700', color: '#222222', letterSpacing: -0.5 },
  headerRight: { alignItems: 'flex-end', gap: 6 },
  battery: { fontSize: 13, fontWeight: '500', color: '#717171' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#AAAAAA',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 10,
  },
});
