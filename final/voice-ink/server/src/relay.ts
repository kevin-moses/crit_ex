import { randomUUID } from 'node:crypto';
import type { ArtPicker } from './art.ts';
import { normalizePcm } from './audio.ts';
import type { DeviceDirectory } from './devices.ts';
import type { Card, Device, Message, SendError } from './domain.ts';
import type { MessageLog } from './message-log.ts';
import { idleCard, noteCard } from './screen.ts';

export interface SpeechToText { transcribe(pcm: Uint8Array): Promise<string> }
export class RelayError extends Error {
  readonly code: SendError;
  constructor(code: SendError, options?: ErrorOptions) {
    super(code, options);
    this.code = code;
  }
}

type RelayDeps = {
  devices: DeviceDirectory;
  log: MessageLog;
  art: ArtPicker;
  stt: SpeechToText;
  now?: () => Date;
  newId?: () => string;
};
export class VoiceRelay {
  readonly #deps: RelayDeps;
  constructor(deps: RelayDeps) { this.#deps = deps; }

  async send(from: Device, pcm: Uint8Array): Promise<Message> {
    if (pcm.byteLength < 9600) throw new RelayError('too_short');
    const { log, art, stt, newId = randomUUID, now = () => new Date() } = this.#deps;
    let transcript: string;
    try {
      transcript = await stt.transcribe(normalizePcm(pcm));
    } catch (cause) {
      throw new RelayError('stt_failed', { cause });
    }
    const text = transcript.replace(/\s+/g, ' ').trim();
    if (!text) throw new RelayError('no_speech');
    const id = newId();
    const attachment = art.pick(text, id);
    const message = { id, from: from.id, to: from.peer, sentAt: now().toISOString(), text, attachments: attachment ? [attachment] : [] };
    log.add(message);
    console.info(`${from.id} -> ${from.peer} ${JSON.stringify(text.slice(0, 40))} [${attachment?.name ?? '-'}]`);
    return message;
  }

  screen(device: Device): Card {
    const peer = this.#deps.devices.get(device.peer)!;
    const latest = this.#deps.log.latest(peer.id, device.id);
    return latest ? noteCard(peer, latest) : idleCard(peer);
  }
  conversation(device: Device, limit: number): readonly Message[] {
    return this.#deps.log.conversation(device.id, device.peer, limit);
  }
}
