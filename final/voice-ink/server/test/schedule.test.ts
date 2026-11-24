import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTimeZone, parseWakeTime, secondsUntilWake } from '../src/schedule.ts';

test('next daily wake in each board’s local zone', () => {
  assert.equal(secondsUntilWake(new Date('2026-11-24T06:59:59.900Z'), parseWakeTime('07:00'), parseTimeZone('UTC'), 0), 1);
  const cases: [string, string, number, number][] = [
    ['2026-11-24T05:00:00Z', 'UTC', 3600, 7200],
    ['2026-11-24T06:30:00Z', 'UTC', 3600, 88200],
    ['2026-11-24T07:00:00Z', 'UTC', 3600, 86400],
    ['2026-11-24T23:00:00Z', 'UTC', 3600, 28800],
    ['2026-11-24T05:59:00Z', 'UTC', 3600, 3660],
    ['2026-11-24T06:30:00Z', 'UTC', 0, 1800],
    ['2026-11-24T06:59:59Z', 'UTC', 0, 1],
    ['2026-10-31T15:00:00Z', 'America/Los_Angeles', 3600, 86400],
    ['2026-03-07T15:00:00Z', 'America/Los_Angeles', 3600, 82800],
    ['2026-11-24T18:12:00Z', 'Europe/London', 3600, 46080],
    ['2026-11-24T18:12:00Z', 'Europe/London', 0, 46080],
    ['2026-11-24T18:12:00Z', 'America/Los_Angeles', 3600, 74880],
    ['2026-11-24T06:30:00Z', 'America/Los_Angeles', 3600, 30600],
    ['2026-11-24T23:00:00Z', 'Asia/Tokyo', 3600, 82800],
    ['2026-11-24T21:30:00Z', 'Asia/Kolkata', 0, 14400],
    ['2026-03-29T00:30:00Z', 'Europe/London', 0, 19800],
  ];
  for (const [time, zone, grace, expected] of cases) {
    assert.equal(secondsUntilWake(new Date(time), parseWakeTime('07:00'), parseTimeZone(zone), grace), expected, time + ' ' + zone);
  }
});

test('wake configuration rejects invalid inputs', () => {
  for (const time of ['7:00', '24:00', '07:60']) assert.throws(() => parseWakeTime(time));
  for (const zone of ['Mars/Olympus', '', 42]) assert.throws(() => parseTimeZone(zone));
  assert.equal(parseTimeZone('Europe/London'), 'Europe/London');
});

test('DST folds use the earlier occurrence and gaps shift the clock forward', () => {
  const zone = parseTimeZone('America/Los_Angeles');
  assert.equal(secondsUntilWake(new Date('2026-11-01T07:00:00Z'), parseWakeTime('01:30'), zone, 0), 5400);
  assert.equal(secondsUntilWake(new Date('2026-03-08T08:00:00Z'), parseWakeTime('02:30'), zone, 0), 9000);
});
