import test from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import example from '../devices.example.json' with { type: 'json' };
import { DeviceDirectory } from '../src/devices.ts';
import { MessageLog } from '../src/message-log.ts';
import { VoiceRelay, type SpeechToText } from '../src/relay.ts';

test('two boards read their peer’s newest note across sends, errors and restarts', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'relay-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'data', 'messages.jsonl');
  const devices = DeviceDirectory.parse(example);
  const [a, b] = devices.all();
  const calls: Uint8Array[] = [];
  let reply: string | Error = '';
  const stt: SpeechToText = { async transcribe(pcm) {
    calls.push(pcm);
    if (reply instanceof Error) throw reply;
    return reply;
  } };
  let time = '2026-11-24T18:12:00Z';
  const open = () => new VoiceRelay({ devices, log: MessageLog.open(path), now: () => new Date(time), stt });
  const relay = open();
  const growth = relay.screen(a).growth;
  assert.equal(growth.iteration, 2);
  assert.deepEqual(relay.screen(b).growth, growth);
  const pcm = Buffer.alloc(9600);
  for (let i = 0; i < pcm.length; i += 2) pcm.writeInt16LE(i % 4 ? -1000 : 1000, i);
  assert.equal(relay.screen(a).text, 'Hold the button to talk to Ben.');
  assert.equal(relay.screen(b).text, 'Hold the button to talk to Ana.');
  await assert.rejects(relay.send(a, pcm.subarray(1)), { code: 'too_short' });
  assert.equal(calls.length, 0);
  reply = '  can you\n grab oat milk ';
  const milk = await relay.send(a, pcm);
  assert.ok(Buffer.from(calls[0]).readInt16LE(0) > 29000);
  assert.equal(relay.screen(a).text, 'Hold the button to talk to Ben.');
  assert.deepEqual(relay.screen(b), { text: 'Ana: can you grab oat milk', growth });
  reply = 'on my way';
  const onWay = await relay.send(b, pcm);
  assert.equal(relay.screen(a).text, 'Ben: on my way');
  assert.equal(relay.screen(b).text, 'Ana: can you grab oat milk');
  reply = 'and bread';
  const bread = await relay.send(a, pcm);
  assert.equal(relay.screen(a).text, 'Ben: on my way');
  assert.equal(relay.screen(b).text, 'Ana: and bread');
  reply = ' \t ';
  await assert.rejects(relay.send(a, pcm), { code: 'no_speech' });
  reply = new Error('provider offline');
  await assert.rejects(relay.send(a, pcm), { code: 'stt_failed', cause: reply });
  assert.deepEqual(relay.conversation(a, 20), [milk, onWay, bread]);
  assert.deepEqual(relay.conversation(b, 1), [bread]);
  const legacy = { ...bread, id: 'legacy' };
  appendFileSync(path, JSON.stringify({ ...legacy, attachments: [{ kind: 'ascii', name: 'star', lines: ['*'] }] }) + '\n');
  appendFileSync(path, JSON.stringify({ ...milk, sentAt: 'nope' }) + '\n');
  appendFileSync(path, '{"id":');
  const reopened = open();
  assert.deepEqual(reopened.conversation(a, 20), [milk, onWay, bread, legacy]);
  assert.deepEqual(reopened.screen(a), relay.screen(a));
  assert.deepEqual(reopened.screen(b), relay.screen(b));
  reply = 'thanks';
  const thanks = await reopened.send(b, pcm);
  assert.deepEqual(open().conversation(a, 20), [milk, onWay, bread, legacy, thanks]);

  function checkGrowth(iteration: number) {
    for (const device of [a, b]) {
      assert.deepEqual(reopened.screen(device).growth, { seed: growth.seed, iteration });
    }
  }
  checkGrowth(2);
  time = '2026-11-25T18:12:00Z';
  checkGrowth(2);
  time = '2026-11-27T18:12:00Z';
  checkGrowth(4);
  await reopened.send(a, pcm);
  checkGrowth(3);
});
