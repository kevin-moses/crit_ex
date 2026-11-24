export function normalizePcm(pcm: Uint8Array): Uint8Array {
  const count = Math.floor(pcm.byteLength / 2);
  const input = new DataView(pcm.buffer, pcm.byteOffset, count * 2);
  const output = new Uint8Array(count * 2);
  const samples = new DataView(output.buffer);
  let sum = 0;
  let min = 32767;
  let max = -32768;
  for (let i = 0; i < count; i++) {
    const sample = input.getInt16(i * 2, true);
    sum += sample;
    min = Math.min(min, sample);
    max = Math.max(max, sample);
  }
  if (max <= min) return output;
  const mean = sum / count;
  const gain = Math.max(1, Math.min(32, 29491 / Math.max(max - mean, mean - min)));
  for (let i = 0; i < count; i++) {
    const value = Math.round((input.getInt16(i * 2, true) - mean) * gain);
    samples.setInt16(i * 2, Math.max(-32768, Math.min(32767, value)), true);
  }
  return output;
}
