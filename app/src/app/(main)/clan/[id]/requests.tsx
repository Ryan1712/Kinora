import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { reviewRelationshipChange } from '../../../../api/reviewRelationshipChange';
import { GlassCard } from '../../../../components/GlassCard';
import { PrimaryButton } from '../../../../components/PrimaryButton';
import { useClanChangeRequests } from '../../../../queries/useClanChangeRequests';
import { brand } from '../../../../theme/brand';

export default function RequestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: requests, isLoading } = useClanChangeRequests(id);
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function review(requestId: string, action: 'approve' | 'reject') {
    setProcessingId(requestId);
    try {
      await reviewRelationshipChange({ request_id: requestId, action });
      queryClient.invalidateQueries({ queryKey: ['clan-requests', id] });
      queryClient.invalidateQueries({ queryKey: ['clan-members', id] });
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Yêu cầu chờ duyệt
      </Text>
      {isLoading ? <Text style={styles.muted}>Đang tải...</Text> : null}
      <FlatList
        data={requests ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GlassCard style={styles.card}>
            <Text style={styles.cardTitle}>{item.persons.full_name}</Text>
            <Text style={styles.cardSubtitle}>{item.proposed_relationship_type}</Text>
            <View style={styles.actions}>
              <Button
                textColor={brand.text.body}
                onPress={() => review(item.id, 'reject')}
                loading={processingId === item.id}
              >
                Từ chối
              </Button>
              <PrimaryButton
                onPress={() => review(item.id, 'approve')}
                loading={processingId === item.id}
                style={styles.approveButton}
              >
                Duyệt
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
  approveButton: { minWidth: 100 },
});
