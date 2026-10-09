const express = require('express');
const asyncHandler = require('../http/asyncHandler');

/**
 * Maakt REST-routes voor een CrudService.
 * GET-routes zijn publiek (via toPublic), schrijven vereist een admin.
 */
class CrudController {
  constructor(service, requireAdmin) {
    this.service = service;
    this.requireAdmin = requireAdmin;
  }

  router() {
    const r = express.Router();
    this.extend(r); // eerst, zodat specifieke paden voor '/:id' komen
    r.get('/', asyncHandler((req, res) => res.json(this.#listFor(req))));
    r.get('/:id', asyncHandler((req, res) => res.json(this.#viewFor(req, this.service.get(req.params.id)))));
    r.post('/', this.requireAdmin, asyncHandler((req, res) => res.status(201).json(this.service.create(req.body))));
    r.put('/:id', this.requireAdmin, asyncHandler((req, res) => res.json(this.service.update(req.params.id, req.body))));
    r.delete('/:id', this.requireAdmin, asyncHandler((req, res) => {
      this.service.remove(req.params.id);
      res.status(204).end();
    }));
    return r;
  }

  /** Subklassen kunnen extra routes toevoegen. */
  extend() {}

  #listFor(req) {
    return this.service.list(req.query).map((item) => this.#viewFor(req, item));
  }

  #viewFor(req, item) {
    return this.service.present(item, !!req.admin);
  }
}

module.exports = CrudController;
