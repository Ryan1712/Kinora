import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, HelperText, Menu, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { inviteMember } from '@/api/inviteMember';
import type { RelationCode } from '@/api/types';
import { PrimaryButton } from '@/components/PrimaryButton';
import { relationLabels } from '@/constants/relationLabels';
import { useClanMembers } from '@/queries/useClanMembers';
import { brand } from '@/theme/brand';

const relationCodes = Object.keys(relationLabels) as RelationCode[];

export default function InviteMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: members } = useClanMembers(id);

  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [anchorMenuOpen, setAnchorMenuOpen] = useState(false);
  const [relationCode, setRelationCode] = useState<RelationCode | null>(null);
  const [relationMenuOpen, setRelationMenuOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unknown'>('unknown');
  const [contact, setContact] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const anchorName = useMemo(
    () => members?.find((member) => member.id === anchorId)?.full_name ?? 'Chọn người neo',
    [anchorId, members]
  );
  const relationLabel = relationCode ? relationLabels[relationCode] : 'Chọn quan hệ';

  async function handleInvite() {
    if (!anchorId || !relationCode || !fullName.trim() || !contact.trim()) {
      setError('Vui lòng nhập đủ tên, liên hệ, người neo và quan hệ.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await inviteMember({
        clan_id: id,
        anchor_person_id: anchorId,
        relation_code: relationCode,
        invitee_full_name: fullName.trim(),
        invitee_gender: gender,
        invitee_phone_or_email: contact.trim(),
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mời thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  const inputTheme = { colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Mời thành viên
      </Text>

      <Menu
        visible={anchorMenuOpen}
        onDismiss={() => setAnchorMenuOpen(false)}
        anchor={
          <Button mode="outlined" textColor={brand.text.body} onPress={() => setAnchorMenuOpen(true)} style={styles.field}>
            {anchorName}
          </Button>
        }
      >
        {(members ?? []).map((member) => (
          <Menu.Item
            key={member.id}
            title={member.full_name}
            onPress={() => {
              setAnchorId(member.id);
              setAnchorMenuOpen(false);
            }}
          />
        ))}
      </Menu>

      <Menu
        visible={relationMenuOpen}
        onDismiss={() => setRelationMenuOpen(false)}
        anchor={
          <Button mode="outlined" textColor={brand.text.body} onPress={() => setRelationMenuOpen(true)} style={styles.field}>
            {relationLabel}
          </Button>
        }
      >
        {relationCodes.map((code) => (
          <Menu.Item
            key={code}
            title={relationLabels[code]}
            onPress={() => {
              setRelationCode(code);
              setRelationMenuOpen(false);
            }}
          />
        ))}
      </Menu>

      <TextInput
        label="Họ tên người được mời"
        value={fullName}
        onChangeText={setFullName}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.field}
      />
      <SegmentedButtons
        value={gender}
        onValueChange={(value) => setGender(value as 'male' | 'female' | 'unknown')}
        buttons={[
          { value: 'male', label: 'Nam' },
          { value: 'female', label: 'Nữ' },
          { value: 'unknown', label: 'Khác' },
        ]}
        style={styles.field}
      />
      <TextInput
        label="Email hoặc số điện thoại"
        value={contact}
        onChangeText={setContact}
        autoCapitalize="none"
        keyboardType="email-address"
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.field}
      />
      <HelperText type={error ? 'error' : 'info'} visible>
        {error ?? 'Stage 1 chỉ hỗ trợ mời bằng email hoặc số điện thoại.'}
      </HelperText>

      <PrimaryButton onPress={handleInvite} loading={submitting} disabled={submitting}>
        Gửi lời mời
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#180d08' },
  container: { padding: 24 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 20 },
  field: { backgroundColor: 'transparent', marginBottom: 14 },
});
