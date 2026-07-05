import { appTheme } from '../appTheme';
import { brand } from '../brand';

describe('appTheme', () => {
  it('uses the brand gold as primary and brand red as error', () => {
    expect(appTheme.colors.primary).toBe(brand.gold.mid);
    expect(appTheme.colors.error).toBe(brand.red);
  });

  it('is a light theme (dark: false)', () => {
    expect(appTheme.dark).toBe(false);
  });
});
