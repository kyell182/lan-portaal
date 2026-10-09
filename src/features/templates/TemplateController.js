const asyncHandler = require('../../core/http/asyncHandler');
const CrudController = require('../../core/crud/CrudController');

/** CRUD voor templates + lijst van beschikbare vormen en dupliceren. */
class TemplateController extends CrudController {
  constructor(service, requireAdmin, formats) {
    super(service, requireAdmin);
    this.formats = formats;
  }

  extend(r) {
    r.get('/formats', (req, res) => res.json(this.formats.list()));
    r.post('/:id/duplicate', this.requireAdmin, asyncHandler((req, res) => res.status(201).json(this.service.duplicate(req.params.id))));
  }
}

module.exports = TemplateController;
