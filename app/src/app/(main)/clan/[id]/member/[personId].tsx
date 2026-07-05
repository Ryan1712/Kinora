import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { clanAdminSettings } from '@/api/clanAdminSettings';
import { useAuth } from '@/lib/AuthContext';
import { useClanMembers } from '@/queries/useClanMembers';

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
    return <Text>Đang tải...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">{person.full_name}</Text>
      <Text>Đời thứ {person.generation_number}</Text>
      <Text>Giới tính: {person.gender}</Text>
      <Text>Vai trò: {person.role ?? 'Chưa có tài khoản'}</Text>

      {isSelf && (
        <Button
          mode="contained"
          style={styles.action}
          onPress={() => router.push(`/(main)/clan/${id}/propose-change`)}
        >
          Đề xuất sửa quan hệ của tôi
        </Button>
      )}

      {viewerIsAdmin && !isSelf && person.role !== 'admin' && (
        <View style={styles.action}>
          {person.role === 'deputy' ? (
            <Button onPress={() => runAction('remove_deputy')} loading={busy} disabled={busy}>
              Gỡ chức phó tộc trưởng
            </Button>
          ) : (
            <Button onPress={() => runAction('appoint_deputy')} loading={busy} disabled={busy}>
              Bổ nhiệm phó tộc trưởng
            </Button>
          )}
          <Button
            textColor="#c0432f"
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
  container: { flex: 1, padding: 24 },
  action: { marginTop: 20 },
});
