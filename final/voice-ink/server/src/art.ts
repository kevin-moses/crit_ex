import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Attachment, AsciiAttachment, NonEmpty } from './domain.ts';

export interface ArtPicker {
  pick(text: string, seed: string): Attachment | undefined;
}
type AsciiArt = { name: string; keywords: readonly string[]; lines: NonEmpty<string> };

export function parseAsciiArt(fileName: string, source: string): AsciiArt {
  const name = /^([a-z0-9-]{1,32})\.txt$/.exec(fileName)?.[1];
  if (!name) throw new Error(`${fileName}: invalid ASCII art filename`);
  const [header, ...body] = source.replaceAll('\r\n', '\n').split('\n');
  const match = /^keywords:(.*)$/.exec(header);
  if (!match) throw new Error(`${fileName}: expected a keywords: header`);
  const keywords = match[1].split(',').map(word => word.trim().toLowerCase()).filter(Boolean);
  if (keywords.some(word => !/^[a-z]+$/.test(word))) throw new Error(`${fileName}: keywords must contain only letters`);
  if (body.some(line => /[^\x20-\x7e]/.test(line))) throw new Error(`${fileName}: use printable ASCII`);
  const lines = body.map(line => line.trimEnd());
  while (lines[0] === '') lines.shift();
  while (lines.at(-1) === '') lines.pop();
  const [first, ...rest] = lines;
  if (!first || lines.length > 8) throw new Error(`${fileName}: art must have 1 to 8 lines`);
  if (lines.some(line => line.length > 16)) throw new Error(`${fileName}: lines must fit 16 columns`);
  return { name, keywords, lines: [first, ...rest] };
}

export function loadAsciiArt(dir: string): { arts: AsciiArt[]; errors: string[] } {
  const arts: AsciiArt[] = [];
  const errors: string[] = [];
  try {
    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith('.txt')) continue;
      try {
        arts.push(parseAsciiArt(file, readFileSync(join(dir, file), 'utf8')));
      } catch (error) {
        errors.push(String(error));
      }
    }
  } catch (error) {
    errors.push(String(error));
  }
  return { arts, errors };
}

export class AsciiArtLibrary implements ArtPicker {
  private readonly dir: string;
  constructor(dir: string) { this.dir = dir; }

  pick(text: string, seed: string): AsciiAttachment | undefined {
    const { arts, errors } = loadAsciiArt(this.dir);
    for (const error of errors) console.warn(error);
    let chosen: AsciiArt | undefined;
    for (const word of text.toLowerCase().match(/[a-z]+/g) ?? []) {
      chosen = arts.find(art => art.keywords.includes(word));
      if (chosen) break;
    }
    if (!chosen) {
      const pool = arts.filter(art => !art.keywords.length);
      if (!pool.length) return undefined;
      chosen = pool[createHash('sha256').update(seed).digest().readUInt32BE() % pool.length];
    }
    return { kind: 'ascii', name: chosen.name, lines: chosen.lines };
  }
}
