const HttpError = require('../core/http/HttpError');
const BalancedGroups = require('../features/tournaments/formats/lan/BalancedGroups');
const PresetSeeder = require('./PresetSeeder');

const FIRST_NAMES = ['Emma', 'Noah', 'Lotte', 'Liam', 'Mila', 'Finn', 'Sara', 'Lars', 'Nina', 'Thomas', 'Eva', 'Jens', 'Fien', 'Ruben', 'Lore', 'Milan'];
const LAST_NAMES = ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Willems', 'Claes', 'Goossens', 'Wouters', 'De Smet', 'Vermeulen'];
const TAG_WORDS = ['Pixel', 'Turbo', 'Ninja', 'Shadow', 'Lucky', 'Cosmic', 'Rapid', 'Frozen', 'Mighty', 'Sneaky', 'Blazing', 'Silent'];
const TAG_NOUNS = ['Fox', 'Wolf', 'Panda', 'Raven', 'Tiger', 'Goblin', 'Dragon', 'Falcon', 'Viking', 'Wizard', 'Otter', 'Pirate'];
const SEATS_PER_TABLE = 8;
const MAX_ROOM_RESULT = 50;

/**
 * Vult een (test)installatie met dummy-spelers en laat de eerste rondes automatisch spelen,
 * zodat je het portaal kan uitproberen zonder echte gegevens. Gebruikt de gegeven preset voor event, games en toernooien.
 */
class DemoSeeder {
  constructor(container) {
    this.c = container;
  }

  /** @param options { count: aantal spelers, playedRounds: aantal rondes dat al gespeeld is, force: ook op bestaande spelers } */
  run(preset, { count = 60, playedRounds = 0, force = false } = {}) {
    if (this.c.players.list().length && !force) {
      throw HttpError.conflict('Er staan al spelers in deze data-map. Gebruik een lege map (DATA_DIR) of --force.');
    }
    const { eventId } = new PresetSeeder(this.c).run(preset);
    const players = this.#players(count, eventId);
    this.#seat(players, eventId);
    const played = this.#playRounds(eventId, players, playedRounds);
    return { eventId, players: players.length, playedRounds: played };
  }

  #players(count, eventId) {
    const used = new Set();
    return Array.from({ length: count }, (_, i) => {
      const nickname = DemoSeeder.#uniqueTag(i, used);
      return this.c.players.create({
        nickname,
        firstName: FIRST_NAMES[i % FIRST_NAMES.length],
        lastName: LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length],
        email: `demo${i + 1}@example.com`,
        checkedIn: true,
        eventId,
      });
    });
  }

  static #uniqueTag(index, used) {
    const base = `${TAG_WORDS[index % TAG_WORDS.length]}${TAG_NOUNS[Math.floor(index / TAG_WORDS.length) % TAG_NOUNS.length]}`;
    let tag = base;
    for (let n = 2; used.has(tag.toLowerCase()); n += 1) tag = `${base}${n}`;
    used.add(tag.toLowerCase());
    return tag;
  }

  /** Eén zone met tafels van 8; iedereen krijgt een plaats. */
  #seat(players, eventId) {
    const seats = this.c.seats.createGrid({ eventId, zone: 'Zaal', rows: Math.ceil(players.length / SEATS_PER_TABLE), tableSize: SEATS_PER_TABLE });
    players.forEach((player, i) => this.c.seats.claim(seats[i].id, player.id));
  }

  /** Speelt de eerste rondes uit; de volgende ronde staat klaar met gegenereerde groepen. */
  #playRounds(eventId, players, playedRounds) {
    const tournaments = this.c.tournaments.list({ eventId });
    const rounds = tournaments.filter((t) => t.roundNo).sort((a, b) => a.roundNo - b.roundNo);
    rounds.forEach((round, i) => {
      if (i > playedRounds) return;
      this.#start(round, players);
      if (i < playedRounds) this.#play(round.id);
      else this.#prepare(round.id);
    });
    tournaments.filter((t) => !t.roundNo).forEach((social) => this.#socialBonus(social, players));
    return Math.min(playedRounds, rounds.length);
  }

  #start(tournament, players) {
    this.c.tournaments.setParticipants(tournament.id, players.map((p) => ({ name: p.nickname, refId: p.id })));
    this.c.tournaments.start(tournament.id);
  }

  /** Klaar om te spelen: groepen gemaakt, nog geen uitslagen. */
  #prepare(id) {
    if (this.c.tournaments.get(id).state.mode === 'groups') this.c.tournaments.report(id, 'generate', {});
  }

  #play(id) {
    const { state, participants } = this.c.tournaments.get(id);
    if (state.mode === 'room') {
      const order = BalancedGroups.shuffle(participants.map((p) => p.id)).slice(0, MAX_ROOM_RESULT);
      this.c.tournaments.report(id, 'roomresult', { order });
    } else {
      this.c.tournaments.report(id, 'generate', {});
      this.#playGroups(id);
    }
    this.c.tournaments.report(id, 'close', { force: true });
  }

  #playGroups(id) {
    for (const group of this.c.tournaments.get(id).state.groups) {
      for (const match of group.matches) {
        const order = BalancedGroups.shuffle(group.pids);
        this.c.tournaments.report(id, `submit:${group.id}:${match.no}`, { by: 'crew', order });
      }
    }
  }

  /** Een deel van de spelers heeft de socials gevolgd. */
  #socialBonus(tournament, players) {
    this.#start(tournament, players);
    const { state, participants } = this.c.tournaments.get(tournament.id);
    const entries = participants.filter((_, i) => i % 3 !== 0).map((p) => ({
      pid: p.id,
      values: Object.fromEntries(state.criteria.filter((_c, i) => (i + p.seed) % 2 === 0).map((c) => [c.id, 1])),
    }));
    this.c.tournaments.report(tournament.id, 'scores', { entries });
  }
}

module.exports = DemoSeeder;
