import { themeCatalog } from './ThemeCatalog.js';
import { themeSelector } from './ThemeSelector.js';
import { ThemePicker } from './ThemePicker.js';
import { SpriteLayer } from './SpriteLayer.js';

/** Laadt de thema's, koppelt het thema aan het huidige event en plaatst de themakeuze in de topbar. */
export async function startThemes(eventContext, pickerContainer) {
  await themeCatalog.load();
  const followEvent = () => themeSelector.setEventTheme(eventContext.current?.theme);
  eventContext.addEventListener('change', followEvent);
  eventContext.addEventListener('list', followEvent);
  followEvent();
  new SpriteLayer(themeSelector).start();
  pickerContainer.append(new ThemePicker(themeSelector).render());
}
