/** Fout met HTTP-statuscode, wordt door de errorHandler netjes teruggestuurd. */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(message, details) {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'Niet aangemeld') {
    return new HttpError(401, message);
  }

  static notFound(message = 'Niet gevonden') {
    return new HttpError(404, message);
  }

  static conflict(message) {
    return new HttpError(409, message);
  }
}

module.exports = HttpError;
