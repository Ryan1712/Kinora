import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SignUpScreen from '../sign-up';
import { supabase } from '../../../lib/supabase';

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { signUp: jest.fn() },
    from: jest.fn(() => ({ insert: jest.fn().mockResolvedValue({ error: null }) })),
  },
}));

describe('SignUpScreen', () => {
  it('signs up then inserts the users profile row with full_name', async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    const { getByLabelText, getByText } = await render(<SignUpScreen />);
    await fireEvent.changeText(getByLabelText('Ho ten'), 'Pham Van Duy');
    await fireEvent.changeText(getByLabelText('Email'), 'duy@example.com');
    await fireEvent.changeText(getByLabelText('Mat khau'), 'password123');
    await fireEvent.press(getByText('Dang ky'));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'duy@example.com',
        password: 'password123',
      });
      expect(supabase.from).toHaveBeenCalledWith('users');
    });
  });
});

