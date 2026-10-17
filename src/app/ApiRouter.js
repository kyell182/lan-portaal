const express = require('express');
const CrudController = require('../core/crud/CrudController');
const LiveController = require('../core/events/LiveController');
const AuthController = require('../features/auth/AuthController');
const AdminController = require('../features/admins/AdminController');
const PlayerController = require('../features/players/PlayerController');
const PlayerAuthController = require('../features/player-auth/PlayerAuthController');
const RoundController = require('../features/rounds/RoundController');
const LeaderboardController = require('../features/leaderboard/LeaderboardController');
const SiteController = require('../features/site/SiteController');
const SeatController = require('../features/seats/SeatController');
const TemplateController = require('../features/templates/TemplateController');
const TournamentController = require('../features/tournaments/TournamentController');
const EventController = require('../features/events/EventController');
const ThemeController = require('../features/themes/ThemeController');
const PluginController = require('../features/plugins/PluginController');

/** Koppelt elke feature aan zijn URL onder /api. */
class ApiRouter {
  constructor(container) {
    this.c = container;
  }

  build() {
    const { c } = this;
    const requireAdmin = c.authMiddleware.require;
    const r = express.Router();

    r.get('/health', (req, res) => res.json({ ok: true }));
    r.use('/auth', new AuthController(c.auth, c.config).router());
    r.use('/player-auth', new PlayerAuthController(c.playerAuth, c.config).router());
    r.use('/rounds', new RoundController(c.rounds, c.authMiddleware.requirePlayer).router());
    r.use('/leaderboard', new LeaderboardController(c.leaderboard).router());
    r.use('/site', new SiteController(c.site, requireAdmin).router());
    r.use('/admins', new AdminController(c.admins, requireAdmin).router());
    r.use('/plugins', new PluginController(c.plugins, requireAdmin).router());
    r.use('/themes', new ThemeController(c.themes).router());
    r.use('/live', new LiveController(c.events).router());

    r.use('/events', new EventController(c.lanEvents, requireAdmin).router());
    r.use('/games', new CrudController(c.games, requireAdmin).router());
    r.use('/players', new PlayerController(c.players, requireAdmin, c.playerImporter).router());
    r.use('/teams', new CrudController(c.teams, requireAdmin).router());
    r.use('/prizes', new CrudController(c.prizes, requireAdmin).router());
    r.use('/seats', new SeatController(c.seats, requireAdmin, c.authMiddleware.requirePlayer).router());
    r.use('/templates', new TemplateController(c.templates, requireAdmin, c.formats).router());
    r.use('/tournaments', new TournamentController(c.tournaments, requireAdmin).router());
    return r;
  }
}

module.exports = ApiRouter;
