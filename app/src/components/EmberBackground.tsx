import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const PARTICLE_COUNT = 10;

function EmberParticle({ index, width, height }: { index: number; width: number; height: number }) {
  const progress = useSharedValue(0);
  const left = ((index * 37) % 100) / 100;
  const size = 3 + (index % 3);
  const startX = width * left;
  const driftX = (index % 2 === 0 ? 1 : -1) * (12 + (index % 4) * 6);

  useEffect(() => {
    progress.value = withDelay(
      (index % PARTICLE_COUNT) * 350,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 4200, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.5 ? progress.value * 2 : (1 - progress.value) * 2,
    transform: [
      { translateY: height * 0.85 - progress.value * height * 0.7 },
      { translateX: progress.value * driftX },
    ],
  }));

  return (
    <Animated.View
      testID="ember-particle"
      style={[
        styles.particle,
        { left: startX, width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

export function EmberBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }, (_, index) => (
        <EmberParticle key={index} index={index} width={width} height={height} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  particle: {
    backgroundColor: 'rgba(244,200,105,0.55)',
    position: 'absolute',
  },
});
