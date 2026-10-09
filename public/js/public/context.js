import { EventContext } from '../core/EventContext.js';

/** Event-keuze op de publieke site: per tabblad (archief bekijken), standaard het actieve event. */
export const eventContext = new EventContext(sessionStorage, 'lan:event');
