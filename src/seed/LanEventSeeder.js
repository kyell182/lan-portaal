const HttpError = require('../core/http/HttpError');
const games = require('./halloweenGames');
const { EVENT, ROUNDS, SOCIAL_BONUS } = require('./halloweenRounds');

/**
 * Richt het Halloween-toernooi in: templates, 6 games, het event en de toernooien.
 * Veilig om opnieuw te draaien: wat al bestaat (op naam) blijft onaangeroerd, zodat aanpassingen in de admin niet verloren gaan.
 */
class LanEventSeeder {
  constructor(container) {
    this.c = container;
  }

  run() {
    const report = { templates: this.c.templates.seedMissing(), games: this.#seedGames(), tournaments: 0 };
    const event = this.#seedEvent();
    report.tournaments = this.#seedTournaments(event);
    return { ...report, eventId: event.id };
  }

  #seedGames() {
    const existing = new Set(this.c.games.list().map((g) => g.name));
    const missing = games.filter((game) => !existing.has(game.name));
    missing.forEach((game) => this.c.games.create(game));
    return missing.length;
  }

  #seedEvent() {
    return this.c.lanEvents.list().find((e) => e.name === EVENT.name) ?? this.c.lanEvents.create(EVENT);
  }

  #seedTournaments(event) {
    const existing = new Set(this.c.tournaments.list({ eventId: event.id }).map((t) => t.name));
    const wanted = [
      ...ROUNDS.map((round) => this.#round(round, event)),
      { name: SOCIAL_BONUS.name, templateId: this.#template(SOCIAL_BONUS.template).id, eventId: event.id },
    ].filter((tournament) => !existing.has(tournament.name));
    wanted.forEach((tournament) => this.c.tournaments.create(tournament));
    return wanted.length;
  }

  #round({ roundNo, game, template, startTime }, event) {
    return {
      name: `Ronde ${roundNo}: ${game}`,
      eventId: event.id,
      templateId: this.#template(template).id,
      gameId: this.#game(game).id,
      roundNo,
      startTime,
      countsForOverall: true,
    };
  }

  #template(name) {
    const template = this.c.templates.list().find((t) => t.name === name);
    if (!template) throw HttpError.notFound(`Template "${name}" ontbreekt`);
    return template;
  }

  #game(name) {
    const game = this.c.games.list().find((g) => g.name === name);
    if (!game) throw HttpError.notFound(`Game "${name}" ontbreekt`);
    return game;
  }
}

module.exports = LanEventSeeder;
