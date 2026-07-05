import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useMyClans } from '../useMyClans';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
jest.mock('../../lib/AuthContext', () => ({
  useAuth: jest.fn(),
}), { virtual: true });

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Probe() {
  const { data, isSuccess } = useMyClans();
  return <Text>{isSuccess ? data?.[0].clans.name : 'loading'}</Text>;
}

describe('useMyClans', () => {
  it('fetches clans for the current user', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    const eqMock = jest.fn().mockResolvedValue({
      data: [{ role: 'admin', clan_id: 'c1', clans: { id: 'c1', name: 'Ho Pham', branch_type: 'noi' } }],
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: eqMock }),
    });

    render(<Probe />, { wrapper });

    await waitFor(() => screen.getByText('Ho Pham'));
    expect(eqMock).toHaveBeenCalledWith('linked_user_id', 'u1');
  });
});
