import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  severity?: 'safe' | 'caution' | 'danger' | 'unknown' | 'neutral';
  style?: ViewStyle;
}

const STRIPE: Record<string, string> = {
  safe:    '#00A699',
  caution: '#FC642D',
  danger:  '#FF385C',
  unknown: '#DDDDDD',
  neutral: '#EBEBEB',
};

const DOT: Record<string, string> = {
  safe:    '#00A699',
  caution: '#FC642D',
  danger:  '#FF385C',
  unknown: '#CCCCCC',
  neutral: 'transparent',
};

const SUB_COLOR: Record<string, string> = {
  safe:    '#00A699',
  caution: '#FC642D',
  danger:  '#FF385C',
  unknown: '#AAAAAA',
  neutral: '#717171',
};

export default function StatusCard({ title, value, subtitle, severity = 'neutral', style }: Props) {
  const showDot = severity !== 'neutral';
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.stripe, { backgroundColor: STRIPE[severity] }]} />
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
        {subtitle ? (
          <View style={styles.subtitleRow}>
            {showDot && <View style={[styles.dot, { backgroundColor: DOT[severity] }]} />}
            <Text style={[styles.subtitle, { color: SUB_COLOR[severity] }]}>{subtitle}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
    overflow: 'hidden',
  },
  stripe: { width: 4 },
  body: { flex: 1, padding: 20 },
  title: {
    fontSize: 11,
    fontWeight: '500',
    color: '#AAAAAA',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  value: {
    fontSize: 40,
    fontWeight: '700',
    color: '#222222',
    letterSpacing: -1.5,
  },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  subtitle: { fontSize: 14, fontWeight: '500' },
});
