const MAX_USERNAME_LENGTH = 60;

/** De sociale platformen waarvoor een speler een bonus kan krijgen. */
class SocialPlatforms {
  static KEYS = ['instagram', 'tiktok', 'facebook', 'linkedin'];

  /** Houdt enkel bekende platformen over, met nette gebruikersnamen (zonder @). */
  static cleanUsernames(raw = {}) {
    const clean = {};
    for (const key of SocialPlatforms.KEYS) {
      const value = String(raw?.[key] ?? '').trim().replace(/^@/, '').slice(0, MAX_USERNAME_LENGTH);
      if (value) clean[key] = value;
    }
    return clean;
  }

  /** Accepteert een lijst of tekst ("Instagram; TikTok") en geeft platformsleutels terug. */
  static cleanClaimed(raw = []) {
    const parts = Array.isArray(raw) ? raw : String(raw).split(/[;,]/);
    const keys = parts.map((part) => String(part).trim().toLowerCase());
    return SocialPlatforms.KEYS.filter((key) => keys.includes(key));
  }
}

module.exports = SocialPlatforms;
