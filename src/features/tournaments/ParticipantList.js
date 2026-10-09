const HttpError = require('../../core/http/HttpError');

/**
 * Deelnemers van een toernooi: een momentopname met eigen naam (vrij aan te passen),
 * optioneel gekoppeld aan een bestaand team of speler (refId).
 */
class ParticipantList {
  constructor(participants = []) {
    this.items = participants.map((p) => ({ ...p }));
  }

  /** Vervangt de lijst; bestaande ids blijven behouden als ze meegestuurd worden. */
  replace(input, refType) {
    if (!Array.isArray(input)) throw HttpError.badRequest('Deelnemers moeten een lijst zijn');
    const known = new Set(this.items.map((p) => p.id));
    let counter = this.#maxCounter();
    this.items = input.map((raw, i) => {
      const name = String(raw?.name || '').trim().slice(0, 60);
      if (!name) throw HttpError.badRequest(`Deelnemer ${i + 1} heeft geen naam`);
      const id = raw.id && known.has(raw.id) ? raw.id : `p${(counter += 1)}`;
      return { id, name, refType: raw.refId ? refType : null, refId: raw.refId || null, seed: i + 1 };
    });
    this.#assertUniqueNames();
    return this;
  }

  rename(pid, name) {
    const participant = this.items.find((p) => p.id === pid);
    if (!participant) throw HttpError.notFound('Deelnemer niet gevonden');
    const clean = String(name || '').trim().slice(0, 60);
    if (!clean) throw HttpError.badRequest('Naam mag niet leeg zijn');
    participant.name = clean;
    this.#assertUniqueNames();
    return this;
  }

  /** Volgorde voor het starten: op seed, of willekeurig gehusseld. */
  ordered(shuffle = false) {
    const list = [...this.items].sort((a, b) => a.seed - b.seed);
    if (!shuffle) return list;
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  toJSON() {
    return this.items;
  }

  #maxCounter() {
    return this.items.reduce((max, p) => Math.max(max, Number(String(p.id).slice(1)) || 0), 0);
  }

  #assertUniqueNames() {
    const names = this.items.map((p) => p.name.toLowerCase());
    if (new Set(names).size !== names.length) throw HttpError.badRequest('Elke deelnemer moet een unieke naam hebben');
  }
}

module.exports = ParticipantList;
