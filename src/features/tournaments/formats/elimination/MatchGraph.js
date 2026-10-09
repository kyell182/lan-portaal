const HttpError = require('../../../../core/http/HttpError');
const { BYE, STATUS } = require('../shared/constants');

/**
 * Werkt op de matches van een bracket: winnaars/verliezers doorschuiven,
 * byes automatisch afhandelen en resultaten veilig corrigeren.
 */
class MatchGraph {
  constructor(matches) {
    this.matches = matches;
    this.index = new Map(matches.map((m) => [m.id, m]));
  }

  get(id) {
    const match = this.index.get(id);
    if (!match) throw HttpError.notFound('Match niet gevonden');
    return match;
  }

  /** Lost alle matches met een bye op (na het opbouwen van de bracket). */
  resolveByes() {
    for (const match of this.matches) this.#tryAuto(match);
  }

  /** Verwerkt een uitslag. Een bestaande uitslag wordt eerst teruggedraaid. */
  report(id, { scores, winner, loser }) {
    const match = this.get(id);
    if (match.status === STATUS.DONE) this.retract(match);
    if (match.status !== STATUS.READY) throw HttpError.badRequest('Deze match is nog niet speelbaar');
    this.#complete(match, { scores, winner, loser, auto: false });
  }

  /** Draait een uitslag terug, inclusief automatisch opgeloste (bye-)matches verderop. */
  retract(match) {
    for (const ref of [match.next, match.loserNext]) {
      if (!ref) continue;
      const target = this.get(ref.matchId);
      if (target.status === STATUS.DONE) {
        if (!target.auto) throw HttpError.conflict(`Pas eerst de uitslag van match ${target.id} aan of zet die terug`);
        this.retract(target);
      }
      target.slots[ref.slot] = { pid: null, score: null };
      this.#refresh(target);
    }
    Object.assign(match, { winner: null, loser: null, auto: false, draw: false, status: STATUS.PENDING });
    match.slots.forEach((s) => { s.score = null; });
    this.#refresh(match);
  }

  #complete(match, { scores, winner, loser, auto }) {
    Object.assign(match, { winner, loser, auto, status: STATUS.DONE });
    if (scores) match.slots.forEach((s, i) => { s.score = scores[i]; });
    this.#place(match.next, winner);
    this.#place(match.loserNext, loser);
  }

  #place(ref, pid) {
    if (!ref) return;
    const target = this.get(ref.matchId);
    target.slots[ref.slot].pid = pid;
    this.#refresh(target);
    this.#tryAuto(target);
  }

  #tryAuto(match) {
    if (match.status !== STATUS.READY) return;
    const [a, b] = match.slots.map((s) => s.pid);
    if (a !== BYE && b !== BYE) return;
    const winner = a === BYE ? b : a;
    this.#complete(match, { scores: null, winner, loser: BYE, auto: true });
  }

  #refresh(match) {
    if (match.status === STATUS.DONE || match.status === STATUS.SKIPPED) return;
    const filled = match.slots.every((s) => s.pid !== null);
    match.status = filled ? STATUS.READY : STATUS.PENDING;
  }
}

module.exports = MatchGraph;
