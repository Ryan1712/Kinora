import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';

import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { appTheme } from '@/theme/appTheme';

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
  }, [loading, router, segments, session]);

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
