const HttpSession = require('./HttpSession');
const BalancedGroups = require('../../features/tournaments/formats/lan/BalancedGroups');

const FORMAT_KEY = 'lan-round';
const MAX_ROOM_RESULT = 50;
const POLL_MS = 1000;
const WAIT_LOG_EVERY_POLLS = 10;
const MAX_INSTANT_POLLS = 100;
const STATUS = Object.freeze({ DRAFT: 'draft', FINISHED: 'finished' });
const CONFIRMED = 'confirmed';

/**
 * Laat dummy-spelers een ronde na ronde spelen tegen een draaiend portaal, via dezelfde API als echte telefoons:
 * hosts sturen een uitslag in, groepsleden drukken OK (soms Melden) en de crew sluit de ronde.
 * Spelers die jij zelf in de browser gekozen hebt, worden overgeslagen: het script wacht dan op jou.
 */
class LiveDemo {
  /** @param options { url, username, password, speed (0 = zonder wachttijd), disputeChance, rounds, log } */
  constructor({ url, username = 'admin', password, speed = 1, disputeChance = 0.1, rounds = Infinity, log = console.log }) {
    this.url = url;
    this.credentials = { username, password };
    this.speed = speed;
    this.disputeChance = disputeChance;
    this.maxRounds = rounds;
    this.log = log;
    this.admin = new HttpSession(url);
    this.players = new Map(); // speler-id -> belofte van een sessie (of null als die naam van iemand anders is)
  }

  async run() {
    await this.admin.post('/auth/login', this.credentials);
    for (let played = 0; played < this.maxRounds; played += 1) {
      const round = await this.#nextRound();
      if (!round) return this.log('[live] Alle rondes zijn gespeeld.');
      await this.#playRound(round);
    }
    return null;
  }

  async #nextRound() {
    const event = await this.admin.get('/events/current');
    const rounds = await this.admin.get(`/tournaments?eventId=${event.id}`);
    const open = rounds.filter((t) => t.formatKey === FORMAT_KEY && t.roundNo && t.status !== STATUS.FINISHED);
    return open.sort((a, b) => a.roundNo - b.roundNo)[0] ?? null;
  }

  async #playRound(round) {
    this.log(`[live] ${round.name}`);
    let current = round;
    if (current.status === STATUS.DRAFT) current = await this.#start(current);
    if (current.state.mode === 'groups' && !current.state.groups.length) current = await this.#action(current, 'generate');
    if (current.state.mode === 'room') await this.#playRoom(current);
    else await this.#playGroups(current);
    await this.#action(await this.admin.get(`/tournaments/${round.id}`), 'close', { force: true });
    this.log('[live] Ronde gesloten.');
  }

  async #start(round) {
    const players = await this.admin.get(`/players?eventId=${round.eventId}`);
    const present = players.filter((p) => p.checkedIn).map((p) => ({ name: p.nickname, refId: p.id }));
    await this.admin.put(`/tournaments/${round.id}/participants`, { participants: present });
    return this.admin.post(`/tournaments/${round.id}/start`, {});
  }

  #action(tournament, action, payload = {}) {
    return this.admin.post(`/tournaments/${tournament.id}/matches/${encodeURIComponent(action)}/result`, payload);
  }

  async #playGroups(round) {
    await Promise.all(round.state.groups.map((group) => this.#playGroup(round, group)));
    await this.#waitUntilConfirmed(round);
  }

  /** Groepen spelen tegelijk; de matches van één groep na elkaar. */
  async #playGroup(round, group) {
    for (const match of group.matches) await this.#playMatch(round, group, match);
  }

  async #playMatch(round, group, match) {
    const host = await this.#session(round, group.hostPid);
    if (!host) return this.log(`[live] ${group.name}, match ${match.no}: de host ben jij, stuur zelf de uitslag in.`);
    await this.#pause(2000, 8000);
    const active = group.pids.filter((p) => !group.removed.includes(p));
    await host.post(`/rounds/me/matches/${match.no}/result`, { order: BalancedGroups.shuffle(active) });
    const disputed = await this.#membersCheck(round, group, match, active.filter((p) => p !== group.hostPid));
    if (disputed) await this.#crewResolves(round, group, match);
    return null;
  }

  /** Elk groepslid drukt OK; hooguit één lid meldt. Geeft terug of er gemeld is. */
  async #membersCheck(round, group, match, members) {
    let disputed = false;
    await Promise.all(members.map(async (pid) => {
      const session = await this.#session(round, pid);
      if (!session) return;
      await this.#pause(1000, 5000);
      const dispute = !disputed && Math.random() < this.disputeChance;
      disputed ||= dispute;
      const path = `/rounds/me/matches/${match.no}/${dispute ? 'dispute' : 'confirm'}`;
      await session.post(path, dispute ? { reason: 'Volgorde klopt niet' } : {});
    }));
    return disputed;
  }

  /** De crew bevestigt een betwiste uitslag na een korte "discussie". */
  async #crewResolves(round, group, match) {
    await this.#pause(3000, 6000);
    await this.#action(round, `confirm:${group.id}:${match.no}`);
    this.log(`[live] ${group.name}, match ${match.no}: melding afgehandeld door de crew.`);
  }

  async #playRoom(round) {
    await this.#pause(3000, 6000);
    const order = BalancedGroups.shuffle(round.participants.map((p) => p.id)).slice(0, MAX_ROOM_RESULT);
    await this.#action(round, 'roomresult', { order });
    this.log('[live] Zaaluitslag ingevuld.');
  }

  /** Wacht tot alle uitslagen bevestigd zijn; bij een speler die jij bent, kan dat even duren. */
  async #waitUntilConfirmed(round) {
    for (let polls = 1; ; polls += 1) {
      const { state } = await this.admin.get(`/tournaments/${round.id}`);
      const open = state.groups.flatMap((g) => g.matches).filter((m) => m.status !== CONFIRMED).length;
      if (!open) return;
      if (this.speed === 0 && polls > MAX_INSTANT_POLLS) throw new Error('Uitslagen blijven onbevestigd');
      if (polls % WAIT_LOG_EVERY_POLLS === 0) this.log(`[live] Wacht op ${open} uitslag(en)...`);
      await new Promise((resolve) => setTimeout(resolve, this.speed === 0 ? 10 : POLL_MS));
    }
  }

  /** Aangemeld als de speler achter dit deelnemer-id, of null als iemand anders die naam al gekozen heeft. */
  async #session(round, pid) {
    const playerId = round.participants.find((p) => p.id === pid)?.refId;
    if (!this.players.has(playerId)) this.players.set(playerId, this.#claim(playerId));
    return this.players.get(playerId);
  }

  async #claim(playerId) {
    const session = new HttpSession(this.url);
    try {
      await session.post('/player-auth/claim', { playerId });
      return session;
    } catch (err) {
      if (err.status === 409 || err.status === 403) return null;
      throw err;
    }
  }

  #pause(minMs, maxMs) {
    const ms = (minMs + Math.random() * (maxMs - minMs)) * this.speed;
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }
}

module.exports = LiveDemo;
