const test = require('node:test');
const assert = require('node:assert');
const LanRoundFormat = require('../src/features/tournaments/formats/lan/LanRoundFormat');
const { participants } = require('./helpers');

const format = new LanRoundFormat();

/** Start een ronde met n spelers in één groep (maxGroupSize = n). */
function setup(n, overrides = {}) {
  const list = participants(n);
  const settings = format.normalizeSettings({ maxGroupSize: n, ...overrides });
  let state = format.create(list, settings);
  const act = (matchId, payload = {}) => { state = format.report(structuredClone(state), matchId, payload, settings, list); return state; };
  act('generate');
  const group = () => state.groups[0];
  const match = (no = 1) => group().matches.find((m) => m.no === no);
  const others = () => group().pids.filter((p) => p !== group().hostPid);
  return { act, group, match, others, list, settings, get state() { return state; } };
}

test('create maakt een lege state; generate verdeelt iedereen in groepen met een host', () => {
  const t = setup(20, { maxGroupSize: 8 });
  assert.deepStrictEqual(t.state.groups.map((g) => g.pids.length), [7, 7, 6]);
  assert.ok(t.state.groups.every((g) => g.pids.includes(g.hostPid)));
  assert.strictEqual(t.state.groups.flatMap((g) => g.pids).length, 20);
});

test('host kan zijn eigen uitslag niet bevestigen; niet-host kan niet insturen', () => {
  const t = setup(4);
  const host = t.group().hostPid;
  assert.throws(() => t.act('submit:g1:1', { by: t.others()[0], order: t.group().pids }), /host of de crew/);
  t.act('submit:g1:1', { by: host, order: t.group().pids });
  assert.throws(() => t.act('confirm:g1:1', { by: host }), /Enkel groepsleden/);
});

test('iedereen OK = bevestigd', () => {
  const t = setup(4);
  t.act('submit:g1:1', { by: t.group().hostPid, order: t.group().pids });
  assert.strictEqual(t.match().status, 'submitted');
  t.others().forEach((pid) => t.act('confirm:g1:1', { by: pid }));
  assert.strictEqual(t.match().status, 'confirmed');
  assert.strictEqual(t.match().confirmedBy, 'players');
});

test('één Melden = betwist; opnieuw insturen wist alle keuzes', () => {
  const t = setup(4);
  const host = t.group().hostPid;
  t.act('submit:g1:1', { by: host, order: t.group().pids });
  t.act('confirm:g1:1', { by: t.others()[0] });
  t.act('dispute:g1:1', { by: t.others()[1], reason: 'fout' });
  assert.strictEqual(t.match().status, 'disputed');
  t.act('submit:g1:1', { by: host, order: [...t.group().pids].reverse() });
  assert.strictEqual(t.match().status, 'submitted');
  assert.deepStrictEqual([t.match().checks, t.match().reports], [{}, []]);
});

test('keuze wijzigen kan tot bevestigd; daarna niet meer', () => {
  const t = setup(3);
  t.act('submit:g1:1', { by: t.group().hostPid, order: t.group().pids });
  const [a, b] = t.others();
  t.act('dispute:g1:1', { by: a });
  t.act('confirm:g1:1', { by: a });
  t.act('confirm:g1:1', { by: b });
  assert.strictEqual(t.match().status, 'confirmed');
  assert.throws(() => t.act('dispute:g1:1', { by: a }), /al bevestigd/);
});

test('crew kan een betwiste uitslag corrigeren en overschrijven', () => {
  const t = setup(4);
  t.act('submit:g1:1', { by: t.group().hostPid, order: t.group().pids });
  t.act('dispute:g1:1', { by: t.others()[0] });
  t.act('submit:g1:1', { order: [...t.group().pids].reverse() });
  assert.deepStrictEqual([t.match().status, t.match().confirmedBy], ['confirmed', 'crew']);
  const newHost = t.others()[0];
  t.act('host:g1', { pid: newHost });
  assert.strictEqual(t.group().hostPid, newHost);
});

test('speler kan geen crew-acties uitvoeren', () => {
  const t = setup(4);
  assert.throws(() => t.act('generate', { by: 'p1' }), /Enkel de crew/);
  assert.throws(() => t.act('close', { by: 'p1' }), /Enkel de crew/);
  assert.throws(() => t.act('remove:g1', { by: 'p1', pid: 'p2' }), /Enkel de crew/);
});

test('punten: 8 spelers 10-7-5-3-1, 7 spelers 10-6-4-2-1', () => {
  for (const [n, expected] of [[8, [10, 7, 5, 3, 1, 1, 1, 1]], [7, [10, 6, 4, 2, 1, 1, 1]], [6, [10, 6, 3, 1, 1, 1]]]) {
    const t = setup(n);
    t.act('submit:g1:1', { by: 'crew', order: t.group().pids });
    const points = format.results(t.state, t.settings).sort((a, b) => a.place - b.place).map((r) => r.points);
    assert.deepStrictEqual(points, expected, `n=${n}`);
  }
});

test('twee matches: som van de plaatsen, gelijkspel op beste plaats, daarna beslissing van de crew', () => {
  const t = setup(4, { matchesPerGroup: 2 });
  const [a, b, c, d] = t.group().pids;
  t.act('submit:g1:1', { by: 'crew', order: [a, b, c, d] });
  assert.deepStrictEqual(format.results(t.state, t.settings), []);
  t.act('submit:g1:2', { by: 'crew', order: [b, a, d, c] });
  const place = (pid) => format.results(t.state, t.settings).find((r) => r.pid === pid).place;
  assert.deepStrictEqual([a, b, c, d].map(place), [1, 1, 3, 3]);
  t.act('tiebreak:g1', { order: [b, a] });
  assert.deepStrictEqual([a, b].map(place), [2, 1]);

  const wins = setup(4, { matchesPerGroup: 2 });
  const [w, x, y, z] = wins.group().pids;
  wins.act('submit:g1:1', { by: 'crew', order: [w, x, y, z] });
  wins.act('submit:g1:2', { by: 'crew', order: [y, z, w, x] });
  const places = Object.fromEntries(format.results(wins.state, wins.settings).map((r) => [r.pid, r.place]));
  assert.deepStrictEqual([places[w], places[y]], [1, 1]);
});

test('no-show verwijderen: geen herschudding, grootte voor de punten telt mee', () => {
  const t = setup(8);
  const before = [...t.group().pids];
  const gone = t.others()[0];
  t.act('remove:g1', { pid: gone });
  assert.deepStrictEqual(t.group().pids, before);
  const order = t.group().pids.filter((p) => p !== gone);
  t.act('submit:g1:1', { by: 'crew', order });
  const results = format.results(t.state, t.settings);
  assert.strictEqual(results.length, 7);
  assert.deepStrictEqual(results.map((r) => r.points).sort((a, b) => b - a), [10, 6, 4, 2, 1, 1, 1]);
});

test('een verwijderde speler die nog moest controleren blokkeert de bevestiging niet', () => {
  const t = setup(4);
  t.act('submit:g1:1', { by: t.group().hostPid, order: t.group().pids });
  const [a, b, c] = t.others();
  t.act('confirm:g1:1', { by: a });
  t.act('confirm:g1:1', { by: b });
  t.act('remove:g1', { pid: c });
  assert.strictEqual(t.match().status, 'confirmed');
});

test('groep met één speler bevestigt automatisch', () => {
  const t = setup(2, { groupCount: 2 });
  assert.strictEqual(t.group().pids.length, 1);
  t.act('submit:g1:1', { by: t.group().hostPid, order: t.group().pids });
  assert.deepStrictEqual([t.match().status, t.match().confirmedBy], ['confirmed', 'auto']);
});

test('opnieuw genereren kan niet meer na een ingestuurde uitslag', () => {
  const t = setup(4);
  t.act('generate');
  t.act('submit:g1:1', { by: t.group().hostPid, order: t.group().pids });
  assert.throws(() => t.act('generate'), /niet meer opnieuw/);
});

test('ronde sluiten kan pas als alles bevestigd is, tenzij geforceerd', () => {
  const t = setup(4);
  t.act('submit:g1:1', { by: t.group().hostPid, order: t.group().pids });
  assert.throws(() => t.act('close'), /nog niet bevestigd/);
  t.act('close', { force: true });
  assert.strictEqual(format.isFinished(t.state), true);
  assert.throws(() => t.act('remove:g1', { pid: 'p1' }), /gesloten/);
  t.act('reopen');
  assert.strictEqual(format.isFinished(t.state), false);
});

test('indeling op stand vraagt de stand en zet de beste spelers in groep 1', () => {
  const list = participants(12);
  const settings = format.normalizeSettings({ maxGroupSize: 6, seeding: 'standing' });
  const state = format.create(list, settings);
  assert.throws(() => format.report(state, 'generate', {}, settings, list), /stand/);
  const standingOrder = list.map((p) => p.id).reverse();
  const done = format.report(state, 'generate', { standingOrder }, settings, list);
  assert.deepStrictEqual(done.groups[0].pids, standingOrder.slice(0, 6));
});

test('klassement toont voorlopige en definitieve punten', () => {
  const t = setup(4);
  t.act('submit:g1:1', { by: t.group().hostPid, order: t.group().pids });
  const [table] = format.standings(t.state, t.list, t.settings);
  assert.strictEqual(table.rows[0].status, 'voorlopig');
  t.act('submit:g1:1', { by: 'crew', order: t.group().pids });
  assert.strictEqual(format.standings(t.state, t.list, t.settings)[0].rows[0].status, 'definitief');
});

test('ongeldige puntentabel in de instellingen geeft een veldfout', () => {
  assert.throws(() => format.normalizeSettings({ pointsBySize: '8=0,0' }), /Ongeldige invoer/);
});

test('automatisch bevestigen: pas na de ingestelde tijd en alleen zonder melding', () => {
  const t = setup(4, { autoConfirmSeconds: 60 });
  t.act('submit:g1:1', { by: t.group().hostPid, order: t.group().pids });
  const submittedAt = Date.parse(t.match().submittedAt);
  assert.strictEqual(format.autoConfirmDue(t.state, t.settings, submittedAt + 59000), false);
  assert.strictEqual(format.autoConfirmDue(t.state, t.settings, submittedAt + 60000), true);
  t.act('autoconfirm', { now: submittedAt + 61000 });
  assert.deepStrictEqual([t.match().status, t.match().confirmedBy], ['confirmed', 'auto']);
  assert.strictEqual(format.autoConfirmDue(t.state, t.settings, submittedAt + 999000), false);
});

test('een melding of instelling 0 voorkomt automatisch bevestigen', () => {
  const disputed = setup(4, { autoConfirmSeconds: 60 });
  disputed.act('submit:g1:1', { by: disputed.group().hostPid, order: disputed.group().pids });
  disputed.act('dispute:g1:1', { by: disputed.others()[0] });
  const later = Date.parse(disputed.match().submittedAt) + 3600000;
  assert.strictEqual(format.autoConfirmDue(disputed.state, disputed.settings, later), false);

  const never = setup(4, { autoConfirmSeconds: 0 });
  never.act('submit:g1:1', { by: never.group().hostPid, order: never.group().pids });
  assert.strictEqual(format.autoConfirmDue(never.state, never.settings, Date.parse(never.match().submittedAt) + 3600000), false);
});

test('autoconfirm is een crew-actie en OK van de helft blijft de timer niet in de weg staan', () => {
  const t = setup(4, { autoConfirmSeconds: 30 });
  t.act('submit:g1:1', { by: t.group().hostPid, order: t.group().pids });
  assert.throws(() => t.act('autoconfirm', { by: 'p1' }), /Enkel de crew/);
  t.act('confirm:g1:1', { by: t.others()[0] });
  assert.strictEqual(format.autoConfirmDue(t.state, t.settings, Date.parse(t.match().submittedAt) + 31000), true);
});
