/**
 * Koppelt deelnemers met (ongeveer) evenveel punten aan elkaar, zonder herkansingen.
 * Backtracking met een limiet; lukt dat niet, dan worden herkansingen toegelaten.
 */
class SwissPairer {
  static MAX_STEPS = 50000;

  /**
   * @param sorted   pids gesorteerd van best naar slechtst
   * @param played   Set met sleutels "a|b" van reeds gespeelde paren
   * @param byeCount Map pid → aantal keer al een bye gehad
   */
  static pair(sorted, played, byeCount) {
    const list = [...sorted];
    const bye = list.length % 2 === 1 ? SwissPairer.#pickBye(list, byeCount) : null;
    if (bye) list.splice(list.indexOf(bye), 1);

    const budget = { steps: 0 };
    const pairs = SwissPairer.#search(list, played, budget) || SwissPairer.#sequential(list);
    return { pairs, bye };
  }

  static key(a, b) {
    return [a, b].sort().join('|');
  }

  /** De laagst gerangschikte deelnemer met het minst aantal byes krijgt de bye. */
  static #pickBye(list, byeCount) {
    const fewest = Math.min(...list.map((pid) => byeCount.get(pid) || 0));
    return [...list].reverse().find((pid) => (byeCount.get(pid) || 0) === fewest);
  }

  static #search(list, played, budget) {
    if (list.length === 0) return [];
    budget.steps += 1;
    if (budget.steps > SwissPairer.MAX_STEPS) return null;
    const [first, ...rest] = list;
    for (let i = 0; i < rest.length; i += 1) {
      if (played.has(SwissPairer.key(first, rest[i]))) continue;
      const remaining = rest.filter((_, j) => j !== i);
      const tail = SwissPairer.#search(remaining, played, budget);
      if (tail) return [[first, rest[i]], ...tail];
    }
    return null;
  }

  static #sequential(list) {
    const pairs = [];
    for (let i = 0; i < list.length; i += 2) pairs.push([list[i], list[i + 1]]);
    return pairs;
  }
}

module.exports = SwissPairer;
