const express = require('express');
const asyncHandler = require('../../core/http/asyncHandler');

/** Plugins beheren: overzicht, instellingen opslaan en een testbericht sturen (enkel admins). */
class PluginController {
  constructor(service, requireAdmin) {
    this.service = service;
    this.requireAdmin = requireAdmin;
  }

  router() {
    const r = express.Router();
    r.use(this.requireAdmin);
    r.get('/', (req, res) => res.json(this.service.list()));
    r.put('/:key', asyncHandler((req, res) => res.json(this.service.configure(req.params.key, req.body))));
    r.post('/:key/test', asyncHandler(async (req, res) => {
      await this.service.test(req.params.key);
      res.json({ ok: true });
    }));
    return r;
  }
}

module.exports = PluginController;
