const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Config = require('../src/core/Config');
const Container = require('../src/app/Container');

function container() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-ev-'));
  const c = new Container(new Config({ DATA_DIR: dir, JWT_SECRET: 'x' }));
  c.templates.seed();
  return c;
}

test('eerste event neemt bestaande data over en wordt actief', () => {
  const c = container();
  const template = c.templates.list()[0];
  const before = c.tournaments.create({ name: 'Oud toernooi', templateId: template.id });
  const ev = c.lanEvents.create({ name: 'Editie 1' });
  assert.strictEqual(ev.active, true);
  assert.strictEqual(c.tournaments.get(before.id).eventId, ev.id);
});

test('slechts één actief event en nieuwe items gaan naar het actieve event', () => {
  const c = container();
  const e1 = c.lanEvents.create({ name: 'Editie 1' });
  const e2 = c.lanEvents.create({ name: 'Editie 2', active: true });
  assert.strictEqual(c.lanEvents.get(e1.id).active, false);
  assert.strictEqual(c.lanEvents.current().id, e2.id);
  const seats = c.seats.createGrid({ zone: 'B.104', rows: 1, cols: 2 });
  assert.ok(seats.every((s) => s.eventId === e2.id));
  assert.strictEqual(c.seats.list({ eventId: e1.id }).length, 0);
  assert.strictEqual(c.seats.list({ eventId: e2.id }).length, 2);
});

test('event met inhoud kan niet verwijderd worden, leeg event wel', () => {
  const c = container();
  const e1 = c.lanEvents.create({ name: 'Editie 1' });
  const e2 = c.lanEvents.create({ name: 'Leeg' });
  c.prizes.create({ name: 'Headset', eventId: e1.id });
  assert.throws(() => c.lanEvents.remove(e1.id), /prijzen/);
  c.lanEvents.remove(e2.id);
  assert.strictEqual(c.lanEvents.list().length, 1);
});

test('speler kan in verschillende events een plaats hebben, maar niet twee in hetzelfde', () => {
  const c = container();
  const player = c.players.create({ nickname: 'Kyell' });
  const e1 = c.lanEvents.create({ name: 'Editie 1' });
  const e2 = c.lanEvents.create({ name: 'Editie 2' });
  const [a1, a2] = c.seats.createGrid({ eventId: e1.id, zone: 'Aula', rows: 1, cols: 2 });
  const [b1] = c.seats.createGrid({ eventId: e2.id, zone: 'Aula', rows: 1, cols: 1 });
  c.seats.update(a1.id, { playerId: player.id });
  c.seats.update(b1.id, { playerId: player.id });
  assert.throws(() => c.seats.update(a2.id, { playerId: player.id }), /zit al/);
});

test('alleen Discord-links toegelaten als invite', () => {
  const c = container();
  assert.throws(() => c.lanEvents.create({ name: 'X', discordUrl: 'javascript:alert(1)' }), /Ongeldige invoer/);
  assert.ok(c.lanEvents.create({ name: 'Y', discordUrl: 'https://discord.gg/vives' }));
});
