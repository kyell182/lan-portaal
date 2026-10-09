const RoundNames = require('./RoundNames');

/**
 * Bouwt de losers-bracket bij een winners-bracket met k rondes.
 * Oneven LB-rondes: LB-winnaars onderling (ronde 1: verliezers uit WB ronde 1).
 * Even LB-rondes: LB-winnaar tegen een verliezer die uit de winners-bracket zakt.
 */
class LosersBracketBuilder {
  constructor(factory) {
    this.factory = factory;
  }

  build(winnersRounds) {
    const k = winnersRounds.length;
    const total = 2 * (k - 1);
    const rounds = [];
    for (let j = 1; j < k; j += 1) {
      const minor = this.#minorRound(2 * j - 1, total, j === 1 ? winnersRounds[0] : rounds[rounds.length - 1], j === 1);
      rounds.push(minor);
      rounds.push(this.#majorRound(2 * j, total, minor, winnersRounds[j], j % 2 === 1));
    }
    return rounds;
  }

  /** Paren uit de vorige ronde: bij de eerste LB-ronde de verliezers, anders de winnaars. */
  #minorRound(round, total, feeders, fromWinnersBracket) {
    const matches = [];
    for (let i = 0; i < feeders.length; i += 2) {
      const match = this.#match(round, total);
      const key = fromWinnersBracket ? 'loserNext' : 'next';
      feeders[i][key] = { matchId: match.id, slot: 0 };
      feeders[i + 1][key] = { matchId: match.id, slot: 1 };
      matches.push(match);
    }
    return matches;
  }

  /** Elke LB-winnaar krijgt een verliezer uit de WB; omgekeerde volgorde beperkt herkansingen tegen dezelfde tegenstander. */
  #majorRound(round, total, previous, droppers, reverse) {
    const dropOrder = reverse ? [...droppers].reverse() : droppers;
    return previous.map((feeder, i) => {
      const match = this.#match(round, total);
      feeder.next = { matchId: match.id, slot: 0 };
      dropOrder[i].loserNext = { matchId: match.id, slot: 1 };
      return match;
    });
  }

  #match(round, total) {
    return this.factory.create({ bracket: 'L', round, label: RoundNames.losers(round, total) });
  }
}

module.exports = LosersBracketBuilder;
