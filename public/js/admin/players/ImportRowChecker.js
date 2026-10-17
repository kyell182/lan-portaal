const NICKNAME = /^[A-Za-z0-9_]{3,16}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Controleert gemapte rijen vooraf: lege/ongeldige/dubbele gamertag, ontbrekende naam, ongeldig e-mailadres. */
export class ImportRowChecker {
  /** @param rows [{ values, skip }] @param takenNicknames gamertags die al in het event bestaan (kleine letters) */
  constructor(takenNicknames = new Set()) {
    this.taken = takenNicknames;
  }

  /** Geeft per rij een lijst problemen ([] = ok). Overgeslagen rijen tellen niet mee voor dubbels. */
  check(rows) {
    const seen = new Set(this.taken);
    return rows.map((row) => {
      if (row.skip) return [];
      const problems = ImportRowChecker.#basic(row.values);
      const key = (row.values.nickname || '').toLowerCase();
      if (key && seen.has(key)) problems.push('Gamertag bestaat al');
      else if (key) seen.add(key);
      return problems;
    });
  }

  /** Eerste vrije variant met een cijfer erachter, bv. Naam → Naam2. */
  suggestFree(nickname, rows) {
    const used = new Set([...this.taken, ...rows.filter((r) => !r.skip).map((r) => (r.values.nickname || '').toLowerCase())]);
    for (let n = 2; ; n += 1) {
      const suffix = String(n);
      const candidate = nickname.slice(0, 16 - suffix.length) + suffix;
      if (!used.has(candidate.toLowerCase())) return candidate;
    }
  }

  static #basic(values) {
    const problems = [];
    if (!values.nickname) problems.push('Gamertag ontbreekt');
    else if (!NICKNAME.test(values.nickname)) problems.push('Gamertag: 3-16 tekens, letters/cijfers/_');
    if (!values.firstName || !values.lastName) problems.push('Voor- of achternaam ontbreekt');
    if (values.email && !EMAIL.test(values.email)) problems.push('Ongeldig e-mailadres');
    return problems;
  }
}
