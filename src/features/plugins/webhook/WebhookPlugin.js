const crypto = require('crypto');
const Plugin = require('../Plugin');
const HttpPoster = require('../HttpPoster');
const HttpError = require('../../../core/http/HttpError');

/**
 * Algemene webhook: stuurt elke melding als JSON naar een eigen URL
 * (bv. een eigen bot, n8n, Home Assistant, een scorebord-scherm...).
 * Optioneel ondertekend met HMAC-SHA256 in de header X-Lan-Signature.
 */
class WebhookPlugin extends Plugin {
  constructor(poster = new HttpPoster()) {
    super();
    this.poster = poster;
  }

  get key() { return 'webhook'; }

  get label() { return 'Algemene webhook'; }

  get description() {
    return 'Stuurt elke melding als JSON naar een eigen URL, om zelf koppelingen te bouwen.';
  }

  get ownFields() {
    return [
      { key: 'url', label: 'URL (https)', type: 'string', maxLength: 500, neededWhenEnabled: true },
      { key: 'secret', label: 'Geheim voor de handtekening (optioneel)', type: 'string', maxLength: 200 },
    ];
  }

  get secretFields() { return ['secret']; }

  normalizeSettings(settings) {
    const clean = super.normalizeSettings(settings);
    if (clean.url && !/^https:\/\//.test(clean.url)) throw HttpError.badRequest('Ongeldige invoer', { url: 'Gebruik een https-URL' });
    return clean;
  }

  async send(message, settings) {
    if (!settings.url) throw new Error('Geen URL ingesteld');
    const body = { source: 'vives-lan-portaal', sentAt: new Date().toISOString(), ...message };
    const headers = settings.secret ? { 'X-Lan-Signature': this.sign(body, settings.secret) } : {};
    await this.poster.post(settings.url, body, headers);
  }

  sign(body, secret) {
    return `sha256=${crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex')}`;
  }
}

module.exports = WebhookPlugin;
