/**
 * Cirkelmethode: iedereen speelt één keer tegen iedereen, verdeeld over rondes.
 * Bij een oneven aantal heeft elke ronde één deelnemer vrij.
 */
class RoundRobinScheduler {
  /** Geeft rondes terug als lijst van paren [pidA, pidB]. legs = 2 voor heen- en terug. */
  static schedule(pids, legs = 1) {
    const list = pids.length % 2 === 0 ? [...pids] : [...pids, null];
    const n = list.length;
    const firstLeg = [];

    for (let r = 0; r < n - 1; r += 1) {
      const pairs = [];
      for (let i = 0; i < n / 2; i += 1) {
        const a = list[i];
        const b = list[n - 1 - i];
        if (a !== null && b !== null) pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
      firstLeg.push(pairs);
      list.splice(1, 0, list.pop()); // roteer alles behalve de eerste
    }

    const rounds = [...firstLeg];
    for (let leg = 2; leg <= legs; leg += 1) {
      rounds.push(...firstLeg.map((pairs) => pairs.map(([a, b]) => (leg % 2 === 0 ? [b, a] : [a, b]))));
    }
    return rounds;
  }
}

module.exports = RoundRobinScheduler;
