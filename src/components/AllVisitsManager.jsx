import { useState, useMemo } from 'react';
import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getVisitsRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';
import { useTecnicos } from '../hooks/useTecnicos';
import { useTiposVisita } from '../hooks/useTiposVisita';
import { VisitFormModal } from './VisitsModal.jsx';
import VisitsReport from './VisitsReport.jsx';
import { formatDateOnly } from '../utils/dates.js';
import {
  Search, X, Plus, Edit2, Trash2, CheckCircle2,
  RotateCcw, XCircle, Ban, ChevronDown, ChevronUp,
  ClipboardList, MapPin, Phone, CreditCard, Wrench, FileText, UserCheck,
} from 'lucide-react';

// ─── Campo con etiqueta para la grilla de tarea ──────────────────────────────
function Field({ label, value, mono = false, icon: Icon }) {
  if (!value) return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-xs text-slate-300 italic">—</p>
    </div>
  );
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 flex items-center gap-1">
        {Icon && <Icon size={10} className="opacity-60" />}{label}
      </p>
      <p className={`text-sm text-slate-800 font-medium truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

// ─── Helpers de estilo ───────────────────────────────────────────────────────

const TASK_STATUS_COLORS = {
  'Pendiente':  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'En Proceso': 'bg-blue-100  text-blue-700  border-blue-200',
  'Completado': 'bg-green-100 text-green-700 border-green-200',
  'Cancelado':  'bg-slate-100 text-slate-500 border-slate-200',
};

const TASK_HEADER_GRADIENT = {
  'Pendiente':  'linear-gradient(135deg, #b45309, #92400e)',
  'En Proceso': 'linear-gradient(135deg, #1d4ed8, #1e40af)',
  'Completado': 'linear-gradient(135deg, #15803d, #166534)',
  'Cancelado':  'linear-gradient(135deg, #64748b, #475569)',
};

const VISIT_STATUS_BORDER = {
  Programada: '#3b82f6',
  Realizada:  '#16a34a',
  Cancelada:  '#f59e0b',
  Anulada:    '#ef4444',
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
  const tasks               = useAppStore(s => s.tasks);
  const addToast            = useAppStore(s => s.addToast);
  const handleEdit          = useAppStore(s => s.handleEdit);
  const handleDelete        = useAppStore(s => s.handleDelete);
  const handleComplete      = useAppStore(s => s.handleComplete);
  const setEditingTask      = useAppStore(s => s.setEditingTask);
  const setActiveTab        = useAppStore(s => s.setActiveTab);
  const getActiveColumns    = useAppStore(s => s.getActiveColumns);
  const setShowExportConfig = useAppStore(s => s.setShowExportConfig);
  const { tecnicos }         = useTecnicos(user);
  const { tiposParaSelect }  = useTiposVisita(user);

  const [innerTab, setInnerTab] = useState('gestion'); // 'gestion' | 'historial'

  // Filtros
  const [filterTaskStatus, setFilterTaskStatus] = useState('');
  const [filterStatus,     setFilterStatus]     = useState('');
  const [filterTechnician, setFilterTechnician] = useState('');
  const [filterUrgency,    setFilterUrgency]    = useState('');
  const [filterDateFrom,   setFilterDateFrom]   = useState('');
  const [filterDateTo,     setFilterDateTo]     = useState('');
  const [search,           setSearch]           = useState('');

  // Estado de UI — formularios de visita
  const [addVisitTask,  setAddVisitTask]  = useState(null); // task | null
  const [editVisitData, setEditVisitData] = useState(null); // { task, visit } | null

  const [collapsed,        setCollapsed]        = useState({});
  const [loadingVisit,     setLoadingVisit]     = useState(null);
  const [completeModal,    setCompleteModal]    = useState(null); // { task, visit }
  const [annulConfirm,     setAnnulConfirm]     = useState(null); // { task, visit }
  const [deleteTaskId,     setDeleteTaskId]     = useState(null);
  const [confirmingVisit,  setConfirmingVisit]  = useState(null); // visitId

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

  const doConfirmVisit = async (taskId, visitId) => {
    setConfirmingVisit(visitId);
    try {
      await updateDoc(doc(getVisitsRef(taskId), visitId), {
        confirmed:           true,
        technicianConfirmed: true,
        confirmedAt:         new Date().toISOString(),
        confirmedBy:         user.email,
      });
    } catch {
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo confirmar la visita.' });
    } finally {
      setConfirmingVisit(null);
    }
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

  const TAB = 'px-4 py-2 text-sm font-semibold rounded-lg transition-colors';
  const ACTIVE_TAB = `${TAB} text-white shadow-sm`;
  const IDLE_TAB = `${TAB} text-slate-500 hover:text-slate-700 hover:bg-slate-100`;

  if (innerTab === 'historial') {
    return (
      <div className="space-y-4">
        {/* Selector de pestañas */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 py-2 flex items-center gap-2">
          <button onClick={() => setInnerTab('gestion')} className={IDLE_TAB}>
            Gestión
          </button>
          <button className={ACTIVE_TAB} style={{ background: '#D61672' }}>
            Historial
          </button>
        </div>
        <VisitsReport
          tasks={tasks}
          exportConfig={getActiveColumns('visits')}
          onOpenConfig={() => setShowExportConfig(true)}
        />
      </div>
    );
  }

  return (
    <>
      {/* Formulario nueva visita */}
      {addVisitTask && (
        <VisitFormModal
          isEdit={false}
          tiposParaSelect={tiposParaSelect}
          tecnicosParaSelect={tecnicos}
          onClose={() => setAddVisitTask(null)}
          onSave={async (formData) => {
            const newVisit = {
              id:                  crypto.randomUUID(),
              scheduledDate:       formData.scheduledDate,
              scheduledTime:       formData.scheduledTime       || '',
              type:                formData.type                || '',
              urgency:             formData.urgency             || 'Media',
              observations:        formData.observations        || '',
              technician:          formData.technician          || user.email,
              technicianEmail:     formData.technicianEmail     || '',
              status:              'Programada',
              createdBy:           user.email,
              createdAt:           new Date().toISOString(),
              completedAt:         null,
              completedBy:         null,
              closingObservations: '',
            };
            try {
              await saveTaskVisits(addVisitTask.id, [...(addVisitTask.visits || []), newVisit]);
              setAddVisitTask(null);
            } catch {
              addToast({ type: 'error', title: '❌ Error', body: 'No se pudo guardar la visita.' });
            }
          }}
        />
      )}

      {/* Formulario editar visita */}
      {editVisitData && (
        <VisitFormModal
          isEdit={true}
          initial={editVisitData.visit}
          tiposParaSelect={tiposParaSelect}
          tecnicosParaSelect={tecnicos}
          onClose={() => setEditVisitData(null)}
          onSave={async (formData) => {
            const updated = (editVisitData.task.visits || []).map(v =>
              v.id === editVisitData.visit.id
                ? { ...v, ...formData, updatedAt: new Date().toISOString(), updatedBy: user.email }
                : v
            );
            try {
              await saveTaskVisits(editVisitData.task.id, updated);
              setEditVisitData(null);
            } catch {
              addToast({ type: 'error', title: '❌ Error', body: 'No se pudo actualizar la visita.' });
            }
          }}
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

        {/* ── Pestañas ── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 py-2 flex items-center gap-2">
          <button className={ACTIVE_TAB} style={{ background: '#D61672' }}>
            Gestión
          </button>
          <button onClick={() => setInnerTab('historial')} className={IDLE_TAB}>
            Historial
          </button>
        </div>

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
              const headerBg     = TASK_HEADER_GRADIENT[task.status] || TASK_HEADER_GRADIENT['Pendiente'];

              return (
                <div key={task.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                  {/* ══ ÁREA DE TAREA ════════════════════════════════════════ */}

                  {/* Barra de título con gradiente */}
                  <div className="px-5 py-3 flex items-center justify-between gap-4"
                    style={{ background: headerBg }}>
                    <div className="flex items-center gap-3 min-w-0">
                      {task.serviceOrder && (
                        <span className="flex-shrink-0 text-xs font-mono font-bold px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                          OS: {task.serviceOrder}
                        </span>
                      )}
                      <span className="font-bold text-white text-base truncate">{task.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.urgency && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${URGENCY_COLORS[task.urgency] || ''}`}>
                          {task.urgency}
                        </span>
                      )}
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                        {task.status}
                      </span>
                    </div>
                  </div>

                  {/* Grilla de campos con etiquetas */}
                  <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 bg-slate-50/60">
                    <Field label="Cédula / RUC" value={task.identification} mono icon={CreditCard} />
                    <Field label="Teléfono"     value={task.clientPhone}    icon={Phone} />
                    <Field label="Dirección"    value={task.clientAddress}  icon={MapPin} />
                    <Field label="Tipo Servicio" value={task.serviceType}   icon={Wrench} />
                    {task.description && (
                      <div className="col-span-2 md:col-span-4">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 flex items-center gap-1">
                          <FileText size={10} className="opacity-60" /> Descripción
                        </p>
                        <p className="text-sm text-slate-600 italic line-clamp-2">{task.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Franja de botones de tarea */}
                  <div className="px-5 py-2.5 flex items-center justify-between gap-3 bg-slate-100 border-t border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Tarea:</span>
                      <button onClick={() => onEditTask(task)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors">
                        <Edit2 size={12} /> Editar
                      </button>
                      <button onClick={() => handleComplete(task.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
                          taskComplete
                            ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
                            : 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                        }`}>
                        <CheckCircle2 size={12} />
                        {taskComplete ? 'Reabrir' : 'Completar'}
                      </button>
                      <button onClick={() => setDeleteTaskId(task.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-red-600 border border-red-200 hover:bg-red-50 shadow-sm transition-colors">
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAddVisitTask(task)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm transition-colors"
                        style={{ background: '#D61672' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#b91260'}
                        onMouseLeave={e => e.currentTarget.style.background = '#D61672'}>
                        <Plus size={12} /> Nueva visita
                      </button>
                      <button onClick={() => setCollapsed(p => ({ ...p, [task.id]: !p[task.id] }))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-500 border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors">
                        {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                        {visits.length < totalVisits ? `${visits.length}/${totalVisits}` : totalVisits} visita{totalVisits !== 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>

                  {/* ══ ÁREA DE VISITAS ══════════════════════════════════════ */}
                  {!isCollapsed && (
                    <div className="border-t-2 border-slate-200">

                      {/* Separador con etiqueta */}
                      <div className="flex items-center gap-3 px-5 py-2 bg-slate-50">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Visitas</span>
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs text-slate-400">{totalVisits} en total</span>
                      </div>

                      {visits.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 italic">
                          Sin visitas que coincidan con los filtros actuales
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {visits.map(visit => {
                            const isOverdue    = visit.status === 'Programada' && visit.scheduledDate < today && !visit.confirmed && !visit.technicianConfirmed;
                            const isConfirmed  = visit.confirmed || visit.technicianConfirmed;
                            const busy         = loadingVisit === visit.id;
                            const borderColor  = VISIT_STATUS_BORDER[visit.status] || '#cbd5e1';

                            return (
                              <div key={visit.id}
                                className="flex items-stretch hover:bg-slate-50/80 transition-colors"
                                style={{ borderLeft: `4px solid ${borderColor}` }}>

                                {/* Columna izquierda: número + fecha */}
                                <div className="flex-shrink-0 w-24 flex flex-col items-center justify-center px-3 py-4 bg-slate-50/60 border-r border-slate-100 text-center gap-1">
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-sm">
                                    #{visit.visitNumber}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-700 leading-tight">
                                    {formatDateOnly(visit.scheduledDate)}
                                  </span>
                                  {visit.scheduledTime && (
                                    <span className="text-xs text-slate-400">{visit.scheduledTime}</span>
                                  )}
                                </div>

                                {/* Columna central: info de visita */}
                                <div className="flex-1 min-w-0 px-4 py-3">
                                  {/* Fila 1: estado + urgencia + alerta */}
                                  <div className="flex items-center gap-2 flex-wrap mb-2">
                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${VISIT_STATUS_COLORS[visit.status] || 'bg-slate-100 text-slate-500'}`}>
                                      {visit.status}
                                    </span>
                                    {visit.urgency && (
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCY_COLORS[visit.urgency] || ''}`}>
                                        {visit.urgency}
                                      </span>
                                    )}
                                    {isConfirmed && (
                                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200"
                                        title={visit.confirmedBy ? `Confirmada por ${visit.confirmedBy}` : ''}>
                                        ✅ Confirmada{visit.confirmedBy ? ` · ${visit.confirmedBy.split('@')[0]}` : ''}
                                      </span>
                                    )}
                                    {isOverdue && (
                                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                        ⚠️ Atrasada
                                      </span>
                                    )}
                                  </div>
                                  {/* Fila 2: técnico + tipo */}
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-1.5">
                                    {visit.technician && (
                                      <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Técnico</p>
                                        <p className="text-xs font-medium text-slate-700">👷 {visit.technician}</p>
                                      </div>
                                    )}
                                    {visit.type && (
                                      <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Tipo</p>
                                        <p className="text-xs font-medium text-slate-700">🔧 {visit.type}</p>
                                      </div>
                                    )}
                                  </div>
                                  {visit.observations && (
                                    <p className="text-xs text-slate-400 italic truncate">📝 {visit.observations}</p>
                                  )}
                                  {visit.closingObservations && (
                                    <p className="text-xs text-green-600 italic truncate">✅ {visit.closingObservations}</p>
                                  )}
                                </div>

                                {/* Columna derecha: botones de acción de visita */}
                                <div className="flex-shrink-0 flex flex-col items-stretch gap-1.5 justify-center px-3 py-3 bg-slate-50 border-l border-slate-100 min-w-[110px]">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-0.5">Visita</p>
                                  {visit.status === 'Programada' && (<>
                                    {!isConfirmed && (
                                      <button
                                        disabled={confirmingVisit === visit.id}
                                        onClick={() => doConfirmVisit(task.id, visit.id)}
                                        className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-teal-100 text-teal-700 hover:bg-teal-200 disabled:opacity-40 transition-colors w-full">
                                        <UserCheck size={11} /> Confirmar
                                      </button>
                                    )}
                                    <button disabled={busy}
                                      onClick={() => setCompleteModal({ task, visit })}
                                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 transition-colors w-full">
                                      <CheckCircle2 size={11} /> Realizada
                                    </button>
                                    <button disabled={busy}
                                      onClick={() => doCancelVisit(task, visit)}
                                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 transition-colors w-full">
                                      <XCircle size={11} /> Cancelar
                                    </button>
                                    <button disabled={busy}
                                      onClick={() => setAnnulConfirm({ task, visit })}
                                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-40 transition-colors w-full">
                                      <Ban size={11} /> Anular
                                    </button>
                                  </>)}
                                  {(visit.status === 'Realizada' || visit.status === 'Cancelada') && (
                                    <button disabled={busy}
                                      onClick={() => doRevertVisit(task, visit)}
                                      className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-600 hover:bg-slate-300 disabled:opacity-40 transition-colors w-full">
                                      <RotateCcw size={11} /> Revertir
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setEditVisitData({ task, visit })}
                                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors w-full"
                                    style={{ color: '#D61672', borderColor: '#fce7f3', background: 'white' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fdf2f8'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                    <Edit2 size={11} /> Editar
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
