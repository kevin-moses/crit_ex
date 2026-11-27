import test from 'node:test';
import assert from 'node:assert/strict';
import { FRAME_BYTES, PANEL, type DeviceId } from '../src/domain.ts';
import { FULL, pairSeed } from '../src/growth.ts';
import { drawVines, growVines, type Rect } from '../src/render/vines.ts';
import { inkAt } from './pixels.ts';

function blankFrame(seed: number, iteration: number): Uint8Array {
  const bits = new Uint8Array(FRAME_BYTES);
  drawVines(bits, growVines(seed), iteration / FULL, []);
  return bits;
}

test('each iteration adds to the same pair of vines', () => {
  for (const seed of [1, 2]) {
    assert.deepEqual(blankFrame(seed, 0), new Uint8Array(FRAME_BYTES));
    let previous = blankFrame(seed, 2);
    let ink = 0;
    for (let y = 0; y < PANEL.height; y++) {
      for (let x = 0; x < PANEL.width; x++) if (inkAt(previous, x, y)) ink++;
    }
    assert.ok(ink >= 150);
    for (let iteration = 3; iteration <= FULL; iteration++) {
      const next = blankFrame(seed, iteration);
      assert.ok(previous.every((byte, i) => (byte & next[i]) === byte));
      previous = next;
    }
  }
  assert.deepEqual(growVines(7), growVines(7));
  assert.notDeepEqual(blankFrame(1, FULL), blankFrame(2, FULL));
});

test('full growth stays inside the six-pixel margin', () => {
  for (const seed of [1, 2, 123456789]) {
    const bits = blankFrame(seed, FULL);
    for (let y = 0; y < PANEL.height; y++) {
      for (let x = 0; x < PANEL.width; x++) {
        if (x < 6 || y < 6 || x >= PANEL.width - 6 || y >= PANEL.height - 6) {
          assert.equal(inkAt(bits, x, y), false);
        }
      }
    }
  }
});

test('the vines frame the checkerboard note at 12 and cover it at 30', () => {
  const lines: Rect[] = [{ x: 6, y: 40, w: 228, h: 24 }, { x: 6, y: 64, w: 84, h: 24 }];
  const pixels: [number, number][] = [];
  const note = new Uint8Array(FRAME_BYTES);
  for (const line of lines) {
    for (let y = line.y; y < line.y + line.h; y++) {
      for (let x = line.x; x < line.x + line.w; x++) {
        pixels.push([x, y]);
        if ((x + y) % 2 === 0) note[y * 37 + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  for (const seed of [1, 2, pairSeed('a' as DeviceId, 'b' as DeviceId)]) {
    for (const iteration of [12, FULL]) {
      const frame = note.slice();
      drawVines(frame, growVines(seed), iteration / FULL, lines);
      const intact = pixels.filter(([x, y]) => {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (inkAt(note, x + dx, y + dy) !== inkAt(frame, x + dx, y + dy)) return false;
          }
        }
        return true;
      }).length;
      if (iteration === 12) assert.equal(intact, pixels.length);
      else assert.ok(intact <= pixels.length / 10);
    }
  }
});
