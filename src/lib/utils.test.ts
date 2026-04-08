import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercent } from './utils';

describe('utils', () => {
  it('formatCurrency should format correctly', () => {
    expect(formatCurrency(1000)).toBe('R$ 1.000,00');
  });

  it('formatPercent should format correctly', () => {
    expect(formatPercent(10)).toBe('10,0%');
  });
});
