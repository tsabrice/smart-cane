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
    safe:    'Clear',
    caution: 'Caution',
    danger:  'Danger',
    unknown: 'No Signal',
  };

  const faceValue = lastFace ? lastFace.name : '--';
  const faceSubtitle = lastFace
    ? `${formatConfidence(lastFace.confidence)} confidence  •  ${formatTimeAgo(lastFace.timestamp)}`
    : 'No face detected yet';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <ConnectionBadge connected={ble.connected} deviceName={ble.deviceName} />
        <View style={styles.battery}>
          <Text style={styles.batteryText}>
            {battery !== null ? `${battery}%` : '--'}
          </Text>
          <Text style={styles.batteryIcon}>
            {battery !== null && battery > 60 ? '' : battery !== null && battery > 20 ? '' : ''}
          </Text>
        </View>
      </View>

      {/* Status Cards */}
      <View style={styles.row}>
        <StatusCard
          title="Obstacle Distance"
          value={distanceLabel}
          subtitle={severityLabel[obstacle.severity]}
          severity={ble.connected ? obstacle.severity : 'unknown'}
          style={styles.card}
        />
      </View>

      <View style={styles.row}>
        <StatusCard
          title="Last Detected Face"
          value={faceValue}
          subtitle={faceSubtitle}
          severity="neutral"
          style={styles.card}
        />
      </View>

      {/* SOS Banner */}
      <SOSBanner active={sos.active} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  battery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  batteryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  batteryIcon: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
  },
});
