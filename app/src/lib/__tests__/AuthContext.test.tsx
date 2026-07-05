import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';

jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

function Probe() {
  const { session, loading } = useAuth();
  return <Text>{loading ? 'loading' : session ? 'signed-in' : 'signed-out'}</Text>;
}

describe('AuthProvider', () => {
  it('resolves to signed-out when there is no session', async () => {
    const { getByText } = await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => getByText('signed-out'));
  });
});
