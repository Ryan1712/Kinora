import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/lib/AuthContext';
import { updateMyProfile, useMyProfile } from '@/queries/useMyProfile';

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Hồ sơ cá nhân</Text>
      <TextInput label="Họ tên" value={fullName} onChangeText={setFullName} style={styles.input} />
      <TextInput label="Số điện thoại" value={phone} onChangeText={setPhone} style={styles.input} />
      <TextInput label="Nghề nghiệp" value={occupation} onChangeText={setOccupation} style={styles.input} />
      <TextInput label="Nơi ở" value={address} onChangeText={setAddress} style={styles.input} />
      {profile && <Text variant="bodySmall">Mã mời: {profile.invite_code}</Text>}
      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.button}>Lưu</Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { marginBottom: 20 },
  input: { marginBottom: 14 },
  button: { marginTop: 16 },
});
