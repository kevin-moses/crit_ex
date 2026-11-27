import test from 'node:test';
import assert from 'node:assert/strict';
import { idleCard, noteCard, noticeCard } from '../src/screen.ts';

test('cards show one note, an invitation, or one send notice', () => {
  assert.deepEqual(noteCard({ name: 'Ana' }, { text: 'can you grab oat milk' }), { text: 'Ana: can you grab oat milk' });
  assert.deepEqual(idleCard({ name: 'Ana' }), { text: 'Hold the button to talk to Ana.' });
  assert.deepEqual(noticeCard('too_short'), { text: 'Too short. Hold the button while you talk.' });
  assert.deepEqual(noticeCard('no_speech'), { text: "Didn't catch that. Hold to retry." });
  assert.deepEqual(noticeCard('stt_failed'), { text: "Couldn't send. Try again later." });
});
