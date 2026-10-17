import { h } from '../../core/dom.js';
import { IMPORT_FIELDS } from './ImportFields.js';

const PREVIEW_FIELDS = IMPORT_FIELDS.filter((f) => ['nickname', 'firstName', 'lastName', 'email', 'studyProgram'].includes(f.key));

/** Voorbeeld van de te importeren rijen met problemen per rij; gamertag aanpasbaar, rij overslaan of hernoemen. */
export class ImportPreviewTable {
  /** @param handlers { onChange(), onRename(row) } */
  constructor(rows, problems, handlers) {
    this.rows = rows;
    this.problems = problems;
    this.handlers = handlers;
  }

  render() {
    return h('div', { class: 'table-scroll' }, h('table', { class: 'data' },
      h('thead', {}, h('tr', {}, h('th', {}, '#'), PREVIEW_FIELDS.map((f) => h('th', {}, f.label)), h('th', {}, 'Controle'), h('th', {}))),
      h('tbody', {}, this.rows.map((row, i) => this.#row(row, i)))));
  }

  #row(row, index) {
    const problems = this.problems[index];
    return h('tr', { style: { opacity: row.skip ? '.45' : '1' } },
      h('td', {}, index + 1),
      PREVIEW_FIELDS.map((f) => h('td', {}, f.key === 'nickname' ? this.#nicknameInput(row) : row.values[f.key] ?? '')),
      h('td', {}, problems.length
        ? h('span', { style: { color: 'var(--danger-text)' } }, problems.join(' · '))
        : h('span', { style: { color: 'var(--ok)' } }, 'OK')),
      h('td', { class: 'num' }, this.#actions(row, problems)));
  }

  #nicknameInput(row) {
    return h('input', {
      value: row.values.nickname || '',
      'aria-label': 'Gamertag',
      onchange: (e) => {
        row.values.nickname = e.target.value.trim();
        this.handlers.onChange();
      },
    });
  }

  #actions(row, problems) {
    const duplicate = problems.includes('Gamertag bestaat al');
    return h('div', { class: 'actions', style: { justifyContent: 'flex-end' } },
      duplicate ? h('button', { class: 'btn small', type: 'button', onclick: () => this.handlers.onRename(row) }, 'Voeg cijfer toe') : null,
      h('button', {
        class: 'btn small',
        type: 'button',
        onclick: () => { row.skip = !row.skip; this.handlers.onChange(); },
      }, row.skip ? 'Toch importeren' : 'Overslaan'));
  }
}
