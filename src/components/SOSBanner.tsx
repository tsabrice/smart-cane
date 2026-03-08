import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface Props {
  active: boolean;
}

export default function SOSBanner({ active }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => navigation.navigate('SOS')}
      activeOpacity={0.85}
    >
      <Animated.Text style={[styles.text, { opacity: pulseAnim }]}>
        ● SOS ACTIVE — Tap for details
      </Animated.Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#CC0000',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 8,
  },
  text: {
    fontWeight: '700',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
