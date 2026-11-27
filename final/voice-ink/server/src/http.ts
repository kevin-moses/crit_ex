import express, { type ErrorRequestHandler, type Response } from 'express';
import type { DeviceDirectory } from './devices.ts';
import { MAX_UPLOAD_BYTES, type Card, type Device } from './domain.ts';
import { bitsToPng, renderFrame } from './render/frame.ts';
import { RelayError, type VoiceRelay } from './relay.ts';
import { secondsUntilWake, WAKE_GRACE_S } from './schedule.ts';
import { noteCard, noticeCard } from './screen.ts';

const STATUS = {
  unknown_device: 404, bad_token: 401, unsupported_media_type: 415, too_large: 413,
  too_short: 422, no_speech: 422, stt_failed: 502, internal: 500,
} as const;

type Dependencies = { devices: DeviceDirectory; relay: VoiceRelay; now: () => Date };
export function createApp({ devices, relay, now }: Dependencies): express.Express {
  const app = express();
  app.disable('etag');
  app.get('/healthz', (_req, res) => { res.json({ ok: true }); });
  const base = '/api/devices/:id';
  app.use(base, (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const auth = devices.authenticate(req.params.id, req.headers.authorization);
    if (!auth.ok) {
      res.status(STATUS[auth.reason]).json({ error: auth.reason });
      return;
    }
    res.locals.device = auth.device;
    next();
  });

  function frame(res: Response, device: Device, card: Card, status: number, route: 'screen' | 'messages') {
    const bits = renderFrame(card);
    const grace = route === 'screen' ? WAKE_GRACE_S : 0;
    const sleep = secondsUntilWake(now(), device.wakeAt, device.timeZone, grace);
    console.info(`${device.id} ${route} sleep ${sleep}s`);
    res.status(status).set('X-Sleep-Seconds', String(sleep)).type('application/octet-stream').send(Buffer.from(bits));
  }

  app.get(base + '/screen', (_req, res) => {
    const device: Device = res.locals.device;
    frame(res, device, relay.screen(device), 200, 'screen');
  });
  app.get(base + '/screen.png', (_req, res) => {
    const bits = renderFrame(relay.screen(res.locals.device));
    res.type('image/png').send(bitsToPng(bits));
  });
  app.get(base + '/messages', (_req, res) => { res.json(relay.conversation(res.locals.device, 20)); });
  const audio = express.raw({ type: 'application/octet-stream', limit: MAX_UPLOAD_BYTES });
  app.post(base + '/messages', audio, async (req, res) => {
    if (!Buffer.isBuffer(req.body)) {
      res.status(STATUS.unsupported_media_type).json({ error: 'unsupported_media_type' });
      return;
    }
    const device: Device = res.locals.device;
    try {
      const message = await relay.send(device, req.body);
      res.set('X-Message-Id', message.id);
      frame(res, device, noteCard(device, message, relay.growth(devices.get(device.peer)!)), 201, 'messages');
    } catch (error) {
      if (!(error instanceof RelayError)) throw error;
      if (error.cause) console.error(error.cause);
      res.set('X-Error', error.code);
      frame(res, device, noticeCard(error.code, relay.growth(device)), STATUS[error.code], 'messages');
    }
  });

  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    const code = error?.type === 'entity.too.large' ? 'too_large' : 'internal';
    if (code === 'internal') console.error(error);
    res.status(STATUS[code]).json({ error: code });
  };
  app.use(onError);
  return app;
}
