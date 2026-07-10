import { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle, Clock, Calendar, Bell, BellOff,
  CheckCircle, Phone, MapPin, X, FileText, User, Wrench, Package,
  DollarSign, Wallet, Users, UserX, BookOpen, ShieldAlert, CalendarCheck2,
} from 'lucide-react';
import StatCard from './StatCard.jsx';
import Pagination from './Pagination.jsx';
import { usePagination } from '../hooks/usePagination.js';
import { useTecnicos } from '../hooks/useTecnicos.js';
import { flattenVisits, flattenNewVisits } from '../services/visitBilling.js';
import { VisitStatusBadge } from './VisitStatusBadge.jsx';
import { localDateStr, formatDateOnly } from '../utils/dates.js';
import { fmtMoney } from '../utils/format.js';

const URGENCY_ORDER = { 'Alta': 3, 'Media': 2, 'Baja': 1 };

// Misma lógica que visitIsOverdue en useNotifications.js, adaptada a filas
// ya aplanadas ({ task, visit }) en vez de task.visits[].
function visitIsOverdue(visit, today, currentTime) {
  if (!visit?.scheduledDate) return false;
  if (visit.scheduledDate < today) return true;
  if (visit.scheduledDate === today && visit.scheduledTime) {
    return visit.scheduledTime < currentTime;
  }
  return false;
}

export default function Dashboard({
  tasks, visits, clients, borradoresPendientes,
  onNavigate, notificationPermission, onRequestNotifications, onShowAlerts, user,
}) {
  const [activeFilter, setActiveFilter] = useState(null);
  // Tick cada 60 s para que los cálculos de fecha/hora no queden congelados
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const { tecnicos } = useTecnicos(user);

  const now         = new Date();
  const today       = localDateStr(now);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const monthPrefix = today.slice(0, 7); // 'YYYY-MM'

  // ─── Todas las visitas (modelo legado + plano) combinadas ──────────────────
  const allRows = useMemo(() => [
    ...flattenVisits(tasks),
    ...flattenNewVisits(visits),
  ], [tasks, visits]);

  // ─── Bloque 1: Agenda operativa ─────────────────────────────────────────────
  const scheduledRows = useMemo(
    () => allRows.filter(r => r.visit.status === 'Programada'),
    [allRows]
  );

  const isOverdueRow = (r) => visitIsOverdue(r.visit, today, currentTime);

  const overdueRows     = scheduledRows.filter(isOverdueRow);
  const dueTodayRows    = scheduledRows.filter(r => r.visit.scheduledDate === today && !isOverdueRow(r));
  const urgentRows      = scheduledRows.filter(r => r.visit.urgency === 'Alta');
  const unconfirmedRows = scheduledRows.filter(r => r.isNew && !r.visit.confirmed);

  const allScheduledSorted = [...scheduledRows].sort((a, b) => {
    const dateA = a.visit.scheduledDate || '9999-99-99';
    const dateB = b.visit.scheduledDate || '9999-99-99';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (URGENCY_ORDER[b.visit.urgency] || 0) - (URGENCY_ORDER[a.visit.urgency] || 0);
  });

  const filterLabels = {
    hoy:          'Para hoy',
    atrasadas:    'Atrasadas',
    urgentes:     'Urgentes',
    sinconfirmar: 'Sin confirmar por el técnico',
  };

  const getFilteredRows = () => {
    switch (activeFilter) {
      case 'hoy':          return dueTodayRows;
      case 'atrasadas':    return overdueRows;
      case 'urgentes':     return urgentRows;
      case 'sinconfirmar': return unconfirmedRows;
      default:             return allScheduledSorted;
    }
  };
  const handleFilter = (filter) => setActiveFilter(prev => prev === filter ? null : filter);
  const filteredRows = getFilteredRows();
  const pagination    = usePagination(filteredRows, 10);

  // ─── Bloque 2: Salud financiera ─────────────────────────────────────────────
  const totalCobrado       = allRows.reduce((s, r) => s + r.summary.abonado, 0);
  const saldoPendiente     = allRows.reduce((s, r) => s + r.summary.saldo, 0);
  const compromisosVencidos = allRows.filter(r =>
    r.visit.commitmentDate && r.visit.commitmentDate < today && !r.summary.pagado
  ).length;

  // ─── Bloque 3: Clientes ──────────────────────────────────────────────────────
  const activeClients       = clients.filter(c => c.active !== false);
  const inactiveClientsCount = clients.filter(c => c.active === false).length;
  const newClientsThisMonth = clients.filter(c => (c.createdAt || '').startsWith(monthPrefix)).length;

  // Mismo criterio que ClientHistorialModal: solo modelo plano (visits), última
  // visita Realizada por cliente — más de 90 días sin visita = "en riesgo".
  const lastRealizedByClient = useMemo(() => {
    const map = {};
    visits.filter(v => v.status === 'Realizada').forEach(v => {
      if (!v.clientId) return;
      if (!map[v.clientId] || v.scheduledDate > map[v.clientId]) map[v.clientId] = v.scheduledDate;
    });
    return map;
  }, [visits]);

  const clientsAtRiskCount = activeClients.filter(c => {
    const last = lastRealizedByClient[c.id];
    if (!last) return false; // sin visita realizada aún: podría ser cliente nuevo, no se marca en riesgo
    const days = Math.floor((now - new Date(last + 'T12:00:00')) / (1000 * 60 * 60 * 24));
    return days > 90;
  }).length;

  // ─── Bloque 4: Técnicos y Borradores ─────────────────────────────────────────
  const technicianRanking = useMemo(() => {
    const counts = {};
    visits
      .filter(v => v.status === 'Realizada' && v.technician && (v.completedAt || '').startsWith(monthPrefix))
      .forEach(v => { counts[v.technician] = (counts[v.technician] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [visits, monthPrefix]);

  return (
    <div className="space-y-6">

      {/* Cabecera */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800">Panel General</h2>
            <p className="text-xs text-slate-400 mt-0.5">Resumen del sistema</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onShowAlerts}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              <Bell size={13} /><span>Ver alertas</span>
            </button>
            <button
              onClick={onRequestNotifications}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                notificationPermission === 'granted'
                  ? 'border-pink-200 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              style={notificationPermission === 'granted'
                ? { background: 'linear-gradient(135deg, #D61672, #FFA901)' }
                : {}}>
              {notificationPermission === 'granted' ? <Bell size={13} /> : <BellOff size={13} />}
              <span>{notificationPermission === 'granted' ? 'Notificaciones ON' : 'Activar notificaciones'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Bloque 1: Agenda operativa ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 px-1">Agenda operativa</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Para hoy" count={dueTodayRows.length}
            icon={<Calendar size={20} />} color="text-blue-600" bg="bg-blue-100"
            isActive={activeFilter === 'hoy'} onClick={() => handleFilter('hoy')} />
          <StatCard title="Atrasadas" count={overdueRows.length}
            icon={<AlertCircle size={20} />} color="text-orange-600" bg="bg-orange-100"
            isActive={activeFilter === 'atrasadas'} onClick={() => handleFilter('atrasadas')} />
          <StatCard title="Urgentes" count={urgentRows.length}
            icon={<AlertCircle size={20} />} color="text-red-600" bg="bg-red-100"
            isActive={activeFilter === 'urgentes'} onClick={() => handleFilter('urgentes')} />
          <StatCard title="Sin confirmar" count={unconfirmedRows.length}
            icon={<Clock size={20} />} color="text-yellow-600" bg="bg-yellow-100"
            isActive={activeFilter === 'sinconfirmar'} onClick={() => handleFilter('sinconfirmar')} />
        </div>
      </div>

      {/* Lista de visitas programadas */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-800">
              {activeFilter ? filterLabels[activeFilter] : 'Todas las visitas programadas'}
            </h3>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full text-white"
              style={{ background: '#D61672' }}>
              {filteredRows.length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {activeFilter && (
              <button onClick={() => setActiveFilter(null)}
                className="flex items-center space-x-1 text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
                <X size={12} /><span>Limpiar filtro</span>
              </button>
            )}
            <button onClick={() => onNavigate('all-visits')}
              className="text-xs font-semibold hover:underline" style={{ color: '#D61672' }}>
              Ver todas
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {pagination.paginatedItems.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Sin visitas en esta categoría</p>
            </div>
          )}

          {pagination.paginatedItems.map(({ task, visit }) => {
            const overdue = visitIsOverdue(visit, today, currentTime);
            const isToday = visit.scheduledDate === today && !overdue;

            return (
              <div key={visit.id}
                className={`p-4 hover:bg-slate-50 transition-colors ${
                  overdue ? 'border-l-4 border-red-400' :
                  isToday ? 'border-l-4 border-blue-400' : ''
                }`}>

                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <h4 className="font-semibold text-slate-800 text-sm">{task.clientName}</h4>
                      {task.serviceOrder && (
                        <span className="inline-flex items-center space-x-1 text-xs font-mono font-semibold px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                          <FileText size={10} /><span>OS: {task.serviceOrder}</span>
                        </span>
                      )}
                      {task.serviceType && (
                        <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-200">
                          <Package size={10} /><span>{task.serviceType}</span>
                        </span>
                      )}
                    </div>
                    {visit.urgency && (
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-bold rounded-full ${
                        visit.urgency === 'Alta'  ? 'bg-red-100 text-red-700' :
                        visit.urgency === 'Media' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>{visit.urgency}</span>
                    )}
                  </div>
                  <VisitStatusBadge status={visit.status} confirmed={visit.confirmed} size="xs" layout="row" />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                  {task.clientPhone && (
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                      <Phone size={11} className="text-slate-400 flex-shrink-0" />
                      <span>{task.clientPhone}</span>
                    </div>
                  )}
                  {task.clientAddress && (
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                      <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate max-w-xs">{task.clientAddress}</span>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 rounded-lg border border-slate-200 p-2.5 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                    <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                    <span>
                      {formatDateOnly(visit.scheduledDate)}
                      {visit.scheduledTime && ` · ${visit.scheduledTime}`}
                    </span>
                    {overdue && (
                      <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">⚠️ Atrasada</span>
                    )}
                    {isToday && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded">📅 Hoy</span>
                    )}
                  </div>
                  {visit.type && (
                    <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                      <Wrench size={12} className="text-slate-400 flex-shrink-0" />
                      <span>{visit.type}</span>
                    </div>
                  )}
                  {visit.technician && (
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                      <User size={12} className="text-slate-400 flex-shrink-0" />
                      <span className="truncate">{visit.technician}</span>
                    </div>
                  )}
                  {visit.observations && (
                    <div className="mt-1 pt-1.5 border-t border-slate-200">
                      <p className="text-xs text-slate-500 italic">📝 {visit.observations}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredRows.length > 10 && (
          <div className="px-4 pb-4">
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
      </div>

      {/* ── Bloque 2: Salud financiera ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-700">Salud financiera</h3>
          <button onClick={() => onNavigate('billing')}
            className="text-xs font-semibold hover:underline" style={{ color: '#D61672' }}>
            Ver Cobros
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div onClick={() => onNavigate('billing')}
            className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm cursor-pointer hover:shadow-md transition-all">
            <div className="p-2.5 rounded-xl bg-green-100 w-fit mb-3"><DollarSign size={20} className="text-green-600" /></div>
            <p className="text-2xl font-bold text-slate-800">${fmtMoney(totalCobrado)}</p>
            <h3 className="text-sm font-semibold text-slate-500">Total cobrado</h3>
          </div>
          <div onClick={() => onNavigate('billing')}
            className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm cursor-pointer hover:shadow-md transition-all">
            <div className="p-2.5 rounded-xl bg-amber-100 w-fit mb-3"><Wallet size={20} className="text-amber-600" /></div>
            <p className="text-2xl font-bold text-slate-800">${fmtMoney(saldoPendiente)}</p>
            <h3 className="text-sm font-semibold text-slate-500">Saldo pendiente</h3>
          </div>
          <StatCard title="Compromisos vencidos" count={compromisosVencidos}
            icon={<ShieldAlert size={20} />} color="text-red-600" bg="bg-red-100"
            onClick={() => onNavigate('billing')} />
        </div>
      </div>

      {/* ── Bloque 3: Clientes ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-700">Clientes</h3>
          <button onClick={() => onNavigate('clients')}
            className="text-xs font-semibold hover:underline" style={{ color: '#D61672' }}>
            Ver Clientes
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Activos" count={activeClients.length}
            icon={<Users size={20} />} color="text-blue-600" bg="bg-blue-100"
            onClick={() => onNavigate('clients')} />
          <StatCard title="Inactivos" count={inactiveClientsCount}
            icon={<UserX size={20} />} color="text-slate-500" bg="bg-slate-100"
            onClick={() => onNavigate('clients')} />
          <StatCard title="Nuevos este mes" count={newClientsThisMonth}
            icon={<CalendarCheck2 size={20} />} color="text-green-600" bg="bg-green-100"
            onClick={() => onNavigate('clients')} />
          <StatCard title="En riesgo (90+ días)" count={clientsAtRiskCount}
            icon={<AlertCircle size={20} />} color="text-orange-600" bg="bg-orange-100"
            onClick={() => onNavigate('clients')} />
        </div>
      </div>

      {/* ── Bloque 4: Técnicos y Borradores ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-700 px-1">Técnicos y borradores</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="p-2.5 rounded-xl bg-teal-100 w-fit mb-3"><Users size={20} className="text-teal-600" /></div>
            <p className="text-2xl font-bold text-slate-800">{tecnicos.length}</p>
            <h3 className="text-sm font-semibold text-slate-500 mb-2">Técnicos registrados</h3>
            {technicianRanking.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <p className="text-xs text-slate-400 font-semibold">Visitas realizadas este mes</p>
                {technicianRanking.map(([nombre, count]) => (
                  <div key={nombre} className="flex items-center justify-between text-xs text-slate-600">
                    <span className="truncate">{nombre}</span>
                    <span className="font-bold text-slate-700">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <StatCard title="Borradores pendientes" count={borradoresPendientes}
            icon={<BookOpen size={20} />} color="text-purple-600" bg="bg-purple-100"
            onClick={() => onNavigate('borradores')} />
        </div>
      </div>
    </div>
  );
}
