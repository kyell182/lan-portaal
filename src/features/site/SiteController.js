const express = require('express');
const asyncHandler = require('../../core/http/asyncHandler');

/** Merknaam: iedereen mag ze lezen, enkel een admin past ze aan. */
class SiteController {
  constructor(site, requireAdmin) {
    this.site = site;
    this.requireAdmin = requireAdmin;
  }

  router() {
    const r = express.Router();
    r.get('/', (req, res) => res.json(this.site.get()));
    r.put('/', this.requireAdmin, asyncHandler((req, res) => res.json(this.site.update(req.body))));
    return r;
  }
}

module.exports = SiteController;
