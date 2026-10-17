const PlayerNickname = require('./PlayerNickname');
const SocialPlatforms = require('./SocialPlatforms');

const TEXT_FIELDS = ['nickname', 'firstName', 'lastName', 'email', 'studyProgram', 'device'];

/** Importeert gemapte rijen (bv. uit Microsoft Forms). Zelfde e-mail in hetzelfde event = bijwerken. */
class PlayerImporter {
  constructor(players) {
    this.players = players;
  }

  /** rows: lijst van { nickname, firstName, ..., instagram, ..., socialsClaimed }. Geen limiet op het aantal. */
  run(rows, eventId) {
    const event = eventId || this.players.withDefaultEvent({}).eventId || null;
    const context = this.#context(event);
    const result = { created: 0, updated: 0, skipped: 0, errors: [] };
    rows.forEach((row, index) => {
      try {
        this.#handle(row, event, context, result);
      } catch (err) {
        result.skipped += 1;
        result.errors.push({ row: index + 1, message: PlayerImporter.#describe(err) });
      }
    });
    this.players.saveBatch({ create: context.create, update: context.update });
    return result;
  }

  #context(event) {
    const existing = this.players.repository.filter((p) => (p.eventId ?? null) === (event ?? null));
    const byEmail = new Map(existing.filter((p) => p.email).map((p) => [p.email.toLowerCase(), p]));
    return { byEmail, taken: new Set(existing.map((p) => PlayerNickname.key(p.nickname))), create: [], update: [] };
  }

  #handle(row, event, context, result) {
    const input = PlayerImporter.#toInput(row, event);
    const email = input.email?.toLowerCase();
    const known = email ? context.byEmail.get(email) : null;
    if (known?.pending) throw new Error('E-mailadres komt twee keer voor in het bestand');
    if (known) return this.#update(known, input, context, result);
    return this.#create(input, email, context, result);
  }

  #create(input, email, context, result) {
    const data = this.players.prepareCreate(input, context.taken);
    context.taken.add(PlayerNickname.key(data.nickname));
    if (email) context.byEmail.set(email, { pending: true });
    context.create.push(data);
    result.created += 1;
  }

  #update(current, input, context, result) {
    const own = PlayerNickname.key(current.nickname);
    context.taken.delete(own);
    try {
      const merged = { ...input, socials: { ...current.socials, ...input.socials } };
      const patch = this.players.prepareUpdate(current, merged, context.taken);
      context.taken.add(PlayerNickname.key(patch.nickname ?? current.nickname));
      context.update.push({ id: current.id, patch });
      result.updated += 1;
    } catch (err) {
      context.taken.add(own);
      throw err;
    }
  }

  /** Lege waarden worden weggelaten zodat een her-import bestaande gegevens niet wist. */
  static #toInput(row, eventId) {
    const input = { eventId };
    for (const key of TEXT_FIELDS) {
      const value = String(row[key] ?? '').trim();
      if (value) input[key] = value;
    }
    input.socials = SocialPlatforms.cleanUsernames(row);
    const claimed = SocialPlatforms.cleanClaimed(row.socialsClaimed);
    if (claimed.length) input.socialsClaimed = claimed;
    return input;
  }

  static #describe(err) {
    const fields = err.details ? Object.values(err.details) : [];
    return fields.length ? fields.join(', ') : err.message;
  }
}

module.exports = PlayerImporter;
