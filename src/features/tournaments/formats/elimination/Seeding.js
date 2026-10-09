/** Hulpfuncties voor bracket-grootte en standaard seeding (1 vs laagste, 2 vs op-één-na-laagste...). */
class Seeding {
  static bracketSize(count) {
    let size = 2;
    while (size < count) size *= 2;
    return size;
  }

  /** Volgorde van seeds in de eerste ronde, bv. size 8 → [1,8,4,5,2,7,3,6]. */
  static order(size) {
    let order = [1, 2];
    while (order.length < size) {
      const total = order.length * 2 + 1;
      order = order.flatMap((seed) => [seed, total - seed]);
    }
    return order;
  }

  /** Geeft paren [pidA, pidB] voor ronde 1; ontbrekende seeds worden byes. */
  static pairs(pids, bye) {
    const size = Seeding.bracketSize(pids.length);
    const slots = Seeding.order(size).map((seed) => pids[seed - 1] ?? bye);
    const pairs = [];
    for (let i = 0; i < slots.length; i += 2) pairs.push([slots[i], slots[i + 1]]);
    return pairs;
  }
}

module.exports = Seeding;
