import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { useMyInvites } from '../useMyInvites';

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('../../lib/AuthContext', () => ({ useAuth: jest.fn() }), { virtual: true });

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Probe() {
  const { data, isSuccess } = useMyInvites();
  return <Text>{isSuccess ? data?.[0].invitee_full_name : 'loading'}</Text>;
}

describe('useMyInvites', () => {
  it('fetches pending invites for the current user', async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    const eqStatus = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'i1',
          clan_id: 'c1',
          invitee_full_name: 'Toan',
          proposed_relationship_type: 'parent_child',
          clans: { name: 'Ho Pham' },
        },
      ],
      error: null,
    });
    const eqUser = jest.fn().mockReturnValue({ eq: eqStatus });
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({ eq: eqUser }),
    });

    render(<Probe />, { wrapper });

    await waitFor(() => screen.getByText('Toan'));
    expect(eqUser).toHaveBeenCalledWith('invitee_user_id', 'u1');
    expect(eqStatus).toHaveBeenCalledWith('status', 'pending');
  });
});
