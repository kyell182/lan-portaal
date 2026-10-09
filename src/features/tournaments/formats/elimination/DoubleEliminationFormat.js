const TournamentFormat = require('../TournamentFormat');
const MatchFactory = require('../shared/MatchFactory');
const ResultParser = require('../shared/ResultParser');
const { bestOf } = require('../shared/commonFields');
const { BYE, STATUS } = require('../shared/constants');
const MatchGraph = require('./MatchGraph');
const Seeding = require('./Seeding');
const EliminationRanking = require('./EliminationRanking');
const LosersBracketBuilder = require('./LosersBracketBuilder');
const GrandFinal = require('./GrandFinal');

/** Double elimination: pas na twee nederlagen ben je eruit (winners- en losers-bracket). */
class DoubleEliminationFormat extends TournamentFormat {
  get key() { return 'double-elimination'; }

  get label() { return 'Double elimination'; }

  get description() { return 'Na een eerste nederlaag ga je naar de losers-bracket. Twee keer verliezen = uitgeschakeld.'; }

  get settingsFields() {
    return [bestOf, { key: 'grandFinalReset', label: 'Grand final reset (bracket reset)', type: 'boolean', default: true }];
  }

  create(participants, settings) {
    this.assertParticipants(participants);
    const factory = new MatchFactory('m');
    const pairs = Seeding.pairs(participants.map((p) => p.id), BYE);
    const winnersRounds = this.#buildWinners(factory, pairs);
    const losersRounds = new LosersBracketBuilder(factory).build(winnersRounds);
    const grandFinal = GrandFinal.build(factory, winnersRounds, losersRounds, settings.grandFinalReset);

    const matches = [...winnersRounds.flat(), ...losersRounds.flat(), ...grandFinal];
    new MatchGraph(matches).resolveByes();
    return { matches, winnersRounds: winnersRounds.length, losersRounds: losersRounds.length };
  }

  report(state, matchId, payload, settings) {
    const graph = new MatchGraph(state.matches);
    const match = graph.get(matchId);
    const final = new GrandFinal(state, settings.grandFinalReset);
    if (final.isFirst(match)) final.beforeReport(graph);
    graph.report(matchId, ResultParser.parse(match, payload));
    if (final.isFirst(match)) final.afterReport(match);
    return state;
  }

  standings(state, participants, settings) {
    const eliminations = new Map();
    for (const m of state.matches) {
      if (m.status !== STATUS.DONE) continue;
      if (m.bracket === 'L' && m.loser !== BYE) eliminations.set(m.loser, m.round);
    }
    new GrandFinal(state, settings.grandFinalReset).applyEliminations(eliminations);
    return [EliminationRanking.table('Eindstand', participants, state.matches, eliminations)];
  }

  isFinished(state) {
    return state.matches.every((m) => m.status === STATUS.DONE || m.status === STATUS.SKIPPED);
  }

  #buildWinners(factory, pairs) {
    const total = Math.log2(pairs.length * 2);
    const label = (round) => (round === total ? 'Winners finale' : `Winners ronde ${round}`);
    const rounds = [pairs.map(([a, b]) => factory.create({ bracket: 'W', round: 1, a, b, label: label(1) }))];
    for (let round = 2; round <= total; round += 1) {
      const previous = rounds[round - 2];
      const current = [];
      for (let i = 0; i < previous.length; i += 2) {
        const match = factory.create({ bracket: 'W', round, label: label(round) });
        previous[i].next = { matchId: match.id, slot: 0 };
        previous[i + 1].next = { matchId: match.id, slot: 1 };
        current.push(match);
      }
      rounds.push(current);
    }
    return rounds;
  }
}

module.exports = DoubleEliminationFormat;
