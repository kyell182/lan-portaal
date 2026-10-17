const FORMAT_KEY = 'lan-round';
const STATUS_DRAFT = 'draft';
const DEFAULT_INTERVAL_MS = 5000;

/**
 * Bevestigt ingestuurde groepsuitslagen automatisch als niemand ze binnen `autoConfirmSeconds` meldt.
 * Een timer controleert goedkoop of er iets "due" is; enkel dan wordt er geschreven en een live-update gestuurd.
 */
class AutoConfirmer {
  constructor(tournaments) {
    this.tournaments = tournaments;
    this.timer = null;
  }

  start(intervalMs = DEFAULT_INTERVAL_MS) {
    this.stop();
    this.timer = setInterval(() => this.sweep(), intervalMs);
    this.timer.unref();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  /** @returns aantal toernooien waarin uitslagen automatisch bevestigd zijn */
  sweep(nowMs = Date.now()) {
    const format = this.tournaments.formats.get(FORMAT_KEY);
    const due = this.tournaments.repository.filter((t) => t.formatKey === FORMAT_KEY && t.status !== STATUS_DRAFT && t.state && format.autoConfirmDue(t.state, t.settings, nowMs));
    due.forEach((t) => this.tournaments.report(t.id, 'autoconfirm', { now: nowMs }));
    return due.length;
  }
}

module.exports = AutoConfirmer;
