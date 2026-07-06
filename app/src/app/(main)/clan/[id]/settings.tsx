import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { clanAdminSettings } from '../../../../api/clanAdminSettings';
import { PrimaryButton } from '../../../../components/PrimaryButton';
import { brand } from '../../../../theme/brand';

type InvitePermission = 'admin_only' | 'all_members';

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [invitePermission, setInvitePermission] = useState<InvitePermission>('admin_only');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await clanAdminSettings({
        clan_id: id,
        action: 'update_settings',
        ...(name ? { name } : {}),
        invite_permission: invitePermission,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Cài đặt gia tộc</Text>
      <TextInput
        label="Tên gia tộc"
        testID="clan-name-input"
        value={name}
        onChangeText={setName}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={{ colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } }}
        style={styles.input}
      />
      <Text style={styles.label}>Ai được phép mời thành viên?</Text>
      <View style={styles.row}>
        <Button
          mode={invitePermission === 'admin_only' ? 'contained' : 'outlined'}
          textColor={invitePermission === 'admin_only' ? undefined : brand.text.body}
          onPress={() => setInvitePermission('admin_only')}
        >
          Chỉ trưởng/phó
        </Button>
        <Button
          mode={invitePermission === 'all_members' ? 'contained' : 'outlined'}
          textColor={invitePermission === 'all_members' ? undefined : brand.text.body}
          onPress={() => setInvitePermission('all_members')}
        >
          Mọi thành viên
        </Button>
      </View>
      <PrimaryButton onPress={handleSave} loading={saving} disabled={saving} style={styles.input}>
        Lưu cài đặt
      </PrimaryButton>
      <Button textColor={brand.red} onPress={() => router.push(`/(main)/clan/${id}/transfer-admin`)}>
        Nhường quyền trưởng họ
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#180d08', flex: 1, padding: 24 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 20 },
  label: { color: brand.text.muted, marginTop: 8, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8 },
  input: { backgroundColor: 'transparent', marginTop: 10 },
});
