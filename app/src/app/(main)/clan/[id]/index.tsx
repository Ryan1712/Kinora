import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { leaveClan } from '@/api/leaveClan';
import { GenerationDivider } from '@/components/GenerationDivider';
import { GlassCard } from '@/components/GlassCard';
import { MemberAvatar } from '@/components/MemberAvatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RoleBadge } from '@/components/RoleBadge';
import { useAuth } from '@/lib/AuthContext';
import { MemberRow, useClanMembers } from '@/queries/useClanMembers';
import { brand } from '@/theme/brand';

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

  function shouldShowDivider(item: MemberRow, index: number): boolean {
    if (index === 0) return true;
    return members![index - 1].generation_number !== item.generation_number;
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Thành viên gia tộc
      </Text>

      <View style={styles.actions}>
        <PrimaryButton onPress={() => router.push(`/(main)/clan/${id}/invite`)} style={styles.primaryChip}>
          Mời thành viên
        </PrimaryButton>
        {me && (
          <Button
            textColor={brand.text.body}
            onPress={() => router.push(`/(main)/clan/${id}/propose-change`)}
          >
            Đề xuất sửa quan hệ
          </Button>
        )}
        {isAdminOrDeputy && (
          <Button textColor={brand.text.body} onPress={() => router.push(`/(main)/clan/${id}/requests`)}>
            Yêu cầu chờ duyệt
          </Button>
        )}
        {isAdmin && (
          <Button textColor={brand.text.body} onPress={() => router.push(`/(main)/clan/${id}/settings`)}>
            Cài đặt
          </Button>
        )}
        {me && !isAdmin && (
          <Button textColor={brand.red} onPress={handleLeave} loading={leaving} disabled={leaving}>
            Rời gia tộc
          </Button>
        )}
      </View>

      {isLoading && <Text style={styles.muted}>Đang tải...</Text>}
      {isError && <Text style={styles.muted}>Không tải được danh sách thành viên.</Text>}
      {!isLoading && !members?.length && <Text style={styles.muted}>Chưa có thành viên nào.</Text>}

      <FlatList
        data={members ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View>
            {shouldShowDivider(item, index) && <GenerationDivider generation={item.generation_number} />}
            <Pressable onPress={() => router.push(`/(main)/clan/${id}/member/${item.id}`)}>
              <GlassCard style={styles.memberRow}>
                <MemberAvatar fullName={item.full_name} gender={item.gender} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.full_name}</Text>
                  <Text style={styles.memberMeta}>Đời {item.generation_number}</Text>
                </View>
                <RoleBadge role={item.role} />
              </GlassCard>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#180d08', flex: 1, padding: 16 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  primaryChip: { minWidth: 160 },
  muted: { color: brand.text.muted },
  memberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 12,
  },
  memberInfo: { flex: 1 },
  memberName: { color: brand.text.body, fontSize: 14, fontWeight: '600' },
  memberMeta: { color: brand.text.muted, fontSize: 11, marginTop: 2 },
});
