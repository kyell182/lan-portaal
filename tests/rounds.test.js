const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Config = require('../src/core/Config');
const Container = require('../src/app/Container');
const App = require('../src/app/App');

const PLAYER_COUNT = 10;
const GROUP_SIZE = 5;

/** Start de app met een lopende ronde van 10 ingecheckte spelers (twee groepen van 5). */
async function scenario() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lan-rd-'));
  const c = new Container(new Config({ DATA_DIR: dir, JWT_SECRET: 'x' }));
  const event = c.lanEvents.create({ name: 'Test' });
  const players = Array.from({ length: PLAYER_COUNT }, (_, i) => c.players.create({
    nickname: `Speler_${i}`, firstName: 'Voor', lastName: `Naam${i}`, checkedIn: true, eventId: event.id,
  }));
  const tournament = c.tournaments.create({ name: 'R1', formatKey: 'lan-round', participantType: 'player', roundNo: 1, settings: { maxGroupSize: GROUP_SIZE } });
  c.tournaments.setParticipants(tournament.id, players.map((p) => ({ name: p.nickname, refId: p.id })));
  c.tournaments.start(tournament.id);
  c.tournaments.report(tournament.id, 'generate', {});

  const server = await new Promise((resolve) => { const s = new App(c).build().listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, url, { body, cookie } = {}) => {
    const res = await fetch(base + url, {
      method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    return { status: res.status, json: await res.json().catch(() => null), cookie: setCookie ? setCookie.split(';')[0] : null };
  };
  const claim = async (player) => (await call('POST', '/player-auth/claim', { body: { playerId: player.id } }));
  return { c, players, tournament, call, claim, close: () => server.close() };
}

const groupOf = (c, tournamentId, player) => {
  const t = c.tournaments.get(tournamentId);
  const pid = t.participants.find((p) => p.refId === player.id).id;
  return { pid, group: t.state.groups.find((g) => g.pids.includes(pid)) };
};

test('naam kiezen: eerst kiezen wint en alleen ingecheckte spelers staan in de lijst', async () => {
  const s = await scenario();
  try {
    s.c.players.create({ nickname: 'Laat_Aan', firstName: 'A', lastName: 'B', eventId: s.c.lanEvents.current().id });
    const list = await s.call('GET', '/player-auth/available');
    assert.strictEqual(list.json.length, PLAYER_COUNT);
    assert.ok(!list.json.some((p) => p.nickname === 'Laat_Aan'));

    const first = await s.claim(s.players[0]);
    assert.strictEqual(first.status, 200);
    assert.strictEqual((await s.claim(s.players[0])).status, 409);
    assert.strictEqual((await s.call('GET', '/player-auth/available')).json.length, PLAYER_COUNT - 1);
    assert.strictEqual((await s.call('GET', '/player-auth/me', { cookie: first.cookie })).json.player.nickname, 'Speler_0');
  } finally { s.close(); }
});

test('niet-ingecheckte speler kan geen naam kiezen; zonder cookie geen toegang tot Mijn ronde', async () => {
  const s = await scenario();
  try {
    const late = s.c.players.create({ nickname: 'Laat_Aan', firstName: 'A', lastName: 'B', eventId: s.c.lanEvents.current().id });
    assert.strictEqual((await s.claim(late)).status, 403);
    assert.strictEqual((await s.call('GET', '/rounds/me')).status, 401);
  } finally { s.close(); }
});

test('naam vrijgeven maakt de oude cookie ongeldig', async () => {
  const s = await scenario();
  try {
    const { cookie } = await s.claim(s.players[0]);
    assert.strictEqual((await s.call('GET', '/rounds/me', { cookie })).status, 200);
    s.c.players.release(s.players[0].id);
    assert.strictEqual((await s.call('GET', '/rounds/me', { cookie })).status, 401);
    assert.strictEqual((await s.claim(s.players[0])).status, 200);
  } finally { s.close(); }
});

test('Mijn ronde toont enkel de eigen groep, host en roominfo', async () => {
  const s = await scenario();
  try {
    const { cookie } = await s.claim(s.players[0]);
    const { group } = groupOf(s.c, s.tournament.id, s.players[0]);
    const { json } = await s.call('GET', '/rounds/me', { cookie });
    assert.strictEqual(json.round.group.members.length, GROUP_SIZE);
    assert.strictEqual(json.round.group.id, group.id);
    assert.strictEqual(json.round.group.host.pid, group.hostPid);
    assert.strictEqual(json.round.group.members.filter((m) => m.isHost).length, 1);
    assert.ok(!JSON.stringify(json).includes('@'), 'geen e-mail in het antwoord');
  } finally { s.close(); }
});

test('volledige flow: host stuurt in, anderen bevestigen via hun eigen sessie', async () => {
  const s = await scenario();
  try {
    const { group } = groupOf(s.c, s.tournament.id, s.players[0]);
    const members = s.players.filter((p) => group.pids.includes(groupOf(s.c, s.tournament.id, p).pid));
    const cookies = new Map();
    for (const p of members) cookies.set(p.id, (await s.claim(p)).cookie);
    const host = members.find((p) => groupOf(s.c, s.tournament.id, p).pid === group.hostPid);
    const others = members.filter((p) => p !== host);

    const room = await s.call('PUT', '/rounds/me/room', { cookie: cookies.get(host.id), body: { code: 'ABCD', password: 'geheim' } });
    assert.strictEqual(room.json.round.group.room.code, 'ABCD');
    assert.strictEqual((await s.call('PUT', '/rounds/me/room', { cookie: cookies.get(others[0].id), body: { code: 'X' } })).status, 403);

    assert.strictEqual((await s.call('POST', '/rounds/me/matches/1/result', { cookie: cookies.get(others[0].id), body: { order: group.pids } })).status, 403);
    const sent = await s.call('POST', '/rounds/me/matches/1/result', { cookie: cookies.get(host.id), body: { order: group.pids } });
    assert.strictEqual(sent.json.round.matches[0].status, 'submitted');
    assert.strictEqual((await s.call('POST', '/rounds/me/matches/1/confirm', { cookie: cookies.get(host.id) })).status, 403);

    for (const p of others) await s.call('POST', '/rounds/me/matches/1/confirm', { cookie: cookies.get(p.id) });
    const after = await s.call('GET', '/rounds/me', { cookie: cookies.get(others[0].id) });
    assert.strictEqual(after.json.round.matches[0].status, 'confirmed');
    assert.ok(after.json.round.myResult.points > 0);
  } finally { s.close(); }
});

test('speler uit groep A kan niets doen in groep B en bereikt geen admin-routes', async () => {
  const s = await scenario();
  try {
    const a = groupOf(s.c, s.tournament.id, s.players[0]);
    const outsider = s.players.find((p) => !a.group.pids.includes(groupOf(s.c, s.tournament.id, p).pid));
    const { cookie } = await s.claim(outsider);
    await s.call('POST', '/rounds/me/matches/1/result', { cookie, body: { order: a.group.pids } });
    assert.strictEqual(s.c.tournaments.get(s.tournament.id).state.groups.find((g) => g.id === a.group.id).matches[0].status, 'open');

    const admin = await s.call('POST', `/tournaments/${s.tournament.id}/matches/close/result`, { cookie, body: { force: true } });
    assert.strictEqual(admin.status, 401);
    assert.strictEqual((await s.call('POST', `/tournaments/${s.tournament.id}/matches/remove:${a.group.id}/result`, { cookie, body: { pid: a.pid } })).status, 401);
    assert.strictEqual((await s.call('DELETE', `/players?eventId=${s.c.lanEvents.current().id}`, { cookie })).status, 401);
  } finally { s.close(); }
});

test('optionele naam in het spel wordt per game bewaard', async () => {
  const s = await scenario();
  try {
    const game = s.c.games.create({ name: 'Curve Fever' });
    s.c.tournaments.update(s.tournament.id, { gameId: game.id });
    const { cookie } = await s.claim(s.players[0]);
    const { json } = await s.call('PUT', '/rounds/me/game-name', { cookie, body: { name: 'Kyell#1234' } });
    assert.strictEqual(json.round.myGameName, 'Kyell#1234');
    assert.strictEqual(s.c.players.get(s.players[0].id).gameNames[game.id], 'Kyell#1234');
  } finally { s.close(); }
});

test('AutoConfirmer bevestigt na de ingestelde tijd en meldt dat aan de speler', async () => {
  const s = await scenario();
  try {
    const { group } = groupOf(s.c, s.tournament.id, s.players[0]);
    const members = s.players.filter((p) => group.pids.includes(groupOf(s.c, s.tournament.id, p).pid));
    const host = members.find((p) => groupOf(s.c, s.tournament.id, p).pid === group.hostPid);
    const other = members.find((p) => p !== host);
    s.c.tournaments.report(s.tournament.id, 'submit:' + group.id + ':1', { by: group.hostPid, order: group.pids });
    assert.ok(s.c.rounds.me(other.id).round.matches[0].autoConfirmAt);

    assert.strictEqual(s.c.autoConfirmer.sweep(Date.now()), 0);
    assert.strictEqual(s.c.autoConfirmer.sweep(Date.now() + 181000), 1);
    assert.strictEqual(s.c.rounds.me(other.id).round.matches[0].status, 'confirmed');
    assert.strictEqual(s.c.autoConfirmer.sweep(Date.now() + 999000), 0);
  } finally { s.close(); }
});
