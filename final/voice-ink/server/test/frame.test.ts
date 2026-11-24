import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { previewCards } from '../scripts/preview.ts';
import { AsciiArtRenderer } from '../src/render/ascii.ts';
import { bitsToPng, layoutCard, packMono } from '../src/render/frame.ts';
import { createFrameRenderer } from '../src/render/registry.ts';

const cards = previewCards();
const renderer = createFrameRenderer();
const ascii = new AsciiArtRenderer();
const ctx = createCanvas(296, 128).getContext('2d');

test('packed bits start at the high bit of each padded row', () => {
  const rgba = new Uint8ClampedArray(10 * 2 * 4).fill(255);
  rgba.fill(0, 0, 3);
  rgba.fill(0, 19 * 4, 19 * 4 + 3);
  assert.deepEqual([...packMono(rgba, 10, 2)], [0x80, 0, 0, 0x40]);
});

test('ASCII renderer supplies the heart at three sizes and rejects oversize blocks in layout', async () => {
  const [heart] = cards.get('miss')!.attachments;
  assert.ok(heart.kind === 'ascii');
  assert.deepEqual((await ascii.layout(ctx, heart)).map(b => [b.width, b.height]), [[101, 112], [76, 84], [51, 56]]);
  assert.equal(layoutCard(ctx, 'Ben: hi', [{ width: 40, height: 117, draw() {} }]).fit, 'text');
});

const cases = [
  ['hi', 'art', 20, 1, 135, 84], ['miss', 'art', 20, 3, 101, 112],
  ['onway', 'art', 20, 2, 84, 84], ['milk', 'art', 20, 4, 84, 84],
  ['rain', 'art', 20, 4, 101, 84], ['house', 'art', 20, 4, 89, 105],
  ['landed', 'art', 16, 6, 101, 56], ['bakery', 'art', 16, 6, 59, 42],
  ['ramble', 'text', 14, 7], ['huge', 'cut', 14, 7], ['longword', 'text', 20, 3],
  ['idle', 'text', 20, 2], ['error', 'text', 20, 2],
] as const;

for (const [name, fit, size, count, width, height] of cases) {
  test(`layout, ink and margins for ${name}`, async () => {
    const card = cards.get(name)!;
    const [art] = card.attachments;
    const layout = layoutCard(ctx, card.text, art?.kind === 'ascii' ? await ascii.layout(ctx, art) : []);
    assert.deepEqual([layout.fit, layout.size, layout.lines.length], [fit, size, count]);
    if (layout.fit === 'art') assert.deepEqual([layout.block.width, layout.block.height], [width, height]);
    if (fit === 'cut') assert.match(layout.lines.at(-1)!, /…$/);
    const bits = await renderer.render(card);
    assert.equal(bits.length, 4736);
    assert.deepEqual(bits, await renderer.render(card));
    const withoutArt = await renderer.render({ ...card, attachments: [] });
    if (fit === 'art') assert.notDeepEqual(bits, withoutArt);
    else assert.deepEqual(bits, withoutArt);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 296; x++) {
        if (x < 6 || x >= 290 || y < 6 || y >= 122) assert.equal(bits[y * 37 + (x >> 3)] & (128 >> (x % 8)), 0);
      }
    }
  });
}

test('PNG pixels match the bytes on the wire', async () => {
  const bits = await renderer.render(cards.get('miss')!);
  ctx.drawImage(await loadImage(bitsToPng(bits)), 0, 0);
  const pixels = ctx.getImageData(0, 0, 296, 128).data;
  for (let i = 0; i < 296 * 128; i++) {
    assert.equal(pixels[i * 4], bits[i >> 3] & (128 >> (i % 8)) ? 0 : 255);
  }
});
