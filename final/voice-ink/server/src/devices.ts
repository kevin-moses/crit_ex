import { createHash, timingSafeEqual } from 'node:crypto';
import type { Device, DeviceId } from './domain.ts';
import { parseTimeZone, parseWakeTime } from './schedule.ts';

type AuthResult = { ok: true; device: Device } | { ok: false; reason: 'unknown_device' | 'bad_token' };

export function isDeviceId(value: unknown): value is DeviceId {
  return typeof value === 'string' && /^[a-z0-9-]{1,32}$/.test(value);
}
function digest(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

export class DeviceDirectory {
  readonly #entries = new Map<string, { device: Device; hash: Buffer }>();

  static parse(json: unknown): DeviceDirectory {
    if (!json || typeof json !== 'object' || !('devices' in json) || !Array.isArray(json.devices) || json.devices.length < 2) {
      throw new Error('devices must list at least two boards');
    }
    const directory = new DeviceDirectory();
    for (const row of json.devices as unknown[]) {
      if (!row || typeof row !== 'object') throw new Error('device entry must be an object');
      const raw = row as Record<string, unknown>;
      const { id, name, peer, token } = raw;
      if (!isDeviceId(id) || directory.get(id)) throw new Error(`Invalid or duplicate device id: ${String(id)}`);
      if (typeof name !== 'string' || !name.trim() || name.length > 16) throw new Error(`${id}: invalid name`);
      if (!isDeviceId(peer) || peer === id) throw new Error(`${id}: invalid peer`);
      if (typeof token !== 'string' || token.length < 16) throw new Error(`${id}: token must contain at least 16 characters`);
      try {
        const device = { id, name, peer, wakeAt: parseWakeTime(raw.wakeAt), timeZone: parseTimeZone(raw.timeZone) };
        directory.#entries.set(id, { device, hash: digest(token) });
      } catch (error) {
        throw new Error(`${id}: ${String(error)}`, { cause: error });
      }
    }
    for (const device of directory.all()) {
      if (directory.get(device.peer)?.peer !== device.id) throw new Error(`${device.id}: peer must point back to this board`);
    }
    return directory;
  }

  get(id: string): Device | undefined { return this.#entries.get(id)?.device; }
  all(): readonly Device[] { return Array.from(this.#entries.values(), e => e.device); }

  authenticate(id: string, authorization: string | undefined): AuthResult {
    const entry = this.#entries.get(id);
    if (!entry) return { ok: false, reason: 'unknown_device' };
    const token = authorization?.match(/^Bearer (.+)$/i)?.[1];
    if (!token || !timingSafeEqual(digest(token), entry.hash)) return { ok: false, reason: 'bad_token' };
    return { ok: true, device: entry.device };
  }
}
