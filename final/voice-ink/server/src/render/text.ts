import { GlobalFonts, type SKRSContext2D } from '@napi-rs/canvas';
import { resolve } from 'node:path';

export const FONT = '"Courier Prime Bold"';
const font = resolve(import.meta.dirname, '../../assets/fonts/CourierPrime-Bold.ttf');
if (!GlobalFonts.registerFromPath(font, 'Courier Prime Bold')) throw new Error(`Cannot load font ${font}`);

export function layoutText(ctx: SKRSContext2D, text: string, size: number, width: number) {
  ctx.font = `${size}px ${FONT}`;
  const lines: string[] = [];
  let line = '';
  function finishLine() {
    lines.push(line);
    line = '';
  }
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? line + ' ' + word : word;
    if (ctx.measureText(next).width <= width) {
      line = next;
      continue;
    }
    if (line) finishLine();
    if (ctx.measureText(word).width <= width) {
      line = word;
      continue;
    }
    for (const char of word) {
      if (line && ctx.measureText(line + char).width > width) finishLine();
      line += char;
    }
  }
  if (line) finishLine();
  return { lines };
}

export function ellipsize(ctx: SKRSContext2D, lines: readonly string[], size: number, maxLines: number, width: number): string[] {
  ctx.font = `${size}px ${FONT}`;
  const kept = lines.slice(0, maxLines);
  const last = Array.from(kept.pop() ?? '');
  while (last.length && ctx.measureText(last.join('') + '…').width > width) last.pop();
  kept.push(last.join('') + '…');
  return kept;
}
