/** Kleine HTTP-client die één cookie bijhoudt: een aangemelde admin of een dummy-speler. */
class HttpSession {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.cookie = '';
  }

  async request(method, path, body) {
    const response = await fetch(`${this.baseUrl}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const cookie = response.headers.get('set-cookie');
    if (cookie) this.cookie = cookie.split(';')[0];
    const data = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error(data?.error || `HTTP ${response.status}`), { status: response.status });
    return data;
  }

  get(path) { return this.request('GET', path); }

  post(path, body = {}) { return this.request('POST', path, body); }

  put(path, body = {}) { return this.request('PUT', path, body); }
}

module.exports = HttpSession;
