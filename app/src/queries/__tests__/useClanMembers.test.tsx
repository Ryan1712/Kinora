import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text } from 'react-native';

import { useClanMembers } from '../useClanMembers';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({ supabase: { from: jest.fn() } }));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function Probe() {
  const { data, isSuccess } = useClanMembers('c1');
  return <Text>{isSuccess ? data?.[0].full_name : 'loading'}</Text>;
}

describe('useClanMembers', () => {
  it('fetches persons for the given clan ordered by generation', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: 'p1',
          full_name: 'Duy',
          gender: 'male',
          generation_number: 15,
          role: 'admin',
          linked_user_id: 'u1',
        },
      ],
      error: null,
    });
    const eq = jest.fn().mockReturnValue({ order });
    (supabase.from as jest.Mock).mockReturnValue({ select: jest.fn().mockReturnValue({ eq }) });

    await render(<Probe />, { wrapper });

    await waitFor(() => screen.getByText('Duy'));
    expect(eq).toHaveBeenCalledWith('clan_id', 'c1');
    expect(order).toHaveBeenCalledWith('generation_number');
  });
});
