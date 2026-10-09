const HttpError = require('../../core/http/HttpError');
const DiscordPlugin = require('./discord/DiscordPlugin');
const WebhookPlugin = require('./webhook/WebhookPlugin');

/**
 * Alle beschikbare plugins. Een nieuwe integratie toevoegen =
 * een klasse die Plugin uitbreidt en hier registreren.
 */
class PluginRegistry {
  #plugins = new Map();

  constructor(plugins = [new DiscordPlugin(), new WebhookPlugin()]) {
    plugins.forEach((p) => this.#plugins.set(p.key, p));
  }

  get(key) {
    const plugin = this.#plugins.get(key);
    if (!plugin) throw HttpError.notFound(`Onbekende plugin: ${key}`);
    return plugin;
  }

  all() {
    return [...this.#plugins.values()];
  }
}

module.exports = PluginRegistry;
