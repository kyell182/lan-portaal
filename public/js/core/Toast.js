import { h } from './dom.js';

/** Korte melding onderaan het scherm. */
export class Toast {
  static show(message, { error = false } = {}) {
    document.querySelector('.toast')?.remove();
    const el = h('div', { class: `toast${error ? ' error' : ''}`, role: 'status' }, message);
    document.body.append(el);
    setTimeout(() => el.remove(), error ? 6000 : 3000);
  }

  static error(err) {
    Toast.show(err?.describe ? err.describe() : err?.message || String(err), { error: true });
  }
}
