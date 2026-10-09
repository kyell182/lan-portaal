const { STATUS } = require('./constants');

/** Maakt match-objecten aan met een vaste, JSON-serialiseerbare vorm. */
class MatchFactory {
  constructor(prefix = 'm') {
    this.prefix = prefix;
    this.counter = 0;
  }

  create({ bracket, round, label = null, group = null, stage = 'main', depth = round, a = null, b = null }) {
    this.counter += 1;
    return {
      id: `${this.prefix}${this.counter}`,
      stage,
      bracket,
      group,
      round,
      order: this.counter,
      depth,
      label,
      slots: [{ pid: a, score: null }, { pid: b, score: null }],
      status: a !== null && b !== null ? STATUS.READY : STATUS.PENDING,
      winner: null,
      loser: null,
      draw: false,
      auto: false,
      next: null,
      loserNext: null,
    };
  }
}

module.exports = MatchFactory;
