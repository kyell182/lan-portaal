const TournamentFormat = require('../TournamentFormat');
const MatchFactory = require('../shared/MatchFactory');
const { bestOf, leaguePoints } = require('../shared/commonFields');
const { STATUS } = require('../shared/constants');
const HttpError = require('../../../../core/http/HttpError');
const RoundRobinFormat = require('./RoundRobinFormat');
const LeagueTable = require('./LeagueTable');
const GroupDistributor = require('./GroupDistributor');
const SingleEliminationFormat = require('../elimination/SingleEliminationFormat');

/**
 * Poulefase (round robin per poule) gevolgd door een knock-out met de beste uit elke poule.
 * Hergebruikt RoundRobinFormat en SingleEliminationFormat (compositie).
 */
class GroupStageFormat extends TournamentFormat {
  constructor() {
    super();
    this.league = new RoundRobinFormat();
    this.knockout = new SingleEliminationFormat();
  }

  get key() { return 'groups-knockout'; }

  get label() { return 'Poules + knock-out'; }

  get description() { return 'Eerst poules (iedereen tegen iedereen), daarna een knock-out met de besten per poule.'; }

  get minParticipants() { return 3; }

  get settingsFields() {
    return [
      bestOf,
      { key: 'groupCount', label: 'Aantal poules', type: 'integer', min: 1, max: 16, default: 2 },
      { key: 'qualifiersPerGroup', label: 'Doorstoten per poule', type: 'integer', min: 1, max: 8, default: 2 },
      { key: 'legs', label: 'Keer tegen elkaar in poule', type: 'integer', min: 1, max: 4, default: 1 },
      ...leaguePoints,
      { key: 'thirdPlaceMatch', label: 'Kleine finale (3de plaats)', type: 'boolean', default: false },
    ];
  }

  create(participants, settings) {
    this.assertParticipants(participants);
    const groups = GroupDistributor.distribute(participants.map((p) => p.id), settings.groupCount);
    if (groups.some((g) => g.pids.length < 2)) throw HttpError.badRequest('Elke poule heeft minstens 2 deelnemers nodig');
    if (settings.groupCount * settings.qualifiersPerGroup < 2) throw HttpError.badRequest('Minstens 2 deelnemers moeten doorstoten');

    const factory = new MatchFactory('g');
    const matches = groups.flatMap((g) => this.league.buildMatches(factory, g.pids, settings, { group: g.name, stage: 'groups' }));
    return { phase: 'groups', groups, matches, knockoutRounds: 0 };
  }

  report(state, matchId, payload, settings) {
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) throw HttpError.notFound('Match niet gevonden');
    if (match.stage === 'groups') {
      if (state.phase !== 'groups') throw HttpError.conflict('De poulefase is afgesloten. Zet het toernooi terug om poule-uitslagen te wijzigen.');
      return this.league.report(state, matchId, payload, settings);
    }
    this.knockout.report(this.#knockoutView(state), matchId, payload, settings);
    return state;
  }

  canAdvance(state) {
    return state.phase === 'groups' && this.#matches(state, 'groups').every((m) => m.status === STATUS.DONE);
  }

  /** Sluit de poules af en bouwt de knock-out met de gekwalificeerden. */
  advance(state, participants, settings) {
    if (!this.canAdvance(state)) throw HttpError.badRequest('Nog niet alle poulematchen zijn gespeeld');
    const tables = this.#groupTables(state, participants, settings);
    const seeds = GroupDistributor.qualifiers(tables, settings.qualifiersPerGroup);
    const qualified = seeds.map((pid) => participants.find((p) => p.id === pid));
    const ko = this.knockout.create(qualified, settings, { stage: 'knockout', prefix: 'k' });
    return { ...state, phase: 'knockout', knockoutRounds: ko.totalRounds, qualified: seeds, matches: [...state.matches, ...ko.matches] };
  }

  standings(state, participants, settings) {
    const tables = this.#groupTables(state, participants, settings);
    if (state.phase !== 'knockout') return tables;
    const qualified = participants.filter((p) => state.qualified.includes(p.id));
    const [knockout] = this.knockout.standings(this.#knockoutView(state), qualified);
    return [{ ...knockout, title: 'Knock-out' }, ...tables];
  }

  isFinished(state) {
    return state.phase === 'knockout' && this.knockout.isFinished(this.#knockoutView(state));
  }

  /** De knock-outmatches in de vorm die SingleEliminationFormat verwacht (zelfde objecten, dus wijzigingen blijven bewaard). */
  #knockoutView(state) {
    return { matches: this.#matches(state, 'knockout'), totalRounds: state.knockoutRounds };
  }

  #matches(state, stage) {
    return state.matches.filter((m) => m.stage === stage);
  }

  #groupTables(state, participants, settings) {
    const table = new LeagueTable(settings);
    return state.groups.map((g) => table.build(
      `Poule ${g.name}`,
      participants.filter((p) => g.pids.includes(p.id)),
      this.#matches(state, 'groups').filter((m) => m.group === g.name),
    ));
  }
}

module.exports = GroupStageFormat;
