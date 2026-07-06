// src/services/exportService.js
// Funciones de exportación CSV y Excel que respetan la config de columnas activas.
import { localDateStr } from '../utils/dates.js';
import { fmtMoneyRaw } from '../utils/format.js';

const fmt = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const fmtDate = (s) => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};

// ─── Extractores de valor por campo ───────────────────────────────────────────

// Tareas
function taskValue(key, t) {
  switch (key) {
    case 'serviceOrder':          return t.serviceOrder          || '';
    case 'clientName':            return t.clientName            || '';
    case 'identification':        return t.identification        || '';
    case 'clientPhone':           return t.clientPhone           || '';
    case 'clientAddress':         return t.clientAddress         || '';
    case 'serviceType':           return t.serviceType           || '';
    case 'type':                  return t.type                  || '';
    case 'urgency':               return t.urgency               || '';
    case 'status':                return t.status                || '';
    case 'dueDate':               return t.dueDate               || '';
    case 'observations':          return t.observations          || '';
    case 'createdBy':             return t.createdBy             || '';
    case 'createdAt':             return t.createdAt ? fmt(t.createdAt) : '';
    case 'completedBy':           return t.completedBy           || '';
    case 'completedAt':           return t.completedAt ? fmt(t.completedAt) : '';
    case 'completionObservations':return t.completionObservations|| '';
    default: return '';
  }
}

// Visitas (row = { task, visit })
function visitValue(key, { task, visit }) {
  switch (key) {
    case 'scheduledDate':        return fmtDate(visit.scheduledDate);
    case 'scheduledTime':        return visit.scheduledTime        || '';
    case 'clientName':           return task.clientName            || '';
    case 'clientPhone':          return task.clientPhone           || '';
    case 'serviceOrder':         return task.serviceOrder          || '';
    case 'serviceType':          return task.serviceType           || '';
    case 'visitType':            return visit.type                 || '';
    case 'urgency':              return visit.urgency              || '';
    case 'visitStatus':          return visit.status               || '';
    case 'technician':           return visit.technician           || '';
    case 'observations':         return visit.observations         || '';
    case 'closingObservations':  return visit.closingObservations  || '';
    case 'valorCobrar':          return visit.status === 'Realizada' ? String(Number(visit.valorCobrar ?? visit.visitValue) || 0) : '';
    case 'completedBy':          return visit.completedBy          || '';
    case 'completedAt':          return visit.completedAt ? fmt(visit.completedAt) : '';
    case 'taskStatus':           return task.status                || '';
    default: return '';
  }
}

// Cobros (row = { task, visit, summary, cuotas })
function billingValue(key, { task, visit, summary, cuotas }) {
  switch (key) {
    case 'scheduledDate':   return fmtDate(visit.scheduledDate);
    case 'clientName':      return task.clientName   || '';
    case 'serviceOrder':    return task.serviceOrder || '';
    case 'serviceType':     return task.serviceType  || '';
    case 'visitType':       return visit.type        || '';
    case 'visitStatus':     return visit.status      || '';
    case 'totalValor':      return summary.total   > 0 ? fmtMoneyRaw(summary.total)   : '';
    case 'totalAbonado':    return fmtMoneyRaw(summary.abonado);
    case 'totalSaldo':      return fmtMoneyRaw(summary.saldo);
    case 'payStatus':
      if (summary.pagado)          return 'Pagado';
      if (summary.abonado > 0)     return 'Abono parcial';
      if (summary.total === 0)     return 'Sin valor';
      if (visit.commitmentDate)    return 'Compromiso';
      return 'Pendiente';
    case 'commitmentDate':  return fmtDate(visit.commitmentDate);
    case 'paymentMethods':  return (visit.payments || []).map(p => `${p.method}:$${p.amount}`).join(' | ');
    case 'cuotas':          return (cuotas || []).map(c => `${fmtDate(c.fecha)}: $${fmtMoneyRaw(c.valor)} (${c.pagado ? 'Pagada' : 'Pendiente'})`).join(' | ');
    default: return '';
  }
}

// ─── Escape HTML para prevenir XSS en exportación Excel ──────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Generador de filas ────────────────────────────────────────────────────────

function buildRows(activeColumns, data, valueFn) {
  const headers = activeColumns.map(c => c.label);
  const rows    = data.map(item =>
    activeColumns.map(c => String(valueFn(c.key, item)))
  );
  return { headers, rows };
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportCSV(reportType, activeColumns, data) {
  const valueFn = reportType === 'tasks'   ? taskValue
                : reportType === 'visits'  ? visitValue
                : billingValue;
  const { headers, rows } = buildRows(activeColumns, data, valueFn);
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `reporte_${reportType}_${localDateStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Excel ────────────────────────────────────────────────────────────────────

export function exportExcel(reportType, activeColumns, data) {
  const valueFn = reportType === 'tasks'   ? taskValue
                : reportType === 'visits'  ? visitValue
                : billingValue;
  const { headers, rows } = buildRows(activeColumns, data, valueFn);
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8">
  <style>
    th { background:#1e40af; color:#fff; font-weight:bold; padding:8px; }
    td { padding:6px 8px; border:1px solid #e2e8f0; }
    tr:nth-child(even) td { background:#f8fafc; }
  </style></head>
  <body><table>
    <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `reporte_${reportType}_${localDateStr()}.xls`;
  a.click();
  URL.revokeObjectURL(url);
}
