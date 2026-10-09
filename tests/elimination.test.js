const test = require('node:test');
const assert = require('node:assert');
const { registry, participants, playAll } = require('./helpers');

const champion = (table) => table.rows.find((r) => r.place === 1).pid;

for (const n of [2, 3, 5, 8, 13, 16]) {
  test(`single elimination met ${n} deelnemers`, () => {
    const format = registry.get('single-elimination');
    const settings = format.normalizeSettings({ thirdPlaceMatch: true });
    const list = participants(n);
    const state = playAll(format, format.create(list, settings), settings, list);
    assert.ok(format.isFinished(state));
    const [table] = format.standings(state, list, settings);
    assert.strictEqual(champion(table), 'p1');
    if (n >= 4) {
      assert.strictEqual(table.rows.find((r) => r.place === 2).pid, 'p2');
      assert.strictEqual(table.rows.filter((r) => r.place === 3).length, 1);
    }
  });

  test(`double elimination met ${n} deelnemers (random)`, () => {
    const format = registry.get('double-elimination');
    const settings = format.normalizeSettings({});
    const list = participants(n);
    for (let i = 0; i < 20; i += 1) {
      const state = playAll(format, format.create(list, settings), settings, list, { random: true });
      assert.ok(format.isFinished(state), 'niet afgelopen');
      const [table] = format.standings(state, list, settings);
      assert.strictEqual(table.rows.filter((r) => r.place === 1).length, 1);
      assert.ok(table.rows.every((r) => r.place !== null), 'iedereen heeft een plaats');
      // niemand verliest meer dan 2 keer (behalve na reset), kampioen max 1 nederlaag
      assert.ok(table.rows.find((r) => r.place === 1).losses <= 1);
    }
  });
}

test('double elimination: favoriet wint zonder reset', () => {
  const format = registry.get('double-elimination');
  const settings = format.normalizeSettings({});
  const list = participants(8);
  const state = playAll(format, format.create(list, settings), settings, list);
  const reset = state.matches.find((m) => m.bracket === 'GF' && m.round === 2);
  assert.strictEqual(reset.status, 'skipped');
  assert.strictEqual(champion(format.standings(state, list, settings)[0]), 'p1');
});

test('uitslag corrigeren schuift juiste winnaar door', () => {
  const format = registry.get('single-elimination');
  const settings = format.normalizeSettings({});
  const list = participants(4);
  let state = format.create(list, settings);
  const first = state.matches[0];
  state = format.report(state, first.id, { scores: [2, 0] }, settings);
  state = format.report(state, first.id, { scores: [0, 2] }, settings);
  const final = state.matches.find((m) => m.round === 2);
  assert.strictEqual(final.slots[0].pid, first.slots[1].pid);
});

test('uitslag corrigeren na gespeelde volgende match wordt geweigerd', () => {
  const format = registry.get('single-elimination');
  const settings = format.normalizeSettings({});
  const list = participants(4);
  let state = format.create(list, settings);
  const [a, b, final] = state.matches;
  state = format.report(state, a.id, { scores: [2, 0] }, settings);
  state = format.report(state, b.id, { scores: [2, 0] }, settings);
  state = format.report(state, final.id, { scores: [2, 0] }, settings);
  assert.throws(() => format.report(state, a.id, { scores: [0, 2] }, settings), /Pas eerst/);
});
