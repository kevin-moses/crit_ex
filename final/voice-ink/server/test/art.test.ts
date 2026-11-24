import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AsciiArtLibrary, loadAsciiArt, parseAsciiArt } from '../src/art.ts';

test('parses printable art, preserving leading spaces', () => {
  const heart = parseAsciiArt('heart.txt', 'keywords: LOVE, miss\r\n\n _  _ \n( \\/ )\n \\  /\n  \\/\n\n');
  assert.deepEqual(heart, { name: 'heart', keywords: ['love', 'miss'], lines: [' _  _', '( \\/ )', ' \\  /', '  \\/'] });
  for (const source of ['bad\n*', 'keywords: cat2\n*', 'keywords:\n' + '*\n'.repeat(9), 'keywords:\n' + '*'.repeat(17), 'keywords:\n\t*', 'keywords:\né', 'keywords:\n']) {
    assert.throws(() => parseAsciiArt('bad.txt', source), /bad\.txt/);
  }
  assert.throws(() => parseAsciiArt('Heart.txt', 'keywords:\n*'), /Heart\.txt/);
  assert.equal(parseAsciiArt('ok.txt', 'keywords:\n' + ('*'.repeat(16) + '\n').repeat(8)).lines.length, 8);
  const shipped = loadAsciiArt('assets/ascii');
  assert.equal(shipped.arts.length, 12);
  assert.deepEqual(shipped.errors, []);
});

test('picks the first matching word, reloads files and falls back by seed', t => {
  const dir = mkdtempSync(join(tmpdir(), 'voice-art-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const library = new AsciiArtLibrary(dir);
  const pick = (text: string) => library.pick(text, 'repeatable')?.name;
  assert.equal(pick('late'), undefined);
  assert.equal(new AsciiArtLibrary(join(dir, 'missing')).pick('late', 'id'), undefined);
  const add = (name: string, keywords: string) => writeFileSync(join(dir, name + '.txt'), 'keywords: ' + keywords + '\n(*)');
  add('heart', 'love, miss');
  add('sun', 'morning');
  assert.equal(pick('I miss you'), 'heart');
  assert.equal(pick('Good morning, love you'), 'sun');
  assert.equal(pick('Running late'), undefined);
  add('star', '');
  add('bunny', '');
  const fallback = pick('Running late');
  assert.ok(fallback === 'star' || fallback === 'bunny');
  assert.equal(pick('Running late'), fallback);
  add('flower', 'flower');
  assert.equal(pick('a flower'), 'flower');
});
