import { supabase } from '../supabase';

describe('supabase client', () => {
  it('is configured with the local dev URL', () => {
    expect(supabase.supabaseUrl).toBe('http://127.0.0.1:54321');
  });
});
