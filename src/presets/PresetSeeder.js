const HttpError = require('../core/http/HttpError');

/**
 * Richt een LAN in vanuit een preset: standaardtemplates, games, event en toernooien.
 * Veilig om opnieuw te draaien: wat al bestaat (op naam) blijft onaangeroerd, zodat aanpassingen in de admin niet verloren gaan.
 */
class PresetSeeder {
  constructor(container) {
    this.c = container;
  }

  /** @param preset { event, games, tournaments } zie src/presets/index.js */
  run(preset) {
    const templates = this.c.templates.seedMissing();
    const games = this.#seedGames(preset.games ?? []);
    const event = this.#seedEvent(preset.event);
    const tournaments = this.#seedTournaments(preset.tournaments ?? [], event);
    return { templates, games, tournaments, eventId: event.id };
  }

  #seedGames(wanted) {
    const existing = new Set(this.c.games.list().map((g) => g.name));
    const missing = wanted.filter((game) => !existing.has(game.name));
    missing.forEach((game) => this.c.games.create(game));
    return missing.length;
  }

  #seedEvent(wanted) {
    return this.c.lanEvents.list().find((e) => e.name === wanted.name) ?? this.c.lanEvents.create(wanted);
  }

  #seedTournaments(wanted, event) {
    const existing = new Set(this.c.tournaments.list({ eventId: event.id }).map((t) => t.name));
    const missing = wanted.filter((tournament) => !existing.has(tournament.name));
    missing.forEach((tournament) => this.c.tournaments.create(this.#input(tournament, event)));
    return missing.length;
  }

  #input({ name, template, game, roundNo, startTime, countsForOverall }, event) {
    return {
      name,
      eventId: event.id,
      templateId: this.#named(this.c.templates, template, 'Template').id,
      ...(game ? { gameId: this.#named(this.c.games, game, 'Game').id } : {}),
      ...(roundNo ? { roundNo } : {}),
      ...(startTime ? { startTime } : {}),
      ...(countsForOverall ? { countsForOverall } : {}),
    };
  }

  #named(service, name, label) {
    const item = service.list().find((x) => x.name === name);
    if (!item) throw HttpError.notFound(`${label} "${name}" ontbreekt`);
    return item;
  }
}

module.exports = PresetSeeder;
