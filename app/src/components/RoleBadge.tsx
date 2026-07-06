import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { brand } from '@/theme/brand';

interface RoleBadgeProps {
  role: string | null;
}

const LABELS: Record<string, string> = {
  admin: 'TRƯỞNG HỌ',
  deputy: 'PHÓ TỘC TRƯỞNG',
  member: 'THÀNH VIÊN',
};

const COLORS: Record<string, { background: string; text: string }> = {
  admin: { background: 'rgba(244,200,105,0.18)', text: '#f4dba0' },
  deputy: { background: 'rgba(143,174,156,0.2)', text: '#8fae9c' },
  member: { background: 'rgba(255,255,255,0.08)', text: brand.text.muted },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  if (!role) return null;

  const label = LABELS[role] ?? role.toUpperCase();
  const colors = COLORS[role] ?? COLORS.member;

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
