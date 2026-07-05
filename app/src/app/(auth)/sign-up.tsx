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
      setError(e instanceof Error ? e.message : 'Dang ky that bai');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.title}>
        Tao tai khoan
      </Text>
      <TextInput
        label="Ho ten"
        accessibilityLabel="Ho ten"
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
        onPress={handleSignUp}
        loading={submitting}
        disabled={submitting}
        style={styles.button}
      >
        Dang ky
      </Button>
      <Link href="/(auth)/sign-in">Da co tai khoan? Dang nhap</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { marginBottom: 24, textAlign: 'center' },
  input: { marginBottom: 12 },
  button: { marginTop: 8, marginBottom: 16 },
});
