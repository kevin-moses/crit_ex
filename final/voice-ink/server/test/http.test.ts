import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import example from '../devices.example.json' with { type: 'json' };
import { DeviceDirectory } from '../src/devices.ts';
import { createApp } from '../src/http.ts';
import { MessageLog } from '../src/message-log.ts';
import { VoiceRelay } from '../src/relay.ts';
import { createFrameRenderer } from '../src/render/registry.ts';
import { noticeCard } from '../src/screen.ts';

test('two boards exchange frames, retain their own wake times, and recover after a restart', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'voice-http-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const devices = DeviceDirectory.parse(example);
  let time = '2026-11-24T18:12:00Z';
  const now = () => new Date(time);
  let reply: string | Error = '';
  const stt = { async transcribe() { if (reply instanceof Error) throw reply; return reply; } };
  const attachment = { kind: 'ascii', name: 'test-art', lines: ['(*)'] } as const;
  const art = { pick: () => attachment };
  const renderer = createFrameRenderer();
  async function start() {
    const relay = new VoiceRelay({ devices, now, stt, art, log: MessageLog.open(join(dir, 'log.jsonl')) });
    const server = createApp({ devices, relay, renderer, now }).listen(0, '127.0.0.1');
    t.after(() => { server.close(); });
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    return `http://127.0.0.1:${address.port}`;
  }
  let origin = await start();
  const url = (id: string, path: string) => `${origin}/api/devices/${id}/${path}`;
  const headers = (id: string) => ({ Authorization: 'Bearer ' + example.devices.find(d => d.id === id)?.token });
  const get = (id: string, path = 'screen') => fetch(url(id, path), { headers: headers(id) });
  const pcm = Buffer.alloc(9600);
  const post = (id: string, body = pcm, type = 'application/octet-stream') => fetch(url(id, 'messages'), {
    method: 'POST', headers: { ...headers(id), 'Content-Type': type }, body,
  });
  async function readFrame(response: Response, status: number, sleep: number) {
    assert.equal(response.status, status);
    assert.equal(response.headers.get('Content-Type'), 'application/octet-stream');
    assert.equal(response.headers.get('X-Sleep-Seconds'), String(sleep));
    const bits = Buffer.from(await response.arrayBuffer());
    assert.equal(bits.length, 4736);
    return bits;
  }
  const aIdle = await readFrame(await get('a'), 200, 46080);
  const bIdle = await readFrame(await get('b'), 200, 74880);
  reply = 'can you grab oat milk';
  const sent = await post('a');
  assert.ok(sent.headers.get('X-Message-Id'));
  const milk = await readFrame(sent, 201, 46080);
  assert.notDeepEqual(milk, bIdle);
  assert.deepEqual(await readFrame(await get('b'), 200, 74880), milk);
  assert.deepEqual(await readFrame(await get('a'), 200, 46080), aIdle);
  reply = 'on my way';
  const onWay = await readFrame(await post('b'), 201, 74880);
  assert.deepEqual(await readFrame(await get('a'), 200, 46080), onWay);
  const history = await (await get('a', 'messages')).json();
  assert.deepEqual(history.map((m: { text: string }) => m.text), ['can you grab oat milk', 'on my way']);
  assert.deepEqual(history[0].attachments, [attachment]);

  time = '2026-11-24T06:30:00Z';
  await readFrame(await get('a'), 200, 88200);
  await readFrame(await get('b'), 200, 30600);
  reply = 'and bread';
  await readFrame(await post('a'), 201, 1800);
  const beforeErrors = await (await get('a', 'messages')).json();
  for (const [result, body, status, code] of [
    ['', pcm, 422, 'no_speech'], ['x', Buffer.alloc(100), 422, 'too_short'], [new Error('offline'), pcm, 502, 'stt_failed'],
  ] as const) {
    reply = result;
    const response = await post('a', body);
    assert.equal(response.headers.get('X-Error'), code);
    assert.deepEqual(await readFrame(response, status, 1800), Buffer.from(await renderer.render(noticeCard(code))));
  }
  assert.deepEqual(await (await get('a', 'messages')).json(), beforeErrors);
  async function jsonError(response: Response, status: number, error: string) {
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error });
  }
  for (const authorization of ['', 'Bearer incorrect', headers('a').Authorization]) {
    await jsonError(await fetch(url('b', 'screen'), { headers: { authorization } }), 401, 'bad_token');
  }
  await jsonError(await fetch(url('zz', 'screen')), 404, 'unknown_device');
  await jsonError(await post('a', pcm, 'text/plain'), 415, 'unsupported_media_type');
  await jsonError(await post('a', Buffer.alloc(600000)), 413, 'too_large');
  await jsonError(await fetch(url('a', 'messages'), {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: Buffer.alloc(600000),
  }), 401, 'bad_token');

  reply = 'chunked';
  await new Promise<void>((resolve, reject) => {
    const req = request(url('a', 'messages'), { method: 'POST', headers: { ...headers('a'), 'Content-Type': 'application/octet-stream' } }, res => {
      res.resume();
      if (res.statusCode !== 201) reject(new Error(`Chunked POST got ${res.statusCode}`));
      res.once('end', resolve);
    });
    req.on('error', reject);
    req.write(pcm.subarray(0, 4800));
    req.write(pcm.subarray(4800));
    req.end();
  });
  const last = await readFrame(await get('b'), 200, 30600);
  const png = await get('b', 'screen.png');
  assert.equal(png.headers.get('Content-Type'), 'image/png');
  assert.deepEqual([...new Uint8Array(await png.arrayBuffer()).slice(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  origin = await start();
  assert.deepEqual(await readFrame(await get('b'), 200, 30600), last);
  assert.deepEqual(await (await fetch(origin + '/healthz')).json(), { ok: true });
});
