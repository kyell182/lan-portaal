const TournamentFormat = require('../TournamentFormat');
const HttpError = require('../../../../core/http/HttpError');
const { STATUS } = require('../shared/constants');
const PointsScale = require('./PointsScale');
const PointsStandings = require('./PointsStandings');

/**
 * Puntentoernooi (free-for-all): iedereen speelt elke ronde tegelijk
 * (battle royale, racing, quiz...). Punten per plaats + optionele bonus (bv. kills).
 */
class PointsFormat extends TournamentFormat {
  get key() { return 'points'; }

  get label() { return 'Puntentoernooi (free-for-all)'; }

  get description() { return 'Elke ronde krijgt iedereen punten volgens zijn plaats (+ bonus). Hoogste totaal wint.'; }

  get settingsFields() {
    return [
      { key: 'rounds', label: 'Aantal rondes', type: 'integer', min: 1, max: 50, default: 3 },
      { key: 'pointsTable', label: 'Punten per plaats (1ste, 2de, ...)', type: 'string', maxLength: 300, default: '25,18,15,12,10,8,6,4,2,1' },
      { key: 'bonusLabel', label: 'Naam bonus (bv. Kills)', type: 'string', maxLength: 30, default: 'Bonus' },
      { key: 'bonusPoints', label: 'Punten per bonus-eenheid', type: 'number', min: 0, default: 0 },
    ];
  }

  create(participants, settings) {
    this.assertParticipants(participants);
    const rounds = Array.from({ length: settings.rounds }, (_, i) => PointsFormat.#round(i + 1));
    return { rounds, matches: [] };
  }

  /** payload: { entries: [{ pid, place, bonus }] } — wie niet vermeld wordt, krijgt 0 punten. */
  report(state, roundId, payload, settings, participants) {
    const round = state.rounds.find((r) => r.id === roundId);
    if (!round) throw HttpError.notFound('Ronde niet gevonden');
    const scale = new PointsScale(settings.pointsTable, settings.bonusPoints);
    round.entries = this.#entries(payload, participants).map((e) => ({ ...e, points: scale.pointsFor(e.place, e.bonus) }));
    round.status = STATUS.DONE;
    return state;
  }

  canAdvance(state) {
    return state.rounds.every((r) => r.status === STATUS.DONE);
  }

  /** Voegt een extra ronde toe. */
  advance(state) {
    return { ...state, rounds: [...state.rounds, PointsFormat.#round(state.rounds.length + 1)] };
  }

  standings(state, participants, settings) {
    return [PointsStandings.build(state.rounds, participants, settings.bonusLabel)];
  }

  isFinished(state) {
    return this.canAdvance(state);
  }

  #entries(payload, participants) {
    const known = new Set(participants.map((p) => p.id));
    const entries = Array.isArray(payload?.entries) ? payload.entries : [];
    const seen = new Set();
    return entries
      .filter((e) => e && e.place !== '' && e.place !== null && e.place !== undefined)
      .map((e) => {
        if (!known.has(e.pid)) throw HttpError.badRequest('Onbekende deelnemer in resultaat');
        if (seen.has(e.pid)) throw HttpError.badRequest('Deelnemer staat dubbel in resultaat');
        seen.add(e.pid);
        const place = Number(e.place);
        const bonus = Number(e.bonus) || 0;
        if (!Number.isInteger(place) || place < 1) throw HttpError.badRequest('Plaats moet een positief geheel getal zijn');
        return { pid: e.pid, place, bonus };
      });
  }

  static #round(number) {
    return { id: `ronde-${number}`, number, label: `Ronde ${number}`, status: STATUS.READY, entries: [] };
  }
}

module.exports = PointsFormat;
