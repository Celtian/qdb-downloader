import { describe, expect, test } from 'vitest';
import {
  createEntityStatusThresholds,
  deriveEntityStatuses,
  isEntityStatus,
} from './entity-status.js';

describe('entity statuses', () => {
  const now = new Date('2026-07-24T12:00:00.000Z');

  test('recognizes supported status values', () => {
    expect(isEntityStatus('new')).toBe(true);
    expect(isEntityStatus('needs-update')).toBe(true);
    expect(isEntityStatus('unknown')).toBe(false);
  });

  test('creates shared UTC thresholds and clamps calendar month ends', () => {
    expect(createEntityStatusThresholds('2024-08-31', now)).toEqual({
      asOfIso: '2026-07-24T12:00:00.000Z',
      newCutoffIso: '2026-07-21T12:00:00.000Z',
      needsUpdateCutoffDate: '2024-02-29',
    });
    expect(createEntityStatusThresholds('2023-08-31', now)?.needsUpdateCutoffDate).toBe(
      '2023-02-28',
    );
    expect(createEntityStatusThresholds('invalid', now)?.needsUpdateCutoffDate).toBeUndefined();
    expect(createEntityStatusThresholds('2026-07-24', new Date('invalid'))).toBeUndefined();
  });

  test('marks timestamps from exactly the last 72 hours as new', () => {
    expect(
      deriveEntityStatuses(
        {
          createdAt: '2026-07-21T12:00:00.000Z',
          updatedAt: '2026-07-24T12:00:00.000Z',
        },
        '2026-07-24',
        now,
      ),
    ).toEqual(['new']);
    expect(
      deriveEntityStatuses(
        {
          createdAt: '2026-07-21T11:59:59.999Z',
          updatedAt: '2026-07-24T12:00:00.000Z',
        },
        '2026-07-24',
        now,
      ),
    ).toEqual([]);
  });

  test('does not mark invalid or future creation timestamps as new', () => {
    expect(
      deriveEntityStatuses(
        { createdAt: 'invalid', updatedAt: '2026-07-24T12:00:00.000Z' },
        '2026-07-24',
        now,
      ),
    ).toEqual([]);
    expect(
      deriveEntityStatuses(
        {
          createdAt: '2026-07-24T12:00:00.001Z',
          updatedAt: '2026-07-24T12:00:00.000Z',
        },
        '2026-07-24',
        now,
      ),
    ).toEqual([]);
  });

  test('marks updates on the inclusive six-calendar-month cutoff', () => {
    expect(
      deriveEntityStatuses(
        {
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2026-01-24T23:59:59.999Z',
        },
        '2026-07-24',
        now,
      ),
    ).toEqual(['needs-update']);
    expect(
      deriveEntityStatuses(
        {
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2026-01-25T00:00:00.000Z',
        },
        '2026-07-24',
        now,
      ),
    ).toEqual([]);
  });

  test('suppresses stale status for invalid or future update dates and invalid references', () => {
    expect(
      deriveEntityStatuses(
        { createdAt: '2025-01-01T00:00:00.000Z', updatedAt: 'invalid' },
        '2026-07-24',
        now,
      ),
    ).toEqual([]);
    expect(
      deriveEntityStatuses(
        {
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2026-07-24T12:00:00.001Z',
        },
        '2027-07-24',
        now,
      ),
    ).toEqual([]);
    expect(
      deriveEntityStatuses(
        {
          createdAt: '2026-07-24T12:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        'invalid',
        now,
      ),
    ).toEqual(['new']);
  });

  test('returns both statuses in display order when rules overlap', () => {
    expect(
      deriveEntityStatuses(
        {
          createdAt: '2026-07-24T12:00:00.000Z',
          updatedAt: '2026-01-24T00:00:00.000Z',
        },
        '2026-07-24',
        now,
      ),
    ).toEqual(['new', 'needs-update']);
  });
});
