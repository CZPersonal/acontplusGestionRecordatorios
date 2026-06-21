import { useMemo, useState } from 'react';
import {
  Filter, X, ChevronDown, ChevronUp, Download,
  FileText, Search, Calendar, User, Phone, Wrench, Package, Settings
} from 'lucide-react';
import Pagination from './Pagination.jsx';
import { usePagination } from '../hooks/usePagination.js';
import { exportCSV, exportExcel } from '../services/exportService.js';
import { localDateStr, formatDateOnly } from '../utils/dates.js';

const formatDateTime = (isoString) => {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// ─── Aplanar visitas desde todas las tareas ────────────────────────────────────
function flattenVisits(tasks) {
  const rows = [];
  tasks.forEach(task => {
    const sortedByCreation = [...(task.visits || [])].sort(
      (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    );
    const numberMap = Object.fromEntries(sortedByCreation.map((v, i) => [v.id, i + 1]));

    (task.visits || []).forEach(visit => {
      rows.push({
        visitNumber:          numberMap[visit.id] || '',
        visitId:              visit.id,
        scheduledDate:        visit.scheduledDate        || '',
        scheduledTime:        visit.scheduledTime        || '',
        visitType:            visit.type                 || '',
        urgency:              visit.urgency              || '',
        visitStatus:          visit.status               || '',
        technician:           visit.technician           || '',
        observations:         visit.observations         || '',
        closingObservations:  visit.closingObservations  || '',
        completedAt:          visit.completedAt          || '',
        completedBy:          visit.completedBy          || '',
        confirmedAt:          visit.confirmedAt          || '',
        confirmedBy:          visit.confirmedBy          || '',
        taskId:               task.id,
        clientName:           task.clientName            || '',
        clientPhone:          task.clientPhone           || '',
        serviceOrder:         task.serviceOrder          || '',
        serviceType:          task.serviceType           || '',
        taskStatus:           task.status                || '',
        // referencias para el exportService (necesita task y visit como objetos)
        task,
        visit,
      });
    });
  });
  return rows.sort((a, b) => {
    if (b.scheduledDate !== a.scheduledDate) return b.scheduledDate.localeCompare(a.scheduledDate);
    return (b.scheduledTime || '').localeCompare(a.scheduledTime || '');
  });
}

// ─── Badges de estado ─────────────────────────────────────────────────────────
function VisitStatusBadge({ status }) {
  const cls = {
    'Programada': 'bg-pink-100 text-pink-700',
    'Realizada':  'bg-green-100 text-green-700',
    'Cancelada':  'bg-slate-100 text-slate-500',
  }[status] || 'bg-slate-100 text-slate-500';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{status || '—'}</span>;
}

function UrgencyBadge({ urgency }) {
  const cls = {
    'Alta':  'bg-red-100 text-red-700',
    'Media': 'bg-yellow-100 text-yellow-700',
    'Baja':  'bg-green-100 text-green-700',
  }[urgency] || 'bg-slate-100 text-slate-500';
  return urgency
    ? <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{urgency}</span>
    : <span className="text-slate-300 text-xs">—</span>;
}

// ─── Componente principal ─────────────────────────────────────────────────────
const INITIAL_FILTERS = {
  search:      '',
  dateFrom:    '',
  dateTo:      '',
  serviceType: 'Todos',
  visitStatus: 'Todos',
  urgency:     'Todos',
};

export default function VisitsReport({ tasks, exportConfig, onOpenConfig }) {
  const [filters,        setFilters]        = useState(INITIAL_FILTERS);
  const [showFilters,    setShowFilters]    = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Aplanar todas las visitas
  const allRows = useMemo(() => flattenVisits(tasks), [tasks]);

  // Valores únicos para los selects
  const uniqueServiceTypes = useMemo(() => {
    const t = tasks.map(t => t.serviceType).filter(Boolean);
    return [...new Set(t)].sort();
  }, [tasks]);

  const handleFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    pagination.resetPage?.();
  };

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    k === 'serviceType' || k === 'visitStatus' || k === 'urgency' ? v !== 'Todos' : v !== ''
  ).length;

  // Aplicar filtros
  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allRows.filter(row => {
      if (q &&
        !row.clientName.toLowerCase().includes(q) &&
        !row.serviceOrder.toLowerCase().includes(q) &&
        !row.technician.toLowerCase().includes(q)) return false;
      if (filters.dateFrom && row.scheduledDate < filters.dateFrom) return false;
      if (filters.dateTo   && row.scheduledDate > filters.dateTo)   return false;
      if (filters.serviceType !== 'Todos' && row.serviceType !== filters.serviceType) return false;
      if (filters.visitStatus !== 'Todos' && row.visitStatus !== filters.visitStatus) return false;
      if (filters.urgency     !== 'Todos' && row.urgency     !== filters.urgency)     return false;
      return true;
    });
  }, [allRows, filters]);

  const pagination = usePagination(filteredRows, 25);

  // KPIs rápidos del resultado filtrado
  const kpis = useMemo(() => ({
    total:      filteredRows.length,
    realizadas: filteredRows.filter(r => r.visitStatus === 'Realizada').length,
    programadas:filteredRows.filter(r => r.visitStatus === 'Programada').length,
    canceladas: filteredRows.filter(r => r.visitStatus === 'Cancelada').length,
  }), [filteredRows]);

  const lbl = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1";
  const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-400 transition-colors bg-white";

  return (
    <div className="space-y-4">

      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reporte de visitas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filteredRows.length} visita{filteredRows.length !== 1 ? 's' : ''} encontrada{filteredRows.length !== 1 ? 's' : ''}
            {allRows.length !== filteredRows.length && ` de ${allRows.length} en total`}
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <button onClick={onOpenConfig}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            title="Configurar columnas de exportación">
            <Settings size={15} />
            <span className="hidden sm:inline">Columnas</span>
          </button>
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
              <Download size={16} /><span>Exportar</span><ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                <button onClick={() => { exportExcel('visits', exportConfig, filteredRows); setShowExportMenu(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 text-left">
                  <div className="p-1.5 bg-green-100 rounded"><FileText size={14} className="text-green-600" /></div>
                  <div><p className="text-sm font-medium text-slate-700">Excel (.xls)</p><p className="text-xs text-slate-400">{exportConfig.length} columnas activas</p></div>
                </button>
                <div className="border-t border-slate-100" />
                <button onClick={() => { exportCSV('visits', exportConfig, filteredRows); setShowExportMenu(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 text-left">
                  <div className="p-1.5 bg-blue-100 rounded"><FileText size={14} className="text-blue-600" /></div>
                  <div><p className="text-sm font-medium text-slate-700">CSV</p><p className="text-xs text-slate-400">Compatible con cualquier app</p></div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',       value: kpis.total,       color: 'text-slate-700',  bg: 'bg-slate-100'  },
          { label: 'Programadas', value: kpis.programadas, color: 'text-pink-700',   bg: 'bg-pink-100'   },
          { label: 'Realizadas',  value: kpis.realizadas,  color: 'text-green-700',  bg: 'bg-green-100'  },
          { label: 'Canceladas',  value: kpis.canceladas,  color: 'text-slate-500',  bg: 'bg-slate-100'  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            <Filter size={15} />
            <span>Filtros {activeFilterCount > 0 && `(${activeFilterCount} activos)`}</span>
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters}
              className="flex items-center space-x-1 text-xs text-slate-500 hover:text-red-600 transition-colors">
              <X size={12} /><span>Limpiar filtros</span>
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

            {/* Búsqueda libre */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className={lbl}>Buscar cliente / OS / técnico</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text" value={filters.search}
                  onChange={e => handleFilter('search', e.target.value)}
                  placeholder="Nombre, OS, técnico..."
                  className={`${inp} pl-7`} />
                {filters.search && (
                  <button onClick={() => handleFilter('search', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Rango de fechas */}
            <div>
              <label className={lbl}>
                <Calendar size={11} className="inline mr-1" />Fecha desde
              </label>
              <div className="relative">
                <input type="date" value={filters.dateFrom}
                  onChange={e => handleFilter('dateFrom', e.target.value)}
                  className={inp} />
                {filters.dateFrom && (
                  <button onClick={() => handleFilter('dateFrom', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className={lbl}>
                <Calendar size={11} className="inline mr-1" />Fecha hasta
              </label>
              <div className="relative">
                <input type="date" value={filters.dateTo}
                  onChange={e => handleFilter('dateTo', e.target.value)}
                  className={inp} />
                {filters.dateTo && (
                  <button onClick={() => handleFilter('dateTo', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Tipo instalación/equipo/servicio */}
            <div>
              <label className={lbl}>
                <Package size={11} className="inline mr-1" />Tipo inst./equipo/servicio
              </label>
              <select value={filters.serviceType}
                onChange={e => handleFilter('serviceType', e.target.value)}
                className={inp}>
                <option value="Todos">Todos los tipos</option>
                {uniqueServiceTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Estado de la visita */}
            <div>
              <label className={lbl}>Estado visita</label>
              <select value={filters.visitStatus}
                onChange={e => handleFilter('visitStatus', e.target.value)}
                className={inp}>
                <option value="Todos">Todos</option>
                {['Programada', 'Realizada', 'Cancelada'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Urgencia */}
            <div>
              <label className={lbl}>Urgencia</label>
              <select value={filters.urgency}
                onChange={e => handleFilter('urgency', e.target.value)}
                className={inp}>
                <option value="Todos">Todos</option>
                {['Alta', 'Media', 'Baja'].map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

          </div>
        )}

        {/* Tags de filtros activos */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
            {filters.dateFrom && (
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                Desde: {formatDateOnly(filters.dateFrom)}
                <button onClick={() => handleFilter('dateFrom', '')}><X size={11} /></button>
              </span>
            )}
            {filters.dateTo && (
              <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                Hasta: {formatDateOnly(filters.dateTo)}
                <button onClick={() => handleFilter('dateTo', '')}><X size={11} /></button>
              </span>
            )}
            {filters.serviceType !== 'Todos' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium">
                <Package size={10} />{filters.serviceType}
                <button onClick={() => handleFilter('serviceType', 'Todos')}><X size={11} /></button>
              </span>
            )}
            {filters.visitStatus !== 'Todos' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-700 rounded-lg text-xs font-medium">
                Estado: {filters.visitStatus}
                <button onClick={() => handleFilter('visitStatus', 'Todos')}><X size={11} /></button>
              </span>
            )}
            {filters.urgency !== 'Todos' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                Urgencia: {filters.urgency}
                <button onClick={() => handleFilter('urgency', 'Todos')}><X size={11} /></button>
              </span>
            )}
            {filters.search && (
              <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                Búsqueda: "{filters.search}"
                <button onClick={() => handleFilter('search', '')}><X size={11} /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Calendar size={40} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">Sin visitas que coincidan con los filtros</p>
            <p className="text-xs mt-1">Ajusta el rango de fechas u otros filtros</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Fecha</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Hora</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">OS</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Tipo inst./equipo</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Tipo visita</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Urgencia</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Estado</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Técnico</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagination.paginatedItems.map(row => {
                    const today    = localDateStr();
                    const isOverdue = row.visitStatus === 'Programada' && row.scheduledDate < today;
                    const isToday   = row.scheduledDate === today;

                    return (
                      <tr key={`${row.taskId}-${row.visitId}`}
                        className={`hover:bg-slate-50 transition-colors ${
                          isOverdue ? 'border-l-4 border-red-400' :
                          isToday   ? 'border-l-4 border-blue-400' : ''
                        }`}>

                        {/* # */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            #{row.visitNumber}
                          </span>
                        </td>

                        {/* Fecha */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-semibold ${
                              isOverdue ? 'text-red-600' : isToday ? 'text-blue-600' : 'text-slate-800'
                            }`}>
                              {formatDateOnly(row.scheduledDate)}
                            </span>
                            {isOverdue && <span className="text-xs text-red-500 font-bold">⚠️</span>}
                            {isToday   && <span className="text-xs text-blue-500 font-bold">📅</span>}
                          </div>
                        </td>

                        {/* Hora */}
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {row.scheduledTime || '—'}
                        </td>

                        {/* Cliente */}
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-800 whitespace-nowrap">{row.clientName}</p>
                          {row.clientPhone && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Phone size={10} className="text-slate-400" />
                              <span className="text-xs text-slate-500">{row.clientPhone}</span>
                            </div>
                          )}
                        </td>

                        {/* OS */}
                        <td className="px-4 py-3">
                          {row.serviceOrder
                            ? <span className="font-mono text-xs font-semibold text-purple-600">{row.serviceOrder}</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>

                        {/* Tipo inst./equipo */}
                        <td className="px-4 py-3">
                          {row.serviceType ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-200 whitespace-nowrap">
                              <Package size={9} />{row.serviceType}
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>

                        {/* Tipo visita */}
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                          {row.visitType ? (
                            <span className="flex items-center gap-1">
                              <Wrench size={11} className="text-slate-400" />{row.visitType}
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>

                        {/* Urgencia */}
                        <td className="px-4 py-3"><UrgencyBadge urgency={row.urgency} /></td>

                        {/* Estado */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <VisitStatusBadge status={row.visitStatus} />
                          {row.confirmedAt && (
                            <p className="text-xs text-teal-600 mt-0.5">🕐 Conf: {formatDateTime(row.confirmedAt)}</p>
                          )}
                          {row.visitStatus === 'Realizada' && row.completedAt && (
                            <p className="text-xs text-green-600 mt-0.5">✅ Real: {formatDateTime(row.completedAt)}</p>
                          )}
                        </td>

                        {/* Técnico */}
                        <td className="px-4 py-3">
                          {row.technician ? (
                            <div className="flex items-center gap-1">
                              <User size={11} className="text-slate-400 flex-shrink-0" />
                              <span className="text-xs text-slate-600 whitespace-nowrap">{row.technician}</span>
                            </div>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>

                        {/* Observaciones */}
                        <td className="px-4 py-3 max-w-xs">
                          {row.observations ? (
                            <p className="text-xs text-slate-500 italic truncate" title={row.observations}>
                              {row.observations}
                            </p>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                          {row.closingObservations && (
                            <p className="text-xs text-green-600 italic truncate mt-0.5" title={row.closingObservations}>
                              ✅ {row.closingObservations}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="px-4 py-3 border-t border-slate-100">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                totalItems={pagination.totalItems}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
