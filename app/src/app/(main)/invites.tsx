import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';

import { respondInvite } from '@/api/respondInvite';
import { useMyInvites } from '@/queries/useMyInvites';

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
      {isLoading && <Text>Đang tải...</Text>}
      <FlatList
        data={invites ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title title={item.invitee_full_name} subtitle={item.clans.name} />
            <Card.Actions>
              <Button onPress={() => respond(item.id, 'decline')} loading={processingId === item.id}>Từ chối</Button>
              <Button mode="contained" onPress={() => respond(item.id, 'accept')} loading={processingId === item.id}>Đồng ý</Button>
            </Card.Actions>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { marginBottom: 12 },
  card: { marginBottom: 12 },
});
