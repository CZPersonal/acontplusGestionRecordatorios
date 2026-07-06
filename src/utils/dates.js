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

// Si la fecha cae en fin de semana, la corre al día hábil más cercano
// (sábado → viernes, domingo → lunes). Cualquier otro día queda igual.
export const nearestBusinessDay = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow  = date.getDay(); // 0 = domingo, 6 = sábado
  if (dow === 6) date.setDate(date.getDate() - 1);
  else if (dow === 0) date.setDate(date.getDate() + 1);
  return localDateStr(date);
};

// Genera una serie periódica [startDate, +stepMonths, +2*stepMonths, ...]
// (incluye startDate) con exactamente `count` fechas, topado por `max`. Si
// businessDaysOnly, cada fecha que caiga en fin de semana se corre al día
// hábil más cercano.
export const generatePeriodicSeries = (startDate, { stepMonths = 1, count, businessDaysOnly = false, max = MAX_RECURRENCE_VISITS } = {}) => {
  const total = Math.min(count || 0, max);
  const dates = [];
  for (let i = 0; i < total; i++) {
    let next = addMonthsClamped(startDate, i * stepMonths);
    if (businessDaysOnly) next = nearestBusinessDay(next);
    dates.push(next);
  }
  return dates;
};

// Quita duplicados y ordena cronológicamente (para fusionar fecha base + fechas manuales)
export const dedupeSortDates = (dates) => [...new Set(dates)].sort();
