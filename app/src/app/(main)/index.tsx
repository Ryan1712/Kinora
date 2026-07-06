import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { GlassCard } from '@/components/GlassCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useMyClans } from '@/queries/useMyClans';
import { brand } from '@/theme/brand';

export default function ClanListScreen() {
  const router = useRouter();
  const { data: clans, isLoading } = useMyClans();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Gia tộc của tôi
        </Text>
        <View>
          <IconButton
            icon="email-outline"
            iconColor={brand.text.heading}
            onPress={() => router.push('/(main)/invites')}
            accessibilityLabel="Lời mời"
          />
          <View style={styles.notificationDot} />
        </View>
      </View>
      {isLoading && <Text style={styles.muted}>Đang tải...</Text>}
      <FlatList
        data={clans ?? []}
        keyExtractor={(item) => item.clan_id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(main)/clan/${item.clan_id}`)}>
            <GlassCard style={styles.clanCard}>
              <Text style={styles.clanName}>{item.clans.name}</Text>
              <Text style={styles.clanMeta}>{item.role}</Text>
            </GlassCard>
          </Pressable>
        )}
      />
      <PrimaryButton
        icon="plus"
        onPress={() => router.push('/(main)/create-clan')}
        style={styles.fab}
      >
        Tạo gia tộc
      </PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#180d08', flex: 1, padding: 16 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { color: brand.text.heading, fontFamily: brand.fonts.heading },
  notificationDot: {
    backgroundColor: brand.notification,
    borderRadius: 4,
    height: 8,
    position: 'absolute',
    right: 6,
    top: 6,
    width: 8,
  },
  muted: { color: brand.text.muted },
  list: { paddingBottom: 96 },
  clanCard: { marginBottom: 12 },
  clanName: { color: brand.text.body, fontSize: 15, fontWeight: '700' },
  clanMeta: { color: brand.text.muted, fontSize: 12, marginTop: 3 },
  fab: { bottom: 16, position: 'absolute', right: 16 },
});
