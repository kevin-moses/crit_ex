import test from 'node:test';
import assert from 'node:assert/strict';
import { pairSeed, vineIteration } from '../src/growth.ts';
import { parseTimeZone } from '../src/schedule.ts';
import { isDeviceId } from '../src/devices.ts';

const now = new Date('2026-11-24T18:12:00Z');
const utc = parseTimeZone('UTC');
const sequence = (first: number, step: number, length: number) =>
  Array.from({ length }, (_, i) => first + step * i);

test('each completed silent day grows one iteration and each note day keeps half the growth above two', () => {
  const cases: [number[], number][] = [
    [[], 2], [[0], 2], [[-1], 2], [[-3], 4], [[0, -1, -2, -3, -4], 2], [[0, 0], 2],
    [[-40], 30], [[-30, 0], 16], [[-30, 0, 0], 16], [[-30, -1, 0], 9], [[-14, 0], 8],
    [[-6, -2, -1, 0], 2], [sequence(-10, -1, 40), 11],
    [sequence(-1, -2, 10), 2], [sequence(-2, -2, 10), 3],
    [sequence(-70, 7, 11), 7], [sequence(-70, 7, 10), 13], [sequence(-90, 15, 7), 15], [[2], 2],
  ];
  for (const [offsets, expected] of cases) {
    const notes = offsets.map(days => new Date(now.getTime() + days * 86_400_000).toISOString());
    assert.equal(vineIteration(notes, utc, now), expected, 'notes on days ' + offsets);
  }
});

test('each board counts silence on its local calendar', () => {
  const sentAt = ['2026-11-21T02:00:00Z'];
  const wake = new Date('2026-11-24T12:00:00Z');
  assert.equal(vineIteration(sentAt, parseTimeZone('Europe/London'), wake), 4);
  assert.equal(vineIteration(sentAt, parseTimeZone('America/Los_Angeles'), wake), 5);
});

test('the seed belongs to the pair in either direction', () => {
  const [a, b, c] = ['a', 'b', 'c'];
  assert.ok(isDeviceId(a) && isDeviceId(b) && isDeviceId(c));
  assert.equal(pairSeed(a, b), pairSeed(b, a));
  assert.notEqual(pairSeed(a, b), pairSeed(a, c));
});
