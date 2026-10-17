const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Config = require('../src/core/Config');
const Container = require('../src/app/Container');
const LanRoundFormat = require('../src/features/tournaments/formats/lan/LanRoundFormat');
const RankBands = require('../src/features/tournaments/formats/lan/RankBands');
const { participants } = require('./helpers');

const format = new LanRoundFormat();

function setup(n) {
  const list = participants(n);
  const settings = format.normalizeSettings({ mode: 'room' });
  let state = format.create(list, settings);
  const act = (matchId, payload = {}) => { state = format.report(structuredClone(state), matchId, payload, settings, list); return state; };
  const points = () => Object.fromEntries(format.results(state, settings, list).map((r) => [r.pid, r.points]));
  return { act, points, list, settings, get state() { return state; } };
}

test('rangbanden: 1e, 5e, 10e, 36e en 60e plaats', () => {
  const bands = new RankBands('1=12; 2=10; 3=9; 4-5=8; 6-10=7; 11-20=5; 21-35=4; 36-50=2; rest=1');
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 10, 11, 20, 21, 35, 36, 50, 51, 60].map((p) => bands.pointsFor(p)), [12, 10, 9, 8, 8, 7, 7, 5, 5, 4, 4, 2, 2, 1, 1]);
});

test('ongeldige of lege rangbanden worden geweigerd', () => {
  for (const bad of ['', 'rest=0', '1=0', 'x=5', '5-2=3', '1=5; rest=1; rest=2']) {
    assert.throws(() => RankBands.validate(bad), /Ongeldige invoer/, bad);
  }
  assert.throws(() => format.normalizeSettings({ rankBands: 'rest=0' }), /Ongeldige invoer/);
});

test('zaalronde start leeg en zonder groepen', () => {
  const t = setup(5);
  assert.strictEqual(t.state.mode, 'room');
  assert.deepStrictEqual(t.points(), {});
  assert.throws(() => t.act('generate'), /Dit is geen zaalronde|Onbekende actie/);
});

test('crew vult de top in: ingevulden krijgen banden, de rest krijgt "rest"', () => {
  const t = setup(70);
  t.act('roomresult', { order: ['p5', 'p3', 'p9'] });
  const points = t.points();
  assert.deepStrictEqual([points.p5, points.p3, points.p9], [12, 10, 9]);
  assert.strictEqual(points.p1, 1);
  assert.strictEqual(Object.keys(points).length, 70);
});

test('speler die niet meespeelt (niet in de deelnemers) krijgt niets', () => {
  const t = setup(6);
  t.act('roomresult', { order: ['p1', 'p2'] });
  const without = t.list.filter((p) => p.id !== 'p6');
  const results = format.results(t.state, t.settings, without);
  assert.ok(!results.some((r) => r.pid === 'p6'));
  assert.strictEqual(results.length, 5);
});

test('uitslag controleren: onbekende of dubbele spelers en niet-crew worden geweigerd', () => {
  const t = setup(5);
  assert.throws(() => t.act('roomresult', { order: ['p1', 'p1'] }), /dubbel/);
  assert.throws(() => t.act('roomresult', { order: ['p99'] }), /Onbekende/);
  assert.throws(() => t.act('roomresult', { order: [] }), /Geef de uitslag/);
  assert.throws(() => t.act('roomresult', { by: 'p1', order: ['p1'] }), /Enkel de crew/);
});

test('speler meldt "mijn plaats klopt niet": enkel een melding, pas na de uitslag', () => {
  const t = setup(5);
  assert.throws(() => t.act('roomreport', { by: 'p2' }), /nog geen uitslag/);
  t.act('roomresult', { order: ['p1', 'p2'] });
  t.act('roomreport', { by: 'p2', reason: 'ik was 1e' });
  t.act('roomreport', { by: 'p2', reason: 'echt' });
  assert.strictEqual(t.state.room.reports.length, 1);
  assert.throws(() => t.act('roomreport', { by: 'p99' }), /Enkel deelnemers/);
  assert.deepStrictEqual(t.points().p1, 12);
});

test('opnieuw invullen wist de meldingen; sluiten vraagt een uitslag en geen open meldingen', () => {
  const t = setup(5);
  assert.throws(() => t.act('close'), /uitslag/);
  t.act('roomresult', { order: ['p1', 'p2'] });
  t.act('roomreport', { by: 'p2' });
  assert.throws(() => t.act('close'), /melding/);
  t.act('roomresult', { order: ['p2', 'p1'] });
  assert.deepStrictEqual(t.state.room.reports, []);
  t.act('close');
  assert.strictEqual(format.isFinished(t.state), true);
});

test('plan B: zaal omzetten naar groepen van 8 kan enkel zonder uitslag', () => {
  const t = setup(20);
  t.act('convertToGroups');
  assert.strictEqual(t.state.mode, 'groups');
  assert.deepStrictEqual(t.state.groups.map((g) => g.pids.length), [7, 7, 6]);
  assert.ok(t.state.groups.every((g) => g.hostPid));

  const withResult = setup(20);
  withResult.act('roomresult', { order: ['p1'] });
  assert.throws(() => withResult.act('convertToGroups'), /zaaluitslag/);
  assert.throws(() => setup(20).act('convertToGroups', { by: 'p1' }), /Enkel de crew/);
});

test('groepsronde weigert zaalacties', () => {
  const list = participants(8);
  const settings = format.normalizeSettings({});
  const state = format.create(list, settings);
  assert.throws(() => format.report(state, 'roomresult', { order: ['p1'] }, settings, list), /geen zaalronde/);
});

test('klassement van een zaalronde sorteert op punten', () => {
  const t = setup(4);
  t.act('roomresult', { order: ['p3', 'p1'] });
  const [table] = format.standings(t.state, t.list, t.settings);
  assert.deepStrictEqual(table.rows.slice(0, 2).map((r) => [r.pid, r.points, r.place]), [['p3', 12, 1], ['p1', 10, 2]]);
});

test('Mijn ronde bij een zaalronde: geen groep, wel roominfo en plaats', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-room-'));
  const c = new Container(new Config({ DATA_DIR: dir, JWT_SECRET: 'x' }));
  const event = c.lanEvents.create({ name: 'Test' });
  const players = Array.from({ length: 4 }, (_, i) => c.players.create({ nickname: `Speler_${i}`, firstName: 'A', lastName: 'B', checkedIn: true, eventId: event.id }));
  const t = c.tournaments.create({ name: 'PopSauce', formatKey: 'lan-round', participantType: 'player', roundNo: 2, settings: { mode: 'room' } });
  c.tournaments.setParticipants(t.id, players.map((p) => ({ name: p.nickname, refId: p.id })));
  c.tournaments.start(t.id);
  c.tournaments.report(t.id, 'room', { code: 'XYZ' });

  let me = c.rounds.me(players[0].id);
  assert.strictEqual(me.round.mode, 'room');
  assert.strictEqual(me.round.room.code, 'XYZ');
  assert.strictEqual(me.round.hasResult, false);
  assert.throws(() => c.rounds.reportRoomPlace(players[0].id), /nog geen uitslag/);

  const pid = c.tournaments.get(t.id).participants[0].id;
  c.tournaments.report(t.id, 'roomresult', { order: [pid] });
  me = c.rounds.reportRoomPlace(players[0].id, 'fout');
  assert.deepStrictEqual([me.round.iReported, me.round.myResult.points], [true, 12]);
  assert.throws(() => c.rounds.submitResult(players[0].id, 1, [pid]), /zaalronde/);
});
