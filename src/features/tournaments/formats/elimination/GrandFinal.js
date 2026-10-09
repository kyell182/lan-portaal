const HttpError = require('../../../../core/http/HttpError');
const { STATUS } = require('../shared/constants');

/**
 * Grand final van double elimination, met optionele reset:
 * wint de kampioen van de losers-bracket de eerste finale, dan volgt een beslissende tweede.
 */
class GrandFinal {
  constructor(state, resetEnabled) {
    this.first = state.matches.find((m) => m.bracket === 'GF' && m.round === 1);
    this.second = state.matches.find((m) => m.bracket === 'GF' && m.round === 2) || null;
    this.resetEnabled = resetEnabled && !!this.second;
    this.depth = (state.losersRounds || 0) + 1;
  }

  static build(factory, winnersRounds, losersRounds, withReset) {
    const wbFinal = winnersRounds[winnersRounds.length - 1][0];
    const lbFinal = losersRounds.length ? losersRounds[losersRounds.length - 1][0] : null;
    const first = factory.create({ bracket: 'GF', round: 1, label: 'Grand final' });
    wbFinal.next = { matchId: first.id, slot: 0 };
    if (lbFinal) lbFinal.next = { matchId: first.id, slot: 1 };
    else wbFinal.loserNext = { matchId: first.id, slot: 1 };
    if (!withReset) return [first];
    return [first, factory.create({ bracket: 'GF', round: 2, label: 'Grand final (reset)' })];
  }

  isFirst(match) {
    return match.id === this.first.id;
  }

  /** Een eerste finale aanpassen mag enkel als de reset nog niet gespeeld is. */
  beforeReport() {
    if (!this.second) return;
    if (this.second.status === STATUS.DONE) throw HttpError.conflict('Pas eerst de uitslag van de reset-finale aan');
    this.second.slots = [{ pid: null, score: null }, { pid: null, score: null }];
    this.second.status = STATUS.PENDING;
  }

  afterReport(first) {
    if (!this.second) return;
    const winnersChampionWon = first.winner === first.slots[0].pid;
    if (winnersChampionWon || !this.resetEnabled) {
      this.second.status = STATUS.SKIPPED;
      return;
    }
    this.second.slots = first.slots.map((s) => ({ pid: s.pid, score: null }));
    this.second.status = STATUS.READY;
  }

  applyEliminations(eliminations) {
    const decisive = this.#decisiveMatch();
    if (!decisive) return;
    eliminations.set(decisive.winner, Infinity);
    eliminations.set(decisive.loser, this.depth);
  }

  #decisiveMatch() {
    if (this.second?.status === STATUS.DONE) return this.second;
    if (this.first.status !== STATUS.DONE) return null;
    if (this.second?.status === STATUS.READY) return null; // reset moet nog gespeeld worden
    return this.first;
  }
}

module.exports = GrandFinal;
