import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { brand } from '@/theme/brand';

export function GlassCard({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.glass.surface,
    borderColor: brand.glass.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
});
