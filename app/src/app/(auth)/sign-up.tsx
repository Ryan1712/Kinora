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
