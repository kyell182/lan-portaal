/** Verdeelt spelers in zo gelijk mogelijke groepen (grootste groepen eerst). Werkt voor kleine en grote LAN's. */
class BalancedGroups {
  /** Groepsgroottes: base = floor(n / g), de eerste (n mod g) groepen krijgen er één extra. */
  static sizes(count, maxGroupSize, groupCount = null) {
    if (count < 1) return [];
    const groups = groupCount ? Math.min(groupCount, count) : Math.ceil(count / maxGroupSize);
    const base = Math.floor(count / groups);
    const extra = count % groups;
    return Array.from({ length: groups }, (_, i) => base + (i < extra ? 1 : 0));
  }

  /**
   * @param pids deelnemers-id's
   * @param seeding 'random' (willekeurig) of 'standing' (groep 1 = beste spelers volgens standingOrder)
   * @param rng functie die een getal in [0, 1) geeft (injecteerbaar voor tests)
   * @returns lijst van groepen, elk een lijst pids
   */
  static build({ pids, maxGroupSize, groupCount = null, seeding = 'random', standingOrder = [], rng = Math.random }) {
    const ordered = seeding === 'standing' ? BalancedGroups.#byStanding(pids, standingOrder) : BalancedGroups.shuffle(pids, rng);
    let start = 0;
    return BalancedGroups.sizes(pids.length, maxGroupSize, groupCount).map((size) => {
      const group = ordered.slice(start, start + size);
      start += size;
      return group;
    });
  }

  /** Fisher-Yates. */
  static shuffle(list, rng = Math.random) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /** Spelers die niet in de stand voorkomen komen achteraan. */
  static #byStanding(pids, standingOrder) {
    const wanted = new Set(pids);
    const ranked = standingOrder.filter((pid) => wanted.has(pid));
    const rankedSet = new Set(ranked);
    return [...ranked, ...pids.filter((pid) => !rankedSet.has(pid))];
  }
}

module.exports = BalancedGroups;
