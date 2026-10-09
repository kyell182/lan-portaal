/**
 * Verstuurt JSON via HTTP POST met een timeout.
 * Respecteert één keer een rate limit (429 + retry_after), zoals Discord die geeft.
 */
class HttpPoster {
  constructor({ timeoutMs = 8000, fetchImpl = globalThis.fetch } = {}) {
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
  }

  async post(url, body, headers = {}, attempt = 1) {
    const res = await this.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'vives-lan-portaal', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (res.status === 429 && attempt === 1) {
      const data = await res.json().catch(() => ({}));
      await new Promise((r) => setTimeout(r, Math.min(Number(data.retry_after || 1) * 1000, 10000)));
      return this.post(url, body, headers, 2);
    }
    if (!res.ok) throw new Error(`Doel antwoordde met HTTP ${res.status}`);
    return res;
  }
}

module.exports = HttpPoster;
