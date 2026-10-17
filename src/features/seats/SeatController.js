const asyncHandler = require('../../core/http/asyncHandler');
const CrudController = require('../../core/crud/CrudController');

/** CRUD voor plaatsen + raster aanmaken en een hele zone wissen. */
class SeatController extends CrudController {
  constructor(service, requireAdmin, requirePlayer) {
    super(service, requireAdmin);
    this.requirePlayer = requirePlayer;
  }

  extend(r) {
    r.post('/release', this.requirePlayer, asyncHandler((req, res) => {
      this.service.release(req.player.id);
      res.status(204).end();
    }));
    r.post('/:id/claim', this.requirePlayer, asyncHandler((req, res) => res.json(this.service.claim(req.params.id, req.player.id))));
    r.post('/grid', this.requireAdmin, asyncHandler((req, res) => res.status(201).json(this.service.createGrid(req.body))));
    r.delete('/zone/:zone', this.requireAdmin, asyncHandler((req, res) => {
      this.service.removeZone(req.params.zone, req.query.eventId);
      res.status(204).end();
    }));
  }
}

module.exports = SeatController;
