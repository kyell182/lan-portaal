import { h } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Toast } from '../../core/Toast.js';
import { playerLabel } from '../../views/playerLabel.js';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', url: (name) => `https://instagram.com/${encodeURIComponent(name)}` },
  { key: 'tiktok', label: 'TikTok', url: (name) => `https://www.tiktok.com/@${encodeURIComponent(name)}` },
  { key: 'facebook', label: 'Facebook', url: (name) => `https://facebook.com/${encodeURIComponent(name)}` },
  { key: 'linkedin', label: 'LinkedIn', url: (name) => `https://www.linkedin.com/in/${encodeURIComponent(name)}` },
];

/**
 * Social-controle: per speler de opgegeven gebruikersnamen met een link om te controleren, en een vinkje "gevolgd".
 * Het vinkje zet het criterium van dat platform (op naam) op 1 in het scorebord.
 */
export class SocialCheckPanel {
  constructor(tournament, players) {
    this.t = tournament;
    const byId = new Map(players.map((p) => [p.id, p]));
    this.rows = tournament.participants.filter((p) => byId.has(p.refId)).map((p) => ({ participant: p, player: byId.get(p.refId) }));
  }

  /** null als er niets te controleren valt (geen gekoppelde spelers of geen criteria per platform). */
  render() {
    const usable = PLATFORMS.filter((platform) => this.#criterion(platform));
    if (!this.rows.length || !usable.length) return null;
    return h('section', { class: 'panel' }, h('h3', {}, 'Social-controle'),
      h('p', { class: 'muted' }, 'Open de link, controleer of de speler jullie volgt en vink het platform af.'),
      h('div', { class: 'table-scroll' }, h('table', { class: 'data' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Speler'), usable.map((platform) => h('th', {}, platform.label)))),
        h('tbody', {}, this.rows.map((row) => h('tr', {}, h('td', {}, playerLabel(row.player)), usable.map((platform) => this.#cell(row, platform))))))));
  }

  #cell(row, platform) {
    const username = row.player.socials?.[platform.key];
    const claimed = row.player.socialsClaimed?.includes(platform.key);
    const criterion = this.#criterion(platform);
    const checked = (this.t.state.scores[row.participant.id]?.[criterion.id] ?? 0) > 0;
    const box = h('input', { type: 'checkbox', checked, 'aria-label': `${platform.label} gevolgd`, onchange: (e) => this.#toggle(row, criterion, e.target.checked) });
    return h('td', {},
      username ? h('a', { href: platform.url(username), target: '_blank', rel: 'noopener noreferrer' }, `@${username}`) : h('span', { class: 'muted' }, claimed ? 'geen naam opgegeven' : '–'),
      ' ', box);
  }

  #criterion(platform) {
    return this.t.state.criteria.find((c) => c.label.toLowerCase().includes(platform.key));
  }

  async #toggle(row, criterion, on) {
    const values = { ...(this.t.state.scores[row.participant.id] ?? {}), [criterion.id]: on ? 1 : 0 };
    try {
      await api.post(`/tournaments/${this.t.id}/matches/scores/result`, { entries: [{ pid: row.participant.id, values }] });
    } catch (err) {
      Toast.error(err);
    }
  }
}
