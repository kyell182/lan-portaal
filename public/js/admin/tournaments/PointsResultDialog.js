import { h } from '../../core/dom.js';
import { api } from '../../core/Api.js';
import { Modal } from '../../core/Modal.js';
import { Toast } from '../../core/Toast.js';

/** Plaatsen en bonus per deelnemer ingeven voor een ronde van een puntentoernooi. */
export class PointsResultDialog {
  constructor(tournament, round) {
    this.t = tournament;
    this.round = round;
  }

  open() {
    const existing = new Map(this.round.entries.map((e) => [e.pid, e]));
    const bonusLabel = this.t.settings.bonusLabel || 'Bonus';
    this.rows = this.t.participants.map((p) => ({
      pid: p.id,
      place: h('input', { type: 'number', min: 1, value: existing.get(p.id)?.place ?? '', 'aria-label': `Plaats ${p.name}` }),
      bonus: h('input', { type: 'number', min: 0, value: existing.get(p.id)?.bonus ?? '', 'aria-label': `${bonusLabel} ${p.name}` }),
      name: p.name,
    }));

    new Modal({
      title: `${this.round.label}: uitslag`,
      body: h('div', {},
        h('p', { class: 'muted' }, 'Laat de plaats leeg voor wie niet meespeelde.'),
        h('div', { class: 'entry-grid' },
          h('span', { class: 'muted' }, 'Deelnemer'), h('span', { class: 'muted' }, 'Plaats'), h('span', { class: 'muted' }, bonusLabel),
          this.rows.map((r) => [h('span', {}, r.name), r.place, r.bonus]))),
      submitLabel: 'Uitslag opslaan',
      onSubmit: async () => {
        const entries = this.rows.map((r) => ({ pid: r.pid, place: r.place.value, bonus: r.bonus.value || 0 }));
        await api.post(`/tournaments/${this.t.id}/matches/${this.round.id}/result`, { entries });
        Toast.show('Uitslag opgeslagen');
      },
      onError: (err) => Toast.error(err),
    }).open();
  }
}
