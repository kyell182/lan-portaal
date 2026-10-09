const fs = require('fs');
const path = require('path');

/**
 * Eenvoudige opslag: één JSON-bestand per collectie, in het geheugen gecachet.
 * Schrijven gebeurt atomisch (tmp-bestand + rename) zodat data nooit half wordt weggeschreven.
 */
class JsonStore {
  #dir;
  #cache = new Map();

  constructor(dir) {
    this.#dir = dir;
    fs.mkdirSync(dir, { recursive: true });
  }

  read(collection) {
    if (!this.#cache.has(collection)) {
      this.#cache.set(collection, this.#load(collection));
    }
    return this.#cache.get(collection);
  }

  write(collection, items) {
    this.#cache.set(collection, items);
    const file = this.#file(collection);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
    fs.renameSync(tmp, file);
  }

  #load(collection) {
    const file = this.#file(collection);
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  #file(collection) {
    return path.join(this.#dir, `${collection}.json`);
  }
}

module.exports = JsonStore;
