/**
 * Uniform formaat voor klassementen zodat de frontend elke vorm op dezelfde manier toont:
 * { title, columns: [{ key, label }], rows: [{ pid, place, ...waarden }] }
 */
class StandingsTable {
  constructor(title, columns) {
    this.title = title;
    this.columns = [{ key: 'place', label: '#' }, { key: 'name', label: 'Deelnemer' }, ...columns];
    this.rows = [];
  }

  /** rows moeten al gesorteerd zijn; isTie(a, b) bepaalt of twee rijen dezelfde plaats delen. */
  fill(rows, isTie = () => false) {
    this.rows = rows.map((row, i) => {
      const tied = i > 0 && isTie(rows[i - 1], row);
      return { ...row, place: tied ? null : i + 1 };
    });
    let last = null;
    for (const row of this.rows) {
      if (row.place === null) row.place = last;
      last = row.place;
    }
    return this;
  }

  toJSON() {
    return { title: this.title, columns: this.columns, rows: this.rows };
  }
}

module.exports = StandingsTable;
