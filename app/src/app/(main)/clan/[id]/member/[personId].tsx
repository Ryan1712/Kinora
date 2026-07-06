import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { clanAdminSettings } from '@/api/clanAdminSettings';
import { MemberAvatar } from '@/components/MemberAvatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RoleBadge } from '@/components/RoleBadge';
import { useAuth } from '@/lib/AuthContext';
import { useClanMembers } from '@/queries/useClanMembers';
import { brand } from '@/theme/brand';

export default function MemberDetailScreen() {
  const { id, personId } = useLocalSearchParams<{ id: string; personId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { data: members } = useClanMembers(id);
  const [busy, setBusy] = useState(false);

  const person = members?.find((member) => member.id === personId);
  const me = members?.find((member) => member.linked_user_id === session?.user.id);
  const isSelf = person?.linked_user_id === session?.user.id;
  const viewerIsAdmin = me?.role === 'admin';

  async function runAction(action: 'appoint_deputy' | 'remove_deputy' | 'remove_member') {
    setBusy(true);
    try {
      await clanAdminSettings({ clan_id: id, action, person_id: personId });
      queryClient.invalidateQueries({ queryKey: ['clan-members', id] });
    } finally {
      setBusy(false);
    }
  }

  if (!person) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MemberAvatar fullName={person.full_name} gender={person.gender} size={72} />
      <Text variant="headlineSmall" style={styles.name}>{person.full_name}</Text>
      <Text style={styles.meta}>Đời thứ {person.generation_number}</Text>
      <Text style={styles.meta}>Giới tính: {person.gender}</Text>
      <View style={styles.roleRow}>
        <Text style={styles.meta}>Vai trò: {person.role ?? 'Chưa có tài khoản'}</Text>
        <RoleBadge role={person.role} />
      </View>

      {isSelf && (
        <PrimaryButton style={styles.action} onPress={() => router.push(`/(main)/clan/${id}/propose-change`)}>
          Đề xuất sửa quan hệ của tôi
        </PrimaryButton>
      )}

      {viewerIsAdmin && !isSelf && person.role !== 'admin' && (
        <View style={styles.action}>
          {person.role === 'deputy' ? (
            <Button textColor={brand.text.body} onPress={() => runAction('remove_deputy')} loading={busy} disabled={busy}>
              Gỡ chức phó tộc trưởng
            </Button>
          ) : (
            <Button textColor={brand.text.body} onPress={() => runAction('appoint_deputy')} loading={busy} disabled={busy}>
              Bổ nhiệm phó tộc trưởng
            </Button>
          )}
          <Button
            textColor={brand.red}
            onPress={() => runAction('remove_member')}
            loading={busy}
            disabled={busy}
          >
            Xóa khỏi gia tộc
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start', backgroundColor: '#180d08', flex: 1, padding: 24 },
  muted: { color: brand.text.muted },
  name: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginTop: 12 },
  meta: { color: brand.text.muted, marginTop: 4 },
  roleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  action: { marginTop: 20 },
});
