import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { GlassCard } from '../GlassCard';
import { brand } from '@/theme/brand';

describe('GlassCard', () => {
  it('renders its children', async () => {
    const { getByText } = await render(
      <GlassCard>
        <Text>Nội dung</Text>
      </GlassCard>
    );
    expect(getByText('Nội dung')).toBeTruthy();
  });

  it('applies the glass surface and border colors', async () => {
    const { getByTestId } = await render(<GlassCard testID="card" />);
    const flatStyle = Object.assign({}, ...getByTestId('card').props.style);
    expect(flatStyle.backgroundColor).toBe(brand.glass.surface);
    expect(flatStyle.borderColor).toBe(brand.glass.border);
  });
});
