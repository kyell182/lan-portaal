const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Config = require('../src/core/Config');
const Container = require('../src/app/Container');
const DemoSeeder = require('../src/presets/DemoSeeder');
const presets = require('../src/presets');

const preset = presets.get('ieee-halloween-2026');

function container() {
  return new Container(new Config({ DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'lan-demo-')), JWT_SECRET: 'x' }));
}

test('demo: dummy-spelers zijn ingecheckt, uniek benoemd en hebben een plaats', () => {
  const c = container();
  const report = new DemoSeeder(c).run(preset, { count: 40 });
  const players = c.players.list();
  assert.strictEqual(report.players, 40);
  assert.strictEqual(new Set(players.map((p) => p.nickname.toLowerCase())).size, 40);
  assert.ok(players.every((p) => p.checkedIn && /^[A-Za-z0-9_]{3,16}$/.test(p.nickname)));
  assert.strictEqual(c.seats.list().filter((s) => s.playerId).length, 40);
});

test('demo: de eerste rondes zijn gespeeld en de volgende staat klaar', () => {
  const c = container();
  new DemoSeeder(c).run(preset, { count: 30, playedRounds: 2 });
  const rounds = c.tournaments.list().filter((t) => t.roundNo).sort((a, b) => a.roundNo - b.roundNo);
  assert.deepStrictEqual(rounds.map((t) => t.status), ['finished', 'finished', 'running', 'draft', 'draft', 'draft']);
  assert.ok(rounds[2].state.groups.length > 0, 'ronde 3 heeft groepen');
  const board = c.leaderboard.overall();
  assert.strictEqual(board.rows.length, 30);
  assert.ok(board.rows.every((r) => r.total > 0));
  assert.ok(board.rows.some((r) => r.social > 0), 'social bonus telt mee');
  assert.strictEqual(board.unconfirmedGroups, 0);
});

test('demo: alle zes rondes spelen en de finale deelt in op stand', () => {
  const c = container();
  new DemoSeeder(c).run(preset, { count: 50, playedRounds: 5 });
  const finale = c.tournaments.list().find((t) => t.roundNo === 6);
  assert.strictEqual(finale.status, 'running');
  assert.ok(finale.state.groups.length >= 6);
});

test('demo weigert een data-map met bestaande spelers, behalve met force', () => {
  const c = container();
  new DemoSeeder(c).run(preset, { count: 10 });
  assert.throws(() => new DemoSeeder(c).run(preset, { count: 10 }), /lege map/);
});
