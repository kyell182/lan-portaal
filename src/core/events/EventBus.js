const { EventEmitter } = require('events');

/** Centrale event-bus: services melden wijzigingen, de live-feed stuurt ze door. */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(500);
  }
}

module.exports = EventBus;
