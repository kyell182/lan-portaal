import { EventContext } from '../core/EventContext.js';

/** Event waaraan de admin werkt; onthouden in deze browser. Nieuwe items komen in dit event. */
export const adminEventContext = new EventContext(localStorage, 'lan:admin-event');
