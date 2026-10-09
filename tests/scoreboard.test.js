const test = require('node:test');
const assert = require('node:assert');
const { registry, participants } = require('./helpers');

const format = registry.get('scoreboard');
const settings = () => format.normalizeSettings({ criteria: 'Social gelikt=5; Social gevolgd=3' });

function started(count = 3) {
  const list = participants(count);
  return { list, state: format.create(list, settings()) };
}

test('scorebord: startcriteria komen uit de instelling', () => {
  const { state } = started();
  assert.deepStrictEqual(state.criteria.map((c) => [c.id, c.label, c.weight, c.max]), [['c1', 'Social gelikt', 5, null], ['c2', 'Social gevolgd', 3, null]]);
});

test('scorebord: totaal = aantal × punten per eenheid, gerangschikt', () => {
  const { list, state } = started();
  const scored = format.report(state, 'scores', { entries: [
    { pid: 'p1', values: { c1: 2, c2: 1 } },
    { pid: 'p2', values: { c1: 4 } },
  ] }, settings(), list);
  const [table] = format.standings(scored, list, settings());
  assert.deepStrictEqual(table.rows.map((r) => [r.pid, r.total, r.place]), [['p2', 20, 1], ['p1', 13, 2], ['p3', 0, 3]]);
});

test('scorebord: maximum per criterium kapt het aantal af', () => {
  const { list, state } = started();
  const capped = format.report(state, 'criteria', { criteria: [{ id: 'c1', label: 'Social gelikt', weight: 5, max: 2 }] }, settings(), list);
  const scored = format.report(capped, 'scores', { entries: [{ pid: 'p1', values: { c1: 10 } }] }, settings(), list);
  assert.strictEqual(format.standings(scored, list, settings())[0].rows[0].total, 10);
});

test('scorebord: criteria aanpassen behoudt punten, verwijderen wist ze', () => {
  const { list, state } = started();
  const scored = format.report(state, 'scores', { entries: [{ pid: 'p1', values: { c1: 1, c2: 1 } }] }, settings(), list);
  const edited = format.report(scored, 'criteria', { criteria: [
    { id: 'c1', label: 'Likes', weight: 10 },
    { label: 'Aanwezigheid', weight: 20 },
  ] }, settings(), list);
  assert.deepStrictEqual(edited.criteria.map((c) => c.id), ['c1', 'c3']);
  assert.deepStrictEqual(edited.scores.p1, { c1: 1 });
  assert.strictEqual(format.standings(edited, list, settings())[0].rows[0].total, 10);
});

test('scorebord: gelijke totalen delen een plaats', () => {
  const { list, state } = started(2);
  const scored = format.report(state, 'scores', { entries: [{ pid: 'p1', values: { c1: 1 } }, { pid: 'p2', values: { c1: 1 } }] }, settings(), list);
  assert.deepStrictEqual(format.standings(scored, list, settings())[0].rows.map((r) => r.place), [1, 1]);
});

test('scorebord: ongeldige invoer wordt geweigerd', () => {
  const { list, state } = started();
  assert.throws(() => format.report(state, 'scores', { entries: [{ pid: 'onbekend', values: {} }] }, settings(), list), /Onbekende deelnemer/);
  assert.throws(() => format.report(state, 'scores', { entries: [{ pid: 'p1', values: { c1: 'abc' } }] }, settings(), list), /getal/);
  assert.throws(() => format.report(state, 'criteria', { criteria: [{ label: '', weight: 1 }] }, settings(), list), /naam/);
  assert.throws(() => format.report(state, 'iets', {}, settings(), list), /Onbekende actie/);
});

test('scorebord: afsluiten en heropenen', () => {
  const { list, state } = started();
  const closed = format.report(state, 'status', { finished: true }, settings(), list);
  assert.ok(format.isFinished(closed));
  assert.ok(!format.isFinished(format.report(closed, 'status', { finished: false }, settings(), list)));
});
