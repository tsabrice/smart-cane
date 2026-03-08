import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Shadows, BorderRadius } from '../utils/theme';

interface Props {
  connected: boolean;
  deviceName: string | null;
}

export default function ConnectionBadge({ connected, deviceName }: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: connected ? Colors.safe : Colors.textMuted }]} />
      <Text style={styles.label}>
        {connected ? deviceName ?? 'Connected' : 'Cane Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F7F7F7', borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 5,
    ...Shadows.level1,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, fontWeight: '500', color: '#484848' },
});
