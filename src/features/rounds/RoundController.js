const express = require('express');
const asyncHandler = require('../../core/http/asyncHandler');

/** Routes voor de aangemelde speler: zijn ronde bekijken, uitslag insturen, bevestigen of melden. */
class RoundController {
  constructor(rounds, requirePlayer) {
    this.rounds = rounds;
    this.requirePlayer = requirePlayer;
  }

  router() {
    const r = express.Router();
    const json = (fn) => asyncHandler((req, res) => res.json(fn(req.player.id, req)));

    r.use(this.requirePlayer);
    r.get('/me', json((id) => this.rounds.me(id)));
    r.put('/me/game-name', json((id, req) => this.rounds.setGameName(id, req.body.name)));
    r.put('/me/room', json((id, req) => this.rounds.setRoom(id, req.body)));
    r.post('/me/room/report', json((id, req) => this.rounds.reportRoomPlace(id, req.body.reason)));
    r.post('/me/matches/:no/result', json((id, req) => this.rounds.submitResult(id, req.params.no, req.body.order)));
    r.post('/me/matches/:no/confirm', json((id, req) => this.rounds.confirm(id, req.params.no)));
    r.post('/me/matches/:no/dispute', json((id, req) => this.rounds.dispute(id, req.params.no, req.body.reason)));
    return r;
  }
}

module.exports = RoundController;
