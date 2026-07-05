import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
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
      <Text variant="headlineMedium" style={styles.title}>
        Tạo tài khoản
      </Text>
      <TextInput
        label="Họ tên"
        accessibilityLabel="Họ tên"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
      />
      <TextInput
        label="Email"
        accessibilityLabel="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        label="Mật khẩu"
        accessibilityLabel="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      {error && <HelperText type="error">{error}</HelperText>}
      <Button
        mode="contained"
        onPress={handleSignUp}
        loading={submitting}
        disabled={submitting}
        style={styles.button}
      >
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
