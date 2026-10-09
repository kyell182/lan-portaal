const HttpError = require('./HttpError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Ongeldige JSON' });
  }
  console.error('[error]', err);
  return res.status(500).json({ error: 'Er ging iets mis op de server' });
}

module.exports = errorHandler;
