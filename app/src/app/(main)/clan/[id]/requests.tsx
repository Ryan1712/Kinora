import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { reviewRelationshipChange } from '../../../../api/reviewRelationshipChange';
import { useClanChangeRequests } from '../../../../queries/useClanChangeRequests';

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
        Pending requests
      </Text>
      {isLoading ? <Text>Loading...</Text> : null}
      <FlatList
        data={requests ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title
              title={item.persons.full_name}
              subtitle={item.proposed_relationship_type}
            />
            <Card.Actions>
              <Button
                onPress={() => review(item.id, 'reject')}
                loading={processingId === item.id}
              >
                Reject
              </Button>
              <Button
                mode="contained"
                onPress={() => review(item.id, 'approve')}
                loading={processingId === item.id}
              >
                Approve
              </Button>
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
