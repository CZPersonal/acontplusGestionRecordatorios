import { useMemo, useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp, Download, FileText, Search, Settings } from 'lucide-react';
import Pagination from './Pagination.jsx';
import { usePagination } from '../hooks/usePagination.js';
import { exportCSV, exportExcel } from '../services/exportService.js';
import { localDateStr } from '../utils/dates.js';

const INITIAL_FILTERS = {
  search: '',
  status: 'Todos',
  urgency: 'Todos',
  serviceType: 'Todos',   // ← nuevo
  serviceOrder: '',
  createdBy: '',
  dateFrom: '',
  dateTo: '',
  dueDateFrom: '',
  dueDateTo: '',
};

export default function Reports({ tasks, exportConfig, onOpenConfig }) {
  const [filters,        setFilters]        = useState(INITIAL_FILTERS);
  const [showFilters,    setShowFilters]    = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    reportPagination.resetPage();
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
    reportPagination.resetPage();
  };

  const activeFilterCount = Object.entries(filters).filter(([key, val]) =>
    key === 'status' || key === 'urgency' || key === 'serviceType' ? val !== 'Todos' : val !== ''
  ).length;

  const uniqueUsers = useMemo(() => {
    const users = tasks.map(t => t.createdBy).filter(Boolean);
    return [...new Set(users)];
  }, [tasks]);

  const uniqueServiceTypes = useMemo(() => {
    const types = tasks.map(t => t.serviceType).filter(Boolean);
    return [...new Set(types)].sort();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const q = filters.search?.toLowerCase();
      if (q && !task.clientName?.toLowerCase().includes(q) &&
                !task.serviceOrder?.toLowerCase().includes(q) &&
                !task.serviceType?.toLowerCase().includes(q)) return false;
      if (filters.serviceOrder && !task.serviceOrder?.toLowerCase().includes(filters.serviceOrder.toLowerCase())) return false;
      if (filters.status      !== 'Todos' && task.status      !== filters.status)      return false;
      if (filters.urgency     !== 'Todos' && task.urgency     !== filters.urgency)     return false;
      if (filters.serviceType !== 'Todos' && task.serviceType !== filters.serviceType) return false;
      if (filters.createdBy && task.createdBy !== filters.createdBy) return false;
      if (filters.dateFrom) {
        const created = task.createdAt?.split('T')[0];
        if (!created || created < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const created = task.createdAt?.split('T')[0];
        if (!created || created > filters.dateTo) return false;
      }
      if (filters.dueDateFrom && task.dueDate < filters.dueDateFrom) return false;
      if (filters.dueDateTo   && task.dueDate > filters.dueDateTo)   return false;
      return true;
    });
  }, [tasks, filters]);

  const reportPagination = usePagination(filteredTasks, 20);

  return (
    <div className="space-y-4">

      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reportes</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {filteredTasks.length} de {tasks.length} registros
          </p>
        </div>

        {/* Acciones: config + exportar */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenConfig}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            title="Configurar columnas de exportación"
          >
            <Settings size={15} />
            <span className="hidden sm:inline">Columnas</span>
          </button>

          {/* Botón exportar */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Download size={16} />
              <span>Exportar</span>
              <ChevronDown size={14} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                <button
                  onClick={() => { exportExcel('tasks', exportConfig, filteredTasks); setShowExportMenu(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="p-1.5 bg-green-100 rounded">
                    <FileText size={14} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Excel (.xlsx)</p>
                    <p className="text-xs text-slate-400">{exportConfig.length} columnas activas</p>
                  </div>
                </button>
                <div className="border-t border-slate-100" />
                <button
                  onClick={() => { exportCSV('tasks', exportConfig, filteredTasks); setShowExportMenu(false); }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="p-1.5 bg-blue-100 rounded">
                    <FileText size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">CSV</p>
                    <p className="text-xs text-slate-400">Compatible con cualquier app</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            <Filter size={15} />
            <span>Filtros {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
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
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Buscar</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={filters.search}
                  onChange={e => handleFilter('search', e.target.value)}
                  placeholder="Cliente, OS, tipo..."
                  className="w-full pl-7 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Estado</label>
              <select value={filters.status} onChange={e => handleFilter('status', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                <option value="Todos">Todos</option>
                {['Pendiente','En Proceso','Completado','Cancelado'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tipo inst./equipo/servicio</label>
              <select value={filters.serviceType} onChange={e => handleFilter('serviceType', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                <option value="Todos">Todos</option>
                {uniqueServiceTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Urgencia</label>
              <select value={filters.urgency} onChange={e => handleFilter('urgency', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                <option value="Todos">Todos</option>
                {['Alta','Media','Baja'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Orden servicio</label>
              <input type="text" value={filters.serviceOrder}
                onChange={e => handleFilter('serviceOrder', e.target.value)}
                placeholder="Nº de OS..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Creado por</label>
              <select value={filters.createdBy} onChange={e => handleFilter('createdBy', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
                <option value="">Todos</option>
                {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">OS</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Cédula/RUC</th>
                {/* ── Columna nueva ── */}
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Tipo inst./equipo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo visita</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Vence</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Urgencia</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Creado por</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Completado por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportPagination.paginatedItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">
                    Sin registros que coincidan con los filtros
                  </td>
                </tr>
              )}
              {reportPagination.paginatedItems.map(task => {
                const today     = localDateStr();
                const isOverdue = task.dueDate < today && task.status !== 'Completado' && task.status !== 'Cancelado';
                return (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-purple-600 font-semibold">
                        {task.serviceOrder || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{task.clientName}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-500">{task.identification || '—'}</span>
                    </td>
                    {/* ── Celda nueva ── */}
                    <td className="px-4 py-3">
                      {task.serviceType ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-200 whitespace-nowrap">
                          {task.serviceType}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{task.type || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                        isOverdue         ? 'bg-red-100 text-red-700' :
                        task.dueDate === today ? 'bg-blue-100 text-blue-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {task.dueDate || '—'}
                        {isOverdue && ' ⚠️'}
                        {task.dueDate === today && !isOverdue && ' 📅'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        task.urgency === 'Alta'  ? 'bg-red-100 text-red-700' :
                        task.urgency === 'Media' ? 'bg-yellow-100 text-yellow-700' :
                        task.urgency === 'Baja'  ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>{task.urgency || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        task.status === 'Completado' ? 'bg-green-100 text-green-700' :
                        task.status === 'En Proceso' ? 'bg-blue-100 text-blue-700'  :
                        task.status === 'Cancelado'  ? 'bg-slate-100 text-slate-500' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{task.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{task.createdBy || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{task.completedBy || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="px-4 pb-4">
          <Pagination
            currentPage={reportPagination.currentPage}
            totalPages={reportPagination.totalPages}
            onPageChange={reportPagination.goToPage}
            startIndex={reportPagination.startIndex}
            endIndex={reportPagination.endIndex}
            totalItems={reportPagination.totalItems}
          />
        </div>
      </div>
    </div>
  );
}
