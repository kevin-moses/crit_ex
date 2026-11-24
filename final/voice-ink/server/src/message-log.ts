import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DeviceId, Message } from './domain.ts';

export class MessageLog {
  readonly #path: string;
  readonly #messages: Message[] = [];

  private constructor(path: string) { this.#path = path; }

  static open(path: string): MessageLog {
    mkdirSync(dirname(path), { recursive: true });
    const log = new MessageLog(path);
    let contents: string;
    try {
      contents = readFileSync(path, 'utf8');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return log;
      throw error;
    }
    for (const line of contents.split('\n')) {
      if (!line) continue;
      try {
        const message = JSON.parse(line);
        if (message && typeof message.text === 'string' && Array.isArray(message.attachments) &&
            typeof message.from === 'string' && typeof message.to === 'string') log.#messages.push(message);
      } catch {
        // A crash can leave an incomplete record. Keep the preceding notes readable.
      }
    }
    if (contents && !contents.endsWith('\n')) appendFileSync(path, '\n');
    return log;
  }

  add(message: Message): void {
    appendFileSync(this.#path, JSON.stringify(message) + '\n');
    this.#messages.push(message);
  }
  latest(from: DeviceId, to: DeviceId): Message | undefined {
    return this.#messages.findLast(m => m.from === from && m.to === to);
  }
  conversation(a: DeviceId, b: DeviceId, limit: number): readonly Message[] {
    if (limit <= 0) return [];
    return this.#messages.filter(m => (m.from === a && m.to === b) || (m.from === b && m.to === a)).slice(-limit);
  }
}
