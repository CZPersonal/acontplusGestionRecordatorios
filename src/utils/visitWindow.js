// Ventana de carga de visitas y búsqueda histórica (P9). Funciones puras.

export const WINDOW_DAYS = 90;
export const MIN_SEARCH_LENGTH = 3;

/** Fecha local YYYY-MM-DD de hace `days` días (sin UTC: evita el desfase de Ecuador). */
export function windowStartDate(now = new Date(), days = WINDOW_DAYS) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Une varias listas de visitas por id (la última gana) y ordena por createdAt desc. */
export function mergeVisits(...lists) {
  const map = new Map();
  for (const list of lists) for (const v of list || []) map.set(v.id, v);
  return [...map.values()].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

/** Rango de prefijo para una consulta de Firestore de un solo campo. */
export function prefixRange(term) {
  return [term, term + ''];
}

/** Variantes del término a consultar por prefijo (tal cual y en mayúsculas, como se guardan los nombres). */
export function searchVariants(raw) {
  const t = String(raw || '').trim();
  if (t.length < MIN_SEARCH_LENGTH) return [];
  return [...new Set([t, t.toUpperCase()])];
}
