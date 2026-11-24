import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePcm } from '../src/audio.ts';

function sine(peak: number, offset: number) {
  const pcm = Buffer.alloc(32_000);
  for (let i = 0; i < 16_000; i++) pcm.writeInt16LE(Math.round(offset + peak * Math.sin(2 * Math.PI * 440 * i / 16_000)), 2 * i);
  const result = Buffer.from(normalizePcm(pcm));
  return Array.from({ length: 16_000 }, (_, i) => result.readInt16LE(2 * i));
}

test('normalization removes DC, amplifies quiet clips and preserves loud clips', () => {
  const samples = sine(1000, 500);
  const peak = Math.max(...samples);
  assert.ok(peak >= 29000 && peak <= 29491);
  assert.ok(Math.abs(samples.reduce((a, b) => a + b, 0) / samples.length) < 50);
  assert.ok(Math.abs(Math.max(...sine(30000, 0)) - 30000) <= 2);
  assert.deepEqual(normalizePcm(new Uint8Array(9)), new Uint8Array(8));
});
