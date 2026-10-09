const TournamentFormat = require('../TournamentFormat');
const MatchFactory = require('../shared/MatchFactory');
const { bestOf, leaguePoints } = require('../shared/commonFields');
const { BYE, STATUS } = require('../shared/constants');
const HttpError = require('../../../../core/http/HttpError');
const RoundRobinFormat = require('./RoundRobinFormat');
const LeagueTable = require('./LeagueTable');
const SwissPairer = require('./SwissPairer');

/** Swiss-systeem: elke ronde speel je tegen iemand met ongeveer evenveel punten. */
class SwissFormat extends TournamentFormat {
  constructor() {
    super();
    this.league = new RoundRobinFormat();
  }

  get key() { return 'swiss'; }

  get label() { return 'Swiss-systeem'; }

  get description() { return 'Vast aantal rondes, telkens tegen een tegenstander met gelijkaardige score. Ideaal voor veel deelnemers.'; }

  get settingsFields() {
    return [
      bestOf,
      { key: 'rounds', label: 'Aantal rondes (0 = automatisch)', type: 'integer', min: 0, max: 20, default: 0 },
      ...leaguePoints,
    ];
  }

  create(participants, settings) {
    this.assertParticipants(participants);
    const pids = participants.map((p) => p.id);
    const totalRounds = settings.rounds || Math.ceil(Math.log2(pids.length));
    const half = Math.ceil(pids.length / 2);
    const top = pids.slice(0, half);
    const bottom = pids.slice(half);
    const pairs = bottom.map((pid, i) => [top[i], pid]);
    const bye = top.length > bottom.length ? top[top.length - 1] : null;
    return { round: 1, totalRounds, matches: this.#roundMatches(1, pairs, bye) };
  }

  report(state, matchId, payload, settings) {
    const match = state.matches.find((m) => m.id === matchId);
    if (match && match.round !== state.round) throw HttpError.conflict('Enkel uitslagen van de huidige ronde kunnen aangepast worden');
    return this.league.report(state, matchId, payload, settings);
  }

  canAdvance(state) {
    return state.round < state.totalRounds && this.#currentDone(state);
  }

  advance(state, participants, settings) {
    if (!this.canAdvance(state)) throw HttpError.badRequest('De huidige ronde is nog niet volledig gespeeld');
    const [table] = this.standings(state, participants, settings);
    const { pairs, bye } = SwissPairer.pair(table.rows.map((r) => r.pid), this.#played(state), this.#byes(state));
    const round = state.round + 1;
    return { ...state, round, matches: [...state.matches, ...this.#roundMatches(round, pairs, bye)] };
  }

  standings(state, participants, settings) {
    return [new LeagueTable(settings, { buchholz: true }).build(`Klassement na ronde ${state.round}`, participants, state.matches)];
  }

  isFinished(state) {
    return state.round >= state.totalRounds && this.#currentDone(state);
  }

  #roundMatches(round, pairs, bye) {
    const factory = new MatchFactory(`r${round}-`);
    const matches = pairs.map(([a, b]) => factory.create({ bracket: 'SW', round, a, b, label: `Ronde ${round}` }));
    if (bye) {
      const match = factory.create({ bracket: 'SW', round, a: bye, b: BYE, label: `Ronde ${round} (bye)` });
      Object.assign(match, { status: STATUS.DONE, winner: bye, loser: BYE, auto: true });
      matches.push(match);
    }
    return matches;
  }

  #currentDone(state) {
    return state.matches.filter((m) => m.round === state.round).every((m) => m.status === STATUS.DONE);
  }

  #played(state) {
    return new Set(state.matches.filter((m) => m.slots[1].pid !== BYE).map((m) => SwissPairer.key(m.slots[0].pid, m.slots[1].pid)));
  }

  #byes(state) {
    const count = new Map();
    for (const m of state.matches) {
      if (m.slots[1].pid === BYE) count.set(m.slots[0].pid, (count.get(m.slots[0].pid) || 0) + 1);
    }
    return count;
  }
}

module.exports = SwissFormat;
