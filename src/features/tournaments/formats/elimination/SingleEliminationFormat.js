const TournamentFormat = require('../TournamentFormat');
const MatchFactory = require('../shared/MatchFactory');
const ResultParser = require('../shared/ResultParser');
const { bestOf } = require('../shared/commonFields');
const { BYE, STATUS } = require('../shared/constants');
const MatchGraph = require('./MatchGraph');
const Seeding = require('./Seeding');
const RoundNames = require('./RoundNames');
const EliminationRanking = require('./EliminationRanking');

/** Klassieke knock-out: wie verliest ligt eruit. Optioneel een kleine finale. */
class SingleEliminationFormat extends TournamentFormat {
  get key() { return 'single-elimination'; }

  get label() { return 'Single elimination (knock-out)'; }

  get description() { return 'Wie verliest, ligt eruit. Byes worden automatisch verdeeld.'; }

  get settingsFields() {
    return [bestOf, { key: 'thirdPlaceMatch', label: 'Kleine finale (3de plaats)', type: 'boolean', default: false }];
  }

  create(participants, settings, { stage = 'main', prefix = 'm' } = {}) {
    this.assertParticipants(participants);
    const factory = new MatchFactory(prefix);
    const pairs = Seeding.pairs(participants.map((p) => p.id), BYE);
    const totalRounds = Math.log2(pairs.length * 2);
    const rounds = this.#buildRounds(factory, pairs, totalRounds, stage);
    const matches = rounds.flat();
    if (settings.thirdPlaceMatch && totalRounds >= 2) matches.push(this.#thirdPlace(factory, rounds, totalRounds, stage));

    new MatchGraph(matches).resolveByes();
    return { matches, totalRounds };
  }

  report(state, matchId, payload) {
    const graph = new MatchGraph(state.matches);
    graph.report(matchId, ResultParser.parse(graph.get(matchId), payload));
    return state;
  }

  standings(state, participants) {
    return [EliminationRanking.table('Eindstand', participants, state.matches, this.eliminations(state))];
  }

  /** Map pid → diepte van uitschakeling (gebruikt voor de rangschikking). */
  eliminations(state) {
    const result = new Map();
    for (const m of state.matches) {
      if (m.status !== STATUS.DONE) continue;
      if (m.bracket === '3P') {
        if (m.winner !== BYE) result.set(m.winner, state.totalRounds - 0.5);
        continue;
      }
      if (m.loser !== BYE) result.set(m.loser, m.round);
      if (m.round === state.totalRounds) result.set(m.winner, Infinity);
    }
    return result;
  }

  isFinished(state) {
    return state.matches.every((m) => m.status === STATUS.DONE || m.status === STATUS.SKIPPED);
  }

  #buildRounds(factory, pairs, totalRounds, stage) {
    const rounds = [pairs.map(([a, b]) => factory.create({ bracket: 'W', round: 1, stage, a, b, label: RoundNames.winners(1, totalRounds) }))];
    for (let round = 2; round <= totalRounds; round += 1) {
      const previous = rounds[round - 2];
      const current = [];
      for (let i = 0; i < previous.length; i += 2) {
        const match = factory.create({ bracket: 'W', round, stage, label: RoundNames.winners(round, totalRounds) });
        previous[i].next = { matchId: match.id, slot: 0 };
        previous[i + 1].next = { matchId: match.id, slot: 1 };
        current.push(match);
      }
      rounds.push(current);
    }
    return rounds;
  }

  #thirdPlace(factory, rounds, totalRounds, stage) {
    const match = factory.create({ bracket: '3P', round: totalRounds, stage, label: 'Kleine finale' });
    rounds[totalRounds - 2].forEach((semi, i) => { semi.loserNext = { matchId: match.id, slot: i }; });
    return match;
  }
}

module.exports = SingleEliminationFormat;
