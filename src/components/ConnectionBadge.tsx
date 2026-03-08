import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  connected: boolean;
  deviceName: string | null;
}

export default function ConnectionBadge({ connected, deviceName }: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, connected ? styles.dotOn : styles.dotOff]} />
      <Text style={[styles.label, connected ? styles.labelOn : styles.labelOff]}>
        {connected ? (deviceName ?? 'Connected') : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotOn: { backgroundColor: '#00A699' },
  dotOff: { backgroundColor: '#CCCCCC' },
  label: { fontSize: 13, fontWeight: '500' },
  labelOn: { color: '#222222' },
  labelOff: { color: '#AAAAAA' },
});
