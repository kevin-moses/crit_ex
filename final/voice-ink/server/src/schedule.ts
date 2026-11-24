import type { TimeZone, WakeTime } from './domain.ts';

export const WAKE_GRACE_S = 3600;

export function parseWakeTime(raw: unknown): WakeTime {
  const match = typeof raw === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.exec(raw);
  if (!match) throw new Error(`wakeAt must be HH:MM, got ${String(raw)}`);
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function parseTimeZone(raw: unknown): TimeZone {
  if (typeof raw !== 'string' || !raw) throw new Error(`Invalid timeZone: ${String(raw)}`);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: raw });
  } catch (cause) {
    throw new Error(`Invalid timeZone: ${raw}`, { cause });
  }
  return raw as TimeZone;
}

export function secondsUntilWake(now: Date, wake: WakeTime, timeZone: TimeZone, graceS: number): number {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  });
  function localClockMs(instant: number): number {
    const parts = format.formatToParts(instant);
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)!.value);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  }

  const dayMs = 86_400_000;
  const today = new Date(localClockMs(now.getTime()));
  today.setUTCHours(wake.hour, wake.minute, 0, 0);
  for (let wall = today.getTime(); ; wall += dayMs) {
    // Use the first occurrence in a repeated hour. In a skipped hour, advance by the DST gap.
    const before = wall - dayMs;
    const after = wall + dayMs;
    const first = wall - (localClockMs(before) - before);
    const second = wall - (localClockMs(after) - after);
    const instant = localClockMs(first) === wall || localClockMs(second) !== wall ? first : second;
    const delay = instant - now.getTime();
    if (delay > graceS * 1000) return Math.ceil(delay / 1000);
  }
}
