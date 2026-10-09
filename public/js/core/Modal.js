import { h } from './dom.js';

/** Eenvoudige dialoog. onSubmit mag async zijn; bij een fout blijft de modal open. */
export class Modal {
  constructor({ title, body, submitLabel = 'Opslaan', onSubmit, onError }) {
    this.onSubmit = onSubmit;
    this.onError = onError;
    this.submit = h('button', { class: 'btn primary', type: 'submit' }, submitLabel);
    this.form = h('form', { class: 'modal', onsubmit: (e) => this.#handle(e) },
      h('h2', {}, title),
      body,
      h('div', { class: 'modal-actions' },
        h('button', { class: 'btn', type: 'button', onclick: () => this.close() }, 'Annuleren'),
        onSubmit ? this.submit : null));
    this.el = h('div', { class: 'modal-backdrop', onclick: (e) => { if (e.target === this.el) this.close(); } }, this.form);
    this.onKey = (e) => { if (e.key === 'Escape') this.close(); };
  }

  open() {
    document.body.append(this.el);
    document.addEventListener('keydown', this.onKey);
    this.form.querySelector('input, select, textarea')?.focus();
    return this;
  }

  close() {
    this.el.remove();
    document.removeEventListener('keydown', this.onKey);
  }

  async #handle(event) {
    event.preventDefault();
    this.submit.disabled = true;
    try {
      await this.onSubmit?.();
      this.close();
    } catch (err) {
      this.onError?.(err);
    } finally {
      this.submit.disabled = false;
    }
  }
}
