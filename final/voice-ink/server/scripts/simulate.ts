import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { CARTESIA_VERSION } from '../src/cartesia.ts';
import { DeviceDirectory } from '../src/devices.ts';
import { FRAME_BYTES, PCM_SAMPLE_RATE, type Message } from '../src/domain.ts';
import { bitsToPng } from '../src/render/frame.ts';

async function synthesize(transcript: string): Promise<Buffer> {
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) throw new Error('--say needs CARTESIA_API_KEY');
  const response = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`, 'Cartesia-Version': CARTESIA_VERSION, 'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model_id: 'sonic-3.6', transcript, language: 'en',
      voice: process.env.CARTESIA_VOICE_ID || 'db6b0ed5-d5d3-463d-ae85-518a07d3c2b4',
      output_format: { container: 'raw', encoding: 'pcm_s16le', sample_rate: PCM_SAMPLE_RATE },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Cartesia TTS ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return Buffer.from(await response.arrayBuffer());
}

async function saveFrame(res: Response, file: string): Promise<Buffer> {
  if (res.headers.get('Content-Type') !== 'application/octet-stream') {
    throw new Error(`Expected a frame, received HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const bits = Buffer.from(await res.arrayBuffer());
  assert.equal(bits.length, FRAME_BYTES, 'Incomplete panel frame');
  writeFileSync(file, bitsToPng(bits));
  return bits;
}

async function simulate() {
  const { values: { from, say, pcm, server } } = parseArgs({ options: {
    from: { type: 'string' }, say: { type: 'string' }, pcm: { type: 'string' },
    server: { type: 'string', default: 'http://localhost:3000' },
  } });
  if (!from || Boolean(say) === Boolean(pcm)) {
    throw new Error('Usage: npm run simulate -- --from ID (--say "text" | --pcm file.pcm) [--server URL]');
  }
  const config = JSON.parse(readFileSync(process.env.DEVICES_FILE ?? 'devices.json', 'utf8'));
  const device = DeviceDirectory.parse(config).get(from);
  if (!device) throw new Error(`Unknown --from board ${from}`);
  const credentials = new Map<string, string>(config.devices.map((row: { id: string; token: string }) => [row.id, row.token]));
  function request(id: string, path: string, body?: Buffer<ArrayBuffer>) {
    return fetch(new URL(`/api/devices/${id}/${path}`, server), {
      headers: { Authorization: `Bearer ${credentials.get(id)}`, ...(body ? { 'Content-Type': 'application/octet-stream' } : {}) },
      method: body ? 'POST' : 'GET', body, signal: AbortSignal.timeout(45_000),
    });
  }

  const audio = pcm ? readFileSync(pcm) : await synthesize(say!);
  mkdirSync('out', { recursive: true });
  const sent = await request(from, 'messages', Buffer.from(audio));
  console.info(`HTTP ${sent.status}   X-Error ${sent.headers.get('X-Error') ?? '-'}   X-Sleep-Seconds ${sent.headers.get('X-Sleep-Seconds') ?? '-'}`);
  const sentBits = await saveFrame(sent, `out/${from}-after-send.png`);
  const peer = await request(device.peer, 'screen');
  if (!peer.ok) throw new Error(`Peer screen returned HTTP ${peer.status}`);
  const peerBits = await saveFrame(peer, `out/${device.peer}.png`);
  if (sent.status !== 201) throw new Error('Send failed. The after-send image contains the panel notice.');
  assert.deepEqual(sentBits, peerBits, 'The peer screen differs from the send reply');
  const history = await request(from, 'messages');
  if (!history.ok) throw new Error(`Message history returned HTTP ${history.status}`);
  const notes: Message[] = await history.json();
  const note = notes.find(m => m.id === sent.headers.get('X-Message-Id'));
  if (!note) throw new Error('The sent note is missing from history');
  console.info(`${device.name}: ${note.text}`);
}
simulate().catch(error => { console.error(String(error)); process.exitCode = 1; });
