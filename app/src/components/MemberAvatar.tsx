import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { brand } from '@/theme/brand';

interface MemberAvatarProps {
  fullName: string;
  gender?: string | null;
  size?: number;
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

const GOLD_GRADIENT = [brand.gold.light, brand.gold.dark] as const;
const GREEN_GRADIENT = ['#8fae9c', '#3d6b57'] as const;

export function MemberAvatar({ fullName, gender, size = 40 }: MemberAvatarProps) {
  const colors = gender === 'female' ? GREEN_GRADIENT : GOLD_GRADIENT;

  return (
    <LinearGradient
      colors={colors}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initialsOf(fullName)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: brand.text.onGold,
    fontWeight: '700',
  },
});
