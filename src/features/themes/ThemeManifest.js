const MOTIONS = ['fly', 'float', 'fall', 'hop', 'dangle', 'twinkle', 'bob', 'stand'];
const SAFE_FILE = /^[\w-]+\.(svg|png|webp|gif)$/i;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const DEFAULT_COLOR = '#0b0e1c';

const clamp = (value, min, max, fallback) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback);

/** Maakt van een ruwe theme.json veilige, volledige themagegevens. Ongeldige delen worden genegeerd. */
class ThemeManifest {
  /** @param availableFiles bestandsnamen die echt in de sprites-map staan */
  static normalize(id, raw, availableFiles) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
      id,
      name: String(source.name || id).slice(0, 40),
      description: String(source.description || '').slice(0, 200),
      color: HEX_COLOR.test(source.color) ? source.color : DEFAULT_COLOR,
      sprites: (Array.isArray(source.sprites) ? source.sprites : [])
        .map((group) => ThemeManifest.#spriteGroup(group, availableFiles))
        .filter(Boolean),
    };
  }

  static #spriteGroup(group, availableFiles) {
    if (!group || !MOTIONS.includes(group.motion)) return null;
    const files = (Array.isArray(group.files) ? group.files : []).filter((f) => SAFE_FILE.test(f) && availableFiles.includes(f));
    if (!files.length) return null;
    return {
      files,
      motion: group.motion,
      count: clamp(Number(group.count), 1, 30, 6),
      size: ThemeManifest.#range(group.size, 16, 200, [32, 64]),
      duration: ThemeManifest.#range(group.duration, 3, 120, [15, 30]),
    };
  }

  static #range(value, min, max, fallback) {
    if (!Array.isArray(value) || value.length !== 2) return fallback;
    const [low, high] = value.map((v) => clamp(Number(v), min, max, min));
    return [Math.min(low, high), Math.max(low, high)];
  }
}

module.exports = ThemeManifest;
