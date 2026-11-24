import { PCM_SAMPLE_RATE } from './domain.ts';
import type { SpeechToText } from './relay.ts';

export const CARTESIA_VERSION = '2026-08-14';
type Options = { apiKey: string; baseUrl?: string; language?: string; timeoutMs?: number };

export class CartesiaSpeechToText implements SpeechToText {
  readonly #options: Options;
  constructor(options: Options) { this.#options = options; }

  async transcribe(pcm: Uint8Array): Promise<string> {
    const { apiKey, baseUrl = 'https://api.cartesia.ai', language = 'en', timeoutMs = 30_000 } = this.#options;
    const url = new URL('/stt', baseUrl);
    url.searchParams.set('encoding', 'pcm_s16le');
    url.searchParams.set('sample_rate', String(PCM_SAMPLE_RATE));
    const body = new FormData();
    body.set('file', new Blob([Uint8Array.from(pcm)], { type: 'application/octet-stream' }), 'audio.pcm');
    body.set('model', 'ink-whisper');
    body.set('language', language);
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Cartesia-Version': CARTESIA_VERSION },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Cartesia STT ${response.status}: ${(await response.text()).slice(0, 200)}`);
    const json: unknown = await response.json();
    if (!json || typeof json !== 'object' || !('text' in json) || typeof json.text !== 'string') {
      throw new Error('Cartesia STT response requires a text string');
    }
    return json.text;
  }
}
