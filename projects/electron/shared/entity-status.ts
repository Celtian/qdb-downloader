import { isReferenceDate } from './reference-date.js';

export const entityStatuses = ['new', 'needs-update'] as const;
export type EntityStatus = (typeof entityStatuses)[number];

export interface EntityStatusTimestamps {
  createdAt: string;
  updatedAt: string;
}

export interface EntityStatusThresholds {
  asOfIso: string;
  newCutoffIso: string;
  needsUpdateCutoffDate?: string;
}

const NEW_WINDOW_MILLISECONDS = 72 * 60 * 60 * 1000;

export const isEntityStatus = (value: unknown): value is EntityStatus =>
  typeof value === 'string' && entityStatuses.includes(value as EntityStatus);

function timestampMilliseconds(value: string): number | undefined {
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : undefined;
}

function utcDate(milliseconds: number): string {
  return new Date(milliseconds).toISOString().slice(0, 10);
}

function subtractCalendarMonths(value: string, months: number): string | undefined {
  if (!isReferenceDate(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const monthIndex = year * 12 + month - 1 - months;
  const targetYear = Math.floor(monthIndex / 12);
  const targetMonthIndex = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();
  const targetMonth = String(targetMonthIndex + 1).padStart(2, '0');
  const targetDay = String(Math.min(day, lastDay)).padStart(2, '0');
  return `${targetYear}-${targetMonth}-${targetDay}`;
}

export function createEntityStatusThresholds(
  referenceDate: string | undefined,
  asOf = new Date(),
): EntityStatusThresholds | undefined {
  const asOfMilliseconds = asOf.getTime();
  if (!Number.isFinite(asOfMilliseconds)) return undefined;
  return {
    asOfIso: new Date(asOfMilliseconds).toISOString(),
    newCutoffIso: new Date(asOfMilliseconds - NEW_WINDOW_MILLISECONDS).toISOString(),
    needsUpdateCutoffDate: referenceDate ? subtractCalendarMonths(referenceDate, 6) : undefined,
  };
}

export function deriveEntityStatuses(
  timestamps: EntityStatusTimestamps,
  referenceDate?: string,
  asOf = new Date(),
): EntityStatus[] {
  const thresholds = createEntityStatusThresholds(referenceDate, asOf);
  if (!thresholds) return [];

  const asOfMilliseconds = Date.parse(thresholds.asOfIso);
  const statuses: EntityStatus[] = [];
  const createdAt = timestampMilliseconds(timestamps.createdAt);
  if (
    createdAt !== undefined &&
    createdAt <= asOfMilliseconds &&
    createdAt >= Date.parse(thresholds.newCutoffIso)
  ) {
    statuses.push('new');
  }

  const updatedAt = timestampMilliseconds(timestamps.updatedAt);
  if (
    updatedAt !== undefined &&
    updatedAt <= asOfMilliseconds &&
    thresholds.needsUpdateCutoffDate !== undefined &&
    utcDate(updatedAt) <= thresholds.needsUpdateCutoffDate
  ) {
    statuses.push('needs-update');
  }

  return statuses;
}
