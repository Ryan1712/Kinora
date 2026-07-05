import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SignInScreen from '../sign-in';
import { supabase } from '../../../lib/supabase';

jest.mock('expo-router', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Link: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock('../../../lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: jest.fn() } },
}));

describe('SignInScreen', () => {
  it('calls signInWithPassword with the entered credentials', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ data: {}, error: null });

    const { getByLabelText, getByText } = await render(<SignInScreen />);
    await fireEvent.changeText(getByLabelText('Email'), 'duy@example.com');
    await fireEvent.changeText(getByLabelText('Mật khẩu'), 'password123');
    await fireEvent.press(getByText('Đăng nhập'));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'duy@example.com',
        password: 'password123',
      });
    });
  });

  it('shows an error message when sign-in fails', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    });

    const { findByText, getByLabelText, getByText } = await render(<SignInScreen />);
    await fireEvent.changeText(getByLabelText('Email'), 'duy@example.com');
    await fireEvent.changeText(getByLabelText('Mật khẩu'), 'wrong');
    await fireEvent.press(getByText('Đăng nhập'));

    expect(await findByText('Invalid login credentials')).toBeTruthy();
  });
});

