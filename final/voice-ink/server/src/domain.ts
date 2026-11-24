export type DeviceId = string & { readonly __brand: 'DeviceId' };
export type TimeZone = string & { readonly __brand: 'TimeZone' };
export type WakeTime = { readonly hour: number; readonly minute: number };

export const PANEL = { width: 296, height: 128 } as const;
export const FRAME_BYTES = Math.ceil(PANEL.width / 8) * PANEL.height;
export const PCM_SAMPLE_RATE = 16_000;
export const MAX_UPLOAD_BYTES = 512_000;

export type NonEmpty<T> = readonly [T, ...T[]];

export type Device = {
  readonly id: DeviceId;
  readonly name: string;
  readonly peer: DeviceId;
  readonly wakeAt: WakeTime;
  readonly timeZone: TimeZone;
};

export type Attachment = { readonly kind: 'ascii'; readonly name: string; readonly lines: NonEmpty<string> };
export type AsciiAttachment = Extract<Attachment, { kind: 'ascii' }>;

export type Message = {
  readonly id: string;
  readonly from: DeviceId;
  readonly to: DeviceId;
  readonly sentAt: string;
  readonly text: string;
  readonly attachments: readonly Attachment[];
};

export type Card = { readonly text: string; readonly attachments: readonly Attachment[] };

export type SendError = 'too_short' | 'no_speech' | 'stt_failed';
