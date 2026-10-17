const FORMAT_KEY = 'lan-round';

/**
 * Gegevens die een nieuwe indeling nodig heeft: de stand (voor de finale op stand) en wie al host was
 * (zodat bij voorkeur iemand anders host wordt). Vertaalt speler-id's naar deelnemer-id's van het toernooi.
 */
class GroupPlanning {
  constructor(leaderboard, tournamentsRepository, seatsRepository) {
    this.leaderboard = leaderboard;
    this.tournaments = tournamentsRepository;
    this.seats = seatsRepository;
  }

  contextFor(tournament) {
    const pidOf = new Map(tournament.participants.filter((p) => p.refId).map((p) => [p.refId, p.id]));
    return {
      standingOrder: this.#standingOrder(tournament, pidOf),
      seatsByPid: this.#seatsByPid(tournament, pidOf),
      avoidHostPids: [...this.#earlierHosts(tournament)].map((playerId) => pidOf.get(playerId)).filter(Boolean),
    };
  }

  /** Tafelplaats (tafel + kolom) per deelnemer-id, voor zover de speler een plaats met tafel heeft. */
  #seatsByPid(tournament, pidOf) {
    const seatsByPid = {};
    for (const seat of this.seats.filter((s) => s.playerId && s.table && (s.eventId ?? null) === (tournament.eventId ?? null))) {
      const pid = pidOf.get(seat.playerId);
      if (pid) seatsByPid[pid] = { table: seat.table, col: seat.col };
    }
    return seatsByPid;
  }

  #standingOrder(tournament, pidOf) {
    const { rows } = this.leaderboard.overall(tournament.eventId, { except: tournament.id });
    return rows.map((row) => pidOf.get(row.playerId)).filter(Boolean);
  }

  /** Speler-id's van wie in een andere ronde van dit event host was. */
  #earlierHosts(tournament) {
    const hosts = new Set();
    const others = this.tournaments.filter((t) => t.id !== tournament.id && t.formatKey === FORMAT_KEY && (t.eventId ?? null) === (tournament.eventId ?? null));
    for (const other of others) {
      const refOf = new Map(other.participants.map((p) => [p.id, p.refId]));
      for (const group of other.state?.groups ?? []) {
        if (refOf.get(group.hostPid)) hosts.add(refOf.get(group.hostPid));
      }
    }
    return hosts;
  }
}

module.exports = GroupPlanning;
