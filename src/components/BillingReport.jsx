import { useMemo, useState } from 'react';
import {
  Filter, X, ChevronDown, ChevronUp, Download,
  FileText, Search, Calendar, DollarSign,
  CheckCircle, AlertCircle, Package, Banknote, Settings, CalendarDays
} from 'lucide-react';
import Pagination from './Pagination.jsx';
import { usePagination } from '../hooks/usePagination.js';
import BillingModal from './BillingModal.jsx';
import AbonosModal from './AbonosModal.jsx';
import { calcPaymentSummary, visitToDisplayTask, computeCuotasPagadas } from '../services/visitBilling.js';
import { exportCSV, exportExcel } from '../services/exportService.js';
import { localDateStr, formatDateOnly } from '../utils/dates.js';
import { fmtMoney } from '../utils/format.js';
import { useAbonos } from '../hooks/useAbonos.js';
import { useAppStore } from '../lib/store';

// ─── Aplanar todas las visitas (modelo legado: tareas con visitas embebidas) ──
function flattenVisits(tasks) {
  const rows = [];
  tasks.forEach(task => {
    (task.visits || []).forEach(visit => {
      const summary = calcPaymentSummary(visit);
      rows.push({ task, visit, summary, isNew: false });
    });
  });
  return rows;
}

// ─── Aplanar visitas de la colección plana (Gestión de visitas) ──────────────
function flattenNewVisits(visits) {
  return visits.map(visit => ({
    task:    visitToDisplayTask(visit),
    visit,
    summary: calcPaymentSummary(visit),
    isNew:   true,
  }));
}

// ─── Estado de cobro ──────────────────────────────────────────────────────────
function PayStatusBadge({ summary, commitmentDate }) {
  if (summary.total === 0)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-400">Sin valor</span>;
  if (summary.pagado)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">✅ Pagado</span>;
  if (summary.abonado > 0)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Abono parcial</span>;
  if (commitmentDate)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Compromiso {formatDateOnly(commitmentDate)}</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Pendiente</span>;
}

// ─── Componente principal ─────────────────────────────────────────────────────
const INITIAL_FILTERS = {
  search:      '',
  dateFrom:    '',
  dateTo:      '',
  serviceType: 'Todos',
  payStatus:   'Todos',
};

export default function BillingReport({ tasks, onTasksUpdate, user, exportConfig, onOpenConfig }) {
  const [filters,        setFilters]        = useState(INITIAL_FILTERS);
  const [showFilters,    setShowFilters]    = useState(true);
  const [showExport,     setShowExport]     = useState(false);
  const [billingTarget,  setBillingTarget]  = useState(null); // { task, visit, isNew, allVisits? }
  const [abonosTarget,   setAbonosTarget]   = useState(null); // { task, visit }

  const { abonosByVisit, addAbono, deleteAbono } = useAbonos();
  const newVisits = useAppStore(s => s.visits);

  // Une el modelo legado (tareas con visitas embebidas) y el nuevo (colección
  // plana de "Gestión de visitas") en una sola lista de cobros.
  const allRows = useMemo(() => {
    const rows = [...flattenVisits(tasks), ...flattenNewVisits(newVisits)];
    return rows.sort((a, b) => (b.visit.scheduledDate || '').localeCompare(a.visit.scheduledDate || ''));
  }, [tasks, newVisits]);

  const uniqueServiceTypes = useMemo(() => {
    const t = [...tasks.map(t => t.serviceType), ...newVisits.map(v => v.serviceType)].filter(Boolean);
    return [...new Set(t)].sort();
  }, [tasks, newVisits]);

  const handleFilter = (key, val) => setFilters(p => ({ ...p, [key]: val }));
  const clearFilters = () => setFilters(INITIAL_FILTERS);
  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    k === 'serviceType' || k === 'payStatus' ? v !== 'Todos' : v !== ''
  ).length;

  // Aplicar filtros
  const filteredRows = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return allRows.filter(({ task, visit, summary }) => {
      if (q &&
        !task.clientName?.toLowerCase().includes(q) &&
        !task.serviceOrder?.toLowerCase().includes(q)) return false;
      if (filters.dateFrom && (visit.scheduledDate || '') < filters.dateFrom) return false;
      if (filters.dateTo   && (visit.scheduledDate || '') > filters.dateTo)   return false;
      if (filters.serviceType !== 'Todos' && task.serviceType !== filters.serviceType) return false;
      if (filters.payStatus !== 'Todos') {
        const st = filters.payStatus;
        if (st === 'Pagado'        && !summary.pagado)                          return false;
        if (st === 'Abono parcial' && !(summary.abonado > 0 && !summary.pagado)) return false;
        if (st === 'Pendiente'     && !(summary.total > 0 && summary.abonado === 0 && !visit.commitmentDate)) return false;
        if (st === 'Sin valor'     && summary.total !== 0)                      return false;
        if (st === 'Compromiso'    && !visit.commitmentDate)                    return false;
      }
      return true;
    });
  }, [allRows, filters]);

  const pagination = usePagination(filteredRows, 20);

  // KPIs
  const kpis = useMemo(() => {
    const totalValor   = filteredRows.reduce((s, r) => s + r.summary.total,   0);
    const totalAbonado = filteredRows.reduce((s, r) => s + r.summary.abonado, 0);
    const totalSaldo   = filteredRows.reduce((s, r) => s + r.summary.saldo,   0);
    const pagadas      = filteredRows.filter(r => r.summary.pagado).length;
    return { totalValor, totalAbonado, totalSaldo, pagadas, total: filteredRows.length };
  }, [filteredRows]);

  const lbl = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1";
  const inp = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-400 transition-colors bg-white";

  // Al actualizar desde el BillingModal: en flatMode llega la visita fresca
  // (el listener en tiempo real de la colección plana ya refresca el store);
  // en el modelo legado llega el array completo de visitas de la tarea.
  const handleBillingUpdate = (updated) => {
    if (billingTarget.isNew) {
      setBillingTarget(prev => ({ ...prev, visit: updated }));
      return;
    }
    if (onTasksUpdate) onTasksUpdate(billingTarget.task.id, updated);
    setBillingTarget(prev => ({
      ...prev,
      visit: updated.find(v => v.id === prev.visit.id) || prev.visit,
      allVisits: updated,
    }));
  };

  return (
    <div className="space-y-4">

      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Cobros por visita</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filteredRows.length} visita{filteredRows.length !== 1 ? 's' : ''}
            {allRows.length !== filteredRows.length && ` de ${allRows.length} en total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onOpenConfig}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            title="Configurar columnas de exportación">
            <Settings size={15} />
            <span className="hidden sm:inline">Columnas</span>
          </button>
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
              <Download size={16} /><span>Exportar</span><ChevronDown size={14} />
            </button>
            {showExport && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                <button onClick={() => { exportExcel('billing', exportConfig, filteredRows); setShowExport(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm">
                  <div className="p-1.5 bg-green-100 rounded"><FileText size={13} className="text-green-600" /></div>
                  <div><p className="font-medium text-slate-700">Excel (.xls)</p><p className="text-xs text-slate-400">{exportConfig.length} columnas activas</p></div>
                </button>
                <div className="border-t border-slate-100" />
                <button onClick={() => { exportCSV('billing', exportConfig, filteredRows); setShowExport(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left text-sm">
                  <div className="p-1.5 bg-blue-100 rounded"><FileText size={13} className="text-blue-600" /></div>
                  <div><p className="font-medium text-slate-700">CSV</p><p className="text-xs text-slate-400">Compatible con todo</p></div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total a cobrar',  value: `$${fmtMoney(kpis.totalValor)}`,   color: 'text-slate-700',  bg: 'bg-slate-50'  },
          { label: 'Total cobrado',   value: `$${fmtMoney(kpis.totalAbonado)}`,  color: 'text-green-700',  bg: 'bg-green-50'  },
          { label: 'Saldo pendiente', value: `$${fmtMoney(kpis.totalSaldo)}`,    color: 'text-orange-700', bg: 'bg-orange-50' },
          { label: 'Visitas pagadas', value: `${kpis.pagadas} / ${kpis.total}`,  color: 'text-blue-700',   bg: 'bg-blue-50'   },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-slate-200 p-4 shadow-sm`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800">
            <Filter size={15} />
            <span>Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
            {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-600">
              <X size={12} />Limpiar
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-1">
              <label className={lbl}>Buscar cliente / OS</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input type="text" value={filters.search}
                  onChange={e => handleFilter('search', e.target.value)}
                  placeholder="Nombre o número OS..."
                  className={`${inp} pl-7`} />
              </div>
            </div>
            <div>
              <label className={lbl}><Calendar size={11} className="inline mr-1" />Fecha desde</label>
              <div className="relative">
                <input type="date" value={filters.dateFrom}
                  onChange={e => handleFilter('dateFrom', e.target.value)} className={inp} />
                {filters.dateFrom && (
                  <button onClick={() => handleFilter('dateFrom', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={13} /></button>
                )}
              </div>
            </div>
            <div>
              <label className={lbl}><Calendar size={11} className="inline mr-1" />Fecha hasta</label>
              <div className="relative">
                <input type="date" value={filters.dateTo}
                  onChange={e => handleFilter('dateTo', e.target.value)} className={inp} />
                {filters.dateTo && (
                  <button onClick={() => handleFilter('dateTo', '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={13} /></button>
                )}
              </div>
            </div>
            <div>
              <label className={lbl}><Package size={11} className="inline mr-1" />Tipo inst./equipo/servicio</label>
              <select value={filters.serviceType}
                onChange={e => handleFilter('serviceType', e.target.value)} className={inp}>
                <option value="Todos">Todos los tipos</option>
                {uniqueServiceTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}><DollarSign size={11} className="inline mr-1" />Estado de cobro</label>
              <select value={filters.payStatus}
                onChange={e => handleFilter('payStatus', e.target.value)} className={inp}>
                <option value="Todos">Todos</option>
                <option value="Pagado">Pagado</option>
                <option value="Abono parcial">Abono parcial</option>
                <option value="Pendiente">Pendiente de cobro</option>
                <option value="Compromiso">Con fecha compromiso</option>
                <option value="Sin valor">Sin valor registrado</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <DollarSign size={40} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">Sin visitas que coincidan con los filtros</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Fecha</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Tipo inst./equipo</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Valor</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Abonado</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Saldo</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Estado cobro</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Cuotas</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagination.paginatedItems.map(({ task, visit, summary, isNew }) => {
                    const today     = localDateStr();
                    const isOverdue = visit.commitmentDate && visit.commitmentDate < today && !summary.pagado;

                    return (
                      <tr key={`${isNew ? 'new' : task.id}-${visit.id}`}
                        className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'border-l-4 border-red-400' : ''}`}>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm font-semibold text-slate-700">{formatDateOnly(visit.scheduledDate)}</p>
                          {visit.scheduledTime && <p className="text-xs text-slate-400">{visit.scheduledTime}</p>}
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-800 whitespace-nowrap">{task.clientName}</p>
                          {task.serviceOrder && (
                            <span className="text-xs font-mono text-purple-600">OS: {task.serviceOrder}</span>
                          )}
                          {visit.type && <p className="text-xs text-slate-400">{visit.type}</p>}
                        </td>

                        <td className="px-4 py-3">
                          {task.serviceType ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-200 whitespace-nowrap">
                              <Package size={9} />{task.serviceType}
                            </span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {summary.total > 0
                            ? <span className="text-sm font-bold text-slate-700">${fmtMoney(summary.total)}</span>
                            : <span className="text-slate-300 text-xs">—</span>}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {summary.abonado > 0
                            ? <span className="text-sm font-bold text-green-600">${fmtMoney(summary.abonado)}</span>
                            : <span className="text-slate-300 text-xs">$0.00</span>}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {summary.saldo > 0
                            ? <span className="text-sm font-bold text-orange-600">${fmtMoney(summary.saldo)}</span>
                            : summary.pagado
                              ? <span className="text-sm font-bold text-green-500">$0.00</span>
                              : <span className="text-slate-300 text-xs">—</span>}
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <PayStatusBadge summary={summary} commitmentDate={visit.commitmentDate} />
                          {isOverdue && (
                            <p className="text-xs text-red-500 mt-0.5">⚠️ Compromiso vencido</p>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {(() => {
                            const va = abonosByVisit[visit.id] || [];
                            if (va.length === 0) return <span className="text-slate-300 text-xs">—</span>;
                            const cuotas = computeCuotasPagadas(va, summary.abonado); // ya ordenadas por fecha
                            return (
                              <div className="space-y-1 min-w-[130px]">
                                {cuotas.map(c => (
                                  <div key={c.id} className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                                    <span>{c.pagado ? '✅' : '🕓'}</span>
                                    <span className="text-slate-500">{formatDateOnly(c.fecha)}</span>
                                    <span className={`font-semibold ${c.pagado ? 'text-green-600' : 'text-amber-700'}`}>
                                      ${fmtMoney(c.valor)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            <button
                              onClick={() => setBillingTarget({ task, visit, isNew, allVisits: isNew ? undefined : (task.visits || []) })}
                              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white whitespace-nowrap"
                              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                              <DollarSign size={11} />Cobrar
                            </button>
                            {summary.total > 0 && !summary.pagado && (
                              <button
                                onClick={() => setAbonosTarget({ task, visit })}
                                className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 whitespace-nowrap transition-colors">
                                <CalendarDays size={11} />Cuotas
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

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

      {/* Modal de cobro */}
      {billingTarget && (
        <BillingModal
          flatMode={billingTarget.isNew}
          task={billingTarget.task}
          visit={billingTarget.visit}
          allVisits={billingTarget.allVisits}
          user={user}
          onClose={() => setBillingTarget(null)}
          onUpdate={handleBillingUpdate}
        />
      )}

      {/* Modal de abonos programados */}
      {abonosTarget && (
        <AbonosModal
          task={abonosTarget.task}
          visit={abonosTarget.visit}
          visitAbonos={abonosByVisit[abonosTarget.visit.id] || []}
          user={user}
          onClose={() => setAbonosTarget(null)}
          onAdd={addAbono}
          onDelete={deleteAbono}
        />
      )}
    </div>
  );
}
