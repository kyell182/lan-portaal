import { api } from '../../../core/Api.js';

/** Voert een actie van een LAN-ronde uit als crew (bv. 'generate', 'submit:g1:1'). Geeft het bijgewerkte toernooi terug. */
export function lanAction(tournamentId, action, payload = {}) {
  return api.post(`/tournaments/${tournamentId}/matches/${encodeURIComponent(action)}/result`, payload);
}

export const MATCH_STATUS_LABEL = { open: 'Open', submitted: 'Ingestuurd', confirmed: 'Bevestigd', disputed: 'Betwist' };
