import test from 'node:test';
import assert from 'node:assert/strict';
import example from '../devices.example.json' with { type: 'json' };
import { DeviceDirectory } from '../src/devices.ts';

test('directory validates required fields, unique ids and two-way pairing', () => {
  const [a, b] = example.devices;
  for (const devices of [null, [a], [a, a], [a, { ...b, peer: 'other' }], [a, b, { ...a, id: 'c', peer: 'a' }]]) {
    assert.throws(() => DeviceDirectory.parse({ devices }));
  }
  for (const [field, invalid] of Object.entries({ id: ['A', '-', 'x'.repeat(33), 'bad id'], name: ['', ' '.repeat(3), 'x'.repeat(17)], peer: ['a', ''], token: ['short', 42], wakeAt: ['24:00'], timeZone: ['Mars/Olympus'] })) {
    for (const value of [...invalid, undefined]) {
      assert.throws(() => DeviceDirectory.parse({ devices: [{ ...a, [field]: value }, b] }), new RegExp(field === 'id' ? 'id|peer' : field));
    }
  }
});

test('a bearer token authenticates its board and stays out of public device records', () => {
  const directory = DeviceDirectory.parse(example);
  const [a, b] = directory.all();
  assert.equal(a.id, 'a');
  assert.equal(b.peer, a.id);
  assert.equal('token' in a, false);
  assert.deepEqual(directory.authenticate('a', 'Bearer ' + example.devices[0].token), { ok: true, device: a });
  for (const auth of [undefined, 'Bearer wrong', 'Bearer ' + example.devices[1].token]) {
    assert.deepEqual(directory.authenticate('a', auth), { ok: false, reason: 'bad_token' });
  }
  assert.deepEqual(directory.authenticate('unknown', undefined), { ok: false, reason: 'unknown_device' });
});
