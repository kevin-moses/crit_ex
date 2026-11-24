import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AsciiArtLibrary, loadAsciiArt } from './art.ts';
import { CartesiaSpeechToText } from './cartesia.ts';
import { DeviceDirectory } from './devices.ts';
import { createApp } from './http.ts';
import { MessageLog } from './message-log.ts';
import { VoiceRelay } from './relay.ts';
import { createFrameRenderer } from './render/registry.ts';

function main() {
  const key = process.env.CARTESIA_API_KEY?.trim();
  if (!key) throw new Error('Set CARTESIA_API_KEY before starting the server');
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1 to 65535');
  const devices = DeviceDirectory.parse(JSON.parse(readFileSync(process.env.DEVICES_FILE ?? 'devices.json', 'utf8')));
  const artDir = process.env.ART_DIR ?? 'assets/ascii';
  const { arts, errors } = loadAsciiArt(artDir);
  console.info(`ascii art: ${arts.length} loaded`);
  for (const error of errors) console.warn(error);
  const log = MessageLog.open(join(process.env.DATA_DIR ?? 'data', 'messages.jsonl'));
  const now = () => new Date();
  const relay = new VoiceRelay({ devices, log, art: new AsciiArtLibrary(artDir), stt: new CartesiaSpeechToText({ apiKey: key }), now });
  createApp({ devices, relay, renderer: createFrameRenderer(), now }).listen(port, error => {
    if (error) {
      console.error(String(error));
      process.exitCode = 1;
      return;
    }
    console.info(`Listening on port ${port}`);
  });
}

try {
  main();
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}
