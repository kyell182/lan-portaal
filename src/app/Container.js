const JsonStore = require('../core/db/JsonStore');
const Repository = require('../core/db/Repository');
const EventBus = require('../core/events/EventBus');
const AdminService = require('../features/admins/AdminService');
const AuthService = require('../features/auth/AuthService');
const AuthMiddleware = require('../features/auth/AuthMiddleware');
const GameService = require('../features/games/GameService');
const PlayerService = require('../features/players/PlayerService');
const PlayerImporter = require('../features/players/PlayerImporter');
const PlayerAuthService = require('../features/player-auth/PlayerAuthService');
const RoundService = require('../features/rounds/RoundService');
const TeamService = require('../features/teams/TeamService');
const PrizeService = require('../features/prizes/PrizeService');
const SeatService = require('../features/seats/SeatService');
const TemplateService = require('../features/templates/TemplateService');
const FormatRegistry = require('../features/tournaments/formats/FormatRegistry');
const TournamentService = require('../features/tournaments/TournamentService');
const EventService = require('../features/events/EventService');
const ThemeRegistry = require('../features/themes/ThemeRegistry');
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

    this.games = new GameService(this.store, this.events);
    this.players = new PlayerService(this.store, this.events);
    this.playerImporter = new PlayerImporter(this.players);
    this.playerAuth = new PlayerAuthService(this.players, config);
    this.authMiddleware = new AuthMiddleware(this.auth, this.playerAuth);
    this.teams = new TeamService(this.store, this.events, this.players.repository);
    this.prizes = new PrizeService(this.store, this.events);
    this.seats = new SeatService(this.store, this.events, this.players.repository);
    this.templates = new TemplateService(this.store, this.events, this.formats);
    this.tournaments = new TournamentService(this.store, this.events, this.formats, this.templates, this.games.repository);

    this.rounds = new RoundService({ players: this.players, tournaments: this.tournaments, games: this.games, seats: this.seats });

    this.themes = new ThemeRegistry([
      { dir: config.builtInThemesDir, urlBase: '/themes' },
      { dir: config.customThemesDir, urlBase: '/custom-themes' },
    ]);

    this.lanEvents = new EventService(this.store, this.events, this.themes, {
      toernooien: this.tournaments.repository,
      zitplaatsen: this.seats.repository,
      prijzen: this.prizes.repository,
      spelers: this.players.repository,
    });
    const currentEvent = () => this.lanEvents.current()?.id ?? null;
    [this.tournaments, this.seats, this.prizes, this.players].forEach((service) => service.useDefaultEvent(currentEvent));

    this.plugins = new PluginService(this.store, new PluginRegistry());
    this.notifications = new NotificationHub(this.events, this.plugins, { publicUrl: config.publicUrl });
  }

  async seed() {
    await this.admins.seed(this.config.adminUsername, this.config.adminPassword);
    this.templates.seed();
  }
}

module.exports = Container;
