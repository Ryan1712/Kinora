import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';

import { respondInvite } from '@/api/respondInvite';
import { GlassCard } from '@/components/GlassCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useMyInvites } from '@/queries/useMyInvites';
import { brand } from '@/theme/brand';

export default function InvitesScreen() {
  const { data: invites, isLoading } = useMyInvites();
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function respond(inviteId: string, action: 'accept' | 'decline') {
    setProcessingId(inviteId);
    try {
      await respondInvite({ invite_id: inviteId, action });
      queryClient.invalidateQueries({ queryKey: ['my-invites'] });
      queryClient.invalidateQueries({ queryKey: ['my-clans'] });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Lời mời đang chờ</Text>
      {isLoading && <Text style={styles.muted}>Đang tải...</Text>}
      <FlatList
        data={invites ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>{item.invitee_full_name}</Text>
            <Text style={styles.cardSubtitle}>{item.clans.name}</Text>
            <View style={styles.actions}>
              <Button
                textColor={brand.text.body}
                onPress={() => respond(item.id, 'decline')}
                loading={processingId === item.id}
              >
                Từ chối
              </Button>
              <PrimaryButton
                onPress={() => respond(item.id, 'accept')}
                loading={processingId === item.id}
                style={styles.acceptButton}
              >
                Đồng ý
              </PrimaryButton>
            </View>
          </GlassCard>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#180d08', flex: 1, padding: 16 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 12 },
  muted: { color: brand.text.muted },
  card: { marginBottom: 12 },
  cardTitle: { color: brand.text.body, fontSize: 15, fontWeight: '700' },
  cardSubtitle: { color: brand.text.muted, fontSize: 12, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 10 },
  acceptButton: { minWidth: 100 },
});
