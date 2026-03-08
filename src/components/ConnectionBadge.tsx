import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  connected: boolean;
  deviceName: string | null;
}

export default function ConnectionBadge({ connected, deviceName }: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, connected ? styles.dotGreen : styles.dotRed]} />
      <Text style={styles.label}>
        {connected ? deviceName ?? 'Connected' : 'Cane Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotGreen: { backgroundColor: '#22c55e' },
  dotRed:   { backgroundColor: '#ef4444' },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
});
