/** Dunne laag rond fetch voor de JSON-API. Fouten worden ApiError met de servermelding. */
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }

  /** Leesbare tekst incl. veldfouten. */
  describe() {
    if (!this.details || typeof this.details !== 'object') return this.message;
    const fields = Object.entries(this.details).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`);
    return `${this.message} (${fields.join('; ')})`;
  }
}

export class Api {
  constructor(base = '/api') {
    this.base = base;
  }

  get(path) { return this.#request('GET', path); }

  post(path, body = {}) { return this.#request('POST', path, body); }

  put(path, body = {}) { return this.#request('PUT', path, body); }

  patch(path, body = {}) { return this.#request('PATCH', path, body); }

  delete(path) { return this.#request('DELETE', path); }

  async #request(method, path, body) {
    const res = await fetch(this.base + path, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error || 'Onbekende fout', data.details);
    return data;
  }
}

export const api = new Api();
