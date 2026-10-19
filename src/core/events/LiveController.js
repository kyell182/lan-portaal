const express = require('express');

/**
 * Server-Sent Events: schermen op de LAN krijgen meteen een seintje bij wijzigingen
 * en halen dan zelf de nieuwe data op.
 */
class LiveController {
  constructor(events) {
    this.events = events;
  }

  router() {
    const r = express.Router();
    r.get('/', (req, res) => this.#stream(req, res));
    return r;
  }

  #stream(req, res) {
    // X-Accel-Buffering: nginx (ook Nginx Proxy Manager) mag de stream niet bufferen, anders komt er nooit iets door.
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n');

    const onChange = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);

    this.events.on('changed', onChange);
    req.on('close', () => {
      clearInterval(ping);
      this.events.off('changed', onChange);
    });
  }
}

module.exports = LiveController;
