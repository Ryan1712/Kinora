import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
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
      <Text variant="headlineMedium" style={styles.title}>
        Pha Ky
      </Text>
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
        label="Mat khau"
        accessibilityLabel="Mat khau"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      {error && <HelperText type="error">{error}</HelperText>}
      <Button
        mode="contained"
        onPress={handleSignIn}
        loading={submitting}
        disabled={submitting}
        style={styles.button}
      >
        Dang nhap
      </Button>
      <Link href="/(auth)/sign-up">Chua co tai khoan? Dang ky</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { marginBottom: 24, textAlign: 'center' },
  input: { marginBottom: 12 },
  button: { marginTop: 8, marginBottom: 16 },
});
