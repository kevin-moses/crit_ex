import { FrameRenderer } from './frame.ts';
import { AsciiArtRenderer } from './ascii.ts';

export function createFrameRenderer(): FrameRenderer {
  return new FrameRenderer({ ascii: new AsciiArtRenderer() });
}
