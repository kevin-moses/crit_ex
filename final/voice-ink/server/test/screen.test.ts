import test from 'node:test';
import assert from 'node:assert/strict';
import { idleCard, noteCard, noticeCard } from '../src/screen.ts';

test('cards show one note, an invitation, or one send notice', () => {
  const growth = { seed: 7, iteration: 16 };
  assert.deepEqual(noteCard({ name: 'Ana' }, { text: 'can you grab oat milk' }, growth), { text: 'Ana: can you grab oat milk', growth });
  assert.deepEqual(idleCard({ name: 'Ana' }, growth), { text: 'Hold the button to talk to Ana.', growth });
  assert.deepEqual(noticeCard('too_short', growth), { text: 'Too short. Hold the button while you talk.', growth });
  assert.deepEqual(noticeCard('no_speech', growth), { text: "Didn't catch that. Hold to retry.", growth });
  assert.deepEqual(noticeCard('stt_failed', growth), { text: "Couldn't send. Try again later.", growth });
});
