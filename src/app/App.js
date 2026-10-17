const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const errorHandler = require('../core/http/errorHandler');
const HttpError = require('../core/http/HttpError');
const ApiRouter = require('./ApiRouter');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

/** Bouwt de Express-app: beveiliging, API, statische bestanden en foutafhandeling. */
class App {
  constructor(container) {
    this.container = container;
  }

  build() {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use(this.#helmet());
    app.use(express.json({ limit: '1mb' }));
    app.use(cookieParser());
    app.use(this.container.authMiddleware.attach);

    app.use('/api', new ApiRouter(this.container).build());
    app.use('/api', (req, res, next) => next(HttpError.notFound('Onbekende API-route')));

    app.get('/manifest.webmanifest', (req, res) => res.type('application/manifest+json').json(this.#manifest()));
    app.use('/custom-themes', express.static(this.container.config.customThemesDir));
    app.use('/custom-themes', (req, res, next) => next(HttpError.notFound('Onbekend themabestand')));
    app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));
    app.get('/admin*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'admin.html')));
    app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

    app.use(errorHandler);
    return app;
  }

  /** Het manifest uit public/, met de merknaam van dit portaal. */
  #manifest() {
    const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'manifest.webmanifest'), 'utf8'));
    const title = this.container.site.title();
    return { ...manifest, name: title, short_name: title, description: `Toernooien, zitplan en prijzen van ${title}` };
  }

  #helmet() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: null,
        },
      },
      crossOriginEmbedderPolicy: false,
    });
  }
}

module.exports = App;
