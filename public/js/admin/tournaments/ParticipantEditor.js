import { h } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Toast } from '../../core/Toast.js';

/**
 * Deelnemers beheren. Voor de start: toevoegen (vrije naam of uit teams/spelers),
 * volgorde = seeding, verwijderen. Na de start: enkel namen aanpassen.
 */
export class ParticipantEditor {
  constructor(tournament, { teams, players }) {
    this.t = tournament;
    this.draft = tournament.status === 'draft';
    this.list = tournament.participants.map((p) => ({ ...p }));
    this.source = tournament.participantType === 'team'
      ? teams.map((t) => ({ id: t.id, name: t.name }))
      : players.map((p) => ({ id: p.id, name: p.nickname }));
  }

  render() {
    this.el = h('div', { class: 'panel' });
    this.#draw();
    return this.el;
  }

  #draw() {
    const kind = this.t.participantType === 'team' ? 'teams' : 'spelers';
    this.el.replaceChildren(
      h('div', { class: 'page-head' },
        h('div', {}, h('h3', {}, `Deelnemers (${this.list.length})`),
          h('div', { class: 'muted' }, this.draft ? 'De volgorde bepaalt de seeding. Bovenaan = hoogste seed.' : 'Het toernooi loopt: je kan enkel nog namen aanpassen.')),
        this.draft ? h('button', { class: 'btn primary', onclick: () => this.#save() }, 'Deelnemers opslaan') : null),
      this.list.length ? h('div', {}, this.list.map((p, i) => this.#row(p, i))) : h('div', { class: 'empty' }, `Nog geen deelnemers. Voeg ${kind} toe of typ een naam.`),
      this.draft ? this.#adders(kind) : null);
  }

  #row(p, i) {
    const input = h('input', { value: p.name, 'aria-label': `Naam deelnemer ${i + 1}`, oninput: (e) => { p.name = e.target.value; this.dirty = true; } });
    if (!this.draft) {
      return h('div', { class: 'participant-row' }, h('span', { class: 'seed' }, i + 1), input,
        h('button', { class: 'btn small', onclick: () => this.#rename(p) }, 'Naam opslaan'), h('span'));
    }
    return h('div', { class: 'participant-row' },
      h('span', { class: 'seed' }, i + 1), input,
      h('div', { class: 'actions' },
        h('button', { class: 'btn small', 'aria-label': 'Hoger', disabled: i === 0, onclick: () => this.#move(i, -1) }, '▲'),
        h('button', { class: 'btn small', 'aria-label': 'Lager', disabled: i === this.list.length - 1, onclick: () => this.#move(i, 1) }, '▼')),
      h('button', { class: 'btn small danger', onclick: () => { this.list.splice(i, 1); this.#changed(); } }, 'Verwijderen'));
  }

  #adders(kind) {
    const used = new Set(this.list.map((p) => p.refId).filter(Boolean));
    const available = this.source.filter((s) => !used.has(s.id));
    const select = h('select', { 'aria-label': `Kies uit ${kind}` }, h('option', { value: '' }, `Kies uit ${kind}`), available.map((s) => h('option', { value: s.id }, s.name)));
    const free = h('input', { placeholder: 'Of typ een naam', 'aria-label': 'Nieuwe deelnemer' });
    const add = () => {
      const ref = available.find((s) => s.id === select.value);
      const name = ref?.name || free.value.trim();
      if (!name) return;
      this.list.push({ name, refId: ref?.id || null });
      this.#changed();
    };
    return h('div', { class: 'actions', style: { marginTop: '16px' } },
      select, free,
      h('button', { class: 'btn', onclick: add }, 'Toevoegen'),
      available.length ? h('button', { class: 'btn', onclick: () => { available.forEach((s) => this.list.push({ name: s.name, refId: s.id })); this.#changed(); } }, `Alle ${available.length} ${kind} toevoegen`) : null,
      this.list.length > 1 ? h('button', { class: 'btn', onclick: () => this.#shuffle() }, 'Volgorde husselen') : null);
  }

  /** Onbewaarde wijzigingen: de pagina herlaadt dan niet automatisch. */
  #changed() {
    this.dirty = true;
    this.#draw();
  }

  #move(i, delta) {
    const [item] = this.list.splice(i, 1);
    this.list.splice(i + delta, 0, item);
    this.#changed();
  }

  #shuffle() {
    for (let i = this.list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.list[i], this.list[j]] = [this.list[j], this.list[i]];
    }
    this.#changed();
  }

  async #save() {
    try {
      this.dirty = false;
      await api.put(`/tournaments/${this.t.id}/participants`, { participants: this.list });
      Toast.show('Deelnemers opgeslagen');
    } catch (err) {
      this.dirty = true;
      Toast.error(err);
    }
  }

  async #rename(p) {
    try {
      this.dirty = false;
      await api.patch(`/tournaments/${this.t.id}/participants/${p.id}`, { name: p.name });
      Toast.show('Naam aangepast');
    } catch (err) { Toast.error(err); }
  }
}
