import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCane } from '../context/CaneContext';
import ConnectionBadge from '../components/ConnectionBadge';
import { formatDistance, formatTimeAgo, formatConfidence, isStale } from '../utils/helpers';
import { STALE_THRESHOLD_MS } from '../utils/constants';
import { Colors, Spacing, Shadows, BorderRadius } from '../utils/theme';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function ProximityStrip({ severity }: { severity: string }) {
  const total = 8;
  const filled = severity === 'danger' ? 7 : severity === 'caution' ? 4 : severity === 'safe' ? 1 : 0;
  const color = severity === 'danger' ? Colors.danger : severity === 'caution' ? Colors.caution : Colors.safe;
  return (
    <View style={{ flexDirection: 'row', gap: 3, marginTop: 12 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i < filled ? color : Colors.divider }}
        />
      ))}
    </View>
  );
}

const SEVERITY_COLOR: Record<string, string> = {
  safe: Colors.safe, caution: Colors.caution, danger: Colors.danger, unknown: Colors.textMuted,
};
const SEVERITY_LABEL: Record<string, string> = {
  safe: 'Clear', caution: 'Caution', danger: 'Danger', unknown: 'No Signal',
};
const OBSTACLE_CARD_BG: Record<string, string> = {
  safe: '#F0FDF4', caution: '#FFFBEB', danger: '#FFF1F2', unknown: Colors.surface,
};

export default function HomeScreen() {
  const { ble, battery, obstacle, lastFace, sos, userName } = useCane();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const stale = isStale(obstacle.updatedAt, STALE_THRESHOLD_MS);
  const distLabel = ble.connected && !stale ? formatDistance(obstacle.distance) : '--';
  const sev = ble.connected ? obstacle.severity : 'unknown';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header row */}
        <View style={styles.header}>
          <ConnectionBadge connected={ble.connected} deviceName={ble.deviceName} />
          {battery !== null && (
            <View style={styles.batteryChip}>
              <Text style={styles.batteryText}>{battery}%</Text>
              <View style={styles.batteryBar}>
                <View style={[styles.batteryFill, {
                  width: `${battery}%` as any,
                  backgroundColor: battery > 40 ? Colors.safe : Colors.danger,
                }]} />
              </View>
            </View>
          )}
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingLabel}>{getGreeting()}</Text>
          <Text style={styles.greetingName}>{userName}</Text>
        </View>

        {/* Obstacle hero card */}
        <View style={[styles.heroCard, { backgroundColor: OBSTACLE_CARD_BG[sev] }]}>
          <Text style={styles.sectionLabel}>OBSTACLE DISTANCE</Text>
          <View style={styles.heroRow}>
            <Text style={[styles.heroValue, { color: SEVERITY_COLOR[sev] }]}>{distLabel}</Text>
            <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLOR[sev] + '22' }]}>
              <Text style={[styles.severityBadgeText, { color: SEVERITY_COLOR[sev] }]}>
                {SEVERITY_LABEL[sev]}
              </Text>
            </View>
          </View>
          <ProximityStrip severity={sev} />
        </View>

        {/* 2-col stat grid */}
        <Text style={styles.sectionLabel}>LIVE STATS</Text>
        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>BATTERY</Text>
            <Text style={styles.statValue}>{battery !== null ? `${battery}%` : '--'}</Text>
            {battery !== null && (
              <View style={styles.miniBar}>
                <View style={[styles.miniBarFill, {
                  width: `${battery}%` as any,
                  backgroundColor: battery > 40 ? Colors.safe : Colors.danger,
                }]} />
              </View>
            )}
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CONNECTION</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.statusDot, { backgroundColor: ble.connected ? Colors.safe : Colors.textMuted }]} />
              <Text style={styles.statValue}>{ble.connected ? 'Active' : 'Offline'}</Text>
            </View>
            <Text style={styles.statSub} numberOfLines={1}>{ble.deviceName ?? 'No device'}</Text>
          </View>
        </View>

        {/* Last face */}
        <Text style={styles.sectionLabel}>LAST DETECTED FACE</Text>
        <View style={styles.faceCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {lastFace ? lastFace.name[0].toUpperCase() : '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.faceName}>
              {lastFace ? lastFace.name : 'No face detected yet'}
            </Text>
            {lastFace && (
              <Text style={styles.faceSub}>
                {formatConfidence(lastFace.confidence)} confidence · {formatTimeAgo(lastFace.timestamp)}
              </Text>
            )}
          </View>
        </View>

      </ScrollView>

      {/* SOS status pill — normal flow, no overlap */}
      <View style={[styles.sosPillWrap, { paddingBottom: 12 + insets.bottom }]}>
        {sos.active ? (
          <TouchableOpacity style={styles.sosActive} onPress={() => navigation.navigate('SOS')} activeOpacity={0.85}>
            <Text style={styles.sosActiveText}>● SOS ACTIVE — Tap for details</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.sosIdle}>
            <Text style={styles.sosIdleText}>✓  SOS System Armed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xl },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  batteryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 5, ...Shadows.level1,
  },
  batteryText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  batteryBar: { width: 32, height: 4, backgroundColor: Colors.divider, borderRadius: 2, overflow: 'hidden' },
  batteryFill: { height: '100%', borderRadius: 2 },

  greeting: { marginBottom: Spacing.xl },
  greetingLabel: { fontSize: 15, color: Colors.textMuted, marginBottom: 2 },
  greetingName: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },

  heroCard: { borderRadius: BorderRadius.lg, padding: Spacing.xl, marginBottom: Spacing.xl, ...Shadows.level1 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: Spacing.sm,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  heroValue: { fontSize: 40, fontWeight: '700', letterSpacing: -1 },
  severityBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 12, paddingVertical: 6 },
  severityBadgeText: { fontSize: 13, fontWeight: '700' },

  statGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, ...Shadows.level1 },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statSub: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  miniBar: { width: '100%', height: 4, backgroundColor: Colors.divider, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  miniBarFill: { height: '100%', borderRadius: 2 },

  faceCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, marginBottom: Spacing.xl, ...Shadows.level1,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.accentBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '700', color: Colors.accent },
  faceName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  faceSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  sosPillWrap: { paddingHorizontal: Spacing.lg, paddingTop: 8 },
  sosActive: {
    backgroundColor: Colors.sosRed, borderRadius: BorderRadius.full,
    paddingVertical: 14, alignItems: 'center', ...Shadows.level2,
  },
  sosActiveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  sosIdle: {
    backgroundColor: '#F0FDF4', borderRadius: BorderRadius.full,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#86EFAC',
  },
  sosIdleText: { color: Colors.safe, fontWeight: '600', fontSize: 13 },
});
