import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { updateMyProfile, useMyProfile } from '../useMyProfile';

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../../lib/AuthContext', () => ({ useAuth: jest.fn() }), { virtual: true });

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Probe() {
  const { data, isSuccess } = useMyProfile();
  return <Text>{isSuccess ? data?.full_name : 'loading'}</Text>;
}

describe('useMyProfile', () => {
  it('fetches the current user row', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    const single = jest.fn().mockResolvedValue({
      data: { id: 'u1', full_name: 'Duy' },
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ single });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ eq }),
    });

    render(<Probe />, { wrapper });

    await waitFor(() => screen.getByText('Duy'));
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
