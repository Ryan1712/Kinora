# Stage 1 Mobile UI (Plan 1B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Expo/React Native mobile app for Stage 1 — every screen and flow that calls the 8 Edge Functions and RLS-protected reads from the Stage 1 backend, styled with the "Ink Root" brand identity.

**Architecture:** A standalone Expo project under `app/` (separate `package.json` from the backend at repo root). Expo Router for file-based navigation, React Native Paper for base components under a fully custom theme, TanStack Query wrapping a Supabase client for all data access (direct `.from().select()` reads per the backend's RLS model, Edge Function calls for all writes).

**Tech Stack:** Expo (latest SDK via `create-expo-app`) + Expo Router, TypeScript, React Native Paper, TanStack Query (`@tanstack/react-query`), `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, Jest + `jest-expo` + `@testing-library/react-native`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-06-stage1-mobile-ui-design.md`.
- Backend spec/plan for exact request/response shapes: `docs/superpowers/specs/2026-07-01-stage1-foundation-design.md`, `docs/superpowers/plans/2026-07-01-stage1-backend.md`.
- Local dev Supabase instance: URL `http://127.0.0.1:54321`, anon key `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0` (same fixed local demo key used by the backend tests — local dev only, never a real project).
- Brand colors (exact hex, from spec): background gradient `#2b1a12 → #4a2418 → #7a2e1f`; gold gradient `#f8dfa0 → #e0ab4a → #a8721f`; seal red `#c0432f`.
- Daily-use screens use a light warm theme (cream background, dark brown text, gold `#e0ab4a` as Paper `primary`, red `#c0432f` as error/important-accent) — the dark brand gradient is reserved for the splash screen only, per the spec's theming rule.
- Logo assets already committed: `docs/design/branding/logo-full.png`, `docs/design/branding/logo-icon.png` — copy into `app/src/assets/` in Task 1.
- Writes go through Edge Functions (`supabase.functions.invoke`); reads go directly through `supabase.from(...).select()` protected by RLS — never write directly to a table from the app except `users` (self-service profile fields), matching the backend's access model exactly.
- No optimistic updates for Stage 1 — wait for server confirmation on every mutation.

---

## Task 1: Expo project scaffold + theme system

**Files:**
- Create: `app/` (Expo project root, via CLI)
- Create: `app/src/theme/brand.ts`
- Create: `app/src/theme/appTheme.ts`
- Create: `app/src/assets/logo-full.png`, `app/src/assets/logo-icon.png`
- Test: `app/src/theme/__tests__/appTheme.test.ts`

**Interfaces:**
- Produces: `brand` object (colors, gradients, motion timing constants) from `src/theme/brand.ts`, `appTheme: MD3Theme` from `src/theme/appTheme.ts` — both imported by every later screen/component task.

- [ ] **Step 1: Scaffold the Expo project**

Run from the repo root:
```bash
npx create-expo-app@latest app --template default
cd app
npx expo install react-native-paper react-native-safe-area-context react-native-screens @tanstack/react-query @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
npm install -D jest-expo @testing-library/react-native @testing-library/jest-native jest @types/jest
```
Expected: `app/package.json` exists with `expo-router` already present (current Expo default template ships it); the additional packages above are added.

- [ ] **Step 2: Configure Jest**

Create `app/jest.config.js`:
```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEach: [],
};
```

Add to `app/package.json` `scripts`:
```json
"test": "jest"
```

- [ ] **Step 3: Copy logo assets**

```bash
mkdir -p app/src/assets
cp docs/design/branding/logo-full.png app/src/assets/logo-full.png
cp docs/design/branding/logo-icon.png app/src/assets/logo-icon.png
```

- [ ] **Step 4: Write the failing test for the theme**

Create `app/src/theme/__tests__/appTheme.test.ts`:
```ts
import { appTheme } from '../appTheme';
import { brand } from '../brand';

describe('appTheme', () => {
  it('uses the brand gold as primary and brand red as error', () => {
    expect(appTheme.colors.primary).toBe(brand.gold.mid);
    expect(appTheme.colors.error).toBe(brand.red);
  });

  it('is a light theme (dark: false)', () => {
    expect(appTheme.dark).toBe(false);
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run (from `app/`): `npx jest src/theme/__tests__/appTheme.test.ts`
Expected: FAIL — `Cannot find module '../appTheme'`.

- [ ] **Step 6: Write brand.ts**

Create `app/src/theme/brand.ts`:
```ts
export const brand = {
  backgroundGradient: ['#2b1a12', '#4a2418', '#7a2e1f'] as const,
  gold: {
    light: '#f8dfa0',
    mid: '#e0ab4a',
    dark: '#a8721f',
  },
  red: '#c0432f',
  fonts: {
    heading: 'PlayfairDisplay_700Bold',
  },
  motion: {
    inkDrawMs: 1100,
    stampMs: 700,
    breatheMs: 3800,
  },
};
```

- [ ] **Step 7: Write appTheme.ts**

Create `app/src/theme/appTheme.ts`:
```ts
import { MD3LightTheme, MD3Theme } from 'react-native-paper';
import { brand } from './brand';

export const appTheme: MD3Theme = {
  ...MD3LightTheme,
  dark: false,
  colors: {
    ...MD3LightTheme.colors,
    primary: brand.gold.mid,
    onPrimary: '#2b1a12',
    secondary: brand.gold.dark,
    error: brand.red,
    background: '#faf3e8',
    surface: '#ffffff',
    onSurface: '#2b1a12',
    outline: '#d8c7a8',
  },
  roundness: 14,
};
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx jest src/theme/__tests__/appTheme.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add app/ docs/design/branding
git commit -m "chore(app): scaffold Expo project and Ink Root theme system"
```

---

## Task 2: Supabase client + env config

**Files:**
- Create: `app/.env.local`
- Create: `app/src/lib/supabase.ts`
- Test: `app/src/lib/__tests__/supabase.test.ts`

**Interfaces:**
- Produces: `supabase: SupabaseClient` from `src/lib/supabase.ts` — imported by every API/data hook in later tasks.

- [ ] **Step 1: Add env file**

Create `app/.env.local` (Expo reads `EXPO_PUBLIC_*` vars automatically):
```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

Add `.env.local` to `app/.gitignore` (create the file if it doesn't exist, append `.env.local`).

- [ ] **Step 2: Write the failing test**

Create `app/src/lib/__tests__/supabase.test.ts`:
```ts
import { supabase } from '../supabase';

describe('supabase client', () => {
  it('is configured with the local dev URL', () => {
    expect(supabase.supabaseUrl).toBe('http://127.0.0.1:54321');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/supabase.test.ts`
Expected: FAIL — `Cannot find module '../supabase'`.

- [ ] **Step 4: Write the client**

Create `app/src/lib/supabase.ts`:
```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/supabase.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib app/.gitignore
git commit -m "feat(app): add Supabase client with AsyncStorage session persistence"
```

---

## Task 3: API layer — typed wrappers for all 8 Edge Functions

**Files:**
- Create: `app/src/api/types.ts`
- Create: `app/src/api/createClan.ts`
- Create: `app/src/api/inviteMember.ts`
- Create: `app/src/api/respondInvite.ts`
- Create: `app/src/api/proposeRelationshipChange.ts`
- Create: `app/src/api/reviewRelationshipChange.ts`
- Create: `app/src/api/clanAdminSettings.ts`
- Create: `app/src/api/transferAdmin.ts`
- Create: `app/src/api/leaveClan.ts`
- Test: `app/src/api/__tests__/api.test.ts`

**Interfaces:**
- Consumes: `supabase` from Task 2.
- Produces: one async function per Edge Function, each throwing on `{error}` and returning the typed success payload — imported by every screen/hook task from Task 6 onward. Exact signatures:
  - `createClan(params: CreateClanParams): Promise<{ clan_id: string; person_id: string }>`
  - `inviteMember(params: InviteMemberParams): Promise<{ invite_id: string; resolved_generation: number }>`
  - `respondInvite(params: { invite_id: string; action: 'accept' | 'decline' }): Promise<{ person_id?: string }>`
  - `proposeRelationshipChange(params: ProposeChangeParams): Promise<{ request_id: string }>`
  - `reviewRelationshipChange(params: { request_id: string; action: 'approve' | 'reject' }): Promise<{}>`
  - `clanAdminSettings(params: ClanAdminSettingsParams): Promise<{}>`
  - `transferAdmin(params: { clan_id: string; new_admin_person_id: string; password: string }): Promise<{}>`
  - `leaveClan(params: { clan_id: string }): Promise<{}>`

- [ ] **Step 1: Write shared types**

Create `app/src/api/types.ts`:
```ts
export type RelationCode =
  | 'father' | 'mother' | 'son' | 'daughter' | 'spouse' | 'sibling'
  | 'paternal_grandfather' | 'paternal_grandmother'
  | 'maternal_grandfather' | 'maternal_grandmother'
  | 'father_sibling' | 'mother_sibling';

export interface CreateClanParams {
  name: string;
  branch_type: 'noi' | 'ngoai' | 'khac';
  admin_full_name: string;
  admin_generation_number: number;
}

export interface InviteMemberParams {
  clan_id: string;
  anchor_person_id: string;
  relation_code: RelationCode;
  invitee_full_name: string;
  invitee_gender?: 'male' | 'female' | 'unknown';
  invitee_user_id?: string;
  invitee_phone_or_email?: string;
}

export interface ProposeChangeParams {
  clan_id: string;
  proposed_relationship_type: 'parent_child' | 'spouse';
  proposed_relationship_with_person_id: string;
}

export interface ClanAdminSettingsParams {
  clan_id: string;
  action: 'update_settings' | 'appoint_deputy' | 'remove_deputy' | 'remove_member';
  name?: string;
  invite_permission?: 'admin_only' | 'all_members';
  person_id?: string;
}

export class ApiError extends Error {}
```

- [ ] **Step 2: Write the failing test**

Create `app/src/api/__tests__/api.test.ts`:
```ts
import { supabase } from '../../lib/supabase';
import { createClan } from '../createClan';
import { ApiError } from '../types';

jest.mock('../../lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

describe('createClan', () => {
  it('returns the parsed payload on success', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { clan_id: 'c1', person_id: 'p1' },
      error: null,
    });
    const result = await createClan({
      name: 'Ho Pham', branch_type: 'noi', admin_full_name: 'Duy', admin_generation_number: 15,
    });
    expect(result).toEqual({ clan_id: 'c1', person_id: 'p1' });
    expect(supabase.functions.invoke).toHaveBeenCalledWith('create-clan', {
      body: { name: 'Ho Pham', branch_type: 'noi', admin_full_name: 'Duy', admin_generation_number: 15 },
    });
  });

  it('throws ApiError when the function returns an error', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'missing required fields' },
    });
    await expect(
      createClan({ name: '', branch_type: 'noi', admin_full_name: '', admin_generation_number: 0 })
    ).rejects.toThrow(ApiError);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/api/__tests__/api.test.ts`
Expected: FAIL — `Cannot find module '../createClan'`.

- [ ] **Step 4: Write createClan.ts (establishes the pattern every other wrapper follows)**

Create `app/src/api/createClan.ts`:
```ts
import { supabase } from '../lib/supabase';
import { ApiError, CreateClanParams } from './types';

export async function createClan(
  params: CreateClanParams
): Promise<{ clan_id: string; person_id: string }> {
  const { data, error } = await supabase.functions.invoke('create-clan', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/api/__tests__/api.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Write the remaining 7 wrappers (same pattern, no additional tests — covered by the established pattern and exercised by later screen tasks)**

Create `app/src/api/inviteMember.ts`:
```ts
import { supabase } from '../lib/supabase';
import { ApiError, InviteMemberParams } from './types';

export async function inviteMember(
  params: InviteMemberParams
): Promise<{ invite_id: string; resolved_generation: number }> {
  const { data, error } = await supabase.functions.invoke('invite-member', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}
```

Create `app/src/api/respondInvite.ts`:
```ts
import { supabase } from '../lib/supabase';
import { ApiError } from './types';

export async function respondInvite(
  params: { invite_id: string; action: 'accept' | 'decline' }
): Promise<{ person_id?: string }> {
  const { data, error } = await supabase.functions.invoke('respond-invite', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}
```

Create `app/src/api/proposeRelationshipChange.ts`:
```ts
import { supabase } from '../lib/supabase';
import { ApiError, ProposeChangeParams } from './types';

export async function proposeRelationshipChange(
  params: ProposeChangeParams
): Promise<{ request_id: string }> {
  const { data, error } = await supabase.functions.invoke('propose-relationship-change', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}
```

Create `app/src/api/reviewRelationshipChange.ts`:
```ts
import { supabase } from '../lib/supabase';
import { ApiError } from './types';

export async function reviewRelationshipChange(
  params: { request_id: string; action: 'approve' | 'reject' }
): Promise<Record<string, never>> {
  const { data, error } = await supabase.functions.invoke('review-relationship-change', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}
```

Create `app/src/api/clanAdminSettings.ts`:
```ts
import { supabase } from '../lib/supabase';
import { ApiError, ClanAdminSettingsParams } from './types';

export async function clanAdminSettings(
  params: ClanAdminSettingsParams
): Promise<Record<string, never>> {
  const { data, error } = await supabase.functions.invoke('clan-admin-settings', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}
```

Create `app/src/api/transferAdmin.ts`:
```ts
import { supabase } from '../lib/supabase';
import { ApiError } from './types';

export async function transferAdmin(
  params: { clan_id: string; new_admin_person_id: string; password: string }
): Promise<Record<string, never>> {
  const { data, error } = await supabase.functions.invoke('transfer-admin', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}
```

Create `app/src/api/leaveClan.ts`:
```ts
import { supabase } from '../lib/supabase';
import { ApiError } from './types';

export async function leaveClan(
  params: { clan_id: string }
): Promise<Record<string, never>> {
  const { data, error } = await supabase.functions.invoke('leave-clan', { body: params });
  if (error) throw new ApiError(error.message);
  return data;
}
```

- [ ] **Step 7: Run the full API test suite once more**

Run: `npx jest src/api`
Expected: PASS (2 tests, unchanged — the other 7 files have no dedicated tests per Step 6's note).

- [ ] **Step 8: Commit**

```bash
git add app/src/api
git commit -m "feat(app): add typed API wrappers for all 8 Stage 1 edge functions"
```

---

## Task 4: Auth context + root layout guard

**Files:**
- Create: `app/src/lib/AuthContext.tsx`
- Create: `app/app/_layout.tsx`
- Test: `app/src/lib/__tests__/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2), `appTheme` (Task 1).
- Produces: `AuthProvider` component and `useAuth(): { session: Session | null; loading: boolean }` hook — consumed by every screen that needs to know the current user, and by the root layout's redirect logic.

- [ ] **Step 1: Write the failing test**

Create `app/src/lib/__tests__/AuthContext.test.tsx`:
```tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
}));

function Probe() {
  const { session, loading } = useAuth();
  return <Text>{loading ? 'loading' : session ? 'signed-in' : 'signed-out'}</Text>;
}

describe('AuthProvider', () => {
  it('resolves to signed-out when there is no session', async () => {
    const { getByText } = render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => getByText('signed-out'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/lib/__tests__/AuthContext.test.tsx`
Expected: FAIL — `Cannot find module '../AuthContext'`.

- [ ] **Step 3: Write AuthContext.tsx**

Create `app/src/lib/AuthContext.tsx`:
```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/lib/__tests__/AuthContext.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the root layout (no dedicated test — exercised end-to-end by manual QA in Task 16)**

Create `app/app/_layout.tsx`:
```tsx
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/lib/AuthContext';
import { appTheme } from '../src/theme/appTheme';

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(main)');
    }
  }, [session, loading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={appTheme}>
        <AuthProvider>
          <AuthGuard>
            <Slot />
          </AuthGuard>
        </AuthProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add app/src/lib app/app/_layout.tsx
git commit -m "feat(app): add auth context and root layout redirect guard"
```

---

## Task 5: Sign-up screen

**Files:**
- Create: `app/app/(auth)/sign-up.tsx`
- Test: `app/app/(auth)/__tests__/sign-up.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2), `appTheme` (Task 1).
- Produces: route `/(auth)/sign-up` — a `Link` to it is added from `sign-in.tsx` in Task 6.

- [ ] **Step 1: Write the failing test**

Create `app/app/(auth)/__tests__/sign-up.test.tsx`:
```tsx
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SignUpScreen from '../sign-up';
import { supabase } from '../../../src/lib/supabase';

jest.mock('../../../src/lib/supabase', () => ({
  supabase: {
    auth: { signUp: jest.fn() },
    from: jest.fn(() => ({ insert: jest.fn().mockResolvedValue({ error: null }) })),
  },
}));

describe('SignUpScreen', () => {
  it('signs up then inserts the users profile row with full_name', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    const { getByLabelText, getByText } = render(<SignUpScreen />);
    fireEvent.changeText(getByLabelText('Họ tên'), 'Pham Van Duy');
    fireEvent.changeText(getByLabelText('Email'), 'duy@example.com');
    fireEvent.changeText(getByLabelText('Mật khẩu'), 'password123');
    fireEvent.press(getByText('Đăng ký'));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'duy@example.com',
        password: 'password123',
      });
      expect(supabase.from).toHaveBeenCalledWith('users');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest app/\\(auth\\)/__tests__/sign-up.test.tsx`
Expected: FAIL — `Cannot find module '../sign-up'`.

- [ ] **Step 3: Write the screen**

Create `app/app/(auth)/sign-up.tsx`:
```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { Link } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

export default function SignUpScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignUp() {
    setError(null);
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      const userId = data.user?.id;
      if (userId) {
        const { error: insertError } = await supabase.from('users').insert({ id: userId, full_name: fullName });
        if (insertError) throw insertError;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng ký thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Tạo tài khoản</Text>
      <TextInput label="Họ tên" value={fullName} onChangeText={setFullName} style={styles.input} />
      <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
      <TextInput label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      {error && <HelperText type="error">{error}</HelperText>}
      <Button mode="contained" onPress={handleSignUp} loading={submitting} disabled={submitting} style={styles.button}>
        Đăng ký
      </Button>
      <Link href="/(auth)/sign-in">Đã có tài khoản? Đăng nhập</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { marginBottom: 24, textAlign: 'center' },
  input: { marginBottom: 12 },
  button: { marginTop: 8, marginBottom: 16 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest app/\\(auth\\)/__tests__/sign-up.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/app/(auth)/sign-up.tsx" "app/app/(auth)/__tests__/sign-up.test.tsx"
git commit -m "feat(app): add sign-up screen"
```

---

## Task 6: Sign-in screen

**Files:**
- Create: `app/app/(auth)/sign-in.tsx`
- Test: `app/app/(auth)/__tests__/sign-in.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2).
- Produces: route `/(auth)/sign-in` — the redirect target used by `_layout.tsx`'s `AuthGuard` (Task 4).

- [ ] **Step 1: Write the failing test**

Create `app/app/(auth)/__tests__/sign-in.test.tsx`:
```tsx
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SignInScreen from '../sign-in';
import { supabase } from '../../../src/lib/supabase';

jest.mock('../../../src/lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: jest.fn() } },
}));

describe('SignInScreen', () => {
  it('calls signInWithPassword with the entered credentials', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ data: {}, error: null });

    const { getByLabelText, getByText } = render(<SignInScreen />);
    fireEvent.changeText(getByLabelText('Email'), 'duy@example.com');
    fireEvent.changeText(getByLabelText('Mật khẩu'), 'password123');
    fireEvent.press(getByText('Đăng nhập'));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'duy@example.com',
        password: 'password123',
      });
    });
  });

  it('shows an error message when sign-in fails', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: {}, error: { message: 'Invalid login credentials' },
    });

    const { getByLabelText, getByText, findByText } = render(<SignInScreen />);
    fireEvent.changeText(getByLabelText('Email'), 'duy@example.com');
    fireEvent.changeText(getByLabelText('Mật khẩu'), 'wrong');
    fireEvent.press(getByText('Đăng nhập'));

    expect(await findByText('Invalid login credentials')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest app/\\(auth\\)/__tests__/sign-in.test.tsx`
Expected: FAIL — `Cannot find module '../sign-in'`.

- [ ] **Step 3: Write the screen**

Create `app/app/(auth)/sign-in.tsx`:
```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { Link } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    setSubmitting(false);
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>Phả Ký</Text>
      <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} />
      <TextInput label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      {error && <HelperText type="error">{error}</HelperText>}
      <Button mode="contained" onPress={handleSignIn} loading={submitting} disabled={submitting} style={styles.button}>
        Đăng nhập
      </Button>
      <Link href="/(auth)/sign-up">Chưa có tài khoản? Đăng ký</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { marginBottom: 24, textAlign: 'center' },
  input: { marginBottom: 12 },
  button: { marginTop: 8, marginBottom: 16 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest app/\\(auth\\)/__tests__/sign-in.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/app/(auth)/sign-in.tsx" "app/app/(auth)/__tests__/sign-in.test.tsx"
git commit -m "feat(app): add sign-in screen"
```

---

## Task 7: `useMyClans` hook + clan list screen

**Files:**
- Create: `app/src/queries/useMyClans.ts`
- Create: `app/app/(main)/index.tsx`
- Test: `app/src/queries/__tests__/useMyClans.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2), `useAuth` (Task 4).
- Produces: `useMyClans(): UseQueryResult<MyClanRow[]>` where `MyClanRow = { role: string; clan_id: string; clans: { id: string; name: string; branch_type: string } }` — consumed by `(main)/index.tsx` here and reusable anywhere a clan-picker is needed later.

- [ ] **Step 1: Write the failing test**

Create `app/src/queries/__tests__/useMyClans.test.tsx`:
```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyClans } from '../useMyClans';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
jest.mock('../../lib/AuthContext', () => ({
  useAuth: jest.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMyClans', () => {
  it('fetches clans for the current user', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    const eqMock = jest.fn().mockResolvedValue({
      data: [{ role: 'admin', clan_id: 'c1', clans: { id: 'c1', name: 'Ho Pham', branch_type: 'noi' } }],
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eqMock }) });

    const { result } = renderHook(() => useMyClans(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].clans.name).toBe('Ho Pham');
    expect(eqMock).toHaveBeenCalledWith('linked_user_id', 'u1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/queries/__tests__/useMyClans.test.tsx`
Expected: FAIL — `Cannot find module '../useMyClans'`.

- [ ] **Step 3: Write the hook**

Create `app/src/queries/useMyClans.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export interface MyClanRow {
  role: string;
  clan_id: string;
  clans: { id: string; name: string; branch_type: string };
}

export function useMyClans() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['my-clans', session?.user.id],
    queryFn: async (): Promise<MyClanRow[]> => {
      const { data, error } = await supabase
        .from('persons')
        .select('role, clan_id, clans(id, name, branch_type)')
        .eq('linked_user_id', session!.user.id);
      if (error) throw error;
      return data as unknown as MyClanRow[];
    },
    enabled: !!session,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/queries/__tests__/useMyClans.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the clan list screen (no dedicated test — thin rendering of `useMyClans`, exercised by manual QA in Task 16)**

Create `app/app/(main)/index.tsx`:
```tsx
import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, FAB, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useMyClans } from '../../src/queries/useMyClans';

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
      <FAB icon="plus" style={styles.fab} onPress={() => router.push('/(main)/create-clan')} label="Tạo gia tộc" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  card: { marginBottom: 12 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
```

- [ ] **Step 6: Commit**

```bash
git add app/src/queries "app/app/(main)/index.tsx"
git commit -m "feat(app): add useMyClans hook and clan list screen"
```

---

## Task 8: Create-clan screen

**Files:**
- Create: `app/app/(main)/create-clan.tsx`
- Test: `app/app/(main)/__tests__/create-clan.test.tsx`

**Interfaces:**
- Consumes: `createClan` (Task 3).
- Produces: route `/(main)/create-clan`, linked from the FAB in `(main)/index.tsx` (Task 7).

- [ ] **Step 1: Write the failing test**

Create `app/app/(main)/__tests__/create-clan.test.tsx`:
```tsx
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CreateClanScreen from '../create-clan';
import { createClan } from '../../../src/api/createClan';

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('../../../src/api/createClan', () => ({ createClan: jest.fn() }));

describe('CreateClanScreen', () => {
  it('submits the form fields to createClan', async () => {
    (createClan as jest.Mock).mockResolvedValue({ clan_id: 'c1', person_id: 'p1' });

    const { getByLabelText, getByText } = render(<CreateClanScreen />);
    fireEvent.changeText(getByLabelText('Tên gia tộc'), 'Ho Pham');
    fireEvent.changeText(getByLabelText('Đời thứ của bạn'), '15');
    fireEvent.press(getByText('Tạo gia tộc'));

    await waitFor(() => {
      expect(createClan).toHaveBeenCalledWith({
        name: 'Ho Pham',
        branch_type: 'noi',
        admin_full_name: '',
        admin_generation_number: 15,
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest "app/\\(main\\)/__tests__/create-clan.test.tsx"`
Expected: FAIL — `Cannot find module '../create-clan'`.

- [ ] **Step 3: Write the screen**

Create `app/app/(main)/create-clan.tsx`:
```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { createClan } from '../../src/api/createClan';

export default function CreateClanScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [branchType, setBranchType] = useState<'noi' | 'ngoai' | 'khac'>('noi');
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo gia tộc thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Tạo gia tộc mới</Text>
      <TextInput label="Tên gia tộc" value={name} onChangeText={setName} style={styles.input} />
      <SegmentedButtons
        value={branchType}
        onValueChange={(v) => setBranchType(v as 'noi' | 'ngoai' | 'khac')}
        buttons={[
          { value: 'noi', label: 'Nội' },
          { value: 'ngoai', label: 'Ngoại' },
          { value: 'khac', label: 'Khác' },
        ]}
        style={styles.input}
      />
      <TextInput label="Họ tên của bạn (trong gia phả)" value={adminFullName} onChangeText={setAdminFullName} style={styles.input} />
      <TextInput label="Đời thứ của bạn" value={generation} onChangeText={setGeneration} keyboardType="numeric" style={styles.input} />
      {error && <HelperText type="error">{error}</HelperText>}
      <Button mode="contained" onPress={handleCreate} loading={submitting} disabled={submitting}>
        Tạo gia tộc
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { marginBottom: 20 },
  input: { marginBottom: 14 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest "app/\\(main\\)/__tests__/create-clan.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/app/(main)/create-clan.tsx" "app/app/(main)/__tests__/create-clan.test.tsx"
git commit -m "feat(app): add create-clan screen"
```

---

## Task 9: `useMyInvites` hook + invites inbox screen

**Files:**
- Create: `app/src/queries/useMyInvites.ts`
- Create: `app/app/(main)/invites.tsx`
- Test: `app/src/queries/__tests__/useMyInvites.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2), `useAuth` (Task 4), `respondInvite` (Task 3).
- Produces: `useMyInvites(): UseQueryResult<InviteRow[]>` where `InviteRow = { id: string; clan_id: string; invitee_full_name: string; proposed_relationship_type: string; clans: { name: string } }`.

- [ ] **Step 1: Write the failing test**

Create `app/src/queries/__tests__/useMyInvites.test.tsx`:
```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyInvites } from '../useMyInvites';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../../lib/AuthContext', () => ({ useAuth: jest.fn() }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMyInvites', () => {
  it('fetches pending invites for the current user', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    const eqStatus = jest.fn().mockResolvedValue({
      data: [{ id: 'i1', clan_id: 'c1', invitee_full_name: 'Toan', proposed_relationship_type: 'parent_child', clans: { name: 'Ho Pham' } }],
      error: null,
    });
    const eqUser = jest.fn().mockReturnValue({ eq: eqStatus });
    (supabase.from as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eqUser }) });

    const { result } = renderHook(() => useMyInvites(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].invitee_full_name).toBe('Toan');
    expect(eqUser).toHaveBeenCalledWith('invitee_user_id', 'u1');
    expect(eqStatus).toHaveBeenCalledWith('status', 'pending');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/queries/__tests__/useMyInvites.test.tsx`
Expected: FAIL — `Cannot find module '../useMyInvites'`.

- [ ] **Step 3: Write the hook**

Create `app/src/queries/useMyInvites.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export interface InviteRow {
  id: string;
  clan_id: string;
  invitee_full_name: string;
  proposed_relationship_type: string;
  clans: { name: string };
}

export function useMyInvites() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['my-invites', session?.user.id],
    queryFn: async (): Promise<InviteRow[]> => {
      const { data, error } = await supabase
        .from('invites')
        .select('id, clan_id, invitee_full_name, proposed_relationship_type, clans(name)')
        .eq('invitee_user_id', session!.user.id)
        .eq('status', 'pending');
      if (error) throw error;
      return data as unknown as InviteRow[];
    },
    enabled: !!session,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/queries/__tests__/useMyInvites.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the invites inbox screen (no dedicated test — thin composition of `useMyInvites` + `respondInvite`, exercised by manual QA in Task 16)**

Create `app/app/(main)/invites.tsx`:
```tsx
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useMyInvites } from '../../src/queries/useMyInvites';
import { respondInvite } from '../../src/api/respondInvite';

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
```

- [ ] **Step 6: Commit**

```bash
git add app/src/queries/useMyInvites.ts app/src/queries/__tests__/useMyInvites.test.tsx "app/app/(main)/invites.tsx"
git commit -m "feat(app): add useMyInvites hook and invites inbox screen"
```

---

## Task 10: Profile screen (self-service `users` edit)

**Files:**
- Create: `app/src/queries/useMyProfile.ts`
- Create: `app/app/(main)/profile.tsx`
- Test: `app/src/queries/__tests__/useMyProfile.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2), `useAuth` (Task 4).
- Produces: `useMyProfile(): UseQueryResult<ProfileRow>` and `updateMyProfile(userId, patch): Promise<void>` — both used only by `(main)/profile.tsx`.

- [ ] **Step 1: Write the failing test**

Create `app/src/queries/__tests__/useMyProfile.test.tsx`:
```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMyProfile, updateMyProfile } from '../useMyProfile';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../../lib/AuthContext', () => ({ useAuth: jest.fn() }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMyProfile', () => {
  it('fetches the current user row', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    const single = jest.fn().mockResolvedValue({ data: { id: 'u1', full_name: 'Duy' }, error: null });
    const eq = jest.fn().mockReturnValue({ single });
    (supabase.from as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ eq }) });

    const { result } = renderHook(() => useMyProfile(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.full_name).toBe('Duy');
  });
});

describe('updateMyProfile', () => {
  it('updates the row for the given user id', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    (supabase.from as jest.Mock).mockReturnValue({ update });

    await updateMyProfile('u1', { occupation: 'Ky su' });
    expect(update).toHaveBeenCalledWith({ occupation: 'Ky su' });
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/queries/__tests__/useMyProfile.test.tsx`
Expected: FAIL — `Cannot find module '../useMyProfile'`.

- [ ] **Step 3: Write the hook + update function**

Create `app/src/queries/useMyProfile.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export interface ProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  address: string | null;
  invite_code: string;
}

export function useMyProfile() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['my-profile', session?.user.id],
    queryFn: async (): Promise<ProfileRow> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, phone, email, occupation, address, invite_code')
        .eq('id', session!.user.id)
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },
    enabled: !!session,
  });
}

export async function updateMyProfile(
  userId: string,
  patch: Partial<Pick<ProfileRow, 'full_name' | 'phone' | 'occupation' | 'address'>>
): Promise<void> {
  const { error } = await supabase.from('users').update(patch).eq('id', userId);
  if (error) throw error;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/queries/__tests__/useMyProfile.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the profile screen (no dedicated test — thin form over the hook above, exercised by manual QA in Task 16)**

Create `app/app/(main)/profile.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../src/lib/AuthContext';
import { useMyProfile, updateMyProfile } from '../../src/queries/useMyProfile';

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Hồ sơ cá nhân</Text>
      <TextInput label="Họ tên" value={fullName} onChangeText={setFullName} style={styles.input} />
      <TextInput label="Số điện thoại" value={phone} onChangeText={setPhone} style={styles.input} />
      <TextInput label="Nghề nghiệp" value={occupation} onChangeText={setOccupation} style={styles.input} />
      <TextInput label="Nơi ở" value={address} onChangeText={setAddress} style={styles.input} />
      {profile && <Text variant="bodySmall">Mã mời: {profile.invite_code}</Text>}
      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.button}>
        Lưu
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { marginBottom: 20 },
  input: { marginBottom: 14 },
  button: { marginTop: 16 },
});
```

- [ ] **Step 6: Commit**

```bash
git add app/src/queries/useMyProfile.ts app/src/queries/__tests__/useMyProfile.test.tsx "app/app/(main)/profile.tsx"
git commit -m "feat(app): add profile screen with self-service edit"
```

---

## Task 11: `useClanMembers` hook + clan home screen

**Files:**
- Create: `app/src/queries/useClanMembers.ts`
- Create: `app/app/(main)/clan/[id]/index.tsx`
- Test: `app/src/queries/__tests__/useClanMembers.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2), `useAuth` (Task 4), `leaveClan` (Task 3).
- Produces: `useClanMembers(clanId): UseQueryResult<MemberRow[]>` where `MemberRow = { id: string; full_name: string; gender: string; generation_number: number; role: string | null; linked_user_id: string | null }` — reused by Task 12 (invite screen's anchor picker), Task 13 (member detail), Task 15 (clan settings member list).

- [ ] **Step 1: Write the failing test**

Create `app/src/queries/__tests__/useClanMembers.test.tsx`:
```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClanMembers } from '../useClanMembers';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useClanMembers', () => {
  it('fetches persons for the given clan ordered by generation', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [{ id: 'p1', full_name: 'Duy', gender: 'male', generation_number: 15, role: 'admin', linked_user_id: 'u1' }],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    (supabase.from as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ eq }) });

    const { result } = renderHook(() => useClanMembers('c1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].full_name).toBe('Duy');
    expect(eq).toHaveBeenCalledWith('clan_id', 'c1');
    expect(order).toHaveBeenCalledWith('generation_number');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/queries/__tests__/useClanMembers.test.tsx`
Expected: FAIL — `Cannot find module '../useClanMembers'`.

- [ ] **Step 3: Write the hook**

Create `app/src/queries/useClanMembers.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface MemberRow {
  id: string;
  full_name: string;
  gender: string;
  generation_number: number;
  role: string | null;
  linked_user_id: string | null;
}

export function useClanMembers(clanId: string) {
  return useQuery({
    queryKey: ['clan-members', clanId],
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase
        .from('persons')
        .select('id, full_name, gender, generation_number, role, linked_user_id')
        .eq('clan_id', clanId)
        .order('generation_number');
      if (error) throw error;
      return data as MemberRow[];
    },
    enabled: !!clanId,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/queries/__tests__/useClanMembers.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the clan home screen (no dedicated test — thin composition, exercised by manual QA in Task 16)**

Create `app/app/(main)/clan/[id]/index.tsx`:
```tsx
import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, List, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClanMembers } from '../../../../src/queries/useClanMembers';
import { useAuth } from '../../../../src/lib/AuthContext';
import { leaveClan } from '../../../../src/api/leaveClan';

export default function ClanHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { data: members, isLoading } = useClanMembers(id);

  const me = members?.find((m) => m.linked_user_id === session?.user.id);
  const isAdmin = me?.role === 'admin';
  const isAdminOrDeputy = me?.role === 'admin' || me?.role === 'deputy';

  async function handleLeave() {
    await leaveClan({ clan_id: id });
    router.replace('/(main)');
  }

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Button mode="contained" onPress={() => router.push(`/(main)/clan/${id}/invite`)}>Mời thành viên</Button>
        {me && (
          <Button onPress={() => router.push(`/(main)/clan/${id}/propose-change`)}>Đề xuất sửa quan hệ</Button>
        )}
        {isAdminOrDeputy && <Button onPress={() => router.push(`/(main)/clan/${id}/requests`)}>Yêu cầu chờ duyệt</Button>}
        {isAdmin && <Button onPress={() => router.push(`/(main)/clan/${id}/settings`)}>Cài đặt</Button>}
        {me && !isAdmin && <Button textColor="#c0432f" onPress={handleLeave}>Rời gia tộc</Button>}
      </View>
      {isLoading && <Text>Đang tải...</Text>}
      <FlatList
        data={members ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={item.full_name}
            description={`Đời ${item.generation_number}${item.role ? ` • ${item.role}` : ''}`}
            onPress={() => router.push(`/(main)/clan/${id}/member/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
});
```

- [ ] **Step 6: Commit**

```bash
git add app/src/queries/useClanMembers.ts app/src/queries/__tests__/useClanMembers.test.tsx "app/app/(main)/clan/[id]/index.tsx"
git commit -m "feat(app): add useClanMembers hook and clan home screen"
```

---

## Task 12: Relation code labels + invite-member screen

**Files:**
- Create: `app/src/constants/relationLabels.ts`
- Create: `app/app/(main)/clan/[id]/invite.tsx`
- Test: `app/src/constants/__tests__/relationLabels.test.ts`

**Interfaces:**
- Consumes: `RelationCode` (Task 3), `useClanMembers` (Task 11), `inviteMember` (Task 3).
- Produces: `relationLabels: Record<RelationCode, string>` (Vietnamese display labels for all 12 codes) — used only by this screen, but exported as a named constant so it isn't duplicated if another screen needs the same labels later.

**Scope note (Stage 1 UI limitation, not a bug):** the backend's `invite-member` function accepts `invitee_user_id` (a known UUID) or `invitee_phone_or_email` — it has no endpoint that resolves an invite_code string to a user id (RLS on `users` only allows reading your own row, so the client cannot look up another user's id by their invite_code). This screen therefore only supports inviting by phone/email. Inviting an existing account directly by their invite_code is deferred until a resolver Edge Function exists — out of scope for Plan 1B.

- [ ] **Step 1: Write the failing test**

Create `app/src/constants/__tests__/relationLabels.test.ts`:
```ts
import { relationLabels } from '../relationLabels';
import type { RelationCode } from '../../api/types';

describe('relationLabels', () => {
  it('has a Vietnamese label for all 12 relation codes', () => {
    const codes: RelationCode[] = [
      'father', 'mother', 'son', 'daughter', 'spouse', 'sibling',
      'paternal_grandfather', 'paternal_grandmother',
      'maternal_grandfather', 'maternal_grandmother',
      'father_sibling', 'mother_sibling',
    ];
    for (const code of codes) {
      expect(relationLabels[code]).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/constants/__tests__/relationLabels.test.ts`
Expected: FAIL — `Cannot find module '../relationLabels'`.

- [ ] **Step 3: Write the labels**

Create `app/src/constants/relationLabels.ts`:
```ts
import type { RelationCode } from '../api/types';

export const relationLabels: Record<RelationCode, string> = {
  father: 'Cha',
  mother: 'Mẹ',
  son: 'Con trai',
  daughter: 'Con gái',
  spouse: 'Vợ/Chồng',
  sibling: 'Anh/Chị/Em',
  paternal_grandfather: 'Ông nội',
  paternal_grandmother: 'Bà nội',
  maternal_grandfather: 'Ông ngoại',
  maternal_grandmother: 'Bà ngoại',
  father_sibling: 'Bác/Chú/Cô (bên nội)',
  mother_sibling: 'Bác/Cậu/Dì (bên ngoại)',
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/constants/__tests__/relationLabels.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the invite screen (no dedicated test — form composition over `useClanMembers`/`inviteMember`, exercised by manual QA in Task 16)**

Create `app/app/(main)/clan/[id]/invite.tsx`:
```tsx
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Text, Menu, HelperText, SegmentedButtons } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClanMembers } from '../../../../src/queries/useClanMembers';
import { inviteMember } from '../../../../src/api/inviteMember';
import { relationLabels } from '../../../../src/constants/relationLabels';
import type { RelationCode } from '../../../../src/api/types';

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

  const anchorName = members?.find((m) => m.id === anchorId)?.full_name ?? 'Chọn người neo';
  const relationLabel = relationCode ? relationLabels[relationCode] : 'Chọn quan hệ';

  async function handleInvite() {
    if (!anchorId || !relationCode) {
      setError('Vui lòng chọn người neo và quan hệ');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await inviteMember({
        clan_id: id,
        anchor_person_id: anchorId,
        relation_code: relationCode,
        invitee_full_name: fullName,
        invitee_gender: gender,
        invitee_phone_or_email: contact,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mời thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Mời thành viên</Text>

      <Menu
        visible={anchorMenuOpen}
        onDismiss={() => setAnchorMenuOpen(false)}
        anchor={<Button mode="outlined" onPress={() => setAnchorMenuOpen(true)}>{anchorName}</Button>}
      >
        {(members ?? []).map((m) => (
          <Menu.Item key={m.id} title={m.full_name} onPress={() => { setAnchorId(m.id); setAnchorMenuOpen(false); }} />
        ))}
      </Menu>

      <Menu
        visible={relationMenuOpen}
        onDismiss={() => setRelationMenuOpen(false)}
        anchor={<Button mode="outlined" onPress={() => setRelationMenuOpen(true)} style={styles.spacedButton}>{relationLabel}</Button>}
      >
        {(Object.keys(relationLabels) as RelationCode[]).map((code) => (
          <Menu.Item key={code} title={relationLabels[code]} onPress={() => { setRelationCode(code); setRelationMenuOpen(false); }} />
        ))}
      </Menu>

      <TextInput label="Họ tên người được mời" value={fullName} onChangeText={setFullName} style={styles.input} />
      <SegmentedButtons
        value={gender}
        onValueChange={(v) => setGender(v as 'male' | 'female' | 'unknown')}
        buttons={[
          { value: 'male', label: 'Nam' },
          { value: 'female', label: 'Nữ' },
          { value: 'unknown', label: 'Khác' },
        ]}
        style={styles.input}
      />
      <TextInput label="Số điện thoại hoặc email" value={contact} onChangeText={setContact} style={styles.input} />
      {error && <HelperText type="error">{error}</HelperText>}
      <Button mode="contained" onPress={handleInvite} loading={submitting} disabled={submitting}>
        Gửi lời mời
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { marginBottom: 20 },
  input: { marginTop: 14 },
  spacedButton: { marginTop: 10 },
});
```

- [ ] **Step 6: Commit**

```bash
git add app/src/constants "app/app/(main)/clan/[id]/invite.tsx"
git commit -m "feat(app): add relation labels and invite-member screen"
```

---

## Task 13: Member detail screen (self-view + admin per-member actions)

**Files:**
- Create: `app/app/(main)/clan/[id]/member/[personId].tsx`
- Test: `app/app/(main)/clan/[id]/member/__tests__/member-detail.test.tsx`

**Interfaces:**
- Consumes: `useClanMembers` (Task 11), `clanAdminSettings` (Task 3), `useAuth` (Task 4).
- Produces: route `clan/[id]/member/[personId]`, linked from the member list in `clan/[id]/index.tsx` (Task 11).

This screen reuses `useClanMembers(id)` and finds the matching row by `personId` rather than adding a new single-person query — the whole member list is already cached from the clan home screen, so this avoids a duplicate round trip.

- [ ] **Step 1: Write the failing test**

Create `app/app/(main)/clan/[id]/member/__tests__/member-detail.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MemberDetailScreen from '../[personId]';
import { useClanMembers } from '../../../../../../src/queries/useClanMembers';
import { useAuth } from '../../../../../../src/lib/AuthContext';
import { clanAdminSettings } from '../../../../../../src/api/clanAdminSettings';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'c1', personId: 'p2' }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('../../../../../../src/queries/useClanMembers');
jest.mock('../../../../../../src/lib/AuthContext');
jest.mock('../../../../../../src/api/clanAdminSettings', () => ({ clanAdminSettings: jest.fn() }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('MemberDetailScreen', () => {
  it('shows an "appoint deputy" action for an admin viewing a plain member', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'admin-user' } } });
    (useClanMembers as jest.Mock).mockReturnValue({
      data: [
        { id: 'p1', full_name: 'Admin', gender: 'male', generation_number: 15, role: 'admin', linked_user_id: 'admin-user' },
        { id: 'p2', full_name: 'Member', gender: 'male', generation_number: 16, role: 'member', linked_user_id: 'member-user' },
      ],
    });
    (clanAdminSettings as jest.Mock).mockResolvedValue({});

    const { getByText } = render(<MemberDetailScreen />, { wrapper });
    fireEvent.press(getByText('Bổ nhiệm phó tộc trưởng'));

    await waitFor(() => {
      expect(clanAdminSettings).toHaveBeenCalledWith({ clan_id: 'c1', action: 'appoint_deputy', person_id: 'p2' });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest "app/\\(main\\)/clan/\\[id\\]/member/__tests__/member-detail.test.tsx"`
Expected: FAIL — `Cannot find module '../[personId]'`.

- [ ] **Step 3: Write the screen**

Create `app/app/(main)/clan/[id]/member/[personId].tsx`:
```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useClanMembers } from '../../../../../src/queries/useClanMembers';
import { useAuth } from '../../../../../src/lib/AuthContext';
import { clanAdminSettings } from '../../../../../src/api/clanAdminSettings';

export default function MemberDetailScreen() {
  const { id, personId } = useLocalSearchParams<{ id: string; personId: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { data: members } = useClanMembers(id);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const person = members?.find((m) => m.id === personId);
  const me = members?.find((m) => m.linked_user_id === session?.user.id);
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

  if (!person) return <Text>Đang tải...</Text>;

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall">{person.full_name}</Text>
      <Text>Đời thứ {person.generation_number}</Text>
      <Text>Vai trò: {person.role ?? 'Chưa có tài khoản'}</Text>

      {isSelf && (
        <Button mode="contained" style={styles.action} onPress={() => router.push(`/(main)/clan/${id}/propose-change`)}>
          Đề xuất sửa quan hệ của tôi
        </Button>
      )}

      {viewerIsAdmin && !isSelf && person.role !== 'admin' && (
        <View style={styles.action}>
          {person.role === 'deputy' ? (
            <Button onPress={() => runAction('remove_deputy')} loading={busy}>Gỡ chức phó tộc trưởng</Button>
          ) : (
            <Button onPress={() => runAction('appoint_deputy')} loading={busy}>Bổ nhiệm phó tộc trưởng</Button>
          )}
          <Button textColor="#c0432f" onPress={() => runAction('remove_member')} loading={busy}>Xóa khỏi gia tộc</Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  action: { marginTop: 20 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest "app/\\(main\\)/clan/\\[id\\]/member/__tests__/member-detail.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/app/(main)/clan/[id]/member"
git commit -m "feat(app): add member detail screen with admin per-member actions"
```

---

## Task 14: Propose-relationship-change screen

**Files:**
- Create: `app/app/(main)/clan/[id]/propose-change.tsx`
- Test: `app/app/(main)/clan/[id]/__tests__/propose-change.test.tsx`

**Interfaces:**
- Consumes: `useClanMembers` (Task 11), `useAuth` (Task 4), `proposeRelationshipChange` (Task 3).
- Produces: route `clan/[id]/propose-change`, linked from `member/[personId].tsx` (Task 13) and `clan/[id]/index.tsx` (Task 11).

- [ ] **Step 1: Write the failing test**

Create `app/app/(main)/clan/[id]/__tests__/propose-change.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProposeChangeScreen from '../propose-change';
import { useClanMembers } from '../../../../../src/queries/useClanMembers';
import { useAuth } from '../../../../../src/lib/AuthContext';
import { proposeRelationshipChange } from '../../../../../src/api/proposeRelationshipChange';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'c1' }),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock('../../../../../src/queries/useClanMembers');
jest.mock('../../../../../src/lib/AuthContext');
jest.mock('../../../../../src/api/proposeRelationshipChange', () => ({ proposeRelationshipChange: jest.fn() }));

describe('ProposeChangeScreen', () => {
  it('submits the selected target and type', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'u1' } } });
    (useClanMembers as jest.Mock).mockReturnValue({
      data: [
        { id: 'p1', full_name: 'Me', linked_user_id: 'u1' },
        { id: 'p2', full_name: 'Bac Ba', linked_user_id: null },
      ],
    });
    (proposeRelationshipChange as jest.Mock).mockResolvedValue({ request_id: 'r1' });

    const { getByText } = render(<ProposeChangeScreen />);
    fireEvent.press(getByText('Chọn người thân'));
    fireEvent.press(getByText('Bac Ba'));
    fireEvent.press(getByText('Gửi đề xuất'));

    await waitFor(() => {
      expect(proposeRelationshipChange).toHaveBeenCalledWith({
        clan_id: 'c1',
        proposed_relationship_type: 'parent_child',
        proposed_relationship_with_person_id: 'p2',
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest "app/\\(main\\)/clan/\\[id\\]/__tests__/propose-change.test.tsx"`
Expected: FAIL — `Cannot find module '../propose-change'`.

- [ ] **Step 3: Write the screen**

Create `app/app/(main)/clan/[id]/propose-change.tsx`:
```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Menu, SegmentedButtons, HelperText } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClanMembers } from '../../../../src/queries/useClanMembers';
import { useAuth } from '../../../../src/lib/AuthContext';
import { proposeRelationshipChange } from '../../../../src/api/proposeRelationshipChange';

export default function ProposeChangeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { data: members } = useClanMembers(id);

  const [type, setType] = useState<'parent_child' | 'spouse'>('parent_child');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const otherMembers = (members ?? []).filter((m) => m.linked_user_id !== session?.user.id);
  const targetName = members?.find((m) => m.id === targetId)?.full_name ?? 'Chọn người thân';

  async function handleSubmit() {
    if (!targetId) {
      setError('Vui lòng chọn người thân');
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gửi đề xuất thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Đề xuất sửa quan hệ</Text>
      <SegmentedButtons
        value={type}
        onValueChange={(v) => setType(v as 'parent_child' | 'spouse')}
        buttons={[
          { value: 'parent_child', label: 'Cha/Mẹ mới' },
          { value: 'spouse', label: 'Vợ/Chồng' },
        ]}
        style={styles.input}
      />
      <Menu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        anchor={<Button mode="outlined" onPress={() => setMenuOpen(true)}>{targetName}</Button>}
      >
        {otherMembers.map((m) => (
          <Menu.Item key={m.id} title={m.full_name} onPress={() => { setTargetId(m.id); setMenuOpen(false); }} />
        ))}
      </Menu>
      {error && <HelperText type="error">{error}</HelperText>}
      <Button mode="contained" style={styles.input} onPress={handleSubmit} loading={submitting} disabled={submitting}>
        Gửi đề xuất
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { marginBottom: 20 },
  input: { marginTop: 14 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest "app/\\(main\\)/clan/\\[id\\]/__tests__/propose-change.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/app/(main)/clan/[id]/propose-change.tsx" "app/app/(main)/clan/[id]/__tests__/propose-change.test.tsx"
git commit -m "feat(app): add propose-relationship-change screen"
```

---

## Task 15: `useClanChangeRequests` hook + requests review screen

**Files:**
- Create: `app/src/queries/useClanChangeRequests.ts`
- Create: `app/app/(main)/clan/[id]/requests.tsx`
- Test: `app/src/queries/__tests__/useClanChangeRequests.test.tsx`

**Interfaces:**
- Consumes: `supabase` (Task 2), `reviewRelationshipChange` (Task 3).
- Produces: `useClanChangeRequests(clanId): UseQueryResult<ChangeRequestRow[]>` where `ChangeRequestRow = { id: string; proposed_relationship_type: string; persons: { full_name: string } }` (the `persons` embed resolves via the `person_id` foreign key — the requester's name).

- [ ] **Step 1: Write the failing test**

Create `app/src/queries/__tests__/useClanChangeRequests.test.tsx`:
```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClanChangeRequests } from '../useClanChangeRequests';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useClanChangeRequests', () => {
  it('fetches pending requests for the clan', async () => {
    const eqStatus = jest.fn().mockResolvedValue({
      data: [{ id: 'r1', proposed_relationship_type: 'parent_child', persons: { full_name: 'Toan' } }],
      error: null,
    });
    const eqClan = jest.fn().mockReturnValue({ eq: eqStatus });
    (supabase.from as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eqClan }) });

    const { result } = renderHook(() => useClanChangeRequests('c1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].persons.full_name).toBe('Toan');
    expect(eqClan).toHaveBeenCalledWith('clan_id', 'c1');
    expect(eqStatus).toHaveBeenCalledWith('status', 'pending');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/queries/__tests__/useClanChangeRequests.test.tsx`
Expected: FAIL — `Cannot find module '../useClanChangeRequests'`.

- [ ] **Step 3: Write the hook**

Create `app/src/queries/useClanChangeRequests.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface ChangeRequestRow {
  id: string;
  proposed_relationship_type: string;
  persons: { full_name: string };
}

export function useClanChangeRequests(clanId: string) {
  return useQuery({
    queryKey: ['clan-requests', clanId],
    queryFn: async (): Promise<ChangeRequestRow[]> => {
      const { data, error } = await supabase
        .from('relationship_change_requests')
        .select('id, proposed_relationship_type, persons!relationship_change_requests_person_id_fkey(full_name)')
        .eq('clan_id', clanId)
        .eq('status', 'pending');
      if (error) throw error;
      return data as unknown as ChangeRequestRow[];
    },
    enabled: !!clanId,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/queries/__tests__/useClanChangeRequests.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the requests review screen (no dedicated test — thin composition, exercised by manual QA in Task 18)**

Create `app/app/(main)/clan/[id]/requests.tsx`:
```tsx
import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useClanChangeRequests } from '../../../../src/queries/useClanChangeRequests';
import { reviewRelationshipChange } from '../../../../src/api/reviewRelationshipChange';

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
      <Text variant="headlineSmall" style={styles.title}>Yêu cầu chờ duyệt</Text>
      {isLoading && <Text>Đang tải...</Text>}
      <FlatList
        data={requests ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title title={item.persons.full_name} subtitle={item.proposed_relationship_type} />
            <Card.Actions>
              <Button onPress={() => review(item.id, 'reject')} loading={processingId === item.id}>Từ chối</Button>
              <Button mode="contained" onPress={() => review(item.id, 'approve')} loading={processingId === item.id}>Duyệt</Button>
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
```

- [ ] **Step 6: Commit**

```bash
git add app/src/queries/useClanChangeRequests.ts app/src/queries/__tests__/useClanChangeRequests.test.tsx "app/app/(main)/clan/[id]/requests.tsx"
git commit -m "feat(app): add useClanChangeRequests hook and requests review screen"
```

---

## Task 16: Clan settings screen

**Files:**
- Create: `app/app/(main)/clan/[id]/settings.tsx`
- Test: `app/app/(main)/clan/[id]/__tests__/settings.test.tsx`

**Interfaces:**
- Consumes: `clanAdminSettings` (Task 3).
- Produces: route `clan/[id]/settings`, linked from `clan/[id]/index.tsx` (Task 11, admin-only button); links onward to `clan/[id]/transfer-admin` (Task 17).

Per-member actions (appoint/remove deputy, remove member) live on the member detail screen (Task 13) — this screen only covers clan-level settings (`update_settings`) to keep responsibilities separated.

- [ ] **Step 1: Write the failing test**

Create `app/app/(main)/clan/[id]/__tests__/settings.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../settings';
import { clanAdminSettings } from '../../../../../src/api/clanAdminSettings';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'c1' }),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('../../../../../src/api/clanAdminSettings', () => ({ clanAdminSettings: jest.fn() }));

describe('SettingsScreen', () => {
  it('submits the new name and invite permission', async () => {
    (clanAdminSettings as jest.Mock).mockResolvedValue({});

    const { getByLabelText, getByText } = render(<SettingsScreen />);
    fireEvent.changeText(getByLabelText('Tên gia tộc'), 'Ho Pham Moi');
    fireEvent.press(getByText('Cho phép mọi người mời'));
    fireEvent.press(getByText('Lưu cài đặt'));

    await waitFor(() => {
      expect(clanAdminSettings).toHaveBeenCalledWith({
        clan_id: 'c1',
        action: 'update_settings',
        name: 'Ho Pham Moi',
        invite_permission: 'all_members',
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest "app/\\(main\\)/clan/\\[id\\]/__tests__/settings.test.tsx"`
Expected: FAIL — `Cannot find module '../settings'`.

- [ ] **Step 3: Write the screen**

Create `app/app/(main)/clan/[id]/settings.tsx`:
```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { clanAdminSettings } from '../../../../src/api/clanAdminSettings';

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState('');
  const [invitePermission, setInvitePermission] = useState<'admin_only' | 'all_members'>('admin_only');
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
      <TextInput label="Tên gia tộc" value={name} onChangeText={setName} style={styles.input} />
      <Text style={styles.label}>Ai được phép mời thành viên?</Text>
      <SegmentedButtons
        value={invitePermission}
        onValueChange={(v) => setInvitePermission(v as 'admin_only' | 'all_members')}
        buttons={[
          { value: 'admin_only', label: 'Chỉ trưởng họ/phó' },
          { value: 'all_members', label: 'Cho phép mọi người mời' },
        ]}
        style={styles.input}
      />
      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving} style={styles.input}>
        Lưu cài đặt
      </Button>
      <Button textColor="#c0432f" onPress={() => router.push(`/(main)/clan/${id}/transfer-admin`)}>
        Nhường quyền trưởng họ
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { marginBottom: 20 },
  label: { marginTop: 8, marginBottom: 4 },
  input: { marginTop: 10 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest "app/\\(main\\)/clan/\\[id\\]/__tests__/settings.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/app/(main)/clan/[id]/settings.tsx" "app/app/(main)/clan/[id]/__tests__/settings.test.tsx"
git commit -m "feat(app): add clan settings screen"
```

---

## Task 17: Transfer-admin screen

**Files:**
- Create: `app/app/(main)/clan/[id]/transfer-admin.tsx`
- Test: `app/app/(main)/clan/[id]/__tests__/transfer-admin.test.tsx`

**Interfaces:**
- Consumes: `useClanMembers` (Task 11), `transferAdmin` (Task 3).
- Produces: route `clan/[id]/transfer-admin`, linked from `clan/[id]/settings.tsx` (Task 16).

- [ ] **Step 1: Write the failing test**

Create `app/app/(main)/clan/[id]/__tests__/transfer-admin.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TransferAdminScreen from '../transfer-admin';
import { useClanMembers } from '../../../../../src/queries/useClanMembers';
import { transferAdmin } from '../../../../../src/api/transferAdmin';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'c1' }),
  useRouter: () => ({ replace: jest.fn() }),
}));
jest.mock('../../../../../src/queries/useClanMembers');
jest.mock('../../../../../src/api/transferAdmin', () => ({ transferAdmin: jest.fn() }));

describe('TransferAdminScreen', () => {
  it('requires selecting a target and entering the password', async () => {
    (useClanMembers as jest.Mock).mockReturnValue({
      data: [{ id: 'p1', full_name: 'Me', role: 'admin' }, { id: 'p2', full_name: 'Toan', role: 'member' }],
    });
    (transferAdmin as jest.Mock).mockResolvedValue({});

    const { getByText, getByLabelText } = render(<TransferAdminScreen />);
    fireEvent.press(getByText('Chọn người kế nhiệm'));
    fireEvent.press(getByText('Toan'));
    fireEvent.changeText(getByLabelText('Nhập lại mật khẩu để xác nhận'), 'password123');
    fireEvent.press(getByText('Xác nhận nhường quyền'));

    await waitFor(() => {
      expect(transferAdmin).toHaveBeenCalledWith({ clan_id: 'c1', new_admin_person_id: 'p2', password: 'password123' });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest "app/\\(main\\)/clan/\\[id\\]/__tests__/transfer-admin.test.tsx"`
Expected: FAIL — `Cannot find module '../transfer-admin'`.

- [ ] **Step 3: Write the screen**

Create `app/app/(main)/clan/[id]/transfer-admin.tsx`:
```tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Menu, TextInput, HelperText } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClanMembers } from '../../../../src/queries/useClanMembers';
import { transferAdmin } from '../../../../src/api/transferAdmin';

export default function TransferAdminScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: members } = useClanMembers(id);

  const [targetId, setTargetId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const candidates = (members ?? []).filter((m) => m.role !== 'admin' && m.role);
  const targetName = members?.find((m) => m.id === targetId)?.full_name ?? 'Chọn người kế nhiệm';

  async function handleConfirm() {
    if (!targetId) {
      setError('Vui lòng chọn người kế nhiệm');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await transferAdmin({ clan_id: id, new_admin_person_id: targetId, password });
      router.replace(`/(main)/clan/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nhường quyền thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>Nhường quyền trưởng họ</Text>
      <Menu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        anchor={<Button mode="outlined" onPress={() => setMenuOpen(true)}>{targetName}</Button>}
      >
        {candidates.map((m) => (
          <Menu.Item key={m.id} title={m.full_name} onPress={() => { setTargetId(m.id); setMenuOpen(false); }} />
        ))}
      </Menu>
      <TextInput
        label="Nhập lại mật khẩu để xác nhận"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      {error && <HelperText type="error">{error}</HelperText>}
      <Button mode="contained" buttonColor="#c0432f" onPress={handleConfirm} loading={submitting} disabled={submitting}>
        Xác nhận nhường quyền
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { marginBottom: 20 },
  input: { marginTop: 14 },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest "app/\\(main\\)/clan/\\[id\\]/__tests__/transfer-admin.test.tsx"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/app/(main)/clan/[id]/transfer-admin.tsx" "app/app/(main)/clan/[id]/__tests__/transfer-admin.test.tsx"
git commit -m "feat(app): add transfer-admin screen with password confirmation"
```

---

## Task 18: Full test suite verification + manual QA walkthrough

**Files:**
- Test: none new — this task runs the full suite from Tasks 1–17 together and performs a manual QA pass.
- Create: `docs/superpowers/specs/stage1-mobile-ui-qa-checklist.md`

**Interfaces:**
- Consumes: every screen and hook from Tasks 1–17.

- [ ] **Step 1: Run the full Jest suite**

From `app/`, run: `npx jest`
Expected: all test files from Tasks 1–17 pass (theme, supabase client, auth context, API wrappers, all query hooks, sign-up/sign-in, create-clan, member-detail, propose-change, settings, transfer-admin — 0 failures).

- [ ] **Step 2: Start the backend for manual QA**

From the repo root (not `app/`):
```bash
supabase status
```
If not running, run `supabase start`, then in a separate terminal `supabase functions serve --env-file supabase/functions/.env.local` (create an empty `.env.local` file first if one doesn't exist).

- [ ] **Step 3: Start the Expo app**

From `app/`, run: `npx expo start`
Launch on an iOS Simulator, Android Emulator, or Expo Go — whichever is available in the current environment.

- [ ] **Step 4: Write and follow the manual QA checklist**

Create `docs/superpowers/specs/stage1-mobile-ui-qa-checklist.md`:
```markdown
# Stage 1 Mobile UI — Manual QA Checklist

Run against the local Supabase stack (`supabase start` + `functions serve`) with two real accounts (Account A = admin, Account B = invitee).

- [ ] Sign up as Account A (email/password) — lands on the clan list, empty state
- [ ] Create a clan as Account A (name, branch type, own generation) — lands on the new clan's home screen, shows Account A as the sole member with role "admin"
- [ ] Sign up as Account B in a second session/device
- [ ] As Account A: invite Account B via "father" relation, using Account B's email as contact — invite succeeds
- [ ] As Account B: see the pending invite in the invites inbox, accept it — Account B now appears in the clan member list at the correct generation (one less than Account A's)
- [ ] As Account B: propose a relationship change (e.g. propose becoming Account A's child instead of parent)
- [ ] As Account A: see the pending request under "Yêu cầu chờ duyệt", approve it — Account B's generation and the relationship direction update correctly in the member list
- [ ] As Account A: open Account B's member detail, appoint Account B as deputy — role badge updates to "deputy"
- [ ] As Account A: open clan settings, change invite_permission to "all_members", save — no errors
- [ ] As Account B (now deputy): invite a third test account — succeeds because invite_permission is now all_members
- [ ] As Account A: open transfer-admin, select Account B, enter Account A's correct password, confirm — Account A becomes "member", Account B becomes "admin"
- [ ] As Account A (now plain member): leave the clan from the clan home screen — Account A no longer appears in the clan list
- [ ] Edit profile (Account B): change occupation/phone/address, save, reload the profile screen — changes persisted
- [ ] Sign out and sign back in as Account B — session persists correctly, lands on the clan list (not forced back to sign-in unexpectedly)
```

Work through every line against a running local stack. If any step fails, fix the responsible screen/hook from Tasks 1–17 and re-run the whole checklist from the top (state from a partially-completed run may not reflect a fresh app install).

- [ ] **Step 5: Commit the checklist**

```bash
git add docs/superpowers/specs/stage1-mobile-ui-qa-checklist.md
git commit -m "docs: add Stage 1 mobile UI manual QA checklist"
```

---

## Plan self-review notes

- **Spec coverage:** monorepo `app/` structure (Task 1), dual theme system (Task 1), all 13 routes from the spec's screen table (Tasks 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 — `leave-clan` wired into Task 11 per the spec's note that it doesn't need its own route), data layer with direct reads + Edge Function writes (Tasks 2, 3, and every query hook), error handling via inline `HelperText`/thrown `ApiError` (every screen task), testing via Jest + `jest-expo` (every task) plus the manual QA walkthrough (Task 18).
- **Deferred per spec:** visual tree rendering, xưng hô calculation, custom roles beyond admin/deputy/member, funds/events (Stage 2+, out of scope). Maestro E2E automation (spec explicitly defers to later). Invite-by-invite_code direct lookup (documented gap in Task 12 — backend has no resolver endpoint for it).
- **Known limitation carried from the spec:** `logo-icon.png`'s decorative ring was lost during background removal — acceptable for development, flagged for a future design pass before a real release build.

