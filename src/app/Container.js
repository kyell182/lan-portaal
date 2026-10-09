const JsonStore = require('../core/db/JsonStore');
const Repository = require('../core/db/Repository');
const EventBus = require('../core/events/EventBus');
const AdminService = require('../features/admins/AdminService');
const AuthService = require('../features/auth/AuthService');
const AuthMiddleware = require('../features/auth/AuthMiddleware');
const GameService = require('../features/games/GameService');
const PlayerService = require('../features/players/PlayerService');
const TeamService = require('../features/teams/TeamService');
const PrizeService = require('../features/prizes/PrizeService');
const SeatService = require('../features/seats/SeatService');
const TemplateService = require('../features/templates/TemplateService');
const FormatRegistry = require('../features/tournaments/formats/FormatRegistry');
const TournamentService = require('../features/tournaments/TournamentService');
const EventService = require('../features/events/EventService');
const PluginRegistry = require('../features/plugins/PluginRegistry');
const PluginService = require('../features/plugins/PluginService');
const NotificationHub = require('../features/plugins/NotificationHub');

/** Maakt alle services één keer aan en koppelt hun afhankelijkheden (dependency injection). */
class Container {
  constructor(config) {
    this.config = config;
    this.store = new JsonStore(config.dataDir);
    this.events = new EventBus();
    this.formats = new FormatRegistry();

    this.admins = new AdminService(new Repository(this.store, 'admins'));
    this.auth = new AuthService(this.admins, config);
    this.authMiddleware = new AuthMiddleware(this.auth);

    this.games = new GameService(this.store, this.events);
    this.players = new PlayerService(this.store, this.events);
    this.teams = new TeamService(this.store, this.events, this.players.repository);
    this.prizes = new PrizeService(this.store, this.events);
    this.seats = new SeatService(this.store, this.events, this.players.repository);
    this.templates = new TemplateService(this.store, this.events, this.formats);
    this.tournaments = new TournamentService(this.store, this.events, this.formats, this.templates, this.games.repository);

    this.lanEvents = new EventService(this.store, this.events, {
      toernooien: this.tournaments.repository,
      zitplaatsen: this.seats.repository,
      prijzen: this.prizes.repository,
    });
    const currentEvent = () => this.lanEvents.current()?.id ?? null;
    [this.tournaments, this.seats, this.prizes].forEach((service) => service.useDefaultEvent(currentEvent));

    this.plugins = new PluginService(this.store, new PluginRegistry());
    this.notifications = new NotificationHub(this.events, this.plugins, { publicUrl: config.publicUrl });
  }

  async seed() {
    await this.admins.seed(this.config.adminUsername, this.config.adminPassword);
    this.templates.seed();
  }
}

module.exports = Container;
