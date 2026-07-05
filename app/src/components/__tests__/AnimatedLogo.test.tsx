import React from 'react';
import { render } from '@testing-library/react-native';
import { AnimatedLogo } from '../AnimatedLogo';

describe('AnimatedLogo', () => {
  it('renders the logo image', async () => {
    const { getByTestId } = await render(<AnimatedLogo />);
    expect(getByTestId('animated-logo-image')).toBeTruthy();
  });

  it('applies the requested size', async () => {
    const { getByTestId } = await render(<AnimatedLogo size={96} />);
    const image = getByTestId('animated-logo-image');
    const flatStyle = Array.isArray(image.props.style)
      ? Object.assign({}, ...image.props.style)
      : image.props.style;
    expect(flatStyle.width).toBe(96);
    expect(flatStyle.height).toBe(96);
  });
});
