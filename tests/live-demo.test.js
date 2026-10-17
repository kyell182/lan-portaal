const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Config = require('../src/core/Config');
const Container = require('../src/app/Container');
const App = require('../src/app/App');
const DemoSeeder = require('../src/presets/DemoSeeder');
const LiveDemo = require('../src/presets/live/LiveDemo');
const presets = require('../src/presets');

const PASSWORD = 'testtest1';

async function demoServer(playerCount = 12) {
  const c = new Container(new Config({ DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'lan-live-')), JWT_SECRET: 'x', ADMIN_PASSWORD: PASSWORD }));
  await c.seed();
  new DemoSeeder(c).run(presets.get('ieee-halloween-2026'), { count: playerCount });
  const server = await new Promise((resolve) => { const s = new App(c).build().listen(0, () => resolve(s)); });
  return { c, server, url: `http://127.0.0.1:${server.address().port}` };
}

test('live demo: dummy-spelers spelen rondes uit en de volgende ronde start vanzelf', async () => {
  const { c, server, url } = await demoServer();
  try {
    const lines = [];
    await new LiveDemo({ url, password: PASSWORD, speed: 0, disputeChance: 1, rounds: 3, log: (l) => lines.push(l) }).run();
    const rounds = c.tournaments.list().filter((t) => t.roundNo).sort((a, b) => a.roundNo - b.roundNo);
    assert.deepStrictEqual(rounds.map((t) => t.status), ['finished', 'finished', 'finished', 'draft', 'draft', 'draft']);
    assert.ok(lines.some((l) => l.includes('melding afgehandeld door de crew')), 'een melding is door de crew afgehandeld');
    const board = c.leaderboard.overall();
    assert.strictEqual(board.rows.length, 12);
    assert.ok(board.rows.every((r) => r.total > 0 && !r.provisional));
  } finally { server.close(); }
});

test('live demo: een speler die jij zelf gekozen hebt wordt overgeslagen en de ronde wacht op jou', async () => {
  const { c, server, url } = await demoServer();
  try {
    const round = c.tournaments.list().find((t) => t.roundNo === 1);
    const group = round.state.groups[0];
    const human = group.pids.find((pid) => pid !== group.hostPid);
    c.playerAuth.claim(round.participants.find((p) => p.id === human).refId);
    const lines = [];
    await assert.rejects(() => new LiveDemo({ url, password: PASSWORD, speed: 0, disputeChance: 0, rounds: 1, log: (l) => lines.push(l) }).run(), /onbevestigd/);
    const match = c.tournaments.get(round.id).state.groups[0].matches[0];
    assert.strictEqual(match.status, 'submitted');
    assert.ok(!match.checks[human], 'de menselijke speler heeft nog niet gekozen');
    assert.ok(Object.keys(match.checks).length >= 1, 'de andere dummy-spelers hebben wel bevestigd');
  } finally { server.close(); }
});

test('live demo: zonder juist wachtwoord stopt het meteen', async () => {
  const { server, url } = await demoServer(10);
  try {
    await assert.rejects(() => new LiveDemo({ url, password: 'fout-wachtwoord', speed: 0, rounds: 1, log: () => {} }).run(), /Ongeldige gebruikersnaam of wachtwoord/);
  } finally { server.close(); }
});

test('live demo: een ronde met twee matches per groep wordt volledig gespeeld (dezelfde host twee keer)', async () => {
  const { c, server, url } = await demoServer(16);
  try {
    await new LiveDemo({ url, password: PASSWORD, speed: 0, disputeChance: 0, rounds: 3, log: () => {} }).run();
    const smash = c.tournaments.list().find((t) => t.roundNo === 3);
    assert.ok(smash.state.groups.every((g) => g.matches.length === 2 && g.matches.every((m) => m.status === 'confirmed')));
  } finally { server.close(); }
});
