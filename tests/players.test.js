const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Config = require('../src/core/Config');
const Container = require('../src/app/Container');

function container() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-pl-'));
  const c = new Container(new Config({ DATA_DIR: dir, JWT_SECRET: 'x' }));
  c.lanEvents.create({ name: 'Editie 1' });
  return c;
}

const row = (nickname, extra = {}) => ({ nickname, firstName: 'Voor', lastName: 'Achter', ...extra });

test('gamertag moet 3 tot 16 tekens zijn zonder spaties of speciale tekens', () => {
  const c = container();
  for (const bad of ['ab', 'a'.repeat(17), 'met spatie', 'emoji😀']) {
    assert.throws(() => c.players.create(row(bad)), /Ongeldige invoer/, bad);
  }
  assert.ok(c.players.create(row('Goede_Tag1')));
});

test('gamertag is uniek per event, hoofdletterongevoelig', () => {
  const c = container();
  c.players.create(row('Kyell'));
  assert.throws(() => c.players.create(row('KYELL')), /Ongeldige invoer/);
  const other = c.lanEvents.create({ name: 'Editie 2' });
  assert.ok(c.players.create({ ...row('Kyell'), eventId: other.id }));
});

test('voor- en achternaam zijn verplicht', () => {
  const c = container();
  assert.throws(() => c.players.create({ nickname: 'Zonder' }), /Ongeldige invoer/);
});

test('publiek ziet geen e-mail, toestel of socials', () => {
  const c = container();
  const player = c.players.create(row('Kyell', { email: 'a@b.be', device: 'laptop', socials: { instagram: 'kyell' } }));
  assert.deepStrictEqual(Object.keys(c.players.toPublic(player)).sort(), ['firstName', 'id', 'lastName', 'nickname', 'studyProgram']);
});

test('inchecken zet een tijdstip en naam vrijgeven maakt oude cookies ongeldig', () => {
  const c = container();
  const player = c.players.create(row('Kyell'));
  const checked = c.players.update(player.id, { checkedIn: true });
  assert.ok(checked.checkedInAt);
  const claimed = c.players.update(player.id, { claimedAt: new Date().toISOString() });
  const released = c.players.release(claimed.id);
  assert.strictEqual(released.claimVersion, 1);
  assert.ok(!released.claimedAt);
});

test('import maakt aan, werkt bij op e-mail en meldt fouten per rij', () => {
  const c = container();
  const first = c.playerImporter.run([
    row('Alpha', { email: 'a@x.be', instagram: '@alpha', socialsClaimed: 'Instagram; TikTok' }),
    row('alpha', { email: 'b@x.be' }),
    { nickname: 'Beta' },
  ]);
  assert.deepStrictEqual([first.created, first.skipped], [1, 2]);
  assert.strictEqual(first.errors[0].row, 2);

  const second = c.playerImporter.run([row('AlphaNieuw', { email: 'A@X.be', tiktok: 'alpha_tt' })]);
  assert.deepStrictEqual([second.created, second.updated], [0, 1]);
  const [player] = c.players.list();
  assert.strictEqual(player.nickname, 'AlphaNieuw');
  assert.deepStrictEqual(player.socials, { instagram: 'alpha', tiktok: 'alpha_tt' });
  assert.deepStrictEqual(player.socialsClaimed, ['instagram', 'tiktok']);
});

test('import heeft geen limiet op het aantal spelers', () => {
  const c = container();
  const rows = Array.from({ length: 1500 }, (_, i) => row(`Speler_${i}`, { email: `s${i}@x.be` }));
  assert.strictEqual(c.playerImporter.run(rows).created, 1500);
  assert.strictEqual(c.players.list().length, 1500);
});

test('alle spelers van een event wissen laat zitplaatsen en andere events met rust', () => {
  const c = container();
  const e1 = c.lanEvents.current();
  const e2 = c.lanEvents.create({ name: 'Editie 2' });
  const player = c.players.create({ ...row('Weg'), eventId: e1.id });
  c.players.create({ ...row('Blijft'), eventId: e2.id });
  const [seat] = c.seats.createGrid({ eventId: e1.id, zone: 'Z', rows: 1, cols: 1 });
  c.seats.update(seat.id, { playerId: player.id });
  assert.strictEqual(c.players.removeAllOfEvent(e1.id), 1);
  assert.strictEqual(c.seats.get(seat.id).playerId, null);
  assert.strictEqual(c.players.list().length, 1);
});
