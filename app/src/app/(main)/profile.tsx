import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/lib/AuthContext';
import { updateMyProfile, useMyProfile } from '@/queries/useMyProfile';
import { brand } from '@/theme/brand';

export default function ProfileScreen() {
  const { session } = useAuth();
  const { data: profile } = useMyProfile();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setOccupation(profile.occupation ?? '');
      setAddress(profile.address ?? '');
    }
  }, [profile]);

  async function handleSave() {
    if (!session) return;

    setSaving(true);
    try {
      await updateMyProfile(session.user.id, { full_name: fullName, phone, occupation, address });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    } finally {
      setSaving(false);
    }
  }

  const inputTheme = { colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Hồ sơ cá nhân</Text>
      <TextInput
        label="Họ tên"
        value={fullName}
        onChangeText={setFullName}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Số điện thoại"
        value={phone}
        onChangeText={setPhone}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Nghề nghiệp"
        value={occupation}
        onChangeText={setOccupation}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Nơi ở"
        value={address}
        onChangeText={setAddress}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      {profile && <Text variant="bodySmall" style={styles.muted}>Mã mời: {profile.invite_code}</Text>}
      <PrimaryButton onPress={handleSave} loading={saving} disabled={saving} style={styles.button}>
        Lưu
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#180d08' },
  container: { padding: 24 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 20 },
  input: { backgroundColor: 'transparent', marginBottom: 14 },
  muted: { color: brand.text.muted },
  button: { marginTop: 16 },
});
