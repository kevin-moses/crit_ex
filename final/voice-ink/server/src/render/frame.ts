import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { PANEL, type Card } from '../domain.ts';
import { ellipsize, FONT, layoutText } from './text.ts';

export { FONT };
const PAD = 6;
const WIDTH = PANEL.width - 2 * PAD;
const HEIGHT = PANEL.height - 2 * PAD;
const TEXT_SIZES = [20, 16, 14] as const;
export type TextSize = typeof TEXT_SIZES[number];
const LINE_HEIGHT = { 20: 24, 16: 19, 14: 16 } satisfies Record<TextSize, number>;
export type CardLayout = { fit: 'text' | 'cut'; size: TextSize; lines: readonly string[] };

export function layoutCard(ctx: SKRSContext2D, text: string): CardLayout {
  for (const size of TEXT_SIZES) {
    const { lines } = layoutText(ctx, text, size, WIDTH);
    const maxLines = Math.floor(HEIGHT / LINE_HEIGHT[size]);
    if (lines.length <= maxLines) return { fit: 'text', size, lines };
    if (size === 14) return { fit: 'cut', size, lines: ellipsize(ctx, lines, size, maxLines, WIDTH) };
  }
  throw new Error('No text sizes configured');
}

export function renderFrame(card: Card): Uint8Array {
  const { width, height } = PANEL;
  const ctx = createCanvas(width, height).getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  const layout = layoutCard(ctx, card.text);
  ctx.beginPath();
  ctx.rect(PAD, PAD, WIDTH, HEIGHT);
  ctx.clip();
  ctx.font = `${layout.size}px ${FONT}`;
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'top';
  const lineHeight = LINE_HEIGHT[layout.size];
  const top = PAD + Math.floor((HEIGHT - layout.lines.length * lineHeight) / 2);
  layout.lines.forEach((line, i) => ctx.fillText(line, PAD, top + i * lineHeight));
  return packMono(ctx.getImageData(0, 0, width, height).data, width, height);
}

export function packMono(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const stride = Math.ceil(width / 8);
  const bits = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2] < 128) {
        bits[y * stride + (x >> 3)] |= 0x80 >> (x % 8);
      }
    }
  }
  return bits;
}

export function bitsToPng(bits: Uint8Array, width: number = PANEL.width, height: number = PANEL.height): Buffer {
  const stride = Math.ceil(width / 8);
  if (bits.length !== stride * height) throw new Error('Frame length does not match the panel');
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(width, height);
  image.data.fill(255);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (bits[y * stride + (x >> 3)] & (0x80 >> (x % 8))) {
        const i = 4 * (y * width + x);
        image.data.fill(0, i, i + 3);
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toBuffer('image/png');
}
