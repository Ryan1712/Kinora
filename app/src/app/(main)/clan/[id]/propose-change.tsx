import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { proposeRelationshipChange } from '../../../../api/proposeRelationshipChange';
import { PrimaryButton } from '../../../../components/PrimaryButton';
import { useAuth } from '../../../../lib/AuthContext';
import { useClanMembers } from '../../../../queries/useClanMembers';
import { brand } from '../../../../theme/brand';

type RelationshipType = 'parent_child' | 'spouse';

interface ClanMember {
  id: string;
  full_name: string;
  linked_user_id?: string | null;
}

export default function ProposeChangeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { data: members } = useClanMembers(id);

  const [type, setType] = useState<RelationshipType>('parent_child');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rows = (members ?? []) as ClanMember[];
  const otherMembers = rows.filter((member) => member.linked_user_id !== session?.user.id);

  async function handleSubmit() {
    if (!targetId) {
      setError('Chọn một người thân trước');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await proposeRelationshipChange({
        clan_id: id,
        proposed_relationship_type: type,
        proposed_relationship_with_person_id: targetId,
      });
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không gửi được đề xuất');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Đề xuất sửa quan hệ</Text>
      <View style={styles.row}>
        <Button
          mode={type === 'parent_child' ? 'contained' : 'outlined'}
          textColor={type === 'parent_child' ? undefined : brand.text.body}
          onPress={() => setType('parent_child')}
        >
          Cha mẹ/con
        </Button>
        <Button
          mode={type === 'spouse' ? 'contained' : 'outlined'}
          textColor={type === 'spouse' ? undefined : brand.text.body}
          onPress={() => setType('spouse')}
        >
          Vợ/chồng
        </Button>
      </View>
      <Text style={styles.label}>Chọn người liên quan</Text>
      {otherMembers.map((member) => (
        <Button
          key={member.id}
          mode={targetId === member.id ? 'contained' : 'outlined'}
          textColor={targetId === member.id ? undefined : brand.text.body}
          onPress={() => setTargetId(member.id)}
          style={styles.input}
        >
          {member.full_name}
        </Button>
      ))}
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <PrimaryButton onPress={handleSubmit} loading={submitting} disabled={submitting} style={styles.input}>
        Gửi đề xuất
      </PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#180d08', flex: 1, padding: 24 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 20 },
  row: { flexDirection: 'row', gap: 8 },
  label: { color: brand.text.muted, marginTop: 18, marginBottom: 4 },
  input: { marginTop: 10 },
});
