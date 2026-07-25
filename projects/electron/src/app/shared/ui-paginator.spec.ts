import { uiPaginatorIntlFactory } from './ui-paginator';

describe('uiPaginatorIntlFactory', () => {
  it('formats ranges and totals in en-US', () => {
    const paginator = uiPaginatorIntlFactory();

    expect(paginator.getRangeLabel(0, 100, 12_345)).toBe('1 – 100 of 12,345');
    expect(paginator.getRangeLabel(0, 0, 12_345)).toBe('0 of 12,345');
  });
});
