/** Speciale deelnemer-waarde voor een vrijgeleide (bye). */
const BYE = '__BYE__';

const STATUS = Object.freeze({
  PENDING: 'pending', // wacht op deelnemers
  READY: 'ready', // beide deelnemers gekend, kan gespeeld worden
  DONE: 'done',
  SKIPPED: 'skipped',
});

module.exports = { BYE, STATUS };
