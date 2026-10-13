const express = require('express');

/** Publieke lijst van beschikbare thema's (ingebouwd en eigen). */
class ThemeController {
  constructor(registry) {
    this.registry = registry;
  }

  router() {
    const r = express.Router();
    r.get('/', (req, res) => res.json(this.registry.list()));
    return r;
  }
}

module.exports = ThemeController;
