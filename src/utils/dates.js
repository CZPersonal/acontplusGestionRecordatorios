export const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const formatDateOnly = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export const formatDateTime = (isoStr) => {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('es-EC', {
    timeZone:  'America/Guayaquil',
    day:       '2-digit',
    month:     '2-digit',
    year:      'numeric',
    hour:      '2-digit',
    minute:    '2-digit',
  });
};

// ─── Helpers para series de visitas periódicas ────────────────────────────────

export const MAX_RECURRENCE_VISITS = 36; // 3 años de visitas mensuales

// Suma n meses a una fecha YYYY-MM-DD, recortando al último día válido del mes
// destino (ej. 31 ene + 1 mes → 28/29 feb, nunca "3 mar" por desborde).
export const addMonthsClamped = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetIndex = m - 1 + n; // mes 0-based, puede ser negativo o >11
  const targetYear  = y + Math.floor(targetIndex / 12);
  const targetMonth = ((targetIndex % 12) + 12) % 12;
  const lastDay     = new Date(targetYear, targetMonth + 1, 0).getDate();
  return localDateStr(new Date(targetYear, targetMonth, Math.min(d, lastDay)));
};

// Genera la serie mensual [startDate, +1mes, +2meses, ...] (incluye startDate),
// deteniéndose al superar endDate o al llegar a max fechas, lo que ocurra primero.
// Si endDate es anterior a startDate devuelve un array vacío (rango inválido).
export const generateMonthlySeries = (startDate, endDate, max = MAX_RECURRENCE_VISITS) => {
  const dates = [];
  for (let i = 0; i < max; i++) {
    const next = addMonthsClamped(startDate, i);
    if (next > endDate) break;
    dates.push(next);
  }
  return dates;
};

// Quita duplicados y ordena cronológicamente (para fusionar fecha base + fechas manuales)
export const dedupeSortDates = (dates) => [...new Set(dates)].sort();
