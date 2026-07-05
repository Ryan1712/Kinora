import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { transferAdmin } from '@/api/transferAdmin';
import { useClanMembers } from '@/queries/useClanMembers';

interface ClanMember {
  id: string;
  full_name: string;
  role?: string | null;
}

export default function TransferAdminScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: members } = useClanMembers(id);

  const [targetId, setTargetId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rows = (members ?? []) as ClanMember[];
  const candidates = rows.filter((member) => member.role && member.role !== 'admin');

  async function handleConfirm() {
    if (!targetId) {
      setError('Vui lòng chọn người kế nhiệm');
      return;
    }
    if (!password) {
      setError('Nhập lại mật khẩu để xác nhận');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await transferAdmin({ clan_id: id, new_admin_person_id: targetId, password });
      router.replace(`/(main)/clan/${id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Nhường quyền thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Nhường quyền trưởng họ</Text>
      <Text style={styles.label}>Chọn người kế nhiệm</Text>
      {candidates.map((member) => (
        <Button
          key={member.id}
          mode={targetId === member.id ? 'contained' : 'outlined'}
          onPress={() => setTargetId(member.id)}
          style={styles.input}
        >
          {member.full_name}
        </Button>
      ))}
      <TextInput
        label="Nhập lại mật khẩu để xác nhận"
        testID="password-input"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button mode="contained" buttonColor="#c0432f" onPress={handleConfirm} loading={submitting} disabled={submitting}>
        Xác nhận nhường quyền
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { marginBottom: 20 },
  label: { marginTop: 8 },
  input: { marginTop: 14 },
});
