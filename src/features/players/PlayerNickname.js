const HttpError = require('../../core/http/HttpError');

const PATTERN = /^[A-Za-z0-9_]{3,16}$/;
const FORMAT_MESSAGE = '3 tot 16 tekens: letters, cijfers en _, geen spaties';

/** Regels voor de gamertag: veilige gemene deler voor alle games, uniek per event. */
class PlayerNickname {
  static key(nickname) {
    return String(nickname).toLowerCase();
  }

  /** Gooit een veldfout als de gamertag ongeldig of al in gebruik is. `taken` bevat kleine-letter-namen. */
  static assertAllowed(nickname, taken) {
    if (!PATTERN.test(nickname)) throw PlayerNickname.#fieldError(FORMAT_MESSAGE);
    if (taken.has(PlayerNickname.key(nickname))) throw PlayerNickname.#fieldError('Deze gamertag is al in gebruik');
  }

  static #fieldError(message) {
    return HttpError.badRequest('Ongeldige invoer', { nickname: message });
  }
}

module.exports = PlayerNickname;
