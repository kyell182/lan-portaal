import { api } from '../../core/Api.js';

/** Hulpfuncties om keuzelijsten (selects) te vullen met data uit de API. */
export const toOptions = (items, label = (i) => i.name) => items.map((i) => ({ value: i.id, label: label(i) }));

export const nameOf = (list, id, label = (i) => i.name) => {
  const item = list?.find((i) => i.id === id);
  return item ? label(item) : '';
};

export async function loadLookups(...names) {
  const results = await Promise.all(names.map((n) => api.get(`/${n}`)));
  return Object.fromEntries(names.map((n, i) => [n, results[i]]));
}
