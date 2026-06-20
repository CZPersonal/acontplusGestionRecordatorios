import { useState, useMemo } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getVisitsRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';
import { useTecnicos } from '../hooks/useTecnicos';
import VisitsModal from './VisitsModal.jsx';
import { formatDateOnly } from '../utils/dates.js';
import {
  Search, X, Plus, Edit2, Trash2, CheckCircle2,
  RotateCcw, XCircle, Ban, ChevronDown, ChevronUp,
  ClipboardList,
} from 'lucide-react';

// ─── Helpers de estilo ───────────────────────────────────────────────────────

const TASK_STATUS_COLORS = {
  'Pendiente':  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'En Proceso': 'bg-blue-100  text-blue-700  border-blue-200',
  'Completado': 'bg-green-100 text-green-700 border-green-200',
  'Cancelado':  'bg-slate-100 text-slate-500 border-slate-200',
};

const VISIT_STATUS_COLORS = {
  Programada: 'bg-blue-100  text-blue-700',
  Realizada:  'bg-green-100 text-green-700',
  Cancelada:  'bg-amber-100 text-amber-700',
  Anulada:    'bg-red-100   text-red-600',
};

const URGENCY_COLORS = {
  Alta:  'bg-red-100    text-red-700',
  Media: 'bg-yellow-100 text-yellow-700',
  Baja:  'bg-green-100  text-green-700',
};

// ─── Operaciones sobre visitas (replica la lógica de useVisits) ──────────────

async function saveTaskVisits(taskId, updatedVisits) {
  const batch = writeBatch(db);
  updatedVisits.forEach(v => {
    batch.set(doc(getVisitsRef(taskId), v.id), v);
  });
  await batch.commit();
}

function applyVisitChange(task, visitId, changes) {
  return (task.visits || []).map(v =>
    v.id === visitId ? { ...v, ...changes } : v
  );
}

// ─── Sub-componente: confirmación ligera ─────────────────────────────────────

function ConfirmDialog({ title, body, onConfirm, onCancel, confirmLabel = 'Confirmar', danger = false }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="font-bold text-slate-800 mb-1.5">{title}</h3>
        {body && <p className="text-sm text-slate-500 mb-5">{body}</p>}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componente: modal completar visita ──────────────────────────────────

function CompleteVisitModal({ visit, task, user, onClose }) {
  const [obs,     setObs]     = useState('');
  const [loading, setLoading] = useState(false);
  const addToast = useAppStore(s => s.addToast);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const updated = applyVisitChange(task, visit.id, {
        status:              'Realizada',
        closingObservations: obs.trim(),
        completedAt:         new Date().toISOString(),
        completedBy:         user.email,
      });
      await saveTaskVisits(task.id, updated);
      onClose();
    } catch {
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo completar la visita.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="font-bold text-slate-800 mb-1">Completar visita #{visit.visitNumber}</h3>
        <p className="text-xs text-slate-400 mb-4">{task.clientName} · {formatDateOnly(visit.scheduledDate)}</p>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Observaciones de cierre <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          value={obs} onChange={e => setObs(e.target.value)}
          rows={3}
          placeholder="Ej: Trabajo realizado correctamente…"
          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-green-400 mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {loading ? 'Guardando…' : 'Marcar realizada'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function AllVisitsManager({ user }) {
  const tasks          = useAppStore(s => s.tasks);
  const addToast       = useAppStore(s => s.addToast);
  const handleEdit     = useAppStore(s => s.handleEdit);
  const handleDelete   = useAppStore(s => s.handleDelete);
  const handleComplete = useAppStore(s => s.handleComplete);
  const setEditingTask = useAppStore(s => s.setEditingTask);
  const setActiveTab   = useAppStore(s => s.setActiveTab);
  const { tecnicos }   = useTecnicos(user);

  // Filtros
  const [filterTaskStatus, setFilterTaskStatus] = useState('');
  const [filterStatus,     setFilterStatus]     = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [filterUrgency,    setFilterUrgency]    = useState('');
  const [filterDateFrom,   setFilterDateFrom]   = useState('');
  const [filterDateTo,     setFilterDateTo]     = useState('');
  const [search,           setSearch]           = useState('');

  // Estado de UI
  const [visitsModalTask,  setVisitsModalTask]  = useState(null); // { task, autoAdd }

  const [collapsed,        setCollapsed]        = useState({});
  const [loadingVisit,     setLoadingVisit]     = useState(null);
  const [completeModal,    setCompleteModal]    = useState(null); // { task, visit }
  const [annulConfirm,     setAnnulConfirm]     = useState(null); // { task, visit }
  const [deleteTaskId,     setDeleteTaskId]     = useState(null);

  const today = useMemo(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }), []);

  // ─── Datos agrupados ────────────────────────────────────────────────────────

  const groupedTasks = useMemo(() => {
    const q = search.toLowerCase().trim();
    const hasVisitFilter = filterStatus || filterTechnician || filterUrgency || filterDateFrom || filterDateTo;

    return tasks
      .map(task => {
        // Asignar números secuenciales por orden de creación
        const byCreation = [...(task.visits || [])].sort(
          (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
        );
        const numbered = byCreation.map((v, i) => ({ ...v, visitNumber: i + 1 }));

        // Filtrar visitas
        const filteredVisits = numbered.filter(v => {
          if (filterStatus     && v.status     !== filterStatus)     return false;
          if (filterTechnician && v.technician !== filterTechnician) return false;
          if (filterUrgency    && v.urgency    !== filterUrgency)    return false;
          if (filterDateFrom   && v.scheduledDate < filterDateFrom)  return false;
          if (filterDateTo     && v.scheduledDate > filterDateTo)    return false;
          return true;
        });

        return { task, visits: filteredVisits, totalVisits: numbered.length };
      })
      .filter(({ task, visits }) => {
        if (filterTaskStatus && task.status !== filterTaskStatus) return false;
        // Con filtros de visita activos, solo mostrar tareas con visitas que coincidan
        if (hasVisitFilter && visits.length === 0) return false;
        if (q) {
          const taskMatch =
            task.clientName?.toLowerCase().includes(q)   ||
            task.identification?.includes(q)             ||
            task.clientPhone?.includes(q)                ||
            task.serviceOrder?.toLowerCase().includes(q) ||
            task.serviceType?.toLowerCase().includes(q)  ||
            task.description?.toLowerCase().includes(q);
          const visitMatch = visits.some(v =>
            v.technician?.toLowerCase().includes(q) ||
            v.type?.toLowerCase().includes(q)
          );
          return taskMatch || visitMatch;
        }
        return true;
      })
      .sort((a, b) => {
        const maxDate = grp =>
          (grp.task.visits || []).map(v => v.scheduledDate || '').sort().pop() || '';
        return maxDate(b).localeCompare(maxDate(a));
      });
  }, [tasks, filterTaskStatus, filterStatus, filterTechnician, filterUrgency, filterDateFrom, filterDateTo, search]);

  const stats = useMemo(() => {
    const all = tasks.flatMap(t => t.visits || []);
    return {
      tareas:     groupedTasks.length,
      sinVisitas: groupedTasks.filter(({ task }) => (task.visits || []).length === 0).length,
      programada: all.filter(v => v.status === 'Programada').length,
      realizada:  all.filter(v => v.status === 'Realizada').length,
      cancelada:  all.filter(v => v.status === 'Cancelada' || v.status === 'Anulada').length,
    };
  }, [tasks, groupedTasks]);

  const hasFilters = filterTaskStatus || filterStatus || filterTechnician ||
    filterUrgency || filterDateFrom || filterDateTo || search;

  const clearFilters = () => {
    setFilterTaskStatus(''); setFilterStatus(''); setFilterTechnician('');
    setFilterUrgency(''); setFilterDateFrom(''); setFilterDateTo(''); setSearch('');
  };

  // ─── Acciones de visita ──────────────────────────────────────────────────────

  const visitAction = async (task, visitId, changes) => {
    setLoadingVisit(visitId);
    try {
      const updated = applyVisitChange(task, visitId, changes);
      await saveTaskVisits(task.id, updated);
    } catch {
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo actualizar la visita.' });
    } finally {
      setLoadingVisit(null);
    }
  };

  const doCancelVisit = (task, visit) =>
    visitAction(task, visit.id, { status: 'Cancelada' });

  const doRevertVisit = (task, visit) =>
    visitAction(task, visit.id, {
      status: 'Programada',
      revertedAt: new Date().toISOString(),
      revertedBy: user.email,
    });

  const doAnnulVisit = async (task, visit) => {
    setAnnulConfirm(null);
    await visitAction(task, visit.id, {
      status:     'Anulada',
      annulledAt: new Date().toISOString(),
      annulledBy: user.email,
    });
  };

  // ─── Acciones de tarea ───────────────────────────────────────────────────────

  const onNewTask = () => { setEditingTask(null); setActiveTab('form'); };
  const onEditTask = task => handleEdit(task); // handleEdit ya navega a 'form'
  const onDeleteTask = id => { handleDelete(id); setDeleteTaskId(null); };

  // ─── Estilos helpers ─────────────────────────────────────────────────────────

  const foc = e => e.target.style.borderColor = '#D61672';
  const blr = e => e.target.style.borderColor = '#e2e8f0';
  const sel = 'border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none bg-white font-medium';
  const actionBtn = (color, hColor, textColor) => ({
    base: `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors`,
    style: { background: color, color: textColor },
    hStyle: { background: hColor, color: textColor },
  });

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Modal VisitsModal para agregar / editar visitas */}
      {visitsModalTask && (
        <VisitsModal
          task={visitsModalTask.task}
          user={user}
          autoAddForm={visitsModalTask.autoAdd}
          onClose={() => setVisitsModalTask(null)}
        />
      )}

      {/* Modal completar visita */}
      {completeModal && (
        <CompleteVisitModal
          visit={completeModal.visit}
          task={completeModal.task}
          user={user}
          onClose={() => setCompleteModal(null)}
        />
      )}

      {/* Confirm anular visita */}
      {annulConfirm && (
        <ConfirmDialog
          title={`¿Anular visita #${annulConfirm.visit.visitNumber}?`}
          body="La visita quedará anulada de forma permanente. Esta acción no se puede deshacer fácilmente."
          confirmLabel="Anular"
          danger
          onConfirm={() => doAnnulVisit(annulConfirm.task, annulConfirm.visit)}
          onCancel={() => setAnnulConfirm(null)}
        />
      )}

      {/* Confirm eliminar tarea */}
      {deleteTaskId && (
        <ConfirmDialog
          title="¿Eliminar tarea?"
          body="Se eliminará la tarea y todas sus visitas. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          danger
          onConfirm={() => onDeleteTask(deleteTaskId)}
          onCancel={() => setDeleteTaskId(null)}
        />
      )}

      <div className="space-y-4">

        {/* ── Header ── */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800">Gestión de Visitas</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {stats.tareas} órdenes
                {stats.sinVisitas > 0 && ` · ${stats.sinVisitas} sin visitas`}
                {' · '}{stats.programada} programadas · {stats.realizada} realizadas · {stats.cancelada} canceladas/anuladas
              </p>
            </div>
            <button onClick={onNewTask}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm"
              style={{ background: '#D61672' }}
              onMouseEnter={e => e.currentTarget.style.background = '#b91260'}
              onMouseLeave={e => e.currentTarget.style.background = '#D61672'}>
              <Plus size={15} /> Nueva Tarea
            </button>
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, OS, cédula, técnico, tipo de servicio…"
              className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none"
              onFocus={foc} onBlur={blr}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <select value={filterTaskStatus} onChange={e => setFilterTaskStatus(e.target.value)}
              className={sel} onFocus={foc} onBlur={blr}>
              <option value="">Estado tarea</option>
              {['Pendiente','En Proceso','Completado','Cancelado'].map(s =>
                <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className={sel} onFocus={foc} onBlur={blr}>
              <option value="">Estado visita</option>
              {['Programada','Realizada','Cancelada','Anulada'].map(s =>
                <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}
              className={sel} onFocus={foc} onBlur={blr}>
              <option value="">Urgencia</option>
              {['Alta','Media','Baja'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={filterTechnician} onChange={e => setFilterTechnician(e.target.value)}
              className={sel} onFocus={foc} onBlur={blr}>
              <option value="">Técnico</option>
              {tecnicos.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
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
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">
                <X size={13} /> Limpiar filtros
              </button>
              <span className="text-xs text-slate-400">
                {groupedTasks.length} orden{groupedTasks.length !== 1 ? 'es' : ''}
              </span>
            </div>
          )}
        </div>

        {/* ── Lista agrupada ── */}
        {groupedTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm text-center py-16 text-slate-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Sin órdenes que coincidan con los filtros</p>
            <button onClick={onNewTask}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white mx-auto"
              style={{ background: '#D61672' }}>
              <Plus size={14} /> Nueva Tarea
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedTasks.map(({ task, visits, totalVisits }) => {
              const isCollapsed  = !!collapsed[task.id];
              const taskComplete = task.status === 'Completado';
              const taskColor    = TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS['Pendiente'];

              return (
                <div key={task.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                  {/* ── Encabezado de tarea ── */}
                  <div className={`p-4 ${taskComplete ? 'bg-green-50/40' : 'bg-slate-50/60'}`}>

                    {/* Fila superior: badges + botones */}
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${taskColor}`}>
                            {task.status}
                          </span>
                          {task.urgency && (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${URGENCY_COLORS[task.urgency] || ''}`}>
                              {task.urgency}
                            </span>
                          )}
                          {task.serviceOrder && (
                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                              OS: {task.serviceOrder}
                            </span>
                          )}
                        </div>

                        {/* Datos del cliente */}
                        <div className="font-bold text-slate-800 text-sm leading-snug mb-1.5">
                          {task.clientName}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                          {task.identification && <span className="font-mono">🪪 {task.identification}</span>}
                          {task.clientPhone    && <span>📞 {task.clientPhone}</span>}
                          {task.clientAddress  && <span>📍 {task.clientAddress}</span>}
                          {task.serviceType    && <span>🔧 {task.serviceType}</span>}
                        </div>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-1.5 italic line-clamp-2">
                            📝 {task.description}
                          </p>
                        )}
                      </div>

                      {/* Botones de tarea */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <button onClick={() => onEditTask(task)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                            <Edit2 size={12} /> Editar
                          </button>
                          <button
                            onClick={() => handleComplete(task.id)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              taskComplete
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}>
                            <CheckCircle2 size={12} />
                            {taskComplete ? 'Reabrir' : 'Completar'}
                          </button>
                          <button onClick={() => setDeleteTaskId(task.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                            <Trash2 size={12} /> Eliminar
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setVisitsModalTask({ task, autoAdd: true })}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-colors"
                            style={{ background: '#D61672' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#b91260'}
                            onMouseLeave={e => e.currentTarget.style.background = '#D61672'}>
                            <Plus size={12} /> Nueva visita
                          </button>
                          <button onClick={() => setCollapsed(p => ({ ...p, [task.id]: !p[task.id] }))}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                            title={isCollapsed ? 'Mostrar visitas' : 'Ocultar visitas'}>
                            {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                            {visits.length < totalVisits
                              ? `${visits.length}/${totalVisits}`
                              : totalVisits} visita{totalVisits !== 1 ? 's' : ''}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Lista de visitas ── */}
                  {!isCollapsed && (
                    <div>
                      {visits.length === 0 ? (
                        <div className="py-5 text-center text-xs text-slate-400 italic border-t border-slate-100">
                          Sin visitas que coincidan con los filtros actuales
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {visits.map(visit => {
                            const isOverdue = visit.status === 'Programada' && visit.scheduledDate < today;
                            const busy      = loadingVisit === visit.id;

                            return (
                              <div key={visit.id}
                                className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-50/70 transition-colors ${
                                  isOverdue ? 'border-l-4 border-red-400' : 'border-l-4 border-transparent'
                                }`}>

                                {/* Número + fecha */}
                                <div className="flex-shrink-0 text-center w-[52px]">
                                  <div className="text-xs font-bold bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 mb-1 inline-block">
                                    #{visit.visitNumber}
                                  </div>
                                  <div className="text-xs font-semibold text-slate-700 leading-none">
                                    {formatDateOnly(visit.scheduledDate)}
                                  </div>
                                  {visit.scheduledTime && (
                                    <div className="text-xs text-slate-400 mt-0.5">{visit.scheduledTime}</div>
                                  )}
                                </div>

                                {/* Info de visita */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${VISIT_STATUS_COLORS[visit.status] || 'bg-slate-100 text-slate-500'}`}>
                                      {visit.status}
                                    </span>
                                    {isOverdue && (
                                      <span className="text-xs font-bold text-red-600">⚠️ Atrasada</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-3 text-xs text-slate-500">
                                    {visit.technician && <span>👷 {visit.technician}</span>}
                                    {visit.type       && <span>🔧 {visit.type}</span>}
                                  </div>
                                  {visit.observations && (
                                    <p className="text-xs text-slate-400 mt-0.5 italic truncate max-w-xs">
                                      📝 {visit.observations}
                                    </p>
                                  )}
                                  {visit.closingObservations && (
                                    <p className="text-xs text-green-600 mt-0.5 italic truncate max-w-xs">
                                      ✅ {visit.closingObservations}
                                    </p>
                                  )}
                                </div>

                                {/* Botones de acción de visita */}
                                <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
                                  {visit.status === 'Programada' && (<>
                                    <button disabled={busy}
                                      onClick={() => setCompleteModal({ task, visit })}
                                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 transition-colors">
                                      <CheckCircle2 size={12} /> Realizada
                                    </button>
                                    <button disabled={busy}
                                      onClick={() => doCancelVisit(task, visit)}
                                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 transition-colors">
                                      <XCircle size={12} /> Cancelar
                                    </button>
                                    <button disabled={busy}
                                      onClick={() => setAnnulConfirm({ task, visit })}
                                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-40 transition-colors">
                                      <Ban size={12} /> Anular
                                    </button>
                                  </>)}
                                  {(visit.status === 'Realizada' || visit.status === 'Cancelada') && (
                                    <button disabled={busy}
                                      onClick={() => doRevertVisit(task, visit)}
                                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 transition-colors">
                                      <RotateCcw size={12} /> Revertir
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setVisitsModalTask({ task, autoAdd: false })}
                                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                                    style={{ color: '#D61672', borderColor: '#fce7f3' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fdf2f8'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    title="Editar datos de esta visita">
                                    <Edit2 size={12} /> Editar
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
