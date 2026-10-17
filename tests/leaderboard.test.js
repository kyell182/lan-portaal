const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Config = require('../src/core/Config');
const Container = require('../src/app/Container');

const NAMES = ['Alpha', 'Beta', 'Gamma', 'Delta'];

function scenario() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-lb-'));
  const c = new Container(new Config({ DATA_DIR: dir, JWT_SECRET: 'x' }));
  const event = c.lanEvents.create({ name: 'Test' });
  const players = NAMES.map((n) => c.players.create({ nickname: n, firstName: n, lastName: 'X', checkedIn: true, eventId: event.id }));

  const round = (roundNo, extra = {}) => {
    const t = c.tournaments.create({ name: `R${roundNo}`, formatKey: 'lan-round', participantType: 'player', roundNo, countsForOverall: true, settings: { maxGroupSize: 4, ...extra } });
    const people = roundNo % 2 ? players : [...players].reverse();
    c.tournaments.setParticipants(t.id, people.map((p) => ({ name: p.nickname, refId: p.id })));
    c.tournaments.start(t.id);
    return t;
  };
  const pid = (t, player) => c.tournaments.get(t.id).participants.find((p) => p.refId === player.id).id;
  const play = (t, playersInOrder) => {
    c.tournaments.report(t.id, 'generate', {});
    c.tournaments.report(t.id, 'submit:g1:1', { by: 'crew', order: playersInOrder.map((p) => pid(t, p)) });
  };
  const rows = () => Object.fromEntries(c.leaderboard.overall().rows.map((r) => [r.nickname, r]));
  return { c, players, round, play, pid, rows };
}

test('koppelt op speler-id, ook als deelnemer-id\'s per toernooi verschillen, en telt de rondes op', () => {
  const s = scenario();
  const [a, b, cc, d] = s.players;
  const r1 = s.round(1);
  const r2 = s.round(2);
  assert.notStrictEqual(s.pid(r1, a), s.pid(r2, a));
  s.play(r1, [a, b, cc, d]);
  s.play(r2, [b, cc, a, d]);
  const rows = s.rows();
  assert.deepStrictEqual([rows.Alpha.total, rows.Beta.total, rows.Gamma.total, rows.Delta.total], [12, 15, 7, 2]);
  assert.deepStrictEqual(rows.Alpha.rounds, { 1: 10, 2: 2 });
  assert.deepStrictEqual(s.c.leaderboard.overall().rows.map((r) => r.nickname), ['Beta', 'Alpha', 'Gamma', 'Delta']);
});

test('gelijke stand: beste enkele ronde, daarna tie-break uit de admin, anders gedeelde plaats', () => {
  const s = scenario();
  const [a, b, cc, d] = s.players;
  s.play(s.round(1), [a, b, cc, d]);
  s.play(s.round(2), [b, a, d, cc]);
  let rows = s.rows();
  assert.deepStrictEqual([rows.Alpha.place, rows.Beta.place, rows.Gamma.place, rows.Delta.place], [1, 1, 3, 3]);

  s.c.players.update(b.id, { tieBreakRank: 1 });
  s.c.players.update(a.id, { tieBreakRank: 2 });
  rows = s.rows();
  assert.deepStrictEqual([rows.Beta.place, rows.Alpha.place], [1, 2]);
});

test('beste enkele ronde gaat voor de tie-break', () => {
  const s = scenario();
  const [a, b, cc, d] = s.players;
  s.play(s.round(1), [a, b, cc, d]);
  s.play(s.round(2), [cc, b, d, a]);
  s.play(s.round(3), [d, cc, b, a]);
  const rows = s.rows();
  assert.deepStrictEqual([rows.Alpha.total, rows.Beta.total], [12, 12]);
  assert.deepStrictEqual([rows.Alpha.best, rows.Beta.best], [10, 5]);
  assert.deepStrictEqual([rows.Alpha.place, rows.Beta.place], [3, 4]);
});

test('social bonus telt mee en geen privégegevens in de rijen', () => {
  const s = scenario();
  const [a, b, cc, d] = s.players;
  s.play(s.round(1), [a, b, cc, d]);
  const social = s.c.tournaments.create({ name: 'Social', formatKey: 'scoreboard', participantType: 'player' });
  s.c.tournaments.setParticipants(social.id, s.players.map((p) => ({ name: p.nickname, refId: p.id })));
  s.c.tournaments.start(social.id);
  const state = s.c.tournaments.get(social.id).state;
  s.c.tournaments.report(social.id, 'scores', { entries: [{ pid: s.pid(social, d), values: { [state.criteria[0].id]: 1 } }] });
  const rows = s.rows();
  assert.ok(rows.Delta.social > 0);
  assert.strictEqual(rows.Delta.total, rows.Delta.rounds[1] + rows.Delta.social);
  assert.ok(!('email' in rows.Alpha) && !('socials' in rows.Alpha));
});

test('onbevestigde groepen geven voorlopige punten en een teller', () => {
  const s = scenario();
  const [a, b, cc, d] = s.players;
  const r1 = s.round(1);
  s.c.tournaments.report(r1.id, 'generate', {});
  const host = s.c.tournaments.get(r1.id).state.groups[0].hostPid;
  s.c.tournaments.report(r1.id, 'submit:g1:1', { by: host, order: [a, b, cc, d].map((p) => s.pid(r1, p)) });
  let board = s.c.leaderboard.overall();
  assert.strictEqual(board.unconfirmedGroups, 1);
  assert.ok(board.rows.every((r) => r.provisional));
  s.c.tournaments.report(r1.id, 'confirm:g1:1', { by: 'crew' });
  board = s.c.leaderboard.overall();
  assert.strictEqual(board.unconfirmedGroups, 0);
  assert.ok(board.rows.every((r) => !r.provisional));
});

test('finale op stand: beste spelers samen in groep 1, eerdere hosts worden vermeden', () => {
  const s = scenario();
  const [a, b, cc, d] = s.players;
  const r1 = s.round(1);
  s.play(r1, [a, b, cc, d]);
  const finale = s.round(3, { seeding: 'standing', maxGroupSize: 2 });
  s.c.tournaments.report(finale.id, 'generate', {});
  const groups = s.c.tournaments.get(finale.id).state.groups;
  assert.deepStrictEqual(groups[0].pids, [a, b].map((p) => s.pid(finale, p)));
  assert.deepStrictEqual(groups[1].pids, [cc, d].map((p) => s.pid(finale, p)));

  const firstHost = s.c.tournaments.get(r1.id).state.groups[0].hostPid;
  const hostPlayer = s.c.tournaments.get(r1.id).participants.find((p) => p.id === firstHost).refId;
  const hostsNow = groups.map((g) => g.hostPid);
  const hostPidNow = s.pid(finale, { id: hostPlayer });
  assert.ok(!hostsNow.includes(hostPidNow));
});

test('Mijn ronde toont mijn plaats in het algemeen klassement', () => {
  const s = scenario();
  const [a, b, cc, d] = s.players;
  s.play(s.round(1), [a, b, cc, d]);
  assert.deepStrictEqual(s.c.rounds.me(b.id).overall, { place: 2, total: 5, of: 4, provisional: false });
});
