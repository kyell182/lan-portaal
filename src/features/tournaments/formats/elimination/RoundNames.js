/** Leesbare namen voor knock-outrondes. */
class RoundNames {
  static winners(round, totalRounds) {
    const fromEnd = totalRounds - round;
    if (fromEnd === 0) return 'Finale';
    if (fromEnd === 1) return 'Halve finale';
    if (fromEnd === 2) return 'Kwartfinale';
    if (fromEnd === 3) return 'Achtste finale';
    return `Ronde ${round}`;
  }

  static losers(round, totalRounds) {
    return round === totalRounds ? 'Losers finale' : `Losers ronde ${round}`;
  }
}

module.exports = RoundNames;
