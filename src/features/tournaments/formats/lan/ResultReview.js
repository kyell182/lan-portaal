const HttpError = require('../../../../core/http/HttpError');
const GroupMembers = require('./GroupMembers');

const MATCH_STATUS = Object.freeze({ OPEN: 'open', SUBMITTED: 'submitted', CONFIRMED: 'confirmed', DISPUTED: 'disputed' });
const CONFIRMED_BY = Object.freeze({ PLAYERS: 'players', AUTO: 'auto', CREW: 'crew' });
const CHECK = Object.freeze({ OK: 'ok', REPORT: 'report' });
/** Wie handelt: een speler-id, of de crew (admin). */
const CREW = 'crew';
const MAX_REASON_LENGTH = 200;
const MAX_PROOF_LENGTH = 300;

/**
 * Statusmachine van één groepsmatch (dubbele beveiliging):
 * open → submitted (host stuurt in) → confirmed (iedereen OK) of disputed (iemand meldt).
 * Muteert de meegegeven match; de state is al een kopie.
 */
class ResultReview {
  static newMatch(no) {
    return { no, status: MATCH_STATUS.OPEN, order: [], submittedBy: null, submittedAt: null, proofUrl: null, checks: {}, reports: [], confirmedBy: null, log: [] };
  }

  /**
   * De host (of de crew) stuurt de volgorde in, optioneel met een bewijslink (bv. een link naar een screenshot).
   * Dat wist alle eerdere OK's en meldingen.
   */
  static submit(match, group, { order, proofUrl }, by, now) {
    if (by !== CREW && by !== group.hostPid) throw HttpError.forbidden('Enkel de host of de crew kan de uitslag insturen');
    if (match.status === MATCH_STATUS.CONFIRMED && by !== CREW) {
      throw HttpError.conflict('Deze uitslag is al bevestigd; vraag de crew om te corrigeren');
    }
    Object.assign(match, { order: ResultReview.#cleanOrder(order, group), proofUrl: ResultReview.#cleanProof(proofUrl), submittedBy: by, submittedAt: now, checks: {}, reports: [], confirmedBy: null, status: MATCH_STATUS.SUBMITTED });
    ResultReview.#log(match, by, 'submit', now);
    if (by === CREW) ResultReview.#confirm(match, CONFIRMED_BY.CREW);
    else ResultReview.evaluate(match, group);
  }

  /** Een groepslid (behalve de host) drukt OK of Melden. Mag gewijzigd worden tot de uitslag bevestigd is. */
  static check(match, group, pid, choice, reason, now) {
    if (![MATCH_STATUS.SUBMITTED, MATCH_STATUS.DISPUTED].includes(match.status)) {
      throw HttpError.conflict(match.status === MATCH_STATUS.CONFIRMED ? 'Deze uitslag is al bevestigd' : 'Er is nog geen uitslag ingestuurd');
    }
    if (!GroupMembers.reviewers(group).includes(pid)) throw HttpError.forbidden('Enkel groepsleden, behalve de host, controleren de uitslag');
    if (!Object.values(CHECK).includes(choice)) throw HttpError.badRequest('Kies OK of Melden');
    match.checks[pid] = choice;
    match.reports = match.reports.filter((r) => r.pid !== pid);
    if (choice === CHECK.REPORT) match.reports.push({ pid, reason: String(reason || '').trim().slice(0, MAX_REASON_LENGTH), at: now });
    ResultReview.#log(match, pid, choice, now, match.reports.find((r) => r.pid === pid)?.reason);
    ResultReview.evaluate(match, group);
  }

  /** De crew bevestigt een ingestuurde of betwiste uitslag. */
  static confirmByCrew(match, now) {
    if (![MATCH_STATUS.SUBMITTED, MATCH_STATUS.DISPUTED].includes(match.status)) throw HttpError.conflict('Er is geen uitslag om te bevestigen');
    ResultReview.#log(match, CREW, 'confirm', now);
    ResultReview.#confirm(match, CONFIRMED_BY.CREW);
  }

  /** Bepaalt de status opnieuw uit de keuzes (ook na het verwijderen van een speler). */
  static evaluate(match, group) {
    if (![MATCH_STATUS.SUBMITTED, MATCH_STATUS.DISPUTED].includes(match.status)) return;
    const reviewers = GroupMembers.reviewers(group);
    if (!reviewers.length) return ResultReview.#confirm(match, CONFIRMED_BY.AUTO);
    if (match.reports.length) return Object.assign(match, { status: MATCH_STATUS.DISPUTED });
    if (reviewers.every((pid) => match.checks[pid] === CHECK.OK)) return ResultReview.#confirm(match, CONFIRMED_BY.PLAYERS);
    return Object.assign(match, { status: MATCH_STATUS.SUBMITTED });
  }

  /** Is een ingestuurde uitslag zonder meldingen lang genoeg blijven staan om automatisch bevestigd te worden? */
  static autoConfirmDue(match, seconds, nowMs) {
    if (!(seconds > 0) || match.status !== MATCH_STATUS.SUBMITTED || match.reports.length) return false;
    return nowMs - Date.parse(match.submittedAt) >= seconds * 1000;
  }

  static autoConfirm(match, now) {
    ResultReview.#log(match, CREW, 'auto-confirm', now);
    ResultReview.#confirm(match, CONFIRMED_BY.AUTO);
  }

  /** Haalt een speler uit de uitslag en uit de controle. */
  static dropPlayer(match, group, pid) {
    match.order = match.order.filter((p) => p !== pid);
    delete match.checks[pid];
    match.reports = match.reports.filter((r) => r.pid !== pid);
    if (!match.order.length && match.status !== MATCH_STATUS.CONFIRMED) Object.assign(match, ResultReview.newMatch(match.no), { log: match.log });
    ResultReview.evaluate(match, group);
  }

  static #confirm(match, confirmedBy) {
    Object.assign(match, { status: MATCH_STATUS.CONFIRMED, confirmedBy });
  }

  /** Enkel gewone web-links; het portaal bewaart geen bestanden. */
  static #cleanProof(raw) {
    const url = String(raw ?? '').trim();
    if (!url) return null;
    if (url.length > MAX_PROOF_LENGTH || !/^https?:\/\/\S+$/i.test(url)) {
      throw HttpError.badRequest('De bewijslink moet een http(s)-link zijn van maximaal 300 tekens');
    }
    return url;
  }

  static #cleanOrder(order, group) {
    const active = new Set(GroupMembers.active(group));
    if (!Array.isArray(order) || !order.length) throw HttpError.badRequest('Geef de volgorde van de spelers op');
    if (new Set(order).size !== order.length) throw HttpError.badRequest('Een speler staat dubbel in de uitslag');
    if (order.some((pid) => !active.has(pid))) throw HttpError.badRequest('Onbekende speler in de uitslag');
    return [...order];
  }

  static #log(match, by, type, at, detail = '') {
    match.log.push({ at, by, type, ...(detail ? { detail } : {}) });
  }
}

module.exports = { ResultReview, MATCH_STATUS, CONFIRMED_BY, CHECK, CREW };
