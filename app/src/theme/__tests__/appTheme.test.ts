import { appTheme } from '../appTheme';
import { brand } from '../brand';

describe('appTheme', () => {
  it('uses the brand gold as primary and brand red as error', () => {
    expect(appTheme.colors.primary).toBe(brand.gold.mid);
    expect(appTheme.colors.error).toBe(brand.red);
  });

  it('is a dark theme with the Ink Root dark background', () => {
    expect(appTheme.dark).toBe(true);
    expect(appTheme.colors.background).toBe('#180d08');
  });

  it('uses brand text colors for surface text', () => {
    expect(appTheme.colors.onSurface).toBe(brand.text.body);
  });
});
