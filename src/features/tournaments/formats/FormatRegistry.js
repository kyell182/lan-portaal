const HttpError = require('../../../core/http/HttpError');
const SingleEliminationFormat = require('./elimination/SingleEliminationFormat');
const DoubleEliminationFormat = require('./elimination/DoubleEliminationFormat');
const RoundRobinFormat = require('./league/RoundRobinFormat');
const GroupStageFormat = require('./league/GroupStageFormat');
const SwissFormat = require('./league/SwissFormat');
const PointsFormat = require('./points/PointsFormat');
const ScoreboardFormat = require('./scoreboard/ScoreboardFormat');

/**
 * Register van alle toernooivormen. Een nieuwe vorm toevoegen =
 * een klasse die TournamentFormat uitbreidt en hier registreren.
 */
class FormatRegistry {
  #formats = new Map();

  constructor(formats = FormatRegistry.defaults()) {
    formats.forEach((format) => this.register(format));
  }

  static defaults() {
    return [
      new SingleEliminationFormat(),
      new DoubleEliminationFormat(),
      new RoundRobinFormat(),
      new GroupStageFormat(),
      new SwissFormat(),
      new PointsFormat(),
      new ScoreboardFormat(),
    ];
  }

  register(format) {
    this.#formats.set(format.key, format);
  }

  get(key) {
    const format = this.#formats.get(key);
    if (!format) throw HttpError.badRequest(`Onbekende toernooivorm: ${key}`);
    return format;
  }

  list() {
    return [...this.#formats.values()].map((f) => f.describe());
  }
}

module.exports = FormatRegistry;
