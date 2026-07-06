import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Button, ButtonProps } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { brand } from '@/theme/brand';

type PrimaryButtonProps = Omit<ButtonProps, 'mode' | 'buttonColor'> & { style?: ViewStyle };

export function PrimaryButton({ style, children, ...rest }: PrimaryButtonProps) {
  const shine = useSharedValue(-1);

  useEffect(() => {
    shine.value = withDelay(
      1500,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, false)
    );
  }, [shine]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shine.value * 220 }, { rotate: '20deg' }],
  }));

  return (
    <View style={[styles.wrapper, style]}>
      <LinearGradient
        colors={[brand.gold.light, brand.gold.dark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Button mode="contained" buttonColor="transparent" textColor={brand.text.onGold} {...rest}>
        {children}
      </Button>
      <Animated.View style={[styles.shine, shineStyle]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  shine: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    bottom: -20,
    left: -60,
    position: 'absolute',
    top: -20,
    width: 40,
  },
});
