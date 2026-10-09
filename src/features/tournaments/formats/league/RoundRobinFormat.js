const TournamentFormat = require('../TournamentFormat');
const MatchFactory = require('../shared/MatchFactory');
const ResultParser = require('../shared/ResultParser');
const { bestOf, leaguePoints } = require('../shared/commonFields');
const { STATUS } = require('../shared/constants');
const RoundRobinScheduler = require('./RoundRobinScheduler');
const LeagueTable = require('./LeagueTable');
const HttpError = require('../../../../core/http/HttpError');

/** Competitie: iedereen tegen iedereen (optioneel heen en terug). */
class RoundRobinFormat extends TournamentFormat {
  get key() { return 'round-robin'; }

  get label() { return 'Round robin (competitie)'; }

  get description() { return 'Iedereen speelt tegen iedereen. Klassement op punten, daarna saldo.'; }

  get settingsFields() {
    return [bestOf, { key: 'legs', label: 'Aantal keer tegen elkaar (heen/terug)', type: 'integer', min: 1, max: 4, default: 1 }, ...leaguePoints];
  }

  create(participants, settings) {
    this.assertParticipants(participants);
    const factory = new MatchFactory('m');
    return { matches: this.buildMatches(factory, participants.map((p) => p.id), settings) };
  }

  /** Ook gebruikt door de poulefase. */
  buildMatches(factory, pids, settings, { group = null, stage = 'main' } = {}) {
    return RoundRobinScheduler.schedule(pids, settings.legs).flatMap((pairs, i) => pairs.map(([a, b]) => factory.create({
      bracket: 'RR', round: i + 1, group, stage, a, b, label: group ? `Poule ${group} – speeldag ${i + 1}` : `Speeldag ${i + 1}`,
    })));
  }

  report(state, matchId, payload, settings) {
    const match = state.matches.find((m) => m.id === matchId);
    if (!match) throw HttpError.notFound('Match niet gevonden');
    if (match.auto) throw HttpError.badRequest('Een bye heeft geen uitslag');
    RoundRobinFormat.applyResult(match, ResultParser.parse(match, payload, { allowDraws: settings.allowDraws }));
    return state;
  }

  static applyResult(match, { scores, winner, loser, draw }) {
    Object.assign(match, { winner, loser, draw, status: STATUS.DONE });
    match.slots.forEach((s, i) => { s.score = scores ? scores[i] : null; });
  }

  standings(state, participants, settings) {
    return [new LeagueTable(settings).build('Klassement', participants, state.matches)];
  }

  isFinished(state) {
    return state.matches.every((m) => m.status === STATUS.DONE);
  }
}

module.exports = RoundRobinFormat;
