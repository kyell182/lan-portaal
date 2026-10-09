const express = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../../core/http/asyncHandler');
const AuthMiddleware = require('./AuthMiddleware');

/** Login / logout / wie-ben-ik. */
class AuthController {
  constructor(authService, config) {
    this.authService = authService;
    this.config = config;
  }

  router() {
    const r = express.Router();
    const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });

    r.post('/login', loginLimiter, asyncHandler(async (req, res) => {
      const { token, admin } = await this.authService.login(req.body.username, req.body.password);
      res.cookie(AuthMiddleware.COOKIE, token, this.#cookieOptions());
      res.json(admin);
    }));
    r.post('/logout', (req, res) => {
      res.clearCookie(AuthMiddleware.COOKIE, this.#cookieOptions());
      res.status(204).end();
    });
    r.get('/me', (req, res) => res.json({ admin: req.admin }));
    return r;
  }

  #cookieOptions() {
    return { httpOnly: true, sameSite: 'strict', secure: this.config.cookieSecure, maxAge: 12 * 60 * 60 * 1000 };
  }
}

module.exports = AuthController;
