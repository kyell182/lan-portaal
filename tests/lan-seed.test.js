const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Config = require('../src/core/Config');
const Container = require('../src/app/Container');
const LanEventSeeder = require('../src/seed/LanEventSeeder');

function container() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-seed-'));
  return new Container(new Config({ DATA_DIR: dir, JWT_SECRET: 'x' }));
}

test('seeder richt event, 6 games, templates en 7 toernooien in', () => {
  const c = container();
  const report = new LanEventSeeder(c).run();
  assert.deepStrictEqual([report.games, report.tournaments], [6, 7]);

  const event = c.lanEvents.get(report.eventId);
  assert.deepStrictEqual([event.theme, event.active, event.location], ['halloween', true, 'Stuvo VIVES Brugge']);

  const rounds = c.tournaments.list({ eventId: event.id }).filter((t) => t.roundNo).sort((a, b) => a.roundNo - b.roundNo);
  assert.deepStrictEqual(rounds.map((t) => [t.roundNo, c.games.get(t.gameId).name, t.settings.mode, t.settings.matchesPerGroup, t.settings.seeding, t.countsForOverall]), [
    [1, 'Skribbl.io', 'groups', 1, 'random', true],
    [2, 'PopSauce', 'room', 1, 'random', true],
    [3, 'Smash Karts', 'groups', 2, 'random', true],
    [4, 'Tetr.io', 'room', 1, 'random', true],
    [5, 'Krunker', 'groups', 1, 'random', true],
    [6, 'Curve Fever', 'groups', 2, 'standing', true],
  ]);
  const social = c.tournaments.list({ eventId: event.id }).find((t) => t.name === 'Social bonus');
  assert.strictEqual(social.formatKey, 'scoreboard');
  assert.notStrictEqual(social.countsForOverall, true);
});

test('seeder is herhaalbaar en laat aanpassingen in de admin ongemoeid', () => {
  const c = container();
  new LanEventSeeder(c).run();
  const skribbl = c.games.list().find((g) => g.name === 'Skribbl.io');
  c.games.update(skribbl.id, { hostSteps: 'Aangepast door Jonas' });
  const again = new LanEventSeeder(c).run();
  assert.deepStrictEqual([again.templates, again.games, again.tournaments], [0, 0, 0]);
  assert.strictEqual(c.games.get(skribbl.id).hostSteps, 'Aangepast door Jonas');
  assert.strictEqual(c.lanEvents.list().length, 1);
});

test('seedMissing voegt de LAN-templates toe aan een bestaande installatie', () => {
  const c = container();
  c.templates.create({ name: 'Eigen', formatKey: 'swiss', participantType: 'player' });
  assert.strictEqual(c.templates.seedMissing(), 13);
  assert.strictEqual(c.templates.seedMissing(), 0);
  assert.ok(c.templates.list().some((t) => t.name === 'LAN Social bonus'));
});

test('Curve Fever heeft een eigen naam in het spel en een host-kaart met afwijkingen', () => {
  const c = container();
  new LanEventSeeder(c).run();
  const curve = c.games.list().find((g) => g.name === 'Curve Fever');
  assert.strictEqual(curve.needsOwnName, true);
  assert.strictEqual(curve.joinMethod, 'code+password');
  const changed = curve.hostSettings.split('\n').filter((line) => line.startsWith('*')).map((line) => line.slice(1).split('|')[0].trim());
  assert.deepStrictEqual(changed, ['Toegang', 'Rank', 'Modules', 'Raketwerpers']);
});

test('social bonus: max +8 via 4 criteria met maximum 1', () => {
  const c = container();
  const report = new LanEventSeeder(c).run();
  const social = c.tournaments.list({ eventId: report.eventId }).find((t) => t.name === 'Social bonus');
  const player = c.players.create({ nickname: 'Kyell', firstName: 'K', lastName: 'W', checkedIn: true, eventId: report.eventId });
  c.tournaments.setParticipants(social.id, [{ name: 'Kyell', refId: player.id }]);
  c.tournaments.start(social.id);
  const { criteria } = c.tournaments.get(social.id).state;
  assert.deepStrictEqual(criteria.map((x) => [x.label, x.weight, x.max]), [['Instagram', 2, 1], ['TikTok', 2, 1], ['Facebook', 2, 1], ['LinkedIn', 2, 1]]);
  const pid = c.tournaments.get(social.id).participants[0].id;
  const values = Object.fromEntries(criteria.map((x) => [x.id, 5]));
  c.tournaments.report(social.id, 'scores', { entries: [{ pid, values }] });
  assert.strictEqual(c.tournaments.standings(social.id)[0].rows[0].total, 8);
});
