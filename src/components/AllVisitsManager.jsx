import { useState, useMemo } from 'react';
import { useAppStore } from '../lib/store';
import { useTecnicos } from '../hooks/useTecnicos';
import { usePagination } from '../hooks/usePagination';
import VisitsModal from './VisitsModal.jsx';
import Pagination from './Pagination.jsx';
import { formatDateOnly } from '../utils/dates.js';
import { Search, Calendar, X, Eye, ClipboardList } from 'lucide-react';

const STATUS_COLORS = {
  Programada: 'bg-blue-100 text-blue-700',
  Realizada:  'bg-green-100 text-green-700',
  Cancelada:  'bg-amber-100 text-amber-700',
  Anulada:    'bg-red-100 text-red-600',
};

const URGENCY_COLORS = {
  Alta:  'bg-red-100 text-red-700',
  Media: 'bg-yellow-100 text-yellow-700',
  Baja:  'bg-green-100 text-green-700',
};

export default function AllVisitsManager({ user }) {
  const tasks              = useAppStore(s => s.tasks);
  const { tecnicos }       = useTecnicos(user);

  const [filterStatus,     setFilterStatus]     = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [filterUrgency,    setFilterUrgency]    = useState('');
  const [filterDateFrom,   setFilterDateFrom]   = useState('');
  const [filterDateTo,     setFilterDateTo]     = useState('');
  const [search,           setSearch]           = useState('');
  const [selectedTask,     setSelectedTask]     = useState(null);

  const allVisits = useMemo(() =>
    tasks.flatMap(task =>
      (task.visits || []).map(visit => ({ ...visit, task }))
    ), [tasks]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allVisits
      .filter(v => {
        if (filterStatus     && v.status     !== filterStatus)     return false;
        if (filterTechnician && v.technician !== filterTechnician) return false;
        if (filterUrgency    && v.urgency    !== filterUrgency)    return false;
        if (filterDateFrom   && v.scheduledDate < filterDateFrom)  return false;
        if (filterDateTo     && v.scheduledDate > filterDateTo)    return false;
        if (q) return (
          v.task.clientName?.toLowerCase().includes(q)  ||
          v.technician?.toLowerCase().includes(q)       ||
          v.task.clientPhone?.includes(q)               ||
          v.task.serviceOrder?.toLowerCase().includes(q)||
          v.type?.toLowerCase().includes(q)
        );
        return true;
      })
      .sort((a, b) => {
        if (a.scheduledDate !== b.scheduledDate)
          return a.scheduledDate < b.scheduledDate ? 1 : -1;
        return (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
      });
  }, [allVisits, filterStatus, filterTechnician, filterUrgency, filterDateFrom, filterDateTo, search]);

  const pagination = usePagination(filtered, 20);

  const hasFilters = filterStatus || filterTechnician || filterUrgency || filterDateFrom || filterDateTo || search;

  const clearFilters = () => {
    setFilterStatus(''); setFilterTechnician(''); setFilterUrgency('');
    setFilterDateFrom(''); setFilterDateTo(''); setSearch('');
  };

  const stats = useMemo(() => ({
    programada: allVisits.filter(v => v.status === 'Programada').length,
    realizada:  allVisits.filter(v => v.status === 'Realizada').length,
    cancelada:  allVisits.filter(v => v.status === 'Cancelada' || v.status === 'Anulada').length,
  }), [allVisits]);

  const foc = e => e.target.style.borderColor = '#D61672';
  const blr = e => e.target.style.borderColor = '#e2e8f0';
  const sel = 'w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white';

  return (
    <>
      {selectedTask && (
        <VisitsModal
          task={selectedTask}
          user={user}
          onClose={() => setSelectedTask(null)}
        />
      )}

      <div className="space-y-4">

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Gestión de Visitas</h2>
              <p className="text-xs text-slate-400 mt-0.5">{allVisits.length} visitas en total</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                {stats.programada} programadas
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                {stats.realizada} realizadas
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                {stats.cancelada} canceladas/anuladas
              </span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, técnico, teléfono, tipo u OS…"
              className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none"
              onFocus={foc} onBlur={blr}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className={sel} onFocus={foc} onBlur={blr}>
              <option value="">Todos los estados</option>
              {['Programada','Realizada','Cancelada','Anulada'].map(s =>
                <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}
              className={sel} onFocus={foc} onBlur={blr}>
              <option value="">Todas las urgencias</option>
              {['Alta','Media','Baja'].map(u =>
                <option key={u} value={u}>{u}</option>)}
            </select>

            <select value={filterTechnician} onChange={e => setFilterTechnician(e.target.value)}
              className={sel} onFocus={foc} onBlur={blr}>
              <option value="">Todos los técnicos</option>
              {tecnicos.map(t =>
                <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
            </select>

            <input type="date" value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className={sel} onFocus={foc} onBlur={blr} />

            <input type="date" value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className={sel} onFocus={foc} onBlur={blr} />
          </div>

          {hasFilters && (
            <div className="flex items-center justify-between">
              <button onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                <X size={13} /> Limpiar filtros
              </button>
              <span className="text-xs text-slate-400">
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Sin visitas que coincidan con los filtros</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-50">
                {pagination.paginatedItems.map(v => {
                  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
                  const isOverdue = v.status === 'Programada' && v.scheduledDate < today;

                  return (
                    <div key={`${v.task.id}-${v.id}`}
                      className={`p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 ${
                        isOverdue ? 'border-l-4 border-red-400' : ''
                      }`}>

                      {/* Fecha */}
                      <div className="flex-shrink-0 w-16 text-center pt-0.5">
                        <div className="text-xs font-bold text-slate-700">
                          {formatDateOnly(v.scheduledDate)}
                        </div>
                        {v.scheduledTime && (
                          <div className="text-xs text-slate-400 mt-0.5">{v.scheduledTime}</div>
                        )}
                        {isOverdue && (
                          <span className="mt-1 inline-block text-xs font-bold text-red-600">⚠️ Atr.</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-slate-800 text-sm truncate">
                            {v.task.clientName}
                          </span>
                          {v.task.serviceOrder && (
                            <span className="text-xs font-mono px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded flex-shrink-0">
                              OS: {v.task.serviceOrder}
                            </span>
                          )}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[v.status] || 'bg-slate-100 text-slate-500'}`}>
                            {v.status}
                          </span>
                          {v.urgency && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${URGENCY_COLORS[v.urgency] || ''}`}>
                              {v.urgency}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          {v.task.clientPhone && <span>📞 {v.task.clientPhone}</span>}
                          {v.technician      && <span>👷 {v.technician}</span>}
                          {v.type            && <span>🔧 {v.type}</span>}
                        </div>
                        {v.observations && (
                          <p className="text-xs text-slate-400 mt-1 italic truncate max-w-md">
                            📝 {v.observations}
                          </p>
                        )}
                      </div>

                      {/* Acción */}
                      <button
                        onClick={() => setSelectedTask(v.task)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                        style={{ color: '#D61672', borderColor: '#fce7f3' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fdf2f8'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Administrar visitas de esta tarea">
                        <Eye size={13} />
                        <span className="hidden sm:inline">Abrir</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {filtered.length > 20 && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={pagination.goToPage}
                    startIndex={pagination.startIndex}
                    endIndex={pagination.endIndex}
                    totalItems={pagination.totalItems}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
