import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import { supabase } from '../../lib/supabase';
import { useClanChangeRequests } from '../useClanChangeRequests';

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Probe() {
  const { data, isSuccess } = useClanChangeRequests('c1');
  return <Text>{isSuccess ? data?.[0].persons.full_name : 'loading'}</Text>;
}

describe('useClanChangeRequests', () => {
  it('fetches pending requests for the clan', async () => {
    const eqStatus = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'r1',
          proposed_relationship_type: 'parent_child',
          persons: { full_name: 'Toan' },
        },
      ],
      error: null,
    });
    const eqClan = jest.fn().mockReturnValue({ eq: eqStatus });
    const select = jest.fn().mockReturnValue({ eq: eqClan });
    (supabase.from as jest.Mock).mockReturnValue({ select });

    const { getByText } = await render(<Probe />, { wrapper });

    await waitFor(() => getByText('Toan'));
    expect(supabase.from).toHaveBeenCalledWith('relationship_change_requests');
    expect(eqClan).toHaveBeenCalledWith('clan_id', 'c1');
    expect(eqStatus).toHaveBeenCalledWith('status', 'pending');
  });
});