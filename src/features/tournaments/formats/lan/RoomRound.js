const HttpError = require('../../../../core/http/HttpError');
const { CREW } = require('./ResultReview');

const MAX_REASON_LENGTH = 200;
const ROOM_FIELDS = Object.freeze({ code: 60, link: 300, password: 60, note: 300 });

/** Acties van een zaalronde (iedereen speelt tegelijk): de crew vult de top in, spelers kunnen hun plaats betwisten. */
class RoomRound {
  static newRoom() {
    return { status: 'open', order: [], reports: [], info: { code: '', link: '', password: '', note: '' } };
  }

  /** De crew geeft de top in (tot zoveel namen als nodig); wie ontbreekt krijgt later de "rest"-punten. */
  static setResult(state, order, participants, now) {
    const known = new Set(participants.map((p) => p.id));
    if (!Array.isArray(order) || !order.length) throw HttpError.badRequest('Geef de uitslag van de zaal op');
    if (new Set(order).size !== order.length) throw HttpError.badRequest('Een speler staat dubbel in de uitslag');
    if (order.some((pid) => !known.has(pid))) throw HttpError.badRequest('Onbekende speler in de uitslag');
    return { ...state, room: { ...state.room, status: 'entered', order: [...order], reports: [], submittedAt: now } };
  }

  /** "Mijn plaats klopt niet": enkel een melding voor de crew, geen OK nodig. */
  static report(state, by, reason, participants, now) {
    if (by === CREW || !participants.some((p) => p.id === by)) throw HttpError.forbidden('Enkel deelnemers kunnen hun plaats melden');
    if (!state.room.order.length) throw HttpError.conflict('Er is nog geen uitslag');
    const reports = state.room.reports.filter((r) => r.pid !== by);
    reports.push({ pid: by, reason: String(reason || '').trim().slice(0, MAX_REASON_LENGTH), at: now });
    return { ...state, room: { ...state.room, reports } };
  }

  static setInfo(state, payload) {
    const info = { ...state.room.info };
    for (const [field, maxLength] of Object.entries(ROOM_FIELDS)) {
      if (payload?.[field] !== undefined) info[field] = String(payload[field]).trim().slice(0, maxLength);
    }
    return { ...state, room: { ...state.room, info } };
  }

  /** Sluiten kan met een uitslag en zonder openstaande meldingen, tenzij de crew forceert. */
  static close(state, payload) {
    if (!state.room.order.length) throw HttpError.conflict('Vul eerst de uitslag in');
    if (state.room.reports.length && payload?.force !== true) throw HttpError.conflict(`${state.room.reports.length} melding(en) nog open`);
    return { ...state, closed: true };
  }
}

module.exports = RoomRound;
