import { supabase } from '../../lib/supabase';
import { createClan } from '../createClan';
import { ApiError } from '../types';

jest.mock('../../lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

describe('createClan', () => {
  it('returns the parsed payload on success', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: { clan_id: 'c1', person_id: 'p1' },
      error: null,
    });

    const result = await createClan({
      name: 'Ho Pham',
      branch_type: 'noi',
      admin_full_name: 'Duy',
      admin_generation_number: 15,
    });

    expect(result).toEqual({ clan_id: 'c1', person_id: 'p1' });
    expect(supabase.functions.invoke).toHaveBeenCalledWith('create-clan', {
      body: {
        name: 'Ho Pham',
        branch_type: 'noi',
        admin_full_name: 'Duy',
        admin_generation_number: 15,
      },
    });
  });

  it('throws ApiError when the function returns an error', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'missing required fields' },
    });

    await expect(
      createClan({ name: '', branch_type: 'noi', admin_full_name: '', admin_generation_number: 0 })
    ).rejects.toThrow(ApiError);
  });
});
