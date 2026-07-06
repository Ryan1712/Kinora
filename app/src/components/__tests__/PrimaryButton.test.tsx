import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { PrimaryButton } from '../PrimaryButton';

function renderWithPaper(ui: React.ReactElement) {
  // @testing-library/react-native's `render` is async in this project's version
  // (see node_modules/@testing-library/react-native/docs/api/render.md) — every
  // existing test in this codebase (GlassCard.test.tsx, AnimatedLogo.test.tsx,
  // sign-in.test.tsx) awaits it too, so we do the same here.
  return render(<PaperProvider>{ui}</PaperProvider>);
}

describe('PrimaryButton', () => {
  it('renders the label and calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const { getByText } = await renderWithPaper(<PrimaryButton onPress={onPress}>Đăng nhập</PrimaryButton>);
    fireEvent.press(getByText('Đăng nhập'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    const { getByText } = await renderWithPaper(
      <PrimaryButton onPress={onPress} disabled>
        Đăng nhập
      </PrimaryButton>
    );
    fireEvent.press(getByText('Đăng nhập'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
