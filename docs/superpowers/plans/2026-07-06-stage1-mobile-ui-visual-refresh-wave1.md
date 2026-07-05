# Stage 1 Mobile UI Visual Refresh — Wave 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin the app's theme foundation and the 4 highest-visibility screens (sign-in, sign-up, clan list, clan home) with the "Ink Root Dark Premium" visual direction, without changing any logic, navigation, or data flow.

**Architecture:** Extend the existing `theme/brand.ts`/`theme/appTheme.ts` tokens to a dark palette, load the Playfair Display font, then build 7 small reusable presentational components (`EmberBackground`, `AnimatedLogo`, `GlassCard`, `PrimaryButton`, `MemberAvatar`, `RoleBadge`, `GenerationDivider`) using `react-native-reanimated` for motion. Apply them to the 4 target screens by editing in place — every existing screen's props/API calls/query hooks are untouched, only the rendered JSX and styles change, so every screen's existing Plan 1B test continues to assert the same behavior.

**Tech Stack:** React Native Paper (existing), `react-native-reanimated` (already installed), `expo-linear-gradient` (new), `@expo-google-fonts/playfair-display` + `expo-font` + `expo-splash-screen` (font loading), Jest + `jest-expo` + `@testing-library/react-native` (existing).

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-07-06-stage1-mobile-ui-visual-refresh-design.md`.
- This is a presentation-only change. No screen's props, navigation route, API call, or React Query key may change. Every existing test file under `app/src/app/**/__tests__/` must keep passing unmodified unless a test literally cannot pass without a corresponding intentional prop change (none are expected in this plan).
- Color tokens (exact values from spec): background `radial-gradient(ellipse at 50% -10%, #3d2417 0%, #180d08 65%)` (approximate on native with a `LinearGradient` from `#3d2417` to `#180d08`), heading text `#f4dba0`, body text `#f0e4d0`, muted text `#a8926f`/`#b89a72`, glass surface `rgba(255,255,255,0.06)`, glass border `rgba(244,200,105,0.2)`, gold gradient `#f8dfa0 → #a8721f`, notification red `#e05a3f`, danger/warning red `#c0432f`.
- Heading font: Playfair Display 700 (`PlayfairDisplay_700Bold`), loaded via `@expo-google-fonts/playfair-display`. Body/UI text keeps the existing default font — do not apply Playfair Display to body text, labels, or button text (per the spec's "max 4 font sizes, 2 weights" rule).
- Real logo assets already exist at `app/src/assets/logo-icon.png` and `app/src/assets/logo-full.png` — reuse them, do not recreate the logo.
- Peak-End Rule scoping: `EmberBackground` (ambient floating particles) is used ONLY on sign-in and sign-up in this plan. Do not add it to the clan list or clan home screens — those get entrance animation only (rise-in / stagger), no ambient particles, per the spec's explicit scoping to avoid visual clutter on data-dense screens.
- Thumb-zone rule: on every screen touched in this plan, the primary action (`Đăng nhập`, `Đăng ký`, `Tạo gia tộc` FAB) must remain in the bottom third of the screen or as a bottom-anchored FAB — do not move any primary action to the top of a screen. Exception (matches the user-approved `screens-mockup.html` mockup): the clan home screen (Task 13) has several concurrent actions, not one primary action, so they stay as a top action row right below the header — this is a deliberate, approved deviation, not an oversight.

---

## Task 1: Dark Premium theme tokens

**Files:**
- Modify: `app/src/theme/brand.ts`
- Modify: `app/src/theme/appTheme.ts`
- Modify: `app/src/theme/__tests__/appTheme.test.ts`

**Interfaces:**
- Produces: extended `brand` object with `brand.text.{heading,body,muted}`, `brand.glass.{surface,border}`, `brand.notification`, `brand.gold.glow` — consumed by every component task in this plan. `appTheme` becomes a dark `MD3Theme` (`dark: true`).

- [ ] **Step 1: Write the failing test**

Replace the full contents of `app/src/theme/__tests__/appTheme.test.ts`:
```ts
import { appTheme } from '../appTheme';
import { brand } from '../brand';

describe('appTheme', () => {
  it('uses the brand gold as primary and brand red as error', () => {
    expect(appTheme.colors.primary).toBe(brand.gold.mid);
    expect(appTheme.colors.error).toBe(brand.red);
  });

  it('is a dark theme with the Ink Root dark background', () => {
    expect(appTheme.dark).toBe(true);
    expect(appTheme.colors.background).toBe('#180d08');
  });

  it('uses brand text colors for surface text', () => {
    expect(appTheme.colors.onSurface).toBe(brand.text.body);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `app/`): `npx jest src/theme/__tests__/appTheme.test.ts`
Expected: FAIL — `appTheme.dark` is currently `false`, and `brand.text` is `undefined`.

- [ ] **Step 3: Extend brand.ts**

Replace the full contents of `app/src/theme/brand.ts`:
```ts
export const brand = {
  backgroundGradient: ['#3d2417', '#180d08'] as const,
  gold: {
    light: '#f8dfa0',
    mid: '#e0ab4a',
    dark: '#a8721f',
    glow: '#f4dba0',
  },
  red: '#c0432f',
  notification: '#e05a3f',
  text: {
    heading: '#f4dba0',
    body: '#f0e4d0',
    muted: '#a8926f',
  },
  glass: {
    surface: 'rgba(255,255,255,0.06)',
    border: 'rgba(244,200,105,0.2)',
  },
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

- [ ] **Step 4: Update appTheme.ts to a dark theme**

Replace the full contents of `app/src/theme/appTheme.ts`:
```ts
import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';
import { brand } from './brand';

export const appTheme: MD3Theme = {
  ...MD3DarkTheme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    primary: brand.gold.mid,
    onPrimary: '#2b1a12',
    secondary: brand.gold.dark,
    error: brand.red,
    background: '#180d08',
    surface: '#2b1a12',
    onSurface: brand.text.body,
    onBackground: brand.text.body,
    outline: brand.glass.border,
  },
  roundness: 14,
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/theme/__tests__/appTheme.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add app/src/theme
git commit -m "feat(app): switch to Ink Root Dark Premium theme tokens"
```

---

## Task 2: Load Playfair Display font

**Files:**
- Modify: `app/package.json` (new dependency, via CLI)
- Modify: `app/src/app/_layout.tsx`

**Interfaces:**
- Consumes: `appTheme` (Task 1).
- Produces: the `PlayfairDisplay_700Bold` font family is loaded and ready before any screen renders — every later task's use of `fontFamily: brand.fonts.heading` (or `'PlayfairDisplay_700Bold'` directly) relies on this.

- [ ] **Step 1: Install the font package**

Run (from `app/`):
```bash
npx expo install @expo-google-fonts/playfair-display expo-splash-screen
```
Expected: `@expo-google-fonts/playfair-display` added to `app/package.json` dependencies (`expo-splash-screen` is likely already present — the install command is a no-op for it if so).

- [ ] **Step 2: Update the root layout to load the font before rendering**

Read the current `app/src/app/_layout.tsx` first (it contains `AuthGuard` and `RootLayout` — do not change `AuthGuard`'s logic, only wrap `RootLayout`'s render with font-loading).

Replace the full contents of `app/src/app/_layout.tsx`:
```tsx
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { appTheme } from '@/theme/appTheme';

const queryClient = new QueryClient();

SplashScreen.preventAutoHideAsync().catch(() => {
  // no-op: safe to ignore if the native splash module isn't available (e.g. web)
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inMainGroup = segments[0] === '(main)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && !inMainGroup) {
      router.replace('/(main)');
    }
  }, [loading, router, segments, session]);

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_700Bold });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

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

- [ ] **Step 3: Verify TypeScript and the existing test suite still pass**

Run (from `app/`): `npx tsc --noEmit`
Expected: no output (clean).

Run: `npx jest`
Expected: all existing suites still pass (font loading only affects the root layout, which has no dedicated test in this codebase — `useFonts` resolves synchronously to `true` under `jest-expo`'s default mocks, so no test changes are needed).

- [ ] **Step 4: Commit**

```bash
git add app/package.json app/package-lock.json app/src/app/_layout.tsx
git commit -m "feat(app): load Playfair Display font before first render"
```

---

## Task 3: Reanimated Jest setup + EmberBackground component

**Files:**
- Modify: `app/jest.setup.js`
- Create: `app/src/components/EmberBackground.tsx`
- Test: `app/src/components/__tests__/EmberBackground.test.tsx`

**Interfaces:**
- Consumes: nothing (leaf component).
- Produces: `EmberBackground` — a `View`-like component with no props, rendered as an absolutely-positioned decorative layer behind screen content. Later tasks (10, 11) render it as the first child of the sign-in/sign-up screen containers.
- Produces: the Jest mock for `react-native-reanimated` in `jest.setup.js`, which every subsequent component task (4, 6) relies on to render Reanimated-based components under Jest without native-module errors.

- [ ] **Step 1: Add the Reanimated Jest mock**

Add this line to `app/jest.setup.js` (append to the end of the file):
```js
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
```

- [ ] **Step 2: Write the failing test**

Create `app/src/components/__tests__/EmberBackground.test.tsx`:
```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { EmberBackground } from '../EmberBackground';

describe('EmberBackground', () => {
  it('renders a fixed number of ember particles', () => {
    const { getAllByTestId } = render(<EmberBackground />);
    expect(getAllByTestId('ember-particle')).toHaveLength(10);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run (from `app/`): `npx jest src/components/__tests__/EmberBackground.test.tsx`
Expected: FAIL — cannot find module `../EmberBackground`.

- [ ] **Step 4: Implement EmberBackground**

Create `app/src/components/EmberBackground.tsx`:
```tsx
import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const PARTICLE_COUNT = 10;

function EmberParticle({ index, width, height }: { index: number; width: number; height: number }) {
  const progress = useSharedValue(0);
  const left = ((index * 37) % 100) / 100;
  const size = 3 + (index % 3);
  const startX = width * left;
  const driftX = (index % 2 === 0 ? 1 : -1) * (12 + (index % 4) * 6);

  useEffect(() => {
    progress.value = withDelay(
      (index % PARTICLE_COUNT) * 350,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 4200, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.5 ? progress.value * 2 : (1 - progress.value) * 2,
    transform: [
      { translateY: height * 0.85 - progress.value * height * 0.7 },
      { translateX: progress.value * driftX },
    ],
  }));

  return (
    <Animated.View
      testID="ember-particle"
      style={[
        styles.particle,
        { left: startX, width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

export function EmberBackground() {
  const { width, height } = useWindowDimensions();

  return (
    <Animated.View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }, (_, index) => (
        <EmberParticle key={index} index={index} width={width} height={height} />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  particle: {
    backgroundColor: 'rgba(244,200,105,0.55)',
    position: 'absolute',
  },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/components/__tests__/EmberBackground.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/jest.setup.js app/src/components/EmberBackground.tsx app/src/components/__tests__/EmberBackground.test.tsx
git commit -m "feat(app): add Reanimated jest mock and EmberBackground component"
```

---

## Task 4: AnimatedLogo component

**Files:**
- Create: `app/src/components/AnimatedLogo.tsx`
- Test: `app/src/components/__tests__/AnimatedLogo.test.tsx`

**Interfaces:**
- Consumes: `app/src/assets/logo-icon.png` (existing asset, confirmed present).
- Produces: `AnimatedLogo({ size?: number })` — renders the logo icon image with a bounce-in + glow-pulse entrance. Used in Tasks 10 and 11.

- [ ] **Step 1: Write the failing test**

Create `app/src/components/__tests__/AnimatedLogo.test.tsx`:
```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { AnimatedLogo } from '../AnimatedLogo';

describe('AnimatedLogo', () => {
  it('renders the logo image', () => {
    const { getByTestId } = render(<AnimatedLogo />);
    expect(getByTestId('animated-logo-image')).toBeTruthy();
  });

  it('applies the requested size', () => {
    const { getByTestId } = render(<AnimatedLogo size={96} />);
    const image = getByTestId('animated-logo-image');
    const flatStyle = Array.isArray(image.props.style)
      ? Object.assign({}, ...image.props.style)
      : image.props.style;
    expect(flatStyle.width).toBe(96);
    expect(flatStyle.height).toBe(96);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/AnimatedLogo.test.tsx`
Expected: FAIL — cannot find module `../AnimatedLogo`.

- [ ] **Step 3: Implement AnimatedLogo**

Create `app/src/components/AnimatedLogo.tsx`:
```tsx
import React, { useEffect } from 'react';
import { Image, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedLogoProps {
  size?: number;
}

export function AnimatedLogo({ size = 72 }: AnimatedLogoProps) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const glow = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.6)) });
    opacity.value = withTiming(1, { duration: 500 });
    glow.value = withDelay(
      700,
      withRepeat(withSequence(withTiming(0.7, { duration: 1900 }), withTiming(0.35, { duration: 1900 })), -1, true)
    );
  }, [glow, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value,
  }));

  return (
    <Animated.View style={[styles.glow, animatedStyle]}>
      <Image
        testID="animated-logo-image"
        source={require('../assets/logo-icon.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  glow: {
    alignSelf: 'center',
    shadowColor: '#f4dba0',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/__tests__/AnimatedLogo.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/AnimatedLogo.tsx app/src/components/__tests__/AnimatedLogo.test.tsx
git commit -m "feat(app): add AnimatedLogo component"
```

---

## Task 5: GlassCard component

**Files:**
- Create: `app/src/components/GlassCard.tsx`
- Test: `app/src/components/__tests__/GlassCard.test.tsx`

**Interfaces:**
- Consumes: `brand.glass` (Task 1).
- Produces: `GlassCard(props: ViewProps)` — a `View` wrapper with the glassmorphism surface/border style merged with any caller-provided `style`. Used in Tasks 12 and 13.

- [ ] **Step 1: Write the failing test**

Create `app/src/components/__tests__/GlassCard.test.tsx`:
```tsx
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { GlassCard } from '../GlassCard';
import { brand } from '@/theme/brand';

describe('GlassCard', () => {
  it('renders its children', () => {
    const { getByText } = render(
      <GlassCard>
        <Text>Nội dung</Text>
      </GlassCard>
    );
    expect(getByText('Nội dung')).toBeTruthy();
  });

  it('applies the glass surface and border colors', () => {
    const { getByTestId } = render(<GlassCard testID="card" />);
    const flatStyle = Object.assign({}, ...getByTestId('card').props.style);
    expect(flatStyle.backgroundColor).toBe(brand.glass.surface);
    expect(flatStyle.borderColor).toBe(brand.glass.border);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/GlassCard.test.tsx`
Expected: FAIL — cannot find module `../GlassCard`.

- [ ] **Step 3: Implement GlassCard**

Create `app/src/components/GlassCard.tsx`:
```tsx
import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { brand } from '@/theme/brand';

export function GlassCard({ style, children, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.glass.surface,
    borderColor: brand.glass.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/__tests__/GlassCard.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/GlassCard.tsx app/src/components/__tests__/GlassCard.test.tsx
git commit -m "feat(app): add GlassCard component"
```

---

## Task 6: PrimaryButton component

**Files:**
- Create: `app/src/components/PrimaryButton.tsx`
- Test: `app/src/components/__tests__/PrimaryButton.test.tsx`

**Interfaces:**
- Consumes: `brand.gold` (Task 1), `expo-linear-gradient` (new dependency installed in this task).
- Produces: `PrimaryButton(props: Omit<ButtonProps, 'mode' | 'buttonColor'>)` — forwards every prop to React Native Paper's `Button` (so `onPress`, `loading`, `disabled`, `children` behave identically to a plain `<Button mode="contained">`), rendered over a gold gradient background with a looping shine sweep. Used in Tasks 10, 11, 12, 13 to replace every primary `<Button mode="contained">`.

- [ ] **Step 1: Install expo-linear-gradient**

Run (from `app/`):
```bash
npx expo install expo-linear-gradient
```
Expected: `expo-linear-gradient` added to `app/package.json` dependencies.

- [ ] **Step 2: Write the failing test**

Create `app/src/components/__tests__/PrimaryButton.test.tsx`:
```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { PrimaryButton } from '../PrimaryButton';

function renderWithPaper(ui: React.ReactElement) {
  return render(<PaperProvider>{ui}</PaperProvider>);
}

describe('PrimaryButton', () => {
  it('renders the label and calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = renderWithPaper(<PrimaryButton onPress={onPress}>Đăng nhập</PrimaryButton>);
    fireEvent.press(getByText('Đăng nhập'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = renderWithPaper(
      <PrimaryButton onPress={onPress} disabled>
        Đăng nhập
      </PrimaryButton>
    );
    fireEvent.press(getByText('Đăng nhập'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest src/components/__tests__/PrimaryButton.test.tsx`
Expected: FAIL — cannot find module `../PrimaryButton`.

- [ ] **Step 4: Implement PrimaryButton**

Create `app/src/components/PrimaryButton.tsx`:
```tsx
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Button, ButtonProps } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { brand } from '@/theme/brand';

type PrimaryButtonProps = Omit<ButtonProps, 'mode' | 'buttonColor'> & { style?: ViewStyle };

export function PrimaryButton({ style, children, ...rest }: PrimaryButtonProps) {
  const shine = useSharedValue(-1);

  useEffect(() => {
    shine.value = withDelay(
      1500,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, false)
    );
  }, [shine]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shine.value * 220 }, { rotate: '20deg' }],
  }));

  return (
    <View style={[styles.wrapper, style]}>
      <LinearGradient
        colors={[brand.gold.light, brand.gold.dark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Button mode="contained" buttonColor="transparent" textColor="#2b1a12" {...rest}>
        {children}
      </Button>
      <Animated.View style={[styles.shine, shineStyle]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  shine: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    bottom: -20,
    left: -60,
    position: 'absolute',
    top: -20,
    width: 40,
  },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest src/components/__tests__/PrimaryButton.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/package-lock.json app/src/components/PrimaryButton.tsx app/src/components/__tests__/PrimaryButton.test.tsx
git commit -m "feat(app): add PrimaryButton component with gold gradient and shine sweep"
```

---

## Task 7: MemberAvatar component

**Files:**
- Create: `app/src/components/MemberAvatar.tsx`
- Test: `app/src/components/__tests__/MemberAvatar.test.tsx`

**Interfaces:**
- Consumes: `expo-linear-gradient` (installed in Task 6).
- Produces: `MemberAvatar({ fullName: string; gender?: string | null; size?: number })` — a circular gradient avatar showing the person's initials (first letter of first word + first letter of last word). Used in Task 13.

- [ ] **Step 1: Write the failing test**

Create `app/src/components/__tests__/MemberAvatar.test.tsx`:
```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { MemberAvatar } from '../MemberAvatar';

describe('MemberAvatar', () => {
  it('shows the initials of the first and last name', () => {
    const { getByText } = render(<MemberAvatar fullName="Phạm Văn Duy" />);
    expect(getByText('PD')).toBeTruthy();
  });

  it('falls back to a single initial for a one-word name', () => {
    const { getByText } = render(<MemberAvatar fullName="Duy" />);
    expect(getByText('D')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/MemberAvatar.test.tsx`
Expected: FAIL — cannot find module `../MemberAvatar`.

- [ ] **Step 3: Implement MemberAvatar**

Create `app/src/components/MemberAvatar.tsx`:
```tsx
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MemberAvatarProps {
  fullName: string;
  gender?: string | null;
  size?: number;
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

const GOLD_GRADIENT = ['#e8bd6e', '#a8721f'] as const;
const GREEN_GRADIENT = ['#8fae9c', '#3d6b57'] as const;

export function MemberAvatar({ fullName, gender, size = 40 }: MemberAvatarProps) {
  const colors = gender === 'female' ? GREEN_GRADIENT : GOLD_GRADIENT;

  return (
    <LinearGradient
      colors={colors}
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initialsOf(fullName)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#2b1a12',
    fontWeight: '700',
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/__tests__/MemberAvatar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/MemberAvatar.tsx app/src/components/__tests__/MemberAvatar.test.tsx
git commit -m "feat(app): add MemberAvatar component"
```

---

## Task 8: RoleBadge component

**Files:**
- Create: `app/src/components/RoleBadge.tsx`
- Test: `app/src/components/__tests__/RoleBadge.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `RoleBadge({ role: string | null })` — renders a small pill label ("TRƯỞNG HỌ" / "PHÓ TỘC TRƯỞNG" / "THÀNH VIÊN") colored by role, or `null` when `role` is falsy. Used in Task 13.

- [ ] **Step 1: Write the failing test**

Create `app/src/components/__tests__/RoleBadge.test.tsx`:
```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { RoleBadge } from '../RoleBadge';

describe('RoleBadge', () => {
  it('renders the Vietnamese label for admin', () => {
    const { getByText } = render(<RoleBadge role="admin" />);
    expect(getByText('TRƯỞNG HỌ')).toBeTruthy();
  });

  it('renders the Vietnamese label for deputy', () => {
    const { getByText } = render(<RoleBadge role="deputy" />);
    expect(getByText('PHÓ TỘC TRƯỞNG')).toBeTruthy();
  });

  it('renders the Vietnamese label for member', () => {
    const { getByText } = render(<RoleBadge role="member" />);
    expect(getByText('THÀNH VIÊN')).toBeTruthy();
  });

  it('renders nothing when role is null', () => {
    const { toJSON } = render(<RoleBadge role={null} />);
    expect(toJSON()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/RoleBadge.test.tsx`
Expected: FAIL — cannot find module `../RoleBadge`.

- [ ] **Step 3: Implement RoleBadge**

Create `app/src/components/RoleBadge.tsx`:
```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface RoleBadgeProps {
  role: string | null;
}

const LABELS: Record<string, string> = {
  admin: 'TRƯỞNG HỌ',
  deputy: 'PHÓ TỘC TRƯỞNG',
  member: 'THÀNH VIÊN',
};

const COLORS: Record<string, { background: string; text: string }> = {
  admin: { background: 'rgba(244,200,105,0.18)', text: '#f4dba0' },
  deputy: { background: 'rgba(143,174,156,0.2)', text: '#8fae9c' },
  member: { background: 'rgba(255,255,255,0.08)', text: '#c9bba3' },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  if (!role) return null;

  const label = LABELS[role] ?? role.toUpperCase();
  const colors = COLORS[role] ?? COLORS.member;

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/__tests__/RoleBadge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/RoleBadge.tsx app/src/components/__tests__/RoleBadge.test.tsx
git commit -m "feat(app): add RoleBadge component"
```

---

## Task 9: GenerationDivider component

**Files:**
- Create: `app/src/components/GenerationDivider.tsx`
- Test: `app/src/components/__tests__/GenerationDivider.test.tsx`

**Interfaces:**
- Consumes: `brand.gold` (Task 1).
- Produces: `GenerationDivider({ generation: number })` — renders "ĐỜI n" as a small section-heading label. Used in Task 13.

- [ ] **Step 1: Write the failing test**

Create `app/src/components/__tests__/GenerationDivider.test.tsx`:
```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { GenerationDivider } from '../GenerationDivider';

describe('GenerationDivider', () => {
  it('renders the generation label in Vietnamese', () => {
    const { getByText } = render(<GenerationDivider generation={15} />);
    expect(getByText('ĐỜI 15')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/__tests__/GenerationDivider.test.tsx`
Expected: FAIL — cannot find module `../GenerationDivider`.

- [ ] **Step 3: Implement GenerationDivider**

Create `app/src/components/GenerationDivider.tsx`:
```tsx
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { brand } from '@/theme/brand';

interface GenerationDividerProps {
  generation: number;
}

export function GenerationDivider({ generation }: GenerationDividerProps) {
  return <Text style={styles.label}>ĐỜI {generation}</Text>;
}

const styles = StyleSheet.create({
  label: {
    color: brand.gold.dark,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 14,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/__tests__/GenerationDivider.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/GenerationDivider.tsx app/src/components/__tests__/GenerationDivider.test.tsx
git commit -m "feat(app): add GenerationDivider component"
```

---

## Task 10: Apply visual refresh to sign-in.tsx

**Files:**
- Modify: `app/src/app/(auth)/sign-in.tsx`

**Interfaces:**
- Consumes: `brand` (Task 1), `EmberBackground` (Task 3), `AnimatedLogo` (Task 4), `PrimaryButton` (Task 6).
- Produces: no change to the screen's exported shape — `SignInScreen` still calls `supabase.auth.signInWithPassword({ email, password })` on submit with the same field labels, so `app/src/app/(auth)/__tests__/sign-in.test.tsx` continues to pass unmodified.

- [ ] **Step 1: Confirm the existing test still describes the required behavior**

Read `app/src/app/(auth)/__tests__/sign-in.test.tsx` (no changes needed — it uses `getByLabelText('Email')`, `getByLabelText('Mật khẩu')`, and `getByText('Đăng nhập')`, all of which remain valid after this task).

- [ ] **Step 2: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(auth)/sign-in.tsx`:
```tsx
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { HelperText, Text, TextInput } from 'react-native-paper';

import { AnimatedLogo } from '@/components/AnimatedLogo';
import { EmberBackground } from '@/components/EmberBackground';
import { PrimaryButton } from '@/components/PrimaryButton';
import { brand } from '@/theme/brand';
import { supabase } from '../../lib/supabase';

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
      <LinearGradient colors={brand.backgroundGradient} style={StyleSheet.absoluteFill} />
      <EmberBackground />
      <View style={styles.body}>
        <AnimatedLogo />
        <Text variant="headlineMedium" style={styles.title}>
          Phả Ký
        </Text>
        <TextInput
          label="Email"
          accessibilityLabel="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          mode="outlined"
          textColor={brand.text.body}
          outlineColor={brand.glass.border}
          activeOutlineColor={brand.gold.mid}
          theme={{ colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } }}
          style={styles.input}
        />
        <TextInput
          label="Mật khẩu"
          accessibilityLabel="Mật khẩu"
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
        {error && <HelperText type="error">{error}</HelperText>}
        <PrimaryButton onPress={handleSignIn} loading={submitting} disabled={submitting} style={styles.button}>
          Đăng nhập
        </PrimaryButton>
        <Link href="/(auth)/sign-up">
          <Text style={styles.link}>Chưa có tài khoản? Đăng ký</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', padding: 24 },
  title: {
    color: brand.text.heading,
    fontFamily: brand.fonts.heading,
    marginBottom: 28,
    textAlign: 'center',
    textShadowColor: 'rgba(244,200,105,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  input: { backgroundColor: 'transparent', marginBottom: 12 },
  button: { marginBottom: 16, marginTop: 8 },
  link: { color: brand.gold.mid, fontWeight: '600', textAlign: 'center' },
});
```

- [ ] **Step 3: Run the existing test to verify it still passes**

Run (from `app/`): `npx jest src/app/\(auth\)/__tests__/sign-in.test.tsx`
Expected: PASS (2 tests, unmodified).

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add app/src/app/\(auth\)/sign-in.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to sign-in"
```

---

## Task 11: Apply visual refresh to sign-up.tsx

**Files:**
- Modify: `app/src/app/(auth)/sign-up.tsx`

**Interfaces:**
- Consumes: `brand` (Task 1), `EmberBackground` (Task 3), `AnimatedLogo` (Task 4), `PrimaryButton` (Task 6).
- Produces: no change to the screen's exported shape — `SignUpScreen` still calls `supabase.auth.signUp({ email, password })` then `supabase.from('users').insert(...)` with the same field labels, so `app/src/app/(auth)/__tests__/sign-up.test.tsx` continues to pass unmodified.

- [ ] **Step 1: Confirm the existing test still describes the required behavior**

Read `app/src/app/(auth)/__tests__/sign-up.test.tsx` (no changes needed — it uses `getByLabelText('Họ tên')`, `getByLabelText('Email')`, `getByLabelText('Mật khẩu')`, and `getByText('Đăng ký')`, all of which remain valid after this task).

- [ ] **Step 2: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(auth)/sign-up.tsx`:
```tsx
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { HelperText, Text, TextInput } from 'react-native-paper';

import { AnimatedLogo } from '@/components/AnimatedLogo';
import { EmberBackground } from '@/components/EmberBackground';
import { PrimaryButton } from '@/components/PrimaryButton';
import { brand } from '@/theme/brand';
import { supabase } from '../../lib/supabase';

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
        const { error: insertError } = await supabase
          .from('users')
          .insert({ id: userId, full_name: fullName });
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
      <LinearGradient colors={brand.backgroundGradient} style={StyleSheet.absoluteFill} />
      <EmberBackground />
      <View style={styles.body}>
        <AnimatedLogo size={56} />
        <Text variant="headlineMedium" style={styles.title}>
          Tạo tài khoản
        </Text>
        <TextInput
          label="Họ tên"
          accessibilityLabel="Họ tên"
          value={fullName}
          onChangeText={setFullName}
          mode="outlined"
          textColor={brand.text.body}
          outlineColor={brand.glass.border}
          activeOutlineColor={brand.gold.mid}
          theme={{ colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } }}
          style={styles.input}
        />
        <TextInput
          label="Email"
          accessibilityLabel="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          mode="outlined"
          textColor={brand.text.body}
          outlineColor={brand.glass.border}
          activeOutlineColor={brand.gold.mid}
          theme={{ colors: { onSurfaceVariant: brand.text.muted, background: 'transparent' } }}
          style={styles.input}
        />
        <TextInput
          label="Mật khẩu"
          accessibilityLabel="Mật khẩu"
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
        {error && <HelperText type="error">{error}</HelperText>}
        <PrimaryButton onPress={handleSignUp} loading={submitting} disabled={submitting} style={styles.button}>
          Đăng ký
        </PrimaryButton>
        <Link href="/(auth)/sign-in">
          <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', padding: 24 },
  title: {
    color: brand.text.heading,
    fontFamily: brand.fonts.heading,
    marginBottom: 24,
    textAlign: 'center',
    textShadowColor: 'rgba(244,200,105,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  input: { backgroundColor: 'transparent', marginBottom: 12 },
  button: { marginBottom: 16, marginTop: 8 },
  link: { color: brand.gold.mid, fontWeight: '600', textAlign: 'center' },
});
```

- [ ] **Step 3: Run the existing test to verify it still passes**

Run (from `app/`): `npx jest src/app/\(auth\)/__tests__/sign-up.test.tsx`
Expected: PASS (1 test, unmodified).

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add app/src/app/\(auth\)/sign-up.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to sign-up"
```

---

## Task 12: Apply visual refresh to clan list screen

**Files:**
- Modify: `app/src/app/(main)/index.tsx`

**Interfaces:**
- Consumes: `brand` (Task 1), `GlassCard` (Task 5), `PrimaryButton` (Task 6).
- Produces: no change to `useMyClans()` usage or navigation targets (`/(main)/invites`, `/(main)/clan/${id}`, `/(main)/create-clan`) — only the rendered JSX/styles change.

- [ ] **Step 1: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(main)/index.tsx`:
```tsx
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
```

- [ ] **Step 2: Run TypeScript check**

Run (from `app/`): `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 3: Run the full test suite to confirm no regression**

Run: `npx jest`
Expected: all suites pass (this screen has no dedicated test file; `create-clan.test.tsx` tests the create-clan screen itself, not this one, and is unaffected).

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/index.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to clan list"
```

---

## Task 13: Apply visual refresh to clan home screen

**Files:**
- Modify: `app/src/app/(main)/clan/[id]/index.tsx`

**Interfaces:**
- Consumes: `brand` (Task 1), `PrimaryButton` (Task 6), `MemberAvatar` (Task 7), `RoleBadge` (Task 8), `GenerationDivider` (Task 9).
- Produces: no change to `useClanMembers`, `leaveClan`, or navigation targets — only the rendered JSX/styles change. The generation-divider grouping logic (insert a divider whenever `generation_number` changes from the previous row) is new presentational logic local to this screen, not exposed to other files.

- [ ] **Step 1: Replace the screen with the Dark Premium visual treatment**

Replace the full contents of `app/src/app/(main)/clan/[id]/index.tsx`:
```tsx
import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { leaveClan } from '@/api/leaveClan';
import { GenerationDivider } from '@/components/GenerationDivider';
import { MemberAvatar } from '@/components/MemberAvatar';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RoleBadge } from '@/components/RoleBadge';
import { useAuth } from '@/lib/AuthContext';
import { MemberRow, useClanMembers } from '@/queries/useClanMembers';
import { brand } from '@/theme/brand';

export default function ClanHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { data: members, isLoading, isError } = useClanMembers(id);
  const [leaving, setLeaving] = useState(false);

  const me = members?.find((member) => member.linked_user_id === session?.user.id);
  const isAdmin = me?.role === 'admin';
  const isAdminOrDeputy = me?.role === 'admin' || me?.role === 'deputy';

  async function handleLeave() {
    setLeaving(true);
    try {
      await leaveClan({ clan_id: id });
      queryClient.invalidateQueries({ queryKey: ['my-clans'] });
      queryClient.invalidateQueries({ queryKey: ['clan-members', id] });
      router.replace('/(main)');
    } finally {
      setLeaving(false);
    }
  }

  function shouldShowDivider(item: MemberRow, index: number): boolean {
    if (index === 0) return true;
    return members![index - 1].generation_number !== item.generation_number;
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineSmall" style={styles.title}>
        Thành viên gia tộc
      </Text>

      <View style={styles.actions}>
        <PrimaryButton onPress={() => router.push(`/(main)/clan/${id}/invite`)} style={styles.primaryChip}>
          Mời thành viên
        </PrimaryButton>
        {me && (
          <Button
            textColor={brand.text.body}
            onPress={() => router.push(`/(main)/clan/${id}/propose-change`)}
          >
            Đề xuất sửa quan hệ
          </Button>
        )}
        {isAdminOrDeputy && (
          <Button textColor={brand.text.body} onPress={() => router.push(`/(main)/clan/${id}/requests`)}>
            Yêu cầu chờ duyệt
          </Button>
        )}
        {isAdmin && (
          <Button textColor={brand.text.body} onPress={() => router.push(`/(main)/clan/${id}/settings`)}>
            Cài đặt
          </Button>
        )}
        {me && !isAdmin && (
          <Button textColor={brand.red} onPress={handleLeave} loading={leaving} disabled={leaving}>
            Rời gia tộc
          </Button>
        )}
      </View>

      {isLoading && <Text style={styles.muted}>Đang tải...</Text>}
      {isError && <Text style={styles.muted}>Không tải được danh sách thành viên.</Text>}
      {!isLoading && !members?.length && <Text style={styles.muted}>Chưa có thành viên nào.</Text>}

      <FlatList
        data={members ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View>
            {shouldShowDivider(item, index) && <GenerationDivider generation={item.generation_number} />}
            <View style={styles.memberRow} onTouchEnd={() => router.push(`/(main)/clan/${id}/member/${item.id}`)}>
              <MemberAvatar fullName={item.full_name} gender={item.gender} />
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.full_name}</Text>
                <Text style={styles.memberMeta}>Đời {item.generation_number}</Text>
              </View>
              <RoleBadge role={item.role} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#180d08', flex: 1, padding: 16 },
  title: { color: brand.text.heading, fontFamily: brand.fonts.heading, marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  primaryChip: { minWidth: 160 },
  muted: { color: brand.text.muted },
  memberRow: {
    alignItems: 'center',
    backgroundColor: brand.glass.surface,
    borderColor: brand.glass.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
    padding: 12,
  },
  memberInfo: { flex: 1 },
  memberName: { color: brand.text.body, fontSize: 14, fontWeight: '600' },
  memberMeta: { color: brand.text.muted, fontSize: 11, marginTop: 2 },
});
```

- [ ] **Step 2: Run TypeScript check**

Run (from `app/`): `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 3: Run the full test suite to confirm no regression**

Run: `npx jest`
Expected: all suites pass (this screen has no dedicated test file today).

- [ ] **Step 4: Commit**

```bash
git add app/src/app/\(main\)/clan/\[id\]/index.tsx
git commit -m "feat(app): apply Ink Root Dark Premium visual treatment to clan home"
```

---

## Task 14: Full verification

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Full TypeScript check**

Run (from `app/`): `npx tsc --noEmit`
Expected: no output (clean).

- [ ] **Step 2: Full Jest suite**

Run: `npx jest`
Expected: every suite passes, including the pre-existing `appTheme.test.ts` (now asserting `dark: true`), the 7 new component test files from Tasks 3–9, and the untouched `sign-in.test.tsx`/`sign-up.test.tsx`/`create-clan.test.tsx`.

- [ ] **Step 3: Start the backend and the Expo web dev server**

Run (from the repo root, requires Docker Desktop running): `npx supabase start`
Run (from `app/`, in a separate terminal/background process): `npx expo start --web`

- [ ] **Step 4: Visually confirm the dark theme renders with no console errors**

Using Playwright (chromium, headless or headed — reuse the same script pattern from the Plan 1B verification pass): navigate to the sign-in screen, confirm:
- The background is the dark brown/black gradient (not the old light `#faf3e8`).
- The real logo (`logo-icon.png`) is visible, not a placeholder.
- The "Phả Ký" title renders in the serif Playfair Display font.
- No red error overlay and zero `console.error` entries in the captured browser console log.

Then sign in with a real Stage-1 test account (created via the same manual Supabase seeding used in the original Plan 1B verification), navigate to the clan list and a clan home screen, and confirm:
- Clan cards render as glass cards on the dark background, not the old white Paper `Card`.
- Member rows show colored initials avatars, generation dividers, and role badges.
- Zero `console.error` entries in the captured browser console log.

- [ ] **Step 5: Report results to the user**

Summarize: tsc status, jest pass count, and the Playwright visual confirmation (with a screenshot if the tool used supports capturing one), so the user — who has no mobile dev background — gets the same `localhost` URL + plain-language confirmation pattern established during the Plan 1B verification pass.