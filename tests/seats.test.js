const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Config = require('../src/core/Config');
const Container = require('../src/app/Container');
const App = require('../src/app/App');
const SeatSeparation = require('../src/features/tournaments/formats/lan/SeatSeparation');
const LanRoundFormat = require('../src/features/tournaments/formats/lan/LanRoundFormat');
const { participants } = require('./helpers');

const lcg = (seed) => { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };

function container() {
  const c = new Container(new Config({ DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'lan-seat-')), JWT_SECRET: 'x' }));
  c.lanEvents.create({ name: 'Test' });
  return c;
}

const player = (c, name) => c.players.create({ nickname: name, firstName: 'A', lastName: 'B', checkedIn: true });

test('tafels: elke tafel krijgt twee kanten tegenover elkaar, rasters zonder tafel blijven werken', () => {
  const c = container();
  const seats = c.seats.createGrid({ zone: 'Hal', rows: 2, tableSize: 6 });
  assert.strictEqual(seats.length, 12);
  const t1 = seats.filter((s) => s.table === 'T1');
  assert.deepStrictEqual(t1.map((s) => s.label), ['T1A1', 'T1A2', 'T1A3', 'T1B1', 'T1B2', 'T1B3']);
  assert.deepStrictEqual([...new Set(t1.filter((s) => s.side === 'A').map((s) => s.row))], [1]);
  assert.deepStrictEqual([...new Set(seats.filter((s) => s.table === 'T2' && s.side === 'A').map((s) => s.row))], [4]);

  const plain = c.seats.createGrid({ zone: 'Lokaal', rows: 2, cols: 3 });
  assert.ok(plain.every((s) => !s.table && !s.side));
});

test('speler kiest zelf een plaats: eerst kiezen wint en doorschuiven kan', () => {
  const c = container();
  const [a, b] = [player(c, 'Alpha'), player(c, 'Beta')];
  const [s1, s2, s3] = c.seats.createGrid({ zone: 'Z', rows: 1, cols: 3 });
  c.seats.claim(s1.id, a.id);
  assert.throws(() => c.seats.claim(s1.id, b.id), /al bezet/);
  c.seats.claim(s2.id, a.id);
  assert.strictEqual(c.seats.get(s1.id).playerId, null);
  assert.strictEqual(c.seats.get(s2.id).playerId, a.id);
  c.seats.release(a.id);
  assert.strictEqual(c.seats.get(s2.id).playerId, null);
  assert.ok(c.seats.claim(s3.id, b.id));
});

test('plaats kiezen via de API vraagt een speler-sessie', async () => {
  const c = container();
  const p = player(c, 'Alpha');
  const [seat] = c.seats.createGrid({ zone: 'Z', rows: 1, cols: 1 });
  const server = await new Promise((resolve) => { const s = new App(c).build().listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    assert.strictEqual((await fetch(`${base}/seats/${seat.id}/claim`, { method: 'POST' })).status, 401);
    const claimed = await fetch(`${base}/player-auth/claim`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: p.id }) });
    const cookie = claimed.headers.get('set-cookie').split(';')[0];
    const res = await fetch(`${base}/seats/${seat.id}/claim`, { method: 'POST', headers: { Cookie: cookie } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual((await res.json()).playerId, p.id);
    assert.strictEqual((await fetch(`${base}/seats/release`, { method: 'POST', headers: { Cookie: cookie } })).status, 204);
    assert.strictEqual(c.seats.get(seat.id).playerId, null);
  } finally { server.close(); }
});

/** 16 spelers aan 2 tafels van 8 (4 per kant). */
function hall() {
  const seatByPid = {};
  for (let i = 0; i < 16; i += 1) seatByPid[`p${i + 1}`] = { table: i < 8 ? 'T1' : 'T2', col: (i % 4) + 1 };
  return seatByPid;
}

test('screen-peek: buren en tegenover/schuin tegenover aan dezelfde tafel zien elkaars scherm', () => {
  const s = new SeatSeparation({ a: { table: 'T1', col: 2 }, b: { table: 'T1', col: 3 }, c: { table: 'T1', col: 4 }, d: { table: 'T2', col: 2 }, e: {} });
  assert.deepStrictEqual([s.canSee('a', 'b'), s.canSee('a', 'c'), s.canSee('a', 'd'), s.canSee('a', 'e'), s.canSee('a', 'zonder')], [true, false, false, false, false]);
});

test('anti screen-peek vermindert het aantal koppels en verliest geen spelers', () => {
  const separation = new SeatSeparation(hall());
  const pids = Object.keys(hall());
  for (let seed = 1; seed <= 10; seed += 1) {
    const rng = lcg(seed);
    const start = [pids.slice(0, 4), pids.slice(4, 8), pids.slice(8, 12), pids.slice(12, 16)];
    const improved = separation.improve(start, { rng, attempts: 400 });
    assert.ok(separation.total(improved) <= separation.total(start));
    assert.strictEqual(separation.total(improved), 0, `seed ${seed}`);
    assert.deepStrictEqual(improved.flat().sort(), [...pids].sort());
  }
});

test('generate gebruikt de tafelplaatsen en meldt de resterende koppels', () => {
  const format = new LanRoundFormat({ rng: lcg(7) });
  const list = participants(16);
  const settings = format.normalizeSettings({ maxGroupSize: 4 });
  const state = format.create(list, settings);
  const done = format.report(state, 'generate', { seatsByPid: hall() }, settings, list);
  const separation = new SeatSeparation(hall());
  assert.strictEqual(done.seatConflicts, separation.total(done.groups.map((g) => g.pids)));
  assert.strictEqual(done.seatConflicts, 0);

  const off = format.normalizeSettings({ maxGroupSize: 4, avoidScreenPeek: false });
  assert.strictEqual(format.report(format.create(list, off), 'generate', { seatsByPid: hall() }, off, list).seatConflicts, null);
});

test('zonder zitplaatsen verandert er niets aan het genereren', () => {
  const format = new LanRoundFormat();
  const list = participants(10);
  const settings = format.normalizeSettings({ maxGroupSize: 4 });
  const done = format.report(format.create(list, settings), 'generate', {}, settings, list);
  assert.strictEqual(done.seatConflicts, null);
  assert.strictEqual(done.groups.flatMap((g) => g.pids).length, 10);
});

test('de finale (op stand) negeert zitplaatsen', () => {
  const finale = new Container(new Config({ DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'lan-fin-')), JWT_SECRET: 'x' }));
  const template = finale.templates.seedMissing() && finale.templates.list().find((t) => t.name === 'LAN Finale op stand');
  assert.strictEqual(template.settings.avoidScreenPeek, false);
});
