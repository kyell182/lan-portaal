const HttpError = require('../http/HttpError');

/**
 * Generieke service voor eenvoudige entiteiten (games, spelers, prijzen...).
 * Subklassen kunnen hooks overschrijven: beforeSave, beforeRemove, toPublic.
 */
class CrudService {
  constructor({ repository, schema, events, entityName, filterKeys = [] }) {
    this.repository = repository;
    this.schema = schema;
    this.events = events;
    this.entityName = entityName;
    this.filterKeys = filterKeys;
  }

  /** Lijst, optioneel gefilterd op toegelaten velden, bv. { eventId: '...' }. */
  list(filters = {}) {
    const active = this.filterKeys.filter((key) => typeof filters[key] === 'string' && filters[key] !== '');
    if (!active.length) return this.repository.all();
    return this.repository.filter((item) => active.every((key) => item[key] === filters[key]));
  }

  get(id) {
    const item = this.repository.findById(id);
    if (!item) throw HttpError.notFound(`${this.entityName} niet gevonden`);
    return item;
  }

  create(input) {
    const data = this.beforeSave(this.schema.validate(this.withDefaultEvent(input)), null);
    const item = this.repository.create(data);
    this.#changed();
    return item;
  }

  update(id, input) {
    const current = this.get(id);
    const data = this.beforeSave(this.schema.validate(input, { partial: true }), current);
    const item = this.repository.update(id, data);
    this.#changed();
    return item;
  }

  remove(id) {
    const item = this.get(id);
    this.beforeRemove(item);
    this.repository.delete(id);
    this.events?.emit('removed', { entity: this.repository.collection, id });
    this.#changed();
  }

  /** Koppelt een bron voor het standaard-event (het actieve event) aan deze service. */
  useDefaultEvent(resolver) {
    this.defaultEventResolver = resolver;
  }

  /** Vult eventId aan met het actieve event als het niet meegegeven werd. */
  withDefaultEvent(input = {}) {
    if (!this.defaultEventResolver || input.eventId) return input;
    return { ...input, eventId: this.defaultEventResolver() };
  }

  /** Weergave voor de API: admins zien alles, het publiek de toPublic-versie. */
  present(item, isAdmin) {
    return isAdmin ? item : this.toPublic(item);
  }

  /** Publieke weergave: standaard alles, subklassen verbergen gevoelige velden. */
  toPublic(item) {
    return item;
  }

  beforeSave(data) {
    return data;
  }

  beforeRemove() {}

  /** Voert fn uit telkens een entiteit van het gegeven type verwijderd wordt. */
  onRemoved(entity, fn) {
    this.events?.on('removed', (e) => {
      if (e.entity === entity) {
        fn(e.id);
        this.#changed();
      }
    });
  }

  #changed() {
    this.events?.emit('changed', { entity: this.repository.collection });
  }
}

module.exports = CrudService;
