/** Verdeelt deelnemers over poules volgens slangseeding (A B C C B A ...), zodat de poules even sterk zijn. */
class GroupDistributor {
  static distribute(pids, groupCount) {
    const groups = Array.from({ length: groupCount }, (_, i) => ({ name: String.fromCharCode(65 + i), pids: [] }));
    pids.forEach((pid, i) => {
      const lap = Math.floor(i / groupCount);
      const pos = i % groupCount;
      groups[lap % 2 === 0 ? pos : groupCount - 1 - pos].pids.push(pid);
    });
    return groups;
  }

  /** Volgorde van gekwalificeerden voor de knock-out: alle groepswinnaars eerst, dan alle tweedes... */
  static qualifiers(groupTables, perGroup) {
    const seeds = [];
    for (let place = 0; place < perGroup; place += 1) {
      for (const table of groupTables) {
        if (table.rows[place]) seeds.push(table.rows[place].pid);
      }
    }
    return seeds;
  }
}

module.exports = GroupDistributor;
