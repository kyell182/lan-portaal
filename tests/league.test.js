const test = require('node:test');
const assert = require('node:assert');
const { registry, participants, playAll } = require('./helpers');

test('round robin: iedereen speelt tegen iedereen', () => {
  const format = registry.get('round-robin');
  for (const n of [2, 5, 6]) {
    const settings = format.normalizeSettings({ legs: 2 });
    const list = participants(n);
    const state = format.create(list, settings);
    assert.strictEqual(state.matches.length, n * (n - 1));
    const played = playAll(format, state, settings, list);
    const [table] = format.standings(played, list, settings);
    assert.strictEqual(table.rows[0].pid, 'p1');
    assert.strictEqual(table.rows[0].points, (n - 1) * 2 * 3);
  }
});

test('round robin: gelijkspel volgens instelling', () => {
  const format = registry.get('round-robin');
  const list = participants(2);
  const noDraws = format.normalizeSettings({ allowDraws: false });
  const state = format.create(list, noDraws);
  assert.throws(() => format.report(state, state.matches[0].id, { scores: [1, 1] }, noDraws), /Gelijkspel/);
  const draws = format.normalizeSettings({});
  format.report(state, state.matches[0].id, { scores: [1, 1] }, draws);
  const [table] = format.standings(state, list, draws);
  assert.deepStrictEqual(table.rows.map((r) => r.place), [1, 1]);
});

test('poules + knock-out', () => {
  const format = registry.get('groups-knockout');
  const settings = format.normalizeSettings({ groupCount: 3, qualifiersPerGroup: 2, thirdPlaceMatch: true });
  const list = participants(11);
  const state = playAll(format, format.create(list, settings), settings, list);
  assert.strictEqual(state.phase, 'knockout');
  assert.ok(format.isFinished(state));
  const tables = format.standings(state, list, settings);
  assert.strictEqual(tables[0].title, 'Knock-out');
  assert.strictEqual(tables[0].rows.find((r) => r.place === 1).pid, 'p1');
  assert.strictEqual(tables.length, 4);
});

test('swiss: geen herkansingen en juiste aantal rondes', () => {
  const format = registry.get('swiss');
  for (const n of [7, 8, 16]) {
    const settings = format.normalizeSettings({ rounds: 0 });
    const list = participants(n);
    const state = playAll(format, format.create(list, settings), settings, list, { random: true });
    assert.strictEqual(state.round, Math.ceil(Math.log2(n)));
    assert.ok(format.isFinished(state));
    const pairs = state.matches.filter((m) => m.slots[1].pid !== '__BYE__').map((m) => [m.slots[0].pid, m.slots[1].pid].sort().join());
    assert.strictEqual(new Set(pairs).size, pairs.length, 'geen herkansingen');
    const byes = state.matches.filter((m) => m.slots[1].pid === '__BYE__').map((m) => m.slots[0].pid);
    assert.strictEqual(new Set(byes).size, byes.length, 'niemand twee byes');
  }
});

test('puntentoernooi', () => {
  const format = registry.get('points');
  const settings = format.normalizeSettings({ rounds: 2, pointsTable: '10,6,3', bonusPoints: 1 });
  const list = participants(4);
  let state = format.create(list, settings);
  state = format.report(state, 'ronde-1', { entries: [{ pid: 'p2', place: 1, bonus: 3 }, { pid: 'p1', place: 2 }, { pid: 'p3', place: 3 }] }, settings, list);
  state = format.report(state, 'ronde-2', { entries: [{ pid: 'p1', place: 1 }, { pid: 'p2', place: 2 }] }, settings, list);
  assert.ok(format.isFinished(state));
  const [table] = format.standings(state, list, settings);
  assert.strictEqual(table.rows[0].pid, 'p2');
  assert.strictEqual(table.rows[0].total, 19);
  assert.strictEqual(table.rows[1].total, 16);
  state = format.advance(state, list, settings);
  assert.strictEqual(state.rounds.length, 3);
  assert.ok(!format.isFinished(state));
});
