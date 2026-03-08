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

  return (
    <TouchableOpacity
      style={[styles.banner, active ? styles.bannerActive : styles.bannerIdle]}
      onPress={() => active && navigation.navigate('SOS')}
      activeOpacity={active ? 0.8 : 1}
    >
      <Animated.Text
        style={[styles.text, active ? styles.textActive : styles.textIdle, { opacity: active ? pulseAnim : 1 }]}
      >
        {active ? 'SOS ACTIVE — TAP FOR DETAILS' : 'SOS System Active'}
      </Animated.Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  bannerIdle: {
    backgroundColor: '#dcfce7',
  },
  bannerActive: {
    backgroundColor: '#ef4444',
  },
  text: {
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  textIdle: {
    color: '#166534',
  },
  textActive: {
    color: '#ffffff',
  },
});
