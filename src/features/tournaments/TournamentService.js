const CrudService = require('../../core/crud/CrudService');
const Repository = require('../../core/db/Repository');
const Schema = require('../../core/validation/Schema');
const HttpError = require('../../core/http/HttpError');
const ParticipantList = require('./ParticipantList');
const TournamentRunner = require('./TournamentRunner');

const STATUS = Object.freeze({ DRAFT: 'draft', RUNNING: 'running', FINISHED: 'finished' });

const createSchema = new Schema({
  eventId: { type: 'string' },
  name: { type: 'string', required: true, maxLength: 80 },
  templateId: { type: 'string' },
  formatKey: { type: 'string' },
  gameId: { type: 'string' },
  participantType: { type: 'string', values: ['team', 'player'] },
  description: { type: 'string', maxLength: 1000 },
  location: { type: 'string', maxLength: 80 },
  startTime: { type: 'string', maxLength: 40 },
  settings: { type: 'object', default: {} },
});

const updateSchema = new Schema({
  eventId: { type: 'string' },
  name: { type: 'string', required: true, maxLength: 80 },
  gameId: { type: 'string' },
  participantType: { type: 'string', values: ['team', 'player'] },
  description: { type: 'string', maxLength: 1000 },
  location: { type: 'string', maxLength: 80 },
  startTime: { type: 'string', maxLength: 40 },
  settings: { type: 'object' },
});

/** Toernooien: aanmaken vanuit een template, deelnemers beheren en de lifecycle (draft → running → finished). */
class TournamentService extends CrudService {
  constructor(store, events, formats, templates, games = null) {
    super({ repository: new Repository(store, 'tournaments'), schema: updateSchema, events, entityName: 'Toernooi', filterKeys: ['eventId', 'status'] });
    this.formats = formats;
    this.templates = templates;
    this.games = games;
    this.runner = new TournamentRunner(formats);
    this.onRemoved('games', (gameId) => this.#detachGame(gameId));
  }

  /** Overschreven: een toernooi start altijd vanuit een template of een vorm. */
  create(input) {
    const data = createSchema.validate(this.withDefaultEvent(input));
    const template = data.templateId ? this.templates.get(data.templateId) : null;
    const formatKey = template?.formatKey || data.formatKey;
    if (!formatKey) throw HttpError.badRequest('Kies een template of toernooivorm');
    const settings = this.formats.get(formatKey).normalizeSettings({ ...(template?.settings || {}), ...data.settings });

    return this.#save(null, {
      ...data,
      formatKey,
      settings,
      participantType: data.participantType || template?.participantType || 'team',
      participants: [],
      status: STATUS.DRAFT,
      state: null,
    });
  }

  beforeSave(data, current) {
    if (data.participantType && data.participantType !== current.participantType && current.status !== STATUS.DRAFT) {
      throw HttpError.conflict('Type deelnemers kan enkel gewijzigd worden voor de start');
    }
    if (data.settings) {
      if (current.status !== STATUS.DRAFT) throw HttpError.conflict('Instellingen kunnen enkel gewijzigd worden voor de start');
      data.settings = this.formats.get(current.formatKey).normalizeSettings({ ...current.settings, ...data.settings });
    }
    return data;
  }

  setParticipants(id, list) {
    const tournament = this.#draft(id);
    const participants = new ParticipantList(tournament.participants).replace(list, tournament.participantType).toJSON();
    return this.#save(id, { participants });
  }

  renameParticipant(id, pid, name) {
    const tournament = this.get(id);
    return this.#save(id, { participants: new ParticipantList(tournament.participants).rename(pid, name).toJSON() });
  }

  start(id, { shuffle = false } = {}) {
    const tournament = this.#draft(id);
    const ordered = new ParticipantList(tournament.participants).ordered(shuffle);
    const participants = ordered.map((p, i) => ({ ...p, seed: i + 1 }));
    const state = this.runner.start({ ...tournament, participants });
    const started = this.#save(id, { participants, state, status: STATUS.RUNNING, startedAt: new Date().toISOString() });
    this.#announce('tournament.started', started);
    return started;
  }

  report(id, matchId, payload) {
    const tournament = this.#running(id);
    const saved = this.#saveProgress(id, this.runner.report(tournament, matchId, payload));
    this.#announceResult(saved, matchId);
    return saved;
  }

  advance(id) {
    const tournament = this.#running(id);
    return this.#saveProgress(id, this.runner.advance(tournament));
  }

  reset(id) {
    this.get(id);
    return this.#save(id, { state: null, status: STATUS.DRAFT, startedAt: null, finishedAt: null });
  }

  standings(id) {
    const tournament = this.get(id);
    if (!tournament.state) return [];
    return this.runner.standings(tournament);
  }

  present(tournament) {
    return this.view(tournament);
  }

  /** Extra info voor de frontend: kan er een volgende ronde/fase gestart worden? */
  view(tournament) {
    return { ...tournament, canAdvance: tournament.status !== STATUS.DRAFT && !!tournament.state && this.runner.canAdvance(tournament) };
  }

  #saveProgress(id, state) {
    const before = this.get(id);
    const tournament = { ...before, state };
    const finished = this.runner.isFinished(tournament);
    const saved = this.#save(id, {
      state,
      status: finished ? STATUS.FINISHED : STATUS.RUNNING,
      finishedAt: finished ? tournament.finishedAt || new Date().toISOString() : null,
    });
    if (finished && before.status !== STATUS.FINISHED) {
      this.#announce('tournament.finished', saved, { podium: this.runner.standings(saved)[0]?.rows.filter((r) => r.place && r.place <= 3) || [] });
    }
    return saved;
  }

  /** Domeinmelding voor plugins (Discord...). */
  #announce(type, tournament, extra = {}) {
    const names = Object.fromEntries(tournament.participants.map((p) => [p.id, p.name]));
    this.events.emit('domain', { type, tournament, names, game: this.games?.findById(tournament.gameId) || null, ...extra });
  }

  #announceResult(tournament, matchId) {
    const round = tournament.state.rounds?.find((r) => r.id === matchId);
    if (round) return this.#announce('round.reported', tournament, { round });
    const match = tournament.state.matches.find((m) => m.id === matchId);
    if (match) this.#announce('match.reported', tournament, { match });
    return null;
  }

  #draft(id) {
    const tournament = this.get(id);
    if (tournament.status !== STATUS.DRAFT) throw HttpError.conflict('Dit kan enkel voor de start (zet het toernooi eerst terug)');
    return tournament;
  }

  #running(id) {
    const tournament = this.get(id);
    if (tournament.status === STATUS.DRAFT) throw HttpError.conflict('Het toernooi is nog niet gestart');
    return tournament;
  }

  #save(id, data) {
    const item = id ? this.repository.update(id, data) : this.repository.create(data);
    this.events.emit('changed', { entity: 'tournaments', id: item.id });
    return item;
  }

  #detachGame(gameId) {
    for (const t of this.repository.filter((x) => x.gameId === gameId)) this.repository.update(t.id, { gameId: null });
  }
}

module.exports = TournamentService;
