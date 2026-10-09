/** Zet een plaatsing om naar punten volgens een instelbare puntentabel, bv. "25,18,15,12,10". */
class PointsScale {
  constructor(table, bonusPoints = 0) {
    this.values = String(table || '')
      .split(/[,;\s]+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n));
    this.bonusPoints = Number(bonusPoints) || 0;
  }

  pointsFor(place, bonus = 0) {
    const base = place >= 1 ? this.values[place - 1] ?? 0 : 0;
    return base + bonus * this.bonusPoints;
  }
}

module.exports = PointsScale;
