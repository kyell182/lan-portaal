const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const WEBHOOK = 'https://discord.com/api/webhooks/123456/abc-DEF_ghi';

function setup() {
  const sent = [];
  globalThis.fetch = async (url, init) => {
    sent.push({ url, body: JSON.parse(init.body) });
    return { ok: true, status: 204, json: async () => ({}) };
  };
  const Config = require('../src/core/Config');
  const Container = require('../src/app/Container');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-'));
  const c = new Container(new Config({ DATA_DIR: dir, JWT_SECRET: 'x', PUBLIC_URL: 'https://lan.test' }));
  c.templates.seed();
  return { c, sent };
}

test('discord-plugin post start, uitslagen en winnaar', async () => {
  const { c, sent } = setup();
  const plugin = c.plugins.configure('discord', { enabled: true, settings: { webhookUrl: WEBHOOK } });
  assert.strictEqual(plugin.settings.webhookUrl, '', 'webhook wordt nooit teruggegeven');
  assert.strictEqual(plugin.secretsSet.webhookUrl, true);

  c.lanEvents.create({ name: 'VIVES LAN Test', location: 'Brugge' });
  const template = c.templates.list().find((t) => t.formatKey === 'single-elimination');
  let t = c.tournaments.create({ name: 'Rocket Cup', templateId: template.id });
  c.tournaments.setParticipants(t.id, [{ name: 'Rood' }, { name: 'Blauw' }]);
  t = c.tournaments.start(t.id);
  c.tournaments.report(t.id, t.state.matches[0].id, { scores: [3, 1] });
  await c.notifications.idle();

  const titles = sent.map((s) => s.body.embeds[0].title);
  assert.ok(titles[0].includes('VIVES LAN Test'));
  assert.ok(titles.some((x) => x.includes('Rocket Cup is gestart')));
  assert.ok(sent.some((s) => s.body.embeds[0].description.includes('**Rood** wint van Blauw (3 – 1)')));
  assert.ok(titles.some((x) => x.includes('Rood wint Rocket Cup')));
  assert.ok(sent.every((s) => s.url === WEBHOOK));
  assert.deepStrictEqual(sent[0].body.allowed_mentions, { parse: [] });
  assert.ok(sent[1].body.embeds[0].url.startsWith('https://lan.test/#/toernooien/'));
});

test('meldingen uitzetten en geheim behouden bij opslaan zonder URL', async () => {
  const { c, sent } = setup();
  c.plugins.configure('discord', { enabled: true, settings: { webhookUrl: WEBHOOK, notifyResults: false } });
  c.plugins.configure('discord', { settings: { username: 'LAN Bot', webhookUrl: '' } });
  assert.ok(c.plugins.enabled()[0].settings.webhookUrl === WEBHOOK);
  const template = c.templates.list().find((t) => t.formatKey === 'round-robin');
  let t = c.tournaments.create({ name: 'Liga', templateId: template.id });
  c.tournaments.setParticipants(t.id, [{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
  t = c.tournaments.start(t.id);
  c.tournaments.report(t.id, t.state.matches[0].id, { scores: [1, 0] });
  await c.notifications.idle();
  assert.strictEqual(sent.length, 1, 'enkel de start, geen uitslag');
  assert.strictEqual(sent[0].body.username, 'LAN Bot');
});

test('ongeldige webhook en inschakelen zonder URL worden geweigerd', () => {
  const { c } = setup();
  assert.throws(() => c.plugins.configure('discord', { settings: { webhookUrl: 'https://evil.example/x' } }), /Ongeldige invoer/);
  assert.throws(() => c.plugins.configure('discord', { enabled: true, settings: {} }), /Vul eerst in/);
});

test('mislukte verzending wordt bewaard als status', async () => {
  const { c } = setup();
  c.plugins.configure('discord', { enabled: true, settings: { webhookUrl: WEBHOOK } });
  globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  // nieuwe poster gebruikt fetch op het moment van aanmaken; vervang daarom de fetch van de plugin
  c.plugins.registry.get('discord').poster.fetch = globalThis.fetch;
  c.lanEvents.create({ name: 'Faal LAN' });
  await c.notifications.idle();
  assert.match(c.plugins.list().find((p) => p.key === 'discord').lastError, /404/);
});
