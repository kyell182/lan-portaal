const crypto = require('crypto');

/** Basis-repository met CRUD op één collectie. Features breiden deze uit. */
class Repository {
  constructor(store, collection) {
    this.store = store;
    this.collection = collection;
  }

  all() {
    return [...this.store.read(this.collection)];
  }

  findById(id) {
    return this.all().find((item) => item.id === id) || null;
  }

  filter(predicate) {
    return this.all().filter(predicate);
  }

  create(data) {
    const now = new Date().toISOString();
    const item = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now };
    this.#save([...this.all(), item]);
    return item;
  }

  update(id, patch) {
    const current = this.findById(id);
    if (!current) return null;
    const updated = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
    this.#save(this.all().map((item) => (item.id === id ? updated : item)));
    return updated;
  }

  delete(id) {
    const before = this.all();
    const after = before.filter((item) => item.id !== id);
    this.#save(after);
    return after.length !== before.length;
  }

  count() {
    return this.all().length;
  }

  #save(items) {
    this.store.write(this.collection, items);
  }
}

module.exports = Repository;
