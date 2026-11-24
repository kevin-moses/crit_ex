import { mkdirSync, writeFileSync } from 'node:fs';
import { loadAsciiArt } from '../src/art.ts';
import type { Card } from '../src/domain.ts';
import { bitsToPng } from '../src/render/frame.ts';
import { createFrameRenderer } from '../src/render/registry.ts';

const examples: [string, string, string?][] = [
  ['idle', 'Hold the button to talk to Ben.'],
  ['hi', 'Ben: hi', 'bunny'],
  ['miss', 'Ana: Good morning! Miss you', 'heart'],
  ['onway', 'Ben: On my way, ten minutes', 'star'],
  ['milk', 'Ana: Can you grab oat milk on the way home?', 'coffee'],
  ['rain', 'Ben: Raining here. Coffee first, then work.', 'rain'],
  ['landed', 'Ana: Landed safe! The flight was long but the window seat was worth it. Call me later?', 'plane'],
  ['house', 'Ben: Finally home. The house is so quiet without you.', 'house'],
  ['bakery', 'Ana: The snow finally stopped so I walked to the bakery and they had the cardamom buns you like. Saved you one in the freezer.', 'sun'],
  ['ramble', 'Ben: Long day. The meeting ran over, then the train was late, then I forgot my keys and had to wait for the neighbor. But the sunset on the walk home was unreal and I wished you were here to see it with me. Goodnight.', 'sleep'],
  ['huge', 'Ana: ' + 'blah '.repeat(400), 'sun'],
  ['longword', 'Ben: Supercalifragilisticexpialidocious!', 'cat'],
  ['error', "Didn't catch that. Hold to retry."],
];

export function previewCards(): Map<string, Card> {
  const { arts, errors } = loadAsciiArt('assets/ascii');
  if (errors.length) throw new Error(errors.join('\n'));
  return new Map(examples.map(([name, text, artName]) => {
    const art = arts.find(a => a.name === artName);
    if (artName && !art) throw new Error(`Missing preview art ${artName}`);
    return [name, { text, attachments: art ? [{ kind: 'ascii', name: art.name, lines: art.lines }] : [] }];
  }));
}

if (import.meta.main) {
  mkdirSync('out', { recursive: true });
  const renderer = createFrameRenderer();
  for (const [name, card] of previewCards()) {
    writeFileSync(`out/preview-${name}.png`, bitsToPng(await renderer.render(card)));
  }
}
