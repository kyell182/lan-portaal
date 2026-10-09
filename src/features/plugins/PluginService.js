const Repository = require('../../core/db/Repository');
const HttpError = require('../../core/http/HttpError');

/**
 * Bewaart per plugin: aan/uit, instellingen en de laatste status.
 * Geheime velden (webhook-URL...) gaan nooit terug naar de browser.
 */
class PluginService {
  constructor(store, registry) {
    this.repository = new Repository(store, 'plugins');
    this.registry = registry;
  }

  /** Overzicht voor het beheer: beschrijving + veilige instellingen + status. */
  list() {
    return this.registry.all().map((plugin) => this.#view(plugin, this.#config(plugin.key)));
  }

  configure(key, { enabled, settings = {} }) {
    const plugin = this.registry.get(key);
    const current = this.#config(key);
    const merged = { ...(current?.settings || {}) };
    for (const [field, value] of Object.entries(settings)) {
      const keepSecret = plugin.secretFields.includes(field) && (value === '' || value === undefined);
      if (!keepSecret) merged[field] = value;
    }
    const clean = plugin.normalizeSettings(merged);
    const data = { key, enabled: enabled ?? current?.enabled ?? false, settings: clean };
    if (data.enabled) this.#assertReady(plugin, clean);
    const saved = current ? this.repository.update(current.id, data) : this.repository.create(data);
    return this.#view(plugin, saved);
  }

  async test(key) {
    const plugin = this.registry.get(key);
    const config = this.#config(key);
    if (!config) throw HttpError.badRequest('Sla eerst de instellingen op');
    try {
      await plugin.test(config.settings);
      this.recordResult(key, null);
    } catch (err) {
      this.recordResult(key, err.message);
      throw HttpError.badRequest(`Test mislukt: ${err.message}`);
    }
  }

  /** Actieve plugins met hun instellingen (voor de NotificationHub). */
  enabled() {
    return this.repository.filter((c) => c.enabled).map((c) => ({ plugin: this.registry.get(c.key), settings: c.settings }));
  }

  recordResult(key, error) {
    const config = this.#config(key);
    if (!config) return;
    this.repository.update(config.id, error ? { lastError: error, lastErrorAt: new Date().toISOString() } : { lastError: null, lastSentAt: new Date().toISOString() });
  }

  #assertReady(plugin, settings) {
    const missing = plugin.ownFields.filter((f) => f.neededWhenEnabled && !settings[f.key]);
    if (missing.length) throw HttpError.badRequest(`Vul eerst in: ${missing.map((f) => f.label).join(', ')}`);
  }

  #config(key) {
    return this.repository.all().find((c) => c.key === key) || null;
  }

  #view(plugin, config) {
    const settings = { ...plugin.normalizeSettings({}), ...(config?.settings || {}) };
    const secretsSet = {};
    for (const field of plugin.secretFields) {
      secretsSet[field] = !!settings[field];
      settings[field] = '';
    }
    return {
      ...plugin.describe(),
      enabled: !!config?.enabled,
      settings,
      secretsSet,
      lastSentAt: config?.lastSentAt || null,
      lastError: config?.lastError || null,
    };
  }
}

module.exports = PluginService;
