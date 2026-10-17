const NEIGHBOUR_DISTANCE = 1;

/**
 * Anti screen-peek: wie naast, tegenover of schuin tegenover elkaar zit aan dezelfde tafel kan elkaars scherm zien.
 * Wisselt spelers tussen groepen om zulke koppels te verminderen. Best effort, nooit blokkerend.
 */
class SeatSeparation {
  /** @param seatByPid { [pid]: { table, col } } — spelers zonder tafelplaats tellen niet mee */
  constructor(seatByPid = {}) {
    this.seats = seatByPid;
  }

  get hasSeats() {
    return Object.keys(this.seats).length > 0;
  }

  /** Zelfde tafel en een kolomverschil van hooguit 1 (zelfde kant = buur, andere kant = tegenover/diagonaal). */
  canSee(pidA, pidB) {
    const a = this.seats[pidA];
    const b = this.seats[pidB];
    return !!a && !!b && !!a.table && a.table === b.table && Math.abs(a.col - b.col) <= NEIGHBOUR_DISTANCE;
  }

  conflictsIn(group) {
    let count = 0;
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) if (this.canSee(group[i], group[j])) count += 1;
    }
    return count;
  }

  total(groups) {
    return groups.reduce((sum, group) => sum + this.conflictsIn(group), 0);
  }

  /** Wisselt (voorkeur: spelers die een conflict hebben) met spelers uit andere groepen zolang het conflicten oplevert. */
  improve(groups, { rng = Math.random, attempts = 0 } = {}) {
    const result = groups.map((group) => [...group]);
    if (result.length < 2) return result;
    for (let i = 0; i < attempts; i += 1) {
      const problem = this.#randomConflicted(result, rng);
      if (!problem) break;
      this.#trySwap(result, problem, rng);
    }
    return result;
  }

  #randomConflicted(groups, rng) {
    const found = [];
    groups.forEach((group, groupIndex) => group.forEach((pid, position) => {
      if (group.some((other) => other !== pid && this.canSee(pid, other))) found.push({ groupIndex, position });
    }));
    return found.length ? found[Math.floor(rng() * found.length)] : null;
  }

  #trySwap(groups, { groupIndex, position }, rng) {
    let otherIndex = Math.floor(rng() * (groups.length - 1));
    if (otherIndex >= groupIndex) otherIndex += 1;
    const other = groups[otherIndex];
    const otherPosition = Math.floor(rng() * other.length);
    const mine = groups[groupIndex];
    const before = this.conflictsIn(mine) + this.conflictsIn(other);
    [mine[position], other[otherPosition]] = [other[otherPosition], mine[position]];
    if (this.conflictsIn(mine) + this.conflictsIn(other) >= before) {
      [mine[position], other[otherPosition]] = [other[otherPosition], mine[position]];
    }
  }
}

module.exports = SeatSeparation;
