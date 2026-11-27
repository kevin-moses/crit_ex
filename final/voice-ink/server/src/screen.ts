import type { Card, Device, Message, SendError } from './domain.ts';

export const NOTICES = {
  too_short: 'Too short. Hold the button while you talk.',
  no_speech: "Didn't catch that. Hold to retry.",
  stt_failed: "Couldn't send. Try again later.",
} satisfies Record<SendError, string>;

export function noteCard(sender: Pick<Device, 'name'>, message: Pick<Message, 'text'>): Card {
  return { text: `${sender.name}: ${message.text}` };
}

export function idleCard(peer: Pick<Device, 'name'>): Card {
  return { text: `Hold the button to talk to ${peer.name}.` };
}

export function noticeCard(error: SendError): Card {
  return { text: NOTICES[error] };
}
