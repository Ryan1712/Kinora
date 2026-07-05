import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, List, Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { leaveClan } from '@/api/leaveClan';
import { useAuth } from '@/lib/AuthContext';
import { useClanMembers } from '@/queries/useClanMembers';

export default function ClanHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { data: members, isLoading, isError } = useClanMembers(id);
  const [leaving, setLeaving] = useState(false);

  const me = members?.find((member) => member.linked_user_id === session?.user.id);
  const isAdmin = me?.role === 'admin';
  const isAdminOrDeputy = me?.role === 'admin' || me?.role === 'deputy';

  async function handleLeave() {
    setLeaving(true);
    try {
      await leaveClan({ clan_id: id });
      queryClient.invalidateQueries({ queryKey: ['my-clans'] });
      queryClient.invalidateQueries({ queryKey: ['clan-members', id] });
      router.replace('/(main)');
    } finally {
      setLeaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Thành viên gia tộc
      </Text>

      <View style={styles.actions}>
        <Button mode="contained" onPress={() => router.push(`/(main)/clan/${id}/invite`)}>
          Mời thành viên
        </Button>
        {me && (
          <Button onPress={() => router.push(`/(main)/clan/${id}/propose-change`)}>
            Đề xuất sửa quan hệ
          </Button>
        )}
        {isAdminOrDeputy && (
          <Button onPress={() => router.push(`/(main)/clan/${id}/requests`)}>
            Yêu cầu chờ duyệt
          </Button>
        )}
        {isAdmin && (
          <Button onPress={() => router.push(`/(main)/clan/${id}/settings`)}>Cài đặt</Button>
        )}
        {me && !isAdmin && (
          <Button textColor="#c0432f" onPress={handleLeave} loading={leaving} disabled={leaving}>
            Rời gia tộc
          </Button>
        )}
      </View>

      {isLoading && <Text>Đang tải...</Text>}
      {isError && <Text>Không tải được danh sách thành viên.</Text>}
      {!isLoading && !members?.length && <Text>Chưa có thành viên nào.</Text>}

      <FlatList
        data={members ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.full_name}
            description={`Đời ${item.generation_number}${item.role ? ` - ${item.role}` : ''}`}
            onPress={() => router.push(`/(main)/clan/${id}/member/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
});
