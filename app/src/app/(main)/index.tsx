import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Card, FAB, IconButton, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { useMyClans } from '@/queries/useMyClans';

export default function ClanListScreen() {
  const router = useRouter();
  const { data: clans, isLoading } = useMyClans();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall">Gia tộc của tôi</Text>
        <IconButton icon="email-outline" onPress={() => router.push('/(main)/invites')} accessibilityLabel="Lời mời" />
      </View>
      {isLoading && <Text>Đang tải...</Text>}
      <FlatList
        data={clans ?? []}
        keyExtractor={(item) => item.clan_id}
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => router.push(`/(main)/clan/${item.clan_id}`)}>
            <Card.Title title={item.clans.name} subtitle={item.role} />
          </Card>
        )}
      />
      <FAB icon="plus" label="Tạo gia tộc" style={styles.fab} onPress={() => router.push('/(main)/create-clan')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  card: { marginBottom: 12 },
  fab: { bottom: 16, position: 'absolute', right: 16 },
});
