const express = require('express');
const asyncHandler = require('../../core/http/asyncHandler');

/** Publieke route voor het algemeen klassement: gamertag met naam, punten per ronde. Geen privégegevens. */
class LeaderboardController {
  constructor(leaderboard) {
    this.leaderboard = leaderboard;
  }

  router() {
    const r = express.Router();
    r.get('/', asyncHandler((req, res) => res.json(this.leaderboard.overall(req.query.eventId))));
    return r;
  }
}

module.exports = LeaderboardController;
