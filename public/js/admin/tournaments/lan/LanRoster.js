/** Koppelt deelnemer-id's van één toernooi aan spelers (gamertag + echte naam). */
export class LanRoster {
  constructor(tournament, players) {
    const byId = new Map(players.map((p) => [p.id, p]));
    this.byPid = new Map(tournament.participants.map((participant) => {
      const player = byId.get(participant.refId);
      return [participant.id, {
        pid: participant.id,
        nickname: participant.name,
        firstName: player?.firstName,
        lastName: player?.lastName,
      }];
    }));
  }

  member(pid) {
    return this.byPid.get(pid) ?? { pid, nickname: '?' };
  }

  members(pids) {
    return pids.map((pid) => this.member(pid));
  }

  all() {
    return [...this.byPid.values()];
  }
}
