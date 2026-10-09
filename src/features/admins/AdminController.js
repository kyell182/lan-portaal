const express = require('express');
const asyncHandler = require('../../core/http/asyncHandler');

/** Routes om admins te beheren (enkel voor aangemelde admins). */
class AdminController {
  constructor(service, requireAdmin) {
    this.service = service;
    this.requireAdmin = requireAdmin;
  }

  router() {
    const r = express.Router();
    r.use(this.requireAdmin);
    r.get('/', (req, res) => res.json(this.service.list()));
    r.post('/', asyncHandler(async (req, res) => res.status(201).json(await this.service.create(req.body))));
    r.put('/:id/password', asyncHandler(async (req, res) => {
      await this.service.changePassword(req.params.id, req.body.password);
      res.status(204).end();
    }));
    r.delete('/:id', (req, res) => {
      this.service.remove(req.params.id, req.admin.id);
      res.status(204).end();
    });
    return r;
  }
}

module.exports = AdminController;
