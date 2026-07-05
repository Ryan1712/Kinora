import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedLogoProps {
  size?: number;
}

export function AnimatedLogo({ size = 72 }: AnimatedLogoProps) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.6)) });
    opacity.value = withTiming(1, { duration: 500 });
    glow.value = withDelay(
      700,
      withRepeat(withSequence(withTiming(0.7, { duration: 1900 }), withTiming(0.35, { duration: 1900 })), -1, true)
    );
  }, [glow, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value,
  }));

  return (
    <Animated.View style={[styles.glow, animatedStyle]}>
      <Image
        testID="animated-logo-image"
        source={require('../assets/logo-icon.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    alignSelf: 'center',
    shadowColor: '#f4dba0',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
  },
});
