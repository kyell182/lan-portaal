const asyncHandler = require('../../core/http/asyncHandler');
const CrudController = require('../../core/crud/CrudController');

/** CRUD voor events + het huidige event en een event actief maken. */
class EventController extends CrudController {
  extend(r) {
    r.get('/current', (req, res) => res.json(this.service.current()));
    r.post('/:id/activate', this.requireAdmin, asyncHandler((req, res) => res.json(this.service.activate(req.params.id))));
  }
}

module.exports = EventController;
