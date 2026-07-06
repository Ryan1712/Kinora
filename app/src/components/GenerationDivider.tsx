import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { brand } from '@/theme/brand';

interface GenerationDividerProps {
  generation: number;
}

export function GenerationDivider({ generation }: GenerationDividerProps) {
  return <Text style={styles.label}>ĐỜI {generation}</Text>;
}

const styles = StyleSheet.create({
  label: {
    color: brand.gold.dark,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 14,
  },
});
