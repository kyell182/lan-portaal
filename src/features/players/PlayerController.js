const asyncHandler = require('../../core/http/asyncHandler');
const CrudController = require('../../core/crud/CrudController');

/** CRUD voor spelers + import, naam vrijgeven en alle spelers van een event wissen. */
class PlayerController extends CrudController {
  constructor(service, requireAdmin, importer) {
    super(service, requireAdmin);
    this.importer = importer;
  }

  extend(r) {
    r.post('/import', this.requireAdmin, asyncHandler((req, res) => {
      res.json(this.importer.run(req.body.rows ?? [], req.body.eventId));
    }));
    r.post('/:id/release', this.requireAdmin, asyncHandler((req, res) => res.json(this.service.release(req.params.id))));
    r.delete('/', this.requireAdmin, asyncHandler((req, res) => {
      res.json({ removed: this.service.removeAllOfEvent(req.query.eventId) });
    }));
  }
}

module.exports = PlayerController;
