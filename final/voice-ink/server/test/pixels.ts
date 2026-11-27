import { PANEL } from '../src/domain.ts';

export function inkAt(frame: Uint8Array, x: number, y: number): boolean {
  const stride = Math.ceil(PANEL.width / 8);
  return (frame[y * stride + (x >> 3)] & (0x80 >> (x & 7))) !== 0;
}
