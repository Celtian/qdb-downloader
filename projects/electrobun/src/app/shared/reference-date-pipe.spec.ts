import { ReferenceDatePipe } from './reference-date-pipe';

describe('ReferenceDatePipe', () => {
  it('formats an ISO calendar date without UTC conversion', () => {
    const pipe = new ReferenceDatePipe();
    expect(pipe.transform('2026-01-01')).toContain('2026');
  });
});
