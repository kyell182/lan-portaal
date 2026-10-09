const asyncHandler = require('../../core/http/asyncHandler');
const CrudController = require('../../core/crud/CrudController');

/** CRUD voor toernooien + deelnemers, starten, uitslagen, volgende ronde en reset. */
class TournamentController extends CrudController {
  extend(r) {
    const admin = this.requireAdmin;
    const s = this.service;
    const json = (fn) => asyncHandler((req, res) => res.json(fn(req)));

    r.get('/:id/standings', json((req) => s.standings(req.params.id)));
    r.put('/:id/participants', admin, json((req) => s.view(s.setParticipants(req.params.id, req.body.participants))));
    r.patch('/:id/participants/:pid', admin, json((req) => s.view(s.renameParticipant(req.params.id, req.params.pid, req.body.name))));
    r.post('/:id/start', admin, json((req) => s.view(s.start(req.params.id, req.body))));
    r.post('/:id/matches/:matchId/result', admin, json((req) => s.view(s.report(req.params.id, req.params.matchId, req.body))));
    r.post('/:id/advance', admin, json((req) => s.view(s.advance(req.params.id))));
    r.post('/:id/reset', admin, json((req) => s.view(s.reset(req.params.id))));
  }
}

module.exports = TournamentController;
