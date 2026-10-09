const MessageBuilder = require('./MessageBuilder');

/**
 * Luistert naar domeinmeldingen ('domain' op de EventBus) en stuurt ze door
 * naar elke ingeschakelde plugin die die melding wil. Fouten blokkeren het portaal nooit.
 */
class NotificationHub {
  constructor(events, pluginService, { publicUrl = '' } = {}) {
    this.pluginService = pluginService;
    this.builder = new MessageBuilder(publicUrl);
    this.pending = new Set();
    events.on('domain', (notification) => this.#track(this.dispatch(notification)));
  }

  async dispatch(notification) {
    const message = this.builder.build(notification);
    if (!message) return;
    const targets = this.pluginService.enabled().filter(({ plugin, settings }) => plugin.wants(notification.type, settings));
    await Promise.all(targets.map(({ plugin, settings }) => this.#send(plugin, message, settings)));
  }

  /** Wacht tot alle lopende meldingen verstuurd zijn (handig voor tests). */
  async idle() {
    await Promise.all([...this.pending]);
  }

  async #send(plugin, message, settings) {
    try {
      await plugin.send(message, settings);
      this.pluginService.recordResult(plugin.key, null);
    } catch (err) {
      console.warn(`[plugins] ${plugin.label}: ${err.message}`);
      this.pluginService.recordResult(plugin.key, err.message);
    }
  }

  #track(promise) {
    this.pending.add(promise);
    promise.finally(() => this.pending.delete(promise));
  }
}

module.exports = NotificationHub;
