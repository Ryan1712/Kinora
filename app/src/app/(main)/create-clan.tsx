import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { createClan } from '@/api/createClan';
import { PrimaryButton } from '@/components/PrimaryButton';
import { brand } from '@/theme/brand';

type BranchType = 'noi' | 'ngoai' | 'khac';

export default function CreateClanScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [branchType, setBranchType] = useState<BranchType>('noi');
  const [adminFullName, setAdminFullName] = useState('');
  const [generation, setGeneration] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await createClan({
        name,
        branch_type: branchType,
        admin_full_name: adminFullName,
        admin_generation_number: Number(generation),
      });
      router.replace(`/(main)/clan/${result.clan_id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Tạo gia tộc thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  const inputTheme = { colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Tạo gia tộc mới</Text>
      <TextInput
        label="Tên gia tộc"
        testID="clan-name-input"
        value={name}
        onChangeText={setName}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <SegmentedButtons
        value={branchType}
        onValueChange={(value) => setBranchType(value as BranchType)}
        buttons={[{ value: 'noi', label: 'Nội' }, { value: 'ngoai', label: 'Ngoại' }, { value: 'khac', label: 'Khác' }]}
        style={styles.input}
      />
      <TextInput
        label="Họ tên của bạn (trong gia phả)"
        testID="admin-name-input"
        value={adminFullName}
        onChangeText={setAdminFullName}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Đời thứ của bạn"
        testID="generation-input"
        value={generation}
        onChangeText={setGeneration}
        keyboardType="numeric"
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      {error && <HelperText type="error">{error}</HelperText>}
      <PrimaryButton onPress={handleCreate} loading={submitting} disabled={submitting}>
        Tạo gia tộc
      </PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#180d08', flex: 1, padding: 24 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 20 },
  input: { backgroundColor: 'transparent', marginBottom: 14 },
});
