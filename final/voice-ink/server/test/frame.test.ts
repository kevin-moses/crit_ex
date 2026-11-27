import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { previewCards } from '../scripts/preview.ts';
import { bitsToPng, layoutCard, packMono, renderFrame } from '../src/render/frame.ts';

const cards = previewCards();
const ctx = createCanvas(296, 128).getContext('2d');

test('packed bits start at the high bit of each padded row', () => {
  const rgba = new Uint8ClampedArray(10 * 2 * 4).fill(255);
  rgba.fill(0, 0, 3);
  rgba.fill(0, 19 * 4, 19 * 4 + 3);
  assert.deepEqual([...packMono(rgba, 10, 2)], [0x80, 0, 0, 0x40]);
});

const cases = [
  ['idle', 'text', 20, 2], ['hi', 'text', 20, 1], ['miss', 'text', 20, 2],
  ['onway', 'text', 20, 2], ['milk', 'text', 20, 2], ['rain', 'text', 20, 3],
  ['landed', 'text', 20, 4], ['house', 'text', 20, 3], ['bakery', 'text', 16, 5],
  ['ramble', 'text', 14, 7], ['huge', 'cut', 14, 7], ['longword', 'text', 20, 3],
  ['error', 'text', 20, 2],
] as const;

for (const [name, fit, size, count] of cases) {
  test(`layout, ink and margins for ${name}`, () => {
    const card = cards.get(name)!;
    const layout = layoutCard(ctx, card.text);
    assert.deepEqual([layout.fit, layout.size, layout.lines.length], [fit, size, count]);
    if (fit === 'cut') assert.match(layout.lines.at(-1)!, /…$/);
    const bits = renderFrame(card);
    assert.equal(bits.length, 4736);
    assert.deepEqual(bits, renderFrame(card));
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 296; x++) {
        if (x < 6 || x >= 290 || y < 6 || y >= 122) assert.equal(bits[y * 37 + (x >> 3)] & (128 >> (x % 8)), 0);
      }
    }
  });
}

test('PNG pixels match the bytes on the wire', async () => {
  const bits = renderFrame(cards.get('miss')!);
  ctx.drawImage(await loadImage(bitsToPng(bits)), 0, 0);
  const pixels = ctx.getImageData(0, 0, 296, 128).data;
  for (let i = 0; i < 296 * 128; i++) {
    assert.equal(pixels[i * 4], bits[i >> 3] & (128 >> (i % 8)) ? 0 : 255);
  }
});
