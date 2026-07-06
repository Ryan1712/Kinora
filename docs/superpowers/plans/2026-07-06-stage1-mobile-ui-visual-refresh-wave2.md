# Stage 1 Mobile UI Visual Refresh — Wave 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the "Ink Root Dark Premium" visual treatment (already built in Wave 1) to the remaining 9 screens of the app, completing the visual refresh across all 13 Stage 1 screens.

**Architecture:** No new shared components — reuse the 7 components already built and reviewed in Wave 1 (`app/src/theme/brand.ts`, `GlassCard`, `PrimaryButton`, `MemberAvatar`, `RoleBadge`; `EmberBackground`/`AnimatedLogo`/`GenerationDivider` are not needed by any Wave 2 screen, per the design spec's scoping). Each task edits one screen file in place: replace list `Card`s with `GlassCard`, replace the primary submit/action `Button` with `PrimaryButton`, restyle `TextInput`s with the same glass recipe used in Wave 1's auth screens, restyle headings with `brand.text.heading`/`brand.fonts.heading`, and use `brand.red`/`brand.text.body`/`brand.text.muted` for secondary/destructive/muted text instead of hardcoded hex or the default light-theme look. Toggle-style selector buttons (`SegmentedButtons`, and hand-rolled contained/outlined `Button` pairs used as radio-style selectors) are left structurally as-is — they already inherit the dark theme's `primary`/`outline` colors from `appTheme` (Task 1 of Wave 1), so no per-item styling is needed there.

**Tech Stack:** Same as Wave 1 — React Native Paper, the Wave 1 component library, no new dependencies.

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-07-06-stage1-mobile-ui-visual-refresh-design.md`. Progress ledger and final-review notes from Wave 1: `.superpowers/sdd/progress.md` (read for context on established conventions and deferred items — do not re-litigate Wave 1's already-fixed findings).
- This is a presentation-only change, identical rule to Wave 1: no screen's props, navigation route, API call shape, or React Query key may change. Every existing test file under `app/src/app/**/__tests__/` must keep passing unmodified — 5 of the 9 screens in this plan (`create-clan.tsx`, `propose-change.tsx`, `settings.tsx`, `transfer-admin.tsx`, `member/[personId].tsx`) have existing tests that assert exact button text, `testID`s, and exact argument shapes passed to mocked API functions; preserve all of these exactly. The other 4 screens (`invites.tsx`, `profile.tsx`, `clan/[id]/invite.tsx`, `clan/[id]/requests.tsx`) have no dedicated test — for these, rely on the full suite (`npx jest`) to catch regressions and preserve data-hook/navigation call sites exactly as Wave 1's Tasks 12-13 did.
- Color tokens: reuse `brand` from `app/src/theme/brand.ts` exactly as Wave 1 established it — do not invent new hex values. In particular: `brand.text.heading` (`#f4dba0`) for screen titles with `brand.fonts.heading` (`PlayfairDisplay_700Bold`), `brand.text.body` (`#f0e4d0`) for primary readable text and neutral secondary-button text, `brand.text.muted` (`#a8926f`) for helper/meta text, `brand.glass.border`/`brand.gold.mid` for `TextInput` outlines (same recipe as Wave 1's sign-in/sign-up screens), `brand.red` (`#c0432f`) for destructive actions (never a hardcoded `'#c0432f'` literal — Wave 1's final review flagged exactly this kind of hex/token drift; reference the token).
- Screen background: `#180d08` (flat, matching Wave 1's clan list/clan home — none of these 9 screens are "peak moment" screens, so no gradient/`EmberBackground`, per the Peak-End Rule scoping already established in Wave 1's Global Constraints).
- Playfair Display is for screen-title `Text` only — never body text, button labels, `TextInput` labels, or list item text.
- Preserve each file's existing import style exactly (some screens import via the `@/` alias, others via relative `../../../../` paths — added imports for Wave 1 components/tokens must match whichever style the file already uses, do not mix styles within one file).
- `PrimaryButton`'s `style` prop lands on its gradient wrapper `View`, not on Paper's `Button` element itself (a known, reviewed characteristic from Wave 1 — see the ledger). This is fine for margin/`minWidth`/layout purposes (as already used in Wave 1's clan list FAB and clan home chip) — keep this in mind when sizing `PrimaryButton` inside a row of other buttons.
- Do not convert toggle/selector `Button`s (relationship-type pickers, invite-permission pickers, candidate pickers, gender `SegmentedButtons`) into `PrimaryButton` — `PrimaryButton` is for single primary submit/confirm actions only, never a multi-option selector, since its gold gradient would visually compete with itself across multiple simultaneously-rendered options.
- The final "Xác nhận nhường quyền" (confirm transfer) button in `transfer-admin.tsx` stays a plain Paper `Button` with `buttonColor={brand.red}` — it is a destructive/danger action and must NOT become a `PrimaryButton` (whose gold gradient signals a normal positive primary action, not danger).

---

## Task 1: Visual refresh for the invites list screen

**Files:**
- Modify: `app/src/app/(main)/invites.tsx`

**Interfaces:**
- Consumes: `GlassCard`, `PrimaryButton` (Wave 1, `app/src/components/`), `brand` (Wave 1, `app/src/theme/brand.ts`).
- Produces: no change to `useMyInvites()` usage, `respondInvite({ invite_id, action })` call, or the two `queryClient.invalidateQueries` calls — only the rendered JSX/styles change.

- [ ] **Step 1: Confirm there is no existing test to preserve**

Confirm `app/src/app/(main)/__tests__/invites.test.tsx` does not exist (there is no dedicated test for this screen today) — verification for this task relies on the full suite, not a screen-specific test.

- [ ] **Step 2: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(main)/invites.tsx`:
```tsx
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
```

- [ ] **Step 3: Run TypeScript check and the full test suite**

Run (from `app/`): `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass (24 suites / 36 tests at the start of Wave 2; this screen has no dedicated test, so a regression here would only surface as a full-suite failure if the changed imports break something else, which they should not).

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/invites.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to invites list"
```

---

## Task 2: Visual refresh for the create-clan screen

**Files:**
- Modify: `app/src/app/(main)/create-clan.tsx`

**Interfaces:**
- Consumes: `PrimaryButton`, `brand`.
- Produces: no change to `createClan({ name, branch_type, admin_full_name, admin_generation_number })` or `router.replace(...)` — `app/src/app/(main)/__tests__/create-clan.test.tsx` must keep passing unmodified (it uses `getByTestId('clan-name-input')`, `getByTestId('admin-name-input')`, `getByTestId('generation-input')`, and `getByText('Tạo gia tộc')`).

- [ ] **Step 1: Confirm the existing test's requirements**

Read `app/src/app/(main)/__tests__/create-clan.test.tsx` (no changes needed) — note the three `testID`s and the exact button text `'Tạo gia tộc'` that must be preserved.

- [ ] **Step 2: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(main)/create-clan.tsx`:
```tsx
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { createClan } from '@/api/createClan';
import { PrimaryButton } from '@/components/PrimaryButton';
import { brand } from '@/theme/brand';

type BranchType = 'noi' | 'ngoai' | 'khac';

export default function CreateClanScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [branchType, setBranchType] = useState<BranchType>('noi');
  const [adminFullName, setAdminFullName] = useState('');
  const [generation, setGeneration] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await createClan({
        name,
        branch_type: branchType,
        admin_full_name: adminFullName,
        admin_generation_number: Number(generation),
      });
      router.replace(`/(main)/clan/${result.clan_id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Tạo gia tộc thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  const inputTheme = { colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } };

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Tạo gia tộc mới</Text>
      <TextInput
        label="Tên gia tộc"
        testID="clan-name-input"
        value={name}
        onChangeText={setName}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <SegmentedButtons
        value={branchType}
        onValueChange={(value) => setBranchType(value as BranchType)}
        buttons={[{ value: 'noi', label: 'Nội' }, { value: 'ngoai', label: 'Ngoại' }, { value: 'khac', label: 'Khác' }]}
        style={styles.input}
      />
      <TextInput
        label="Họ tên của bạn (trong gia phả)"
        testID="admin-name-input"
        value={adminFullName}
        onChangeText={setAdminFullName}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Đời thứ của bạn"
        testID="generation-input"
        value={generation}
        onChangeText={setGeneration}
        keyboardType="numeric"
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      {error && <HelperText type="error">{error}</HelperText>}
      <PrimaryButton onPress={handleCreate} loading={submitting} disabled={submitting}>
        Tạo gia tộc
      </PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#180d08', flex: 1, padding: 24 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 20 },
  input: { backgroundColor: 'transparent', marginBottom: 14 },
});
```

- [ ] **Step 3: Run the existing test, TypeScript check, and full suite**

Run (from `app/`): `npx jest "src/app/(main)/__tests__/create-clan.test.tsx"` — expect PASS (1 test, unmodified).
Run: `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/create-clan.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to create-clan"
```

---

## Task 3: Visual refresh for the profile screen

**Files:**
- Modify: `app/src/app/(main)/profile.tsx`

**Interfaces:**
- Consumes: `PrimaryButton`, `brand`.
- Produces: no change to `useAuth()`, `useMyProfile()`, `updateMyProfile(session.user.id, { full_name, phone, occupation, address })`, or the `queryClient.invalidateQueries({ queryKey: ['my-profile'] })` call.

- [ ] **Step 1: Confirm there is no existing test to preserve**

Confirm `app/src/app/(main)/__tests__/profile.test.tsx` does not exist today.

- [ ] **Step 2: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(main)/profile.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/lib/AuthContext';
import { updateMyProfile, useMyProfile } from '@/queries/useMyProfile';
import { brand } from '@/theme/brand';

export default function ProfileScreen() {
  const { session } = useAuth();
  const { data: profile } = useMyProfile();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setOccupation(profile.occupation ?? '');
      setAddress(profile.address ?? '');
    }
  }, [profile]);

  async function handleSave() {
    if (!session) return;

    setSaving(true);
    try {
      await updateMyProfile(session.user.id, { full_name: fullName, phone, occupation, address });
      queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    } finally {
      setSaving(false);
    }
  }

  const inputTheme = { colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Hồ sơ cá nhân</Text>
      <TextInput
        label="Họ tên"
        value={fullName}
        onChangeText={setFullName}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Số điện thoại"
        value={phone}
        onChangeText={setPhone}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Nghề nghiệp"
        value={occupation}
        onChangeText={setOccupation}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      <TextInput
        label="Nơi ở"
        value={address}
        onChangeText={setAddress}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={inputTheme}
        style={styles.input}
      />
      {profile && <Text variant="bodySmall" style={styles.muted}>Mã mời: {profile.invite_code}</Text>}
      <PrimaryButton onPress={handleSave} loading={saving} disabled={saving} style={styles.button}>
        Lưu
      </PrimaryButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#180d08' },
  container: { padding: 24 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 20 },
  input: { backgroundColor: 'transparent', marginBottom: 14 },
  muted: { color: brand.text.muted },
  button: { marginTop: 16 },
});
```

- [ ] **Step 3: Run TypeScript check and the full test suite**

Run (from `app/`): `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/profile.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to profile"
```

---

## Task 4: Visual refresh for the invite-member screen

**Files:**
- Modify: `app/src/app/(main)/clan/[id]/invite.tsx`

**Interfaces:**
- Consumes: `PrimaryButton`, `brand`.
- Produces: no change to `inviteMember({ clan_id, anchor_person_id, relation_code, invitee_full_name, invitee_gender, invitee_phone_or_email })` or `router.back()`.

- [ ] **Step 1: Confirm there is no existing test to preserve**

Confirm `app/src/app/(main)/clan/[id]/__tests__/invite.test.tsx` does not exist today.

- [ ] **Step 2: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(main)/clan/[id]/invite.tsx`:
```tsx
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
```

- [ ] **Step 3: Run TypeScript check and the full test suite**

Run (from `app/`): `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/clan/\[id\]/invite.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to invite-member"
```

---

## Task 5: Visual refresh for the member detail screen

**Files:**
- Modify: `app/src/app/(main)/clan/[id]/member/[personId].tsx`

**Interfaces:**
- Consumes: `MemberAvatar`, `RoleBadge`, `PrimaryButton`, `brand`.
- Produces: no change to `useAuth()`, `useClanMembers(id)`, `clanAdminSettings({ clan_id, action, person_id })`, or the `queryClient.invalidateQueries({ queryKey: ['clan-members', id] })` call. `app/src/app/(main)/clan/[id]/member/__tests__/member-detail.test.tsx` must keep passing unmodified (it presses the exact button text `'Bổ nhiệm phó tộc trưởng'` and asserts the exact `clanAdminSettings` call).

- [ ] **Step 1: Confirm the existing test's requirements**

Read `app/src/app/(main)/clan/[id]/member/__tests__/member-detail.test.tsx` (no changes needed) — note it renders with a `QueryClientProvider` wrapper only (no `PaperProvider`), consistent with how Wave 1's `PrimaryButton` was already proven to render correctly without an explicit `PaperProvider` ancestor (Paper's `Button` falls back to its own default theme when none is provided — the `PaperProvider`-specific crash from Wave 1's Task 6 only occurs when a test explicitly wraps content in `<PaperProvider>`, which this test does not).

- [ ] **Step 2: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(main)/clan/[id]/member/[personId].tsx`:
```tsx
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { clanAdminSettings } from '@/api/clanAdminSettings';
import { MemberAvatar } from '@/components/MemberAvatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RoleBadge } from '@/components/RoleBadge';
import { useAuth } from '@/lib/AuthContext';
import { useClanMembers } from '@/queries/useClanMembers';
import { brand } from '@/theme/brand';

export default function MemberDetailScreen() {
  const { id, personId } = useLocalSearchParams<{ id: string; personId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { data: members } = useClanMembers(id);
  const [busy, setBusy] = useState(false);

  const person = members?.find((member) => member.id === personId);
  const me = members?.find((member) => member.linked_user_id === session?.user.id);
  const isSelf = person?.linked_user_id === session?.user.id;
  const viewerIsAdmin = me?.role === 'admin';

  async function runAction(action: 'appoint_deputy' | 'remove_deputy' | 'remove_member') {
    setBusy(true);
    try {
      await clanAdminSettings({ clan_id: id, action, person_id: personId });
      queryClient.invalidateQueries({ queryKey: ['clan-members', id] });
    } finally {
      setBusy(false);
    }
  }

  if (!person) {
    return (
      <View style={styles.container}>
        <Text style={styles.muted}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MemberAvatar fullName={person.full_name} gender={person.gender} size={72} />
      <Text variant="headlineSmall" style={styles.name}>{person.full_name}</Text>
      <Text style={styles.meta}>Đời thứ {person.generation_number}</Text>
      <Text style={styles.meta}>Giới tính: {person.gender}</Text>
      <View style={styles.roleRow}>
        <Text style={styles.meta}>Vai trò: {person.role ?? 'Chưa có tài khoản'}</Text>
        <RoleBadge role={person.role} />
      </View>

      {isSelf && (
        <PrimaryButton style={styles.action} onPress={() => router.push(`/(main)/clan/${id}/propose-change`)}>
          Đề xuất sửa quan hệ của tôi
        </PrimaryButton>
      )}

      {viewerIsAdmin && !isSelf && person.role !== 'admin' && (
        <View style={styles.action}>
          {person.role === 'deputy' ? (
            <Button textColor={brand.text.body} onPress={() => runAction('remove_deputy')} loading={busy} disabled={busy}>
              Gỡ chức phó tộc trưởng
            </Button>
          ) : (
            <Button textColor={brand.text.body} onPress={() => runAction('appoint_deputy')} loading={busy} disabled={busy}>
              Bổ nhiệm phó tộc trưởng
            </Button>
          )}
          <Button
            textColor={brand.red}
            onPress={() => runAction('remove_member')}
            loading={busy}
            disabled={busy}
          >
            Xóa khỏi gia tộc
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start', backgroundColor: '#180d08', flex: 1, padding: 24 },
  name: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginTop: 12 },
  meta: { color: brand.text.muted, marginTop: 4 },
  roleRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  action: { marginTop: 20 },
});
```

- [ ] **Step 3: Run the existing test, TypeScript check, and full suite**

Run (from `app/`): `npx jest "src/app/(main)/clan/[id]/member/__tests__/member-detail.test.tsx"` — expect PASS (1 test, unmodified).
Run: `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/clan/\[id\]/member/\[personId\].tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to member detail"
```

---

## Task 6: Visual refresh for the propose-change screen

**Files:**
- Modify: `app/src/app/(main)/clan/[id]/propose-change.tsx`

**Interfaces:**
- Consumes: `PrimaryButton`, `brand`.
- Produces: no change to `useAuth()`, `useClanMembers(id)`, `proposeRelationshipChange({ clan_id, proposed_relationship_type, proposed_relationship_with_person_id })`, or `router.back()`. `app/src/app/(main)/clan/[id]/__tests__/propose-change.test.tsx` must keep passing unmodified (it presses the exact member-name button text and `'Gửi đề xuất'`, and asserts the exact call arguments).

- [ ] **Step 1: Confirm the existing test's requirements**

Read `app/src/app/(main)/clan/[id]/__tests__/propose-change.test.tsx` (no changes needed) — note the mocked member button text (`'Bac Ba'`) and the final submit button text `'Gửi đề xuất'` that must be preserved.

- [ ] **Step 2: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(main)/clan/[id]/propose-change.tsx`:
```tsx
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
```

- [ ] **Step 3: Run the existing test, TypeScript check, and full suite**

Run (from `app/`): `npx jest "src/app/(main)/clan/[id]/__tests__/propose-change.test.tsx"` — expect PASS (1 test, unmodified).
Run: `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/clan/\[id\]/propose-change.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to propose-change"
```

---

## Task 7: Visual refresh for the pending requests screen

**Files:**
- Modify: `app/src/app/(main)/clan/[id]/requests.tsx`

**Interfaces:**
- Consumes: `GlassCard`, `PrimaryButton`, `brand`.
- Produces: no change to `useClanChangeRequests(id)`, `reviewRelationshipChange({ request_id, action })`, or the two `queryClient.invalidateQueries` calls.

- [ ] **Step 1: Confirm there is no existing test to preserve**

Confirm `app/src/app/(main)/clan/[id]/__tests__/requests.test.tsx` does not exist today.

- [ ] **Step 2: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(main)/clan/[id]/requests.tsx`:
```tsx
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
```

- [ ] **Step 3: Run TypeScript check and the full test suite**

Run (from `app/`): `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/clan/\[id\]/requests.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to pending requests"
```

---

## Task 8: Visual refresh for the clan settings screen

**Files:**
- Modify: `app/src/app/(main)/clan/[id]/settings.tsx`

**Interfaces:**
- Consumes: `PrimaryButton`, `brand`.
- Produces: no change to `clanAdminSettings({ clan_id, action: 'update_settings', name?, invite_permission })` or `router.push(`/(main)/clan/${id}/transfer-admin`)`. `app/src/app/(main)/clan/[id]/__tests__/settings.test.tsx` must keep passing unmodified (it uses `getByTestId('clan-name-input')`, presses `'Mọi thành viên'`, presses `'Lưu cài đặt'`, and asserts the exact call arguments).

- [ ] **Step 1: Confirm the existing test's requirements**

Read `app/src/app/(main)/clan/[id]/__tests__/settings.test.tsx` (no changes needed) — note the `testID` and exact button texts that must be preserved.

- [ ] **Step 2: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(main)/clan/[id]/settings.tsx`:
```tsx
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { clanAdminSettings } from '../../../../api/clanAdminSettings';
import { PrimaryButton } from '../../../../components/PrimaryButton';
import { brand } from '../../../../theme/brand';

type InvitePermission = 'admin_only' | 'all_members';

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [invitePermission, setInvitePermission] = useState<InvitePermission>('admin_only');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await clanAdminSettings({
        clan_id: id,
        action: 'update_settings',
        ...(name ? { name } : {}),
        invite_permission: invitePermission,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Cài đặt gia tộc</Text>
      <TextInput
        label="Tên gia tộc"
        testID="clan-name-input"
        value={name}
        onChangeText={setName}
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={{ colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } }}
        style={styles.input}
      />
      <Text style={styles.label}>Ai được phép mời thành viên?</Text>
      <View style={styles.row}>
        <Button
          mode={invitePermission === 'admin_only' ? 'contained' : 'outlined'}
          textColor={invitePermission === 'admin_only' ? undefined : brand.text.body}
          onPress={() => setInvitePermission('admin_only')}
        >
          Chỉ trưởng/phó
        </Button>
        <Button
          mode={invitePermission === 'all_members' ? 'contained' : 'outlined'}
          textColor={invitePermission === 'all_members' ? undefined : brand.text.body}
          onPress={() => setInvitePermission('all_members')}
        >
          Mọi thành viên
        </Button>
      </View>
      <PrimaryButton onPress={handleSave} loading={saving} disabled={saving} style={styles.input}>
        Lưu cài đặt
      </PrimaryButton>
      <Button textColor={brand.red} onPress={() => router.push(`/(main)/clan/${id}/transfer-admin`)}>
        Nhường quyền trưởng họ
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#180d08', flex: 1, padding: 24 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 20 },
  label: { color: brand.text.muted, marginTop: 8, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8 },
  input: { backgroundColor: 'transparent', marginTop: 10 },
});
```

- [ ] **Step 3: Run the existing test, TypeScript check, and full suite**

Run (from `app/`): `npx jest "src/app/(main)/clan/[id]/__tests__/settings.test.tsx"` — expect PASS (1 test, unmodified).
Run: `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/clan/\[id\]/settings.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to clan settings"
```

---

## Task 9: Visual refresh for the transfer-admin screen

**Files:**
- Modify: `app/src/app/(main)/clan/[id]/transfer-admin.tsx`

**Interfaces:**
- Consumes: `brand` (no `PrimaryButton` — the confirm action is destructive/danger, see Global Constraints).
- Produces: no change to `useClanMembers(id)`, `transferAdmin({ clan_id, new_admin_person_id, password })`, or `router.replace(`/(main)/clan/${id}`)`. `app/src/app/(main)/clan/[id]/__tests__/transfer-admin.test.tsx` must keep passing unmodified (it presses a candidate name button, uses `getByTestId('password-input')`, presses `'Xác nhận nhường quyền'`, and asserts the exact call arguments).

- [ ] **Step 1: Confirm the existing test's requirements**

Read `app/src/app/(main)/clan/[id]/__tests__/transfer-admin.test.tsx` (no changes needed) — note the `testID` and exact button texts that must be preserved.

- [ ] **Step 2: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(main)/clan/[id]/transfer-admin.tsx`:
```tsx
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { transferAdmin } from '@/api/transferAdmin';
import { useClanMembers } from '@/queries/useClanMembers';
import { brand } from '@/theme/brand';

interface ClanMember {
  id: string;
  full_name: string;
  role?: string | null;
}

export default function TransferAdminScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: members } = useClanMembers(id);

  const [targetId, setTargetId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rows = (members ?? []) as ClanMember[];
  const candidates = rows.filter((member) => member.role && member.role !== 'admin');

  async function handleConfirm() {
    if (!targetId) {
      setError('Vui lòng chọn người kế nhiệm');
      return;
    }
    if (!password) {
      setError('Nhập lại mật khẩu để xác nhận');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await transferAdmin({ clan_id: id, new_admin_person_id: targetId, password });
      router.replace(`/(main)/clan/${id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Nhường quyền thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Nhường quyền trưởng họ</Text>
      <Text style={styles.label}>Chọn người kế nhiệm</Text>
      {candidates.map((member) => (
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
      <TextInput
        label="Nhập lại mật khẩu để xác nhận"
        testID="password-input"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        mode="outlined"
        textColor={brand.text.body}
        outlineColor={brand.glass.border}
        activeOutlineColor={brand.gold.mid}
        theme={{ colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } }}
        style={styles.input}
      />
      {error ? <HelperText type="error">{error}</HelperText> : null}
      <Button mode="contained" buttonColor={brand.red} onPress={handleConfirm} loading={submitting} disabled={submitting}>
        Xác nhận nhường quyền
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#180d08', flex: 1, padding: 24 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 20 },
  label: { color: brand.text.muted, marginTop: 8 },
  input: { backgroundColor: 'transparent', marginTop: 14 },
});
```

- [ ] **Step 3: Run the existing test, TypeScript check, and full suite**

Run (from `app/`): `npx jest "src/app/(main)/clan/[id]/__tests__/transfer-admin.test.tsx"` — expect PASS (1 test, unmodified).
Run: `npx tsc --noEmit` — expect no output.
Run: `npx jest` — expect all suites to pass.

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/clan/\[id\]/transfer-admin.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to transfer-admin"
```

---

## Task 10: Full verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full TypeScript check**

Run (from `app/`): `npx tsc --noEmit` — expect no output.

- [ ] **Step 2: Full Jest suite**

Run: `npx jest` — expect every suite to pass, including all 5 pre-existing screen tests touched in this plan (`create-clan.test.tsx`, `propose-change.test.tsx`, `settings.test.tsx`, `transfer-admin.test.tsx`, `member-detail.test.tsx`) with zero diff to their assertions.

- [ ] **Step 3: Start the backend and the Expo web dev server**

Run (from the repo root, requires Docker Desktop running): `npx supabase start` (if not already running from a prior session — check `docker ps` first; if the edge functions runtime was left stopped, run `npx supabase stop` then `npx supabase start` to bring it back up, per the issue found during Wave 1's Task 14).
Run (from `app/`, in a separate terminal/background process): `npx expo start --web`.

- [ ] **Step 4: Visually confirm all 9 screens via Playwright**

Using the same Playwright pattern established in Wave 1's Task 14 verification: sign in with a real Stage-1 test account (or sign up fresh), then navigate to and screenshot each of the 9 screens touched in this plan:
- Clan list → tap the invites icon → **invites list** screen: confirm dark background, `GlassCard` invite rows (if any pending invites exist in test data), gold `PrimaryButton` accept action.
- Clan list → FAB → **create-clan** screen: confirm dark background, glass-styled `TextInput`s, gold submit button; submit the form and confirm it still successfully creates a clan and navigates to the new clan's home (this exercises the exact flow already manually verified once in Wave 1's Task 14 investigation, now under the new dark styling).
- Clan home → "Mời thành viên" → **invite-member** screen: confirm dark background, styled Menu anchor buttons, gold submit button.
- Clan home → tap a member row → **member detail** screen: confirm `MemberAvatar` and `RoleBadge` render for the selected person, action buttons retain their exact text.
- Clan home → "Đề xuất sửa quan hệ" → **propose-change** screen: confirm dark background, toggle buttons visibly reflect the dark theme's `primary`/`outline` colors, gold submit button.
- Clan home (as admin/deputy) → "Yêu cầu chờ duyệt" → **requests** screen: confirm dark background and `GlassCard` rows (if any pending requests exist in test data).
- Clan home (as admin) → "Cài đặt" → **settings** screen: confirm dark background, glass `TextInput`, gold save button, red "Nhường quyền trưởng họ" link.
- Settings → "Nhường quyền trưởng họ" → **transfer-admin** screen: confirm dark background, glass password input, red (not gold) confirm button.
- Any screen's nav drawer/menu → **profile** screen: confirm dark background, 4 glass `TextInput`s, gold save button.

Confirm zero `console.error` entries in the captured browser console log across all 9 screens.

- [ ] **Step 5: Report results to the user**

Summarize: tsc status, jest pass count, and the Playwright visual confirmation (with screenshots), following the same plain-language, `localhost`-URL-based reporting pattern established in Wave 1's Task 14 and the finishing-a-development-branch flow that follows it.