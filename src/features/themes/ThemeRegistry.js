const fs = require('fs');
const path = require('path');
const ThemeManifest = require('./ThemeManifest');

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,29}$/;

/**
 * Zoekt thema's op schijf. Elk thema is een map met theme.json, theme.css en een sprites-map.
 * Mappen die met '_' beginnen worden genegeerd (handig voor voorbeelden of werk in uitvoering).
 * Wordt bij elke aanvraag opnieuw ingelezen, zodat een nieuwe map meteen werkt zonder herstart.
 */
class ThemeRegistry {
  /** @param sources [{ dir, urlBase }] – eerste bron wint bij dubbele id's (ingebouwd boven eigen) */
  constructor(sources) {
    this.sources = sources;
  }

  list() {
    const found = new Map();
    for (const source of this.sources) {
      for (const theme of this.#scan(source)) if (!found.has(theme.id)) found.set(theme.id, theme);
    }
    return [...found.values()];
  }

  has(id) {
    return this.list().some((theme) => theme.id === id);
  }

  #scan({ dir, urlBase }) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && ID_PATTERN.test(entry.name))
      .map((entry) => this.#read(path.join(dir, entry.name), entry.name, urlBase))
      .filter(Boolean);
  }

  #read(folder, id, urlBase) {
    const manifest = ThemeRegistry.#readJson(path.join(folder, 'theme.json'));
    const spritesDir = path.join(folder, 'sprites');
    const sprites = fs.existsSync(spritesDir) ? fs.readdirSync(spritesDir) : [];
    return {
      ...ThemeManifest.normalize(id, manifest, sprites),
      base: `${urlBase}/${id}`,
      hasCss: fs.existsSync(path.join(folder, 'theme.css')),
    };
  }

  static #readJson(file) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn(`[themes] ${file} is ongeldig en wordt genegeerd: ${err.message}`);
      return null;
    }
  }
}

module.exports = ThemeRegistry;
