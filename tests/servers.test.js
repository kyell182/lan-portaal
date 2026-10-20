const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Config = require('../src/core/Config');
const Container = require('../src/app/Container');

function container() {
  const c = new Container(new Config({ DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'lan-server-')), JWT_SECRET: 'x' }));
  c.lanEvents.create({ name: 'Test' });
  return c;
}

test('servers: een server hoort bij het actieve event en wordt per event gefilterd', () => {
  const c = container();
  const server = c.servers.create({ name: 'Minecraft', address: 'mc.lan:25565', details: 'Versie: 1.21' });
  assert.strictEqual(server.eventId, c.lanEvents.current().id);
  assert.strictEqual(c.servers.list({ eventId: server.eventId }).length, 1);
  assert.strictEqual(c.servers.list({ eventId: 'ander' }).length, 0);
});

test('servers: een naam is verplicht', () => {
  assert.throws(() => container().servers.create({ address: 'mc.lan' }));
});

test('servers: een event met servers kan niet verwijderd worden', () => {
  const c = container();
  c.servers.create({ name: 'Minecraft' });
  assert.throws(() => c.lanEvents.remove(c.lanEvents.current().id));
});

test('servers: het wachtwoord is enkel zichtbaar voor admins en ingelogde spelers', () => {
  const c = container();
  const server = c.servers.create({ name: 'Minecraft', password: 'geheim' });
  assert.strictEqual(c.servers.present(server, true).password, 'geheim');
  assert.strictEqual(c.servers.present(server, false, true).password, 'geheim');
  const anonymous = c.servers.present(server, false, false);
  assert.strictEqual(anonymous.password, undefined);
  assert.strictEqual(anonymous.hasPassword, true);
});
