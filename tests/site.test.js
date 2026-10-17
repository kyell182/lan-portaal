const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Config = require('../src/core/Config');
const Container = require('../src/app/Container');
const App = require('../src/app/App');

function container(env = {}) {
  return new Container(new Config({ DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'lan-site-')), JWT_SECRET: 'x', ...env }));
}

test('merknaam valt terug op de omgeving en is aanpasbaar', () => {
  const c = container({ SITE_MARK: 'IEEE', SITE_NAME: 'Brugge' });
  assert.deepStrictEqual(c.site.get(), { mark: 'IEEE', name: 'Brugge' });
  assert.deepStrictEqual(c.site.update({ mark: 'GameZone', name: 'Party' }), { mark: 'GameZone', name: 'Party' });
  assert.strictEqual(c.site.title(), 'GameZone Party');
  assert.deepStrictEqual(c.site.update({ mark: '', name: '' }), { mark: 'IEEE', name: 'Brugge' });
});

test('te lange namen worden geweigerd', () => {
  assert.throws(() => container().site.update({ mark: 'x'.repeat(13) }), /Ongeldige invoer/);
});

test('standaard merknaam blijft VIVES LAN voor bestaande installaties', () => {
  assert.deepStrictEqual(container().site.get(), { mark: 'VIVES', name: 'LAN' });
});

test('site-route is publiek om te lezen, schrijven vraagt een admin; het manifest volgt de naam', async () => {
  const c = container();
  c.site.update({ mark: 'Mijn', name: 'LAN' });
  const server = await new Promise((resolve) => { const s = new App(c).build().listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.deepStrictEqual(await (await fetch(`${base}/api/site`)).json(), { mark: 'Mijn', name: 'LAN' });
    const put = await fetch(`${base}/api/site`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mark: 'X' }) });
    assert.strictEqual(put.status, 401);
    const manifest = await (await fetch(`${base}/manifest.webmanifest`)).json();
    assert.deepStrictEqual([manifest.name, manifest.short_name, manifest.start_url], ['Mijn LAN', 'Mijn LAN', '/']);
  } finally { server.close(); }
});
