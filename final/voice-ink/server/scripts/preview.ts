import { mkdirSync, writeFileSync } from 'node:fs';
import type { Card } from '../src/domain.ts';
import { bitsToPng, renderFrame } from '../src/render/frame.ts';

const examples: [string, string][] = [
  ['idle', 'Hold the button to talk to Ben.'],
  ['hi', 'Ben: hi'],
  ['miss', 'Ana: Good morning! Miss you'],
  ['onway', 'Ben: On my way, ten minutes'],
  ['milk', 'Ana: Can you grab oat milk on the way home?'],
  ['rain', 'Ben: Raining here. Coffee first, then work.'],
  ['landed', 'Ana: Landed safe! The flight was long but the window seat was worth it. Call me later?'],
  ['house', 'Ben: Finally home. The house is so quiet without you.'],
  ['bakery', 'Ana: The snow finally stopped so I walked to the bakery and they had the cardamom buns you like. Saved you one in the freezer.'],
  ['ramble', 'Ben: Long day. The meeting ran over, then the train was late, then I forgot my keys and had to wait for the neighbor. But the sunset on the walk home was unreal and I wished you were here to see it with me. Goodnight.'],
  ['huge', 'Ana: ' + 'blah '.repeat(400)],
  ['longword', 'Ben: Supercalifragilisticexpialidocious!'],
  ['error', "Didn't catch that. Hold to retry."],
];

export function previewCards(): Map<string, Card> {
  return new Map(examples.map(([name, text]) => [name, { text }]));
}

if (import.meta.main) {
  mkdirSync('out', { recursive: true });
  for (const [name, card] of previewCards()) {
    writeFileSync(`out/preview-${name}.png`, bitsToPng(renderFrame(card)));
  }
}
