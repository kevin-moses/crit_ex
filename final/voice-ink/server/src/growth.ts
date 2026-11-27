import { createHash } from 'node:crypto';
import type { DeviceId, TimeZone } from './domain.ts';

export const FLOOR = 2;
export const FULL = 30;
export const KEEP = 0.5;

export function pairSeed(a: DeviceId, b: DeviceId): number {
  return createHash('sha256').update([a, b].sort().join('|')).digest().readUInt32BE(0);
}

export function vineIteration(sentAt: readonly string[], timeZone: TimeZone, now: Date): number {
  const { format } = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const today = format(now);
  const days = new Set(sentAt.map(instant => format(new Date(instant))));
  const first = [...days].sort()[0];
  let iteration = FLOOR;
  if (!first) return iteration;

  for (let day = first; day <= today; day = nextDay(day)) {
    if (days.has(day)) iteration = FLOOR + Math.floor((iteration - FLOOR) * KEEP);
    else if (day < today) iteration = Math.min(FULL, iteration + 1);
  }
  return iteration;
}

// Step through calendar labels in UTC so a local DST transition still counts as one day.
function nextDay(day: string): string {
  return new Date(Date.parse(day + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10);
}
