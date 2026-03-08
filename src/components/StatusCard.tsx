import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  severity?: 'safe' | 'caution' | 'danger' | 'unknown' | 'neutral';
  style?: ViewStyle;
}

const SEVERITY_BG: Record<string, string> = {
  safe:    '#dcfce7',
  caution: '#fef9c3',
  danger:  '#fee2e2',
  unknown: '#f1f5f9',
  neutral: '#f8fafc',
};

const SEVERITY_TEXT: Record<string, string> = {
  safe:    '#166534',
  caution: '#854d0e',
  danger:  '#991b1b',
  unknown: '#64748b',
  neutral: '#1e293b',
};

export default function StatusCard({ title, value, subtitle, severity = 'neutral', style }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: SEVERITY_BG[severity] }, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color: SEVERITY_TEXT[severity] }]}>{value}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: SEVERITY_TEXT[severity] }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  value: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.8,
  },
});
