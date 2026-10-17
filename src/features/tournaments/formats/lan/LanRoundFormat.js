const TournamentFormat = require('../TournamentFormat');
const HttpError = require('../../../../core/http/HttpError');
const GroupSizeScale = require('./GroupSizeScale');
const LanGroups = require('./LanGroups');
const LanResults = require('./LanResults');
const LanStandings = require('./LanStandings');
const { ResultReview, MATCH_STATUS, CHECK, CREW } = require('./ResultReview');

/** Acties (het "matchId" van de uitslag-route): `actie`, `actie:groep` of `actie:groep:match`. */
const ACTION = Object.freeze({
  GENERATE: 'generate', HOST: 'host', ROOM: 'room', REMOVE: 'remove', TIEBREAK: 'tiebreak',
  SUBMIT: 'submit', CONFIRM: 'confirm', DISPUTE: 'dispute', CLOSE: 'close', REOPEN: 'reopen',
});
const CREW_ONLY = new Set([ACTION.GENERATE, ACTION.HOST, ACTION.REMOVE, ACTION.TIEBREAK, ACTION.CLOSE, ACTION.REOPEN]);

/**
 * LAN-ronde met groepen: spelers worden willekeurig (of op stand) in gelijke groepen verdeeld,
 * de host van elke groep stuurt de volgorde in en de rest bevestigt (OK) of meldt (Melden).
 * payload.by is 'crew' (standaard) of het deelnemers-id van de speler die handelt; de server zet dat, nooit de browser.
 */
class LanRoundFormat extends TournamentFormat {
  constructor({ rng = Math.random } = {}) {
    super();
    this.groups = new LanGroups(rng);
  }

  get key() { return 'lan-round'; }

  get label() { return 'LAN-ronde (groepen)'; }

  get description() { return 'Willekeurige groepen met een host per groep; de groep bevestigt de uitslag. Punten per groepsgrootte.'; }

  get settingsFields() {
    return [
      { key: 'maxGroupSize', label: 'Max. spelers per groep', type: 'integer', min: 2, max: 200, default: 8 },
      { key: 'groupCount', label: 'Aantal groepen (leeg = automatisch)', type: 'integer', min: 1, max: 1000 },
      { key: 'matchesPerGroup', label: 'Matches per groep', type: 'integer', min: 1, max: 3, default: 1 },
      { key: 'seeding', label: 'Indeling', type: 'string', values: ['random', 'standing'], default: 'random' },
      {
        key: 'pointsBySize',
        label: 'Punten per plaats per groepsgrootte',
        type: 'string',
        maxLength: 600,
        default: '8=10,7,5,3,1,1,1,1; 7=10,6,4,2,1,1,1; 6=10,6,3,1,1,1; 5=10,6,3,1,1; 4=10,5,2,1; 3=10,4,1; 2=10,3',
      },
    ];
  }

  normalizeSettings(settings = {}) {
    const clean = super.normalizeSettings(settings);
    GroupSizeScale.validate(clean.pointsBySize);
    return clean;
  }

  /** Maakt een lege state: de crew controleert eerst de aanwezigen en genereert de groepen daarna. */
  create(participants) {
    this.assertParticipants(participants);
    return { mode: 'groups', groups: [], closed: false, matches: [] };
  }

  report(state, matchId, payload = {}, settings, participants) {
    const [action, groupId, matchNo] = String(matchId).split(':');
    const by = payload.by ?? CREW;
    if (state.closed && action !== ACTION.REOPEN) throw HttpError.conflict('De ronde is gesloten');
    if (CREW_ONLY.has(action) && by !== CREW) throw HttpError.forbidden('Enkel de crew kan dit doen');
    const now = new Date().toISOString();

    if (action === ACTION.GENERATE) return this.groups.generate(state, participants, settings, payload);
    if (action === ACTION.CLOSE) return this.#close(state, payload);
    if (action === ACTION.REOPEN) return { ...state, closed: false };
    const group = LanRoundFormat.#group(state, groupId);
    if (action === ACTION.SUBMIT || action === ACTION.CONFIRM || action === ACTION.DISPUTE) {
      this.#review(action, LanRoundFormat.#match(group, matchNo), group, payload, by, now);
    } else this.#manage(action, group, payload, by);
    return state;
  }

  standings(state, participants, settings) {
    return [LanStandings.build(state, settings)];
  }

  /** Ronde-punten per speler (voor het algemeen klassement). */
  results(state, settings) {
    return LanResults.compute(state, settings);
  }

  isFinished(state) {
    return state.closed === true;
  }

  #review(action, match, group, payload, by, now) {
    if (action === ACTION.SUBMIT) return ResultReview.submit(match, group, payload.order, by, now);
    if (action === ACTION.CONFIRM) {
      return by === CREW ? ResultReview.confirmByCrew(match, now) : ResultReview.check(match, group, by, CHECK.OK, '', now);
    }
    return ResultReview.check(match, group, by, CHECK.REPORT, payload.reason, now);
  }

  #manage(action, group, payload, by) {
    if (action === ACTION.ROOM) {
      if (by !== CREW && by !== group.hostPid) throw HttpError.forbidden('Enkel de host of de crew vult de roominfo in');
      return this.groups.setRoom(group, payload);
    }
    if (action === ACTION.HOST) return this.groups.setHost(group, payload.pid);
    if (action === ACTION.REMOVE) return this.groups.removePlayer(group, payload.pid);
    if (action === ACTION.TIEBREAK) return this.groups.setTieBreak(group, payload.order);
    throw HttpError.notFound('Onbekende actie voor een LAN-ronde');
  }

  /** Sluiten kan pas als alle uitslagen bevestigd zijn, tenzij de crew forceert. */
  #close(state, payload) {
    const open = state.groups.flatMap((g) => g.matches).filter((m) => m.status !== MATCH_STATUS.CONFIRMED).length;
    if (!state.groups.length) throw HttpError.conflict('Genereer eerst de groepen');
    if (open && payload.force !== true) throw HttpError.conflict(`${open} uitslag(en) nog niet bevestigd`);
    return { ...state, closed: true };
  }

  static #group(state, groupId) {
    const group = state.groups.find((g) => g.id === groupId);
    if (!group) throw HttpError.notFound('Groep niet gevonden');
    return group;
  }

  static #match(group, matchNo) {
    const match = group.matches.find((m) => String(m.no) === String(matchNo));
    if (!match) throw HttpError.notFound('Match niet gevonden');
    return match;
  }
}

module.exports = LanRoundFormat;
