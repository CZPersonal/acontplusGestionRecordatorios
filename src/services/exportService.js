// src/services/exportService.js
// Funciones de exportación CSV y Excel que respetan la config de columnas activas.
import * as XLSX from 'xlsx';
import { localDateStr } from '../utils/dates.js';
import { fmtMoneyRaw } from '../utils/format.js';
import { getPayStatus } from './visitBilling.js';

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

// Clientes (row = { ruc, nombre, ubicacion, ciudad, direccion, telefono, email, equipo, observacion })
// — una fila por ubicación/instalación, mismo formato que el Excel de importación.
function clientValue(key, row) {
  return row[key] || '';
}

// Estado visible de la visita — misma precedencia que VisitStatusBadge.jsx:
// Realizada > Cancelada > Anulada > (confirmed ? Confirmada : Programada).
function seriesDisplayStatus(v) {
  if (v.status === 'Realizada') return 'Realizada';
  if (v.status === 'Cancelada') return 'Cancelada';
  if (v.status === 'Anulada')   return 'Anulada';
  if (v.status === 'Confirmada' || v.confirmed) return 'Confirmada';
  return 'Programada';
}

// Series de visitas recurrentes (row = { visit, seriesNumber, periodicidadLabel })
function seriesValue(key, { visit: v, seriesNumber, periodicidadLabel }) {
  switch (key) {
    case 'seriesNumber':   return seriesNumber != null ? String(seriesNumber) : '';
    case 'recurrenceInfo': return (v.recurrenceIndex && v.recurrenceTotal) ? `${v.recurrenceIndex}/${v.recurrenceTotal}` : '';
    case 'clientName':     return v.clientName    || '';
    case 'identification': return v.clientId      || '';
    case 'phone':          return v.phone         || '';
    case 'clientEmail':    return v.clientEmail   || '';
    case 'address':        return [v.ubicacion, v.ciudad, v.address].filter(Boolean).join(' · ');
    case 'periodicidad':   return periodicidadLabel || '';
    case 'scheduledDate':  return fmtDate(v.scheduledDate);
    case 'scheduledTime':  return v.scheduledTime || '';
    case 'technician':     return v.technician    || '';
    case 'visitStatus':    return seriesDisplayStatus(v);
    case 'confirmedAt':    return v.confirmedAt ? fmt(v.confirmedAt) : '';
    case 'completedAt':    return v.completedAt ? fmt(v.completedAt) : '';
    case 'closingObservations': return v.closingObservations || '';
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
      return getPayStatus({ summary, commitmentDate: visit.commitmentDate, cuotas }, localDateStr());
    case 'commitmentDate':  return fmtDate(visit.commitmentDate);
    case 'paymentMethods':  return (visit.payments || []).map(p => `${p.method}:$${p.amount}`).join(' | ');
    case 'cuotas':          return (cuotas || []).map(c => `${fmtDate(c.fecha)}: $${fmtMoneyRaw(c.valor)} (${c.pagado ? 'Pagada' : 'Pendiente'})`).join(' | ');
    default: return '';
  }
}

// ─── Generador de filas ────────────────────────────────────────────────────────

function buildRows(activeColumns, data, valueFn) {
  const headers = activeColumns.map(c => c.label);
  const keys    = activeColumns.map(c => c.key);
  const rows    = data.map(item =>
    activeColumns.map(c => String(valueFn(c.key, item)))
  );
  return { headers, keys, rows };
}

// Columnas que deben exportarse como NUMERO real (para poder sumarlas/operar en Excel),
// nunca como texto forzado. Todo lo demás (RUC, cédula, teléfono, orden de servicio,
// nombres, observaciones, etc.) se exporta como texto para que Excel no reinterprete
// ceros a la izquierda o números largos como notación científica.
const NUMERIC_COLUMN_KEYS = new Set(['valorCobrar', 'totalValor', 'totalAbonado', 'totalSaldo']);

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportCSV(reportType, activeColumns, data) {
  const valueFn = reportType === 'tasks'   ? taskValue
                : reportType === 'visits'  ? visitValue
                : reportType === 'clients' ? clientValue
                : reportType === 'series'  ? seriesValue
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

// ─── Excel (.xlsx real, vía SheetJS — compatible con Office actual) ──────────

export function exportExcel(reportType, activeColumns, data) {
  const valueFn = reportType === 'tasks'   ? taskValue
                : reportType === 'visits'  ? visitValue
                : reportType === 'clients' ? clientValue
                : reportType === 'series'  ? seriesValue
                : billingValue;
  const { headers, keys, rows } = buildRows(activeColumns, data, valueFn);

  // Los montos (Total/Abonado/Saldo/valorCobrar) se guardan como número real para
  // poder sumarlos en Excel; el resto (RUC, cédula, teléfono, etc.) queda como texto
  // — al venir del array como string, SheetJS los guarda como celda de texto,
  // evitando que Excel reinterprete ceros a la izquierda o números largos.
  const excelRows = rows.map(row =>
    row.map((val, i) => {
      if (!NUMERIC_COLUMN_KEYS.has(keys[i]) || val === '') return val;
      const num = parseFloat(val);
      return Number.isNaN(num) ? val : num;
    })
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...excelRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, `reporte_${reportType}_${localDateStr()}.xlsx`);
}
