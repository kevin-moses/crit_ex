import type { SKRSContext2D } from '@napi-rs/canvas';
import type { AsciiAttachment } from '../domain.ts';
import type { AttachmentRenderer, Block } from './frame.ts';
import { FONT } from './text.ts';

export class AsciiArtRenderer implements AttachmentRenderer<AsciiAttachment> {
  async layout(ctx: SKRSContext2D, art: AsciiAttachment): Promise<readonly Block[]> {
    return [28, 21, 14].map(size => {
      const font = `${size}px ${FONT}`;
      ctx.font = font;
      return {
        width: Math.ceil(Math.max(...art.lines.map(line => ctx.measureText(line).width))),
        height: art.lines.length * size,
        draw(ctx, x, y) {
          ctx.font = font;
          ctx.fillStyle = '#000';
          ctx.textBaseline = 'top';
          art.lines.forEach((line, i) => ctx.fillText(line, x, y + i * size));
        },
      };
    });
  }
}
