const express = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../../core/http/asyncHandler');
const AuthMiddleware = require('../auth/AuthMiddleware');

const CLAIM_WINDOW_MS = 15 * 60 * 1000;
// Op een LAN zitten veel spelers achter hetzelfde IP, dus ruim.
const CLAIM_LIMIT = 200;
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

/** Namenlijst, naam kiezen en "wie ben ik" voor spelers. */
class PlayerAuthController {
  constructor(playerAuth, config) {
    this.playerAuth = playerAuth;
    this.config = config;
  }

  router() {
    const r = express.Router();
    const claimLimiter = rateLimit({ windowMs: CLAIM_WINDOW_MS, limit: CLAIM_LIMIT, standardHeaders: true, legacyHeaders: false });

    r.get('/available', asyncHandler((req, res) => res.json(this.playerAuth.available(req.query.eventId))));
    r.get('/me', (req, res) => res.json({ player: req.player }));
    r.post('/claim', claimLimiter, asyncHandler((req, res) => {
      const { token, player } = this.playerAuth.claim(req.body.playerId);
      res.cookie(AuthMiddleware.PLAYER_COOKIE, token, this.#cookieOptions());
      res.json({ player });
    }));
    return r;
  }

  #cookieOptions() {
    return { httpOnly: true, sameSite: 'strict', secure: this.config.cookieSecure, maxAge: COOKIE_MAX_AGE_MS };
  }
}

module.exports = PlayerAuthController;
