const Plugin = require('../Plugin');
const HttpPoster = require('../HttpPoster');
const HttpError = require('../../../core/http/HttpError');

const COLORS = { vives: 0xe30613, cyan: 0x2fe0ff, gold: 0xffd23f, neutral: 0x2a3560 };
const WEBHOOK = /^https:\/\/(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

/**
 * Discord via een kanaal-webhook (Kanaalinstellingen → Integraties → Webhooks).
 * Geen bot nodig: het portaal post berichten als embed in het gekozen kanaal.
 */
class DiscordPlugin extends Plugin {
  constructor(poster = new HttpPoster()) {
    super();
    this.poster = poster;
  }

  get key() { return 'discord'; }

  get label() { return 'Discord'; }

  get description() {
    return 'Post toernooistarts, uitslagen en winnaars in een Discord-kanaal via een webhook.';
  }

  get ownFields() {
    return [
      { key: 'webhookUrl', label: 'Webhook-URL', type: 'string', maxLength: 300, neededWhenEnabled: true },
      { key: 'username', label: 'Naam van de bot in Discord', type: 'string', maxLength: 80, default: 'VIVES LAN' },
    ];
  }

  get secretFields() { return ['webhookUrl']; }

  normalizeSettings(settings) {
    const clean = super.normalizeSettings(settings);
    if (clean.webhookUrl && !WEBHOOK.test(clean.webhookUrl)) {
      throw HttpError.badRequest('Ongeldige invoer', { webhookUrl: 'Dit is geen Discord-webhook-URL' });
    }
    return clean;
  }

  async send(message, settings) {
    if (!settings.webhookUrl) throw new Error('Geen webhook-URL ingesteld');
    await this.poster.post(settings.webhookUrl, this.toPayload(message, settings));
  }

  /** Discord-formaat: één embed, mentions uitgeschakeld zodat niemand per ongeluk gepingd wordt. */
  toPayload(message, settings = {}) {
    return {
      username: settings.username || 'VIVES LAN',
      allowed_mentions: { parse: [] },
      embeds: [{
        title: message.title.slice(0, 256),
        description: (message.text || '').slice(0, 4000),
        color: COLORS[message.color] ?? COLORS.vives,
        url: message.url || undefined,
        timestamp: new Date().toISOString(),
        footer: { text: 'VIVES LAN-portaal' },
      }],
    };
  }
}

module.exports = DiscordPlugin;
