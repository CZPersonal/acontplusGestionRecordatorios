import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { useTecnicos } from '../hooks/useTecnicos';
import { useTiposVisita } from '../hooks/useTiposVisita';
import { getClientContacts } from '../hooks/useClients.js';
import { printVisitPDF, shareVisitWhatsApp } from './VisitsModal.jsx';
import VisitsReport from './VisitsReport.jsx';
import { formatDateOnly, formatDateTime } from '../utils/dates.js';
import {
  Search, X, Plus, Edit2, Trash2, CheckCircle2,
  RotateCcw, XCircle, Ban, ClipboardList, MapPin, Phone,
  Wrench, UserCheck, FileText, RefreshCw, Building2, Navigation, Clipboard, Clock,
} from 'lucide-react';
import { VisitStatusBadge } from './VisitStatusBadge.jsx';

// ─── Paletas de colores ───────────────────────────────────────────────────────
const VISIT_STATUS_BORDER = {
  Programada: '#3b82f6', Confirmada: '#0d9488', Realizada: '#16a34a', Cancelada: '#f59e0b', Anulada: '#ef4444',
};
const VISIT_STATUS_COLORS = {
  Programada: 'bg-blue-100 text-blue-700',
  Confirmada: 'bg-teal-100 text-teal-700',
  Realizada:  'bg-green-100 text-green-700',
  Cancelada:  'bg-amber-100 text-amber-700',
  Anulada:    'bg-red-100 text-red-600',
};
const URGENCY_COLORS = {
  Alta:  'bg-red-100 text-red-700',
  Media: 'bg-yellow-100 text-yellow-700',
  Baja:  'bg-green-100 text-green-700',
};

// ─── Modal confirmar acción ───────────────────────────────────────────────────
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

// ─── Modal completar visita ───────────────────────────────────────────────────
function CompleteVisitModal({ visit, onClose }) {
  const [obs,   setObs]   = useState('');
  const [value, setValue] = useState('0');
  const [busy,  setBusy]  = useState(false);
  const completeVisit = useAppStore(s => s.completeVisit);
  const editVisit     = useAppStore(s => s.editVisit);
  const addToast      = useAppStore(s => s.addToast);

  const handleSave = async () => {
    setBusy(true);
    const parsedValue = parseFloat(value) || 0;
    const ok = await completeVisit(visit.id, { closingObservations: obs.trim() });
    if (ok && parsedValue > 0) {
      await editVisit(visit.id, { visitValue: parsedValue });
    }
    if (!ok) addToast({ type: 'error', title: '❌ Error', body: 'No se pudo completar la visita.' });
    setBusy(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <h3 className="font-bold text-slate-800 mb-1">Completar visita</h3>
        <p className="text-xs text-slate-400 mb-4">{visit.clientName} · {formatDateOnly(visit.scheduledDate)}</p>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Observaciones de cierre <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
          placeholder="Trabajo realizado correctamente…"
          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-green-400 mb-3" />
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Valor de la visita <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-semibold">$</span>
          <input type="number" min="0" step="0.01" value={value} onChange={e => setValue(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-green-400" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={busy}
            className="flex-1 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={busy}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {busy ? 'Guardando…' : 'Marcar realizada'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Vista de tareas legacy (colección water_filter_tasks) ───────────────────
function LegacyView({ user }) {
  const tasks = useAppStore(s => s.tasks);
  const getActiveColumns  = useAppStore(s => s.getActiveColumns);
  const setShowExportConfig = useAppStore(s => s.setShowExportConfig);

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">📦 Datos históricos</p>
        <p className="text-xs">Visitas generadas con el sistema anterior (tareas). Solo lectura.</p>
      </div>
      <VisitsReport
        tasks={tasks}
        exportConfig={getActiveColumns('visits')}
        onOpenConfig={() => setShowExportConfig(true)}
      />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AllVisitsManager({ user }) {
  const visits              = useAppStore(s => s.visits);
  const clients             = useAppStore(s => s.clients);
  const updateClient        = useAppStore(s => s.updateClient);
  const addToast            = useAppStore(s => s.addToast);
  const cancelVisit         = useAppStore(s => s.cancelVisit);
  const annulVisit          = useAppStore(s => s.annulVisit);
  const revertVisit         = useAppStore(s => s.revertVisit);
  const deleteVisit         = useAppStore(s => s.deleteVisit);
  const confirmVisit        = useAppStore(s => s.confirmVisit);
  const handleGenerateSupport = useAppStore(s => s.handleGenerateSupport);
  const setEditingVisit     = useAppStore(s => s.setEditingVisit);
  const openNewVisitModal   = useAppStore(s => s.openNewVisitModal);
  const highlightedVisitId  = useAppStore(s => s.highlightedVisitId);
  const setHighlightedVisitId = useAppStore(s => s.setHighlightedVisitId);
  const { tecnicos }        = useTecnicos(user);
  const tecnicosMap = useMemo(() => {
    const map = {};
    tecnicos.forEach(t => { map[t.nombre] = { phone: t.phone || '', email: t.email || '' }; });
    return map;
  }, [tecnicos]);

  const emailToName = useMemo(() => {
    const m = {};
    tecnicos.forEach(t => { if (t.email) m[t.email] = t.nombre; });
    return m;
  }, [tecnicos]);

  const establecimientos = useAppStore(s => s.establecimientos);

  const [innerTab, setInnerTab]           = useState('gestion');
  const [search, setSearch]               = useState('');
  const [filterStatus, setFilter]         = useState('');
  const [filterTech, setFilterTech]       = useState('');
  const [filterUrgency, setFilterU]       = useState('');
  const [filterFrom, setFilterFrom]       = useState('');
  const [filterTo, setFilterTo]           = useState('');
  const [filterEst, setFilterEst]         = useState('');
  const [completeModal, setCompleteModal] = useState(null);
  const [annulConfirm,  setAnnulConfirm]  = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [busy, setBusy] = useState(null);
  const [flashId, setFlashId] = useState(null);
  const [editingMapsId, setEditingMapsId] = useState(null);
  const [mapsInput,     setMapsInput]     = useState('');

  const today = useMemo(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }), []);
  const nowTime = useMemo(() => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }, []);

  // Highlight visit después de crearla
  useEffect(() => {
    if (!highlightedVisitId) return;
    setFlashId(highlightedVisitId);
    const scrollTimer = setTimeout(() => {
      const el = document.getElementById(`visit-${highlightedVisitId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    const clearTimer = setTimeout(() => {
      setFlashId(null);
      setHighlightedVisitId(null);
    }, 3500);
    return () => { clearTimeout(scrollTimer); clearTimeout(clearTimer); };
  }, [highlightedVisitId, setHighlightedVisitId]);

  const hasFilters = !!(search || filterStatus || filterTech || filterUrgency || filterFrom || filterTo || filterEst);
  const clearFilters = () => {
    setSearch(''); setFilter(''); setFilterTech(''); setFilterU(''); setFilterFrom(''); setFilterTo(''); setFilterEst('');
  };

  // ─── Filtrado ────────────────────────────────────────────────────────────────
  const isVisitOverdue = (v) => {
    if (v.status !== 'Programada' && v.status !== 'Confirmada') return false;
    if (v.scheduledDate < today) return true;
    if (v.scheduledDate === today && v.scheduledTime && v.scheduledTime < nowTime) return true;
    return false;
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return visits.filter(v => {
      if (filterStatus) {
        switch (filterStatus) {
          case '__no_confirmadas':
            if (v.status !== 'Programada') return false;
            break;
          case '__no_realizadas':
            if (v.status !== 'Programada' && v.status !== 'Confirmada') return false;
            break;
          case '__atrasadas':
            if (!isVisitOverdue(v)) return false;
            break;
          case '__a_tiempo':
            if ((v.status !== 'Programada' && v.status !== 'Confirmada') || isVisitOverdue(v)) return false;
            break;
          default:
            if (v.status !== filterStatus) return false;
        }
      }
      if (filterTech && v.technician !== filterTech) return false;
      if (filterUrgency && v.urgency !== filterUrgency) return false;
      if (filterFrom && v.scheduledDate < filterFrom) return false;
      if (filterTo && v.scheduledDate > filterTo) return false;
      if (filterEst && v.establecimientoId !== filterEst) return false;
      if (q) {
        return (
          v.clientName?.toLowerCase().includes(q) ||
          v.visitNumber?.toLowerCase().includes(q) ||
          v.serviceOrder?.toLowerCase().includes(q) ||
          v.technician?.toLowerCase().includes(q) ||
          v.serviceType?.toLowerCase().includes(q) ||
          v.ubicacion?.toLowerCase().includes(q) ||
          v.phone?.includes(q)
        );
      }
      return true;
    });
  }, [visits, search, filterStatus, filterTech, filterUrgency, filterFrom, filterTo, filterEst, today, nowTime]);

  // ─── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     filtered.length,
    prog:      filtered.filter(v => v.status === 'Programada').length,
    real:      filtered.filter(v => v.status === 'Realizada').length,
    otros:     filtered.filter(v => v.status === 'Cancelada' || v.status === 'Anulada').length,
  }), [filtered]);

  // ─── Acciones de visita ───────────────────────────────────────────────────────
  const doAction = async (action, visitId) => {
    setBusy(visitId);
    const ok = await action(visitId);
    if (!ok) addToast({ type: 'error', title: '❌ Error', body: 'No se pudo realizar la acción.' });
    setBusy(null);
  };

  const onEditVisit = (visit) => {
    setEditingVisit(visit);
    openNewVisitModal(visit);
  };

  const onGenerateSupport = async (visit) => {
    setBusy(visit.id + '_support');
    await handleGenerateSupport(visit);
    setBusy(null);
  };

  const onDeleteVisit = async (visitId) => {
    setBusy(visitId);
    await deleteVisit(visitId);
    setBusy(null);
    setDeleteConfirm(null);
  };

  // Índice de clientes para lookup rápido por id
  const clientsById = useMemo(() => {
    const map = {};
    clients.forEach(c => { map[c.id] = c; });
    return map;
  }, [clients]);

  // Devuelve el mapsLink del contacto vinculado a la visita
  const getMapsLink = (visit) => {
    const client = clientsById[visit.clientId];
    if (!client || !visit.contactId) return '';
    const contact = getClientContacts(client).find(c => c.id === visit.contactId);
    return contact?.mapsLink || '';
  };

  // Guarda el mapsLink en el contacto del cliente
  const saveMapsLink = async (visit, url) => {
    const client = clientsById[visit.clientId];
    if (!client || !visit.contactId) return;
    const updatedContacts = getClientContacts(client).map(c =>
      c.id === visit.contactId ? { ...c, mapsLink: url.trim() } : c
    );
    const ok = await updateClient(client.id, {
      name:           client.name,
      foreign:        client.foreign ?? false,
      identification: client.identification,
      contacts:       updatedContacts,
    });
    if (ok) {
      addToast({ type: 'success', title: '✅ Link guardado', body: 'El enlace de Maps se guardó en el cliente.' });
      setEditingMapsId(null);
      setMapsInput('');
    } else {
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo guardar el enlace.' });
    }
  };

  // Construye objeto "task" sintético para PDF/WA (mantiene compatibilidad con funciones de VisitsModal)
  const makeTaskForPDF = (visit) => ({
    serviceOrder:  visit.serviceOrder  || '',
    clientName:    visit.clientName    || '',
    identification: '',
    clientPhone:   visit.phone         || '',
    clientAddress: `${visit.ubicacion || ''} ${visit.address || ''}`.trim(),
  });

  // ─── Estilos ─────────────────────────────────────────────────────────────────
  const sel = 'border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none bg-white font-medium';
  const TAB = 'px-4 py-2 text-sm font-semibold rounded-lg transition-colors';
  const ACTIVE_TAB = `${TAB} text-white shadow-sm`;
  const IDLE_TAB   = `${TAB} text-slate-500 hover:text-slate-700 hover:bg-slate-100`;

  return (
    <>
      {/* Modales */}
      {completeModal && (
        <CompleteVisitModal visit={completeModal} onClose={() => setCompleteModal(null)} />
      )}
      {annulConfirm && (
        <ConfirmDialog
          title="¿Anular visita?"
          body="La visita quedará anulada. No se puede deshacer fácilmente."
          confirmLabel="Anular" danger
          onConfirm={() => { doAction(annulVisit, annulConfirm); setAnnulConfirm(null); }}
          onCancel={() => setAnnulConfirm(null)}
        />
      )}
      {deleteConfirm && (
        <ConfirmDialog
          title="¿Eliminar visita?"
          body="La visita se eliminará permanentemente."
          confirmLabel="Eliminar" danger
          onConfirm={() => onDeleteVisit(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      <div className="space-y-4">

        {/* ── Pestañas ── */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 py-2 flex items-center gap-2">
          <button onClick={() => setInnerTab('gestion')}
            className={innerTab === 'gestion' ? ACTIVE_TAB : IDLE_TAB}
            style={innerTab === 'gestion' ? { background: '#D61672' } : {}}>
            Gestión de visitas
          </button>
          <button onClick={() => setInnerTab('legacy')}
            className={innerTab === 'legacy' ? ACTIVE_TAB : IDLE_TAB}
            style={innerTab === 'legacy' ? { background: '#D61672' } : {}}>
            Historial legado
          </button>
        </div>

        {innerTab === 'legacy' && <LegacyView user={user} />}

        {innerTab === 'gestion' && (
          <>
            {/* ── Header ── */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800">Gestión de visitas</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {stats.total} visita{stats.total !== 1 ? 's' : ''}
                    {' · '}{stats.prog} programadas · {stats.real} realizadas · {stats.otros} canceladas/anuladas
                  </p>
                </div>
                <button
                  onClick={() => openNewVisitModal()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-colors"
                  style={{ background: '#D61672' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#b91260'}
                  onMouseLeave={e => e.currentTarget.style.background = '#D61672'}>
                  <Plus size={15} /> Nueva visita
                </button>
              </div>
            </div>

            {/* ── Filtros ── */}
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por cliente, OS, técnico, servicio, ubicación, teléfono…"
                  className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-pink-400" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                <select value={filterStatus} onChange={e => setFilter(e.target.value)} className={sel}>
                  <option value="">Estado visita</option>
                  <optgroup label="── Pendientes ──">
                    <option value="__no_confirmadas">No confirmadas</option>
                    <option value="__no_realizadas">No realizadas</option>
                    <option value="__atrasadas">Atrasadas</option>
                    <option value="__a_tiempo">A tiempo</option>
                  </optgroup>
                  <optgroup label="── Por estado ──">
                    <option value="Programada">Programada</option>
                    <option value="Confirmada">Confirmada</option>
                    <option value="Realizada">Realizada</option>
                    <option value="Cancelada">Cancelada</option>
                    <option value="Anulada">Anulada</option>
                  </optgroup>
                </select>
                <select value={filterUrgency} onChange={e => setFilterU(e.target.value)} className={sel}>
                  <option value="">Urgencia</option>
                  {['Alta','Media','Baja'].map(u => <option key={u}>{u}</option>)}
                </select>
                <select value={filterTech} onChange={e => setFilterTech(e.target.value)} className={sel}>
                  <option value="">Técnico</option>
                  {tecnicos.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                </select>
                {establecimientos.length > 0 && (
                  <select value={filterEst} onChange={e => setFilterEst(e.target.value)} className={sel}>
                    <option value="">Establecimiento</option>
                    {establecimientos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                )}
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={sel} />
                <input type="date" value={filterTo}   onChange={e => setFilterTo(e.target.value)}   className={sel} />
              </div>
              {hasFilters && (
                <div className="flex items-center justify-between">
                  <button onClick={clearFilters}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">
                    <X size={13} /> Limpiar filtros
                  </button>
                  <span className="text-xs text-slate-400">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* ── Lista de visitas ── */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm text-center py-16 text-slate-400">
                <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                {visits.length === 0 ? (
                  <>
                    <p className="text-sm font-medium mb-1">Aún no hay visitas registradas</p>
                    <p className="text-xs mb-4">Crea la primera visita para comenzar</p>
                    <button onClick={() => openNewVisitModal()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white mx-auto"
                      style={{ background: '#D61672' }}>
                      <Plus size={14} /> Nueva visita
                    </button>
                  </>
                ) : (
                  <p className="text-sm font-medium">Sin visitas que coincidan con los filtros</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(visit => {
                  const isOverdue   = isVisitOverdue(visit);
                  const isFlashing  = flashId === visit.id;
                  const isBusy      = busy === visit.id;
                  const borderColor = VISIT_STATUS_BORDER[visit.status] || '#cbd5e1';

                  return (
                    <div key={visit.id} id={`visit-${visit.id}`}
                      className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-700 ${
                        isFlashing ? 'border-amber-400 ring-2 ring-amber-300 ring-offset-1' : 'border-slate-200'
                      }`}>

                      {/* Barra de título */}
                      <div className="px-4 py-2.5 flex items-center justify-between gap-3"
                        style={{ borderLeft: `4px solid ${borderColor}` }}>
                        <div className="flex items-center gap-3 min-w-0">
                          {visit.visitNumber && (
                            <span className="flex-shrink-0 text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-700">
                              {visit.visitNumber}
                            </span>
                          )}
                          {visit.parentVisitId && (
                            <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">
                              🔧 Soporte
                            </span>
                          )}
                          <span className="font-bold text-slate-800 truncate">{visit.clientName}</span>
                          {visit.serviceOrder && (
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              OS: {visit.serviceOrder}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-1.5 flex-shrink-0 flex-wrap justify-end">
                          {visit.urgency && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${URGENCY_COLORS[visit.urgency] || ''}`}>
                              {visit.urgency}
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                              ⚠️ Atrasada
                            </span>
                          )}
                          {/* Estado progresivo */}
                          <VisitStatusBadge
                            status={visit.status}
                            confirmed={visit.confirmed}
                            size="xs"
                            layout="row"
                          />
                        </div>
                      </div>

                      {/* Cuerpo */}
                      <div className="bg-slate-50/60 text-sm">

                        {/* Banda técnico */}
                        {visit.technician && (
                          <div className="px-4 py-2 border-y border-blue-100 bg-blue-50 flex items-center gap-3 flex-wrap">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest shrink-0 flex items-center gap-1">
                              <UserCheck size={10} /> Técnico
                            </span>
                            <span className="font-semibold text-slate-800">{visit.technician}</span>
                            {tecnicosMap[visit.technician]?.phone && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Phone size={10} className="text-blue-400" />
                                {tecnicosMap[visit.technician].phone}
                              </span>
                            )}
                            {tecnicosMap[visit.technician]?.email && (
                              <span className="text-xs text-slate-400 truncate">✉ {tecnicosMap[visit.technician].email}</span>
                            )}
                          </div>
                        )}

                        {/* Info principal: servicio/tipo/obs + teléfono/dirección */}
                        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">

                          {/* Grupo 1: Servicio + Tipo + Observaciones */}
                          {(visit.serviceType || visit.type || visit.observations) && (
                            <div className="space-y-2">
                              {visit.serviceType && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5 flex items-center gap-1"><Wrench size={10} />Servicio</p>
                                  <p className="font-medium text-slate-700">{visit.serviceType}</p>
                                </div>
                              )}
                              {visit.type && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Tipo</p>
                                  <p className="font-medium text-slate-700">{visit.type}</p>
                                </div>
                              )}
                              {visit.observations && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5 flex items-center gap-1"><FileText size={10} />Observaciones</p>
                                  <p className="text-sm text-slate-600 italic">{visit.observations}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Grupo 2: Teléfono + Dirección */}
                          {(visit.phone || visit.ubicacion || visit.ciudad || visit.address || visit.contactId) && (
                            <div className="space-y-2">
                              {visit.phone && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5 flex items-center gap-1"><Phone size={10} />Teléfono</p>
                                  <p className="font-medium text-slate-700">{visit.phone}</p>
                                </div>
                              )}
                              {(visit.ubicacion || visit.ciudad || visit.address || visit.contactId) && (
                                <div>
                                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5 flex items-center gap-1"><MapPin size={10} />Dirección</p>
                                  {(visit.ubicacion || visit.ciudad) && (
                                    <p className="font-medium text-slate-700 truncate">
                                      {[visit.ubicacion, visit.ciudad].filter(Boolean).join(' · ')}
                                    </p>
                                  )}
                                  {visit.address && (
                                    <p className="text-xs text-slate-500 truncate">{visit.address}</p>
                                  )}
                                  {(() => {
                                    const link = getMapsLink(visit);
                                    if (link) {
                                      return (
                                        <a href={link} target="_blank" rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline">
                                          <Navigation size={10} /> Ver en Maps
                                        </a>
                                      );
                                    }
                                    if (!visit.contactId) return null;
                                    if (editingMapsId === visit.id) {
                                      return (
                                        <div className="mt-1.5 space-y-1">
                                          <div className="flex gap-1">
                                            <input autoFocus type="url" value={mapsInput}
                                              onChange={e => setMapsInput(e.target.value)}
                                              placeholder="Pega el link de Google Maps…"
                                              className="flex-1 text-xs border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 min-w-0" />
                                            <button type="button"
                                              onClick={async () => {
                                                const text = await navigator.clipboard.readText().catch(() => '');
                                                if (text) setMapsInput(text.trim());
                                              }}
                                              title="Pegar"
                                              className="px-1.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500">
                                              <Clipboard size={11} />
                                            </button>
                                          </div>
                                          <div className="flex gap-1">
                                            <button type="button"
                                              disabled={!mapsInput.trim()}
                                              onClick={() => saveMapsLink(visit, mapsInput)}
                                              className="px-2 py-0.5 rounded-lg bg-blue-600 text-white text-[10px] font-bold hover:bg-blue-700 disabled:opacity-40">
                                              Guardar
                                            </button>
                                            <button type="button"
                                              onClick={() => { setEditingMapsId(null); setMapsInput(''); }}
                                              className="px-2 py-0.5 rounded-lg border border-slate-200 text-[10px] text-slate-500 hover:bg-slate-50">
                                              Cancelar
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <button type="button"
                                        onClick={() => {
                                          setEditingMapsId(visit.id);
                                          setMapsInput('');
                                          if (navigator.geolocation) {
                                            navigator.geolocation.getCurrentPosition(
                                              ({ coords }) => { window.open(`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`, '_blank'); },
                                              () => window.open('https://www.google.com/maps', '_blank')
                                            );
                                          } else {
                                            window.open('https://www.google.com/maps', '_blank');
                                          }
                                        }}
                                        className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-slate-400 hover:text-blue-600 transition-colors">
                                        <Navigation size={9} /> Agregar Maps
                                      </button>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Sucursal — campo del sistema */}
                        {visit.establecimientoNombre && (
                          <div className="px-4 py-1.5 border-t border-slate-200 bg-slate-100 flex items-center gap-2">
                            <Building2 size={10} className="text-slate-400 shrink-0" />
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Sistema ·</span>
                            <span className="text-xs font-semibold text-slate-500">{visit.establecimientoNombre}</span>
                          </div>
                        )}

                        {/* Observaciones de cierre + Valor */}
                        {(visit.closingObservations || (visit.visitValue != null && Number(visit.visitValue) > 0)) && (
                          <div className="px-4 py-2 border-t border-slate-200 space-y-1.5">
                            {visit.closingObservations && (
                              <div>
                                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-0.5">✅ Observaciones de cierre</p>
                                <p className="text-sm text-green-700 italic">{visit.closingObservations}</p>
                              </div>
                            )}
                            {visit.visitValue != null && Number(visit.visitValue) > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Valor</p>
                                <p className="font-bold text-emerald-700">${Number(visit.visitValue).toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Cronología */}
                        {(() => {
                          const nameFor = (email) => email ? (emailToName[email] || email.split('@')[0]) : null;
                          const entries = [
                            visit.createdAt ? { icon: '📝', label: 'Creada', ts: formatDateTime(visit.createdAt), user: nameFor(visit.createdBy), cls: 'text-slate-500' } : null,
                            { icon: '📅', label: 'Programada', ts: formatDateOnly(visit.scheduledDate) + (visit.scheduledTime ? ' · ' + visit.scheduledTime : ''), user: null, cls: 'text-blue-600' },
                            (visit.confirmedAt || visit.confirmed) ? { icon: '✓', label: 'Confirmada', ts: visit.confirmedAt ? formatDateTime(visit.confirmedAt) : '—', user: nameFor(visit.confirmedBy), cls: 'text-teal-600' } : null,
                            visit.completedAt ? { icon: '✅', label: 'Realizada', ts: formatDateTime(visit.completedAt), user: nameFor(visit.completedBy), cls: 'text-green-600' } : null,
                            visit.annulledAt ? { icon: '🚫', label: 'Anulada', ts: formatDateTime(visit.annulledAt), user: nameFor(visit.annulledBy), cls: 'text-orange-600' } : null,
                            visit.cancelledAt ? { icon: '❌', label: 'Cancelada', ts: formatDateTime(visit.cancelledAt), user: nameFor(visit.cancelledBy), cls: 'text-amber-600' } : null,
                          ].filter(Boolean);
                          return (
                            <div className="px-4 pb-3 pt-2 border-t border-slate-200">
                              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                                <Clock size={10} /> Cronología
                              </p>
                              <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                                {entries.map((e, i) => (
                                  <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                                    <span className={`w-[4.5rem] font-bold shrink-0 ${e.cls}`}>{e.icon} {e.label}</span>
                                    <span className="text-slate-600 tabular-nums">{e.ts}</span>
                                    {e.user && <span className={`ml-auto font-medium shrink-0 ${e.cls}`}>{e.user}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Acciones */}
                      <div className="px-4 py-2 flex items-center gap-2 flex-wrap bg-white border-t border-slate-100">

                        {/* Acciones de estado */}
                        {visit.status === 'Programada' && (<>
                          {!visit.confirmed && (
                            <button disabled={isBusy}
                              onClick={() => doAction(confirmVisit, visit.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-100 text-teal-700 hover:bg-teal-200 disabled:opacity-40 transition-colors">
                              <UserCheck size={11} /> Confirmar
                            </button>
                          )}
                          <button disabled={isBusy}
                            onClick={() => setCompleteModal(visit)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-40 transition-colors">
                            <CheckCircle2 size={11} /> Realizada
                          </button>
                          <button disabled={isBusy}
                            onClick={() => doAction(cancelVisit, visit.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-40 transition-colors">
                            <XCircle size={11} /> Cancelar
                          </button>
                          <button disabled={isBusy}
                            onClick={() => setAnnulConfirm(visit.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-40 transition-colors">
                            <Ban size={11} /> Anular
                          </button>
                        </>)}

                        {(visit.status === 'Realizada' || visit.status === 'Cancelada') && (
                          <button disabled={isBusy}
                            onClick={() => doAction(revertVisit, visit.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-600 hover:bg-slate-300 disabled:opacity-40 transition-colors">
                            <RotateCcw size={11} /> Revertir
                          </button>
                        )}

                        {/* Soporte */}
                        {visit.status === 'Realizada' && (
                          <button
                            disabled={busy === visit.id + '_support'}
                            onClick={() => onGenerateSupport(visit)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-40 transition-colors">
                            <RefreshCw size={11} /> Generar soporte
                          </button>
                        )}

                        {/* Editar */}
                        <button onClick={() => onEditVisit(visit)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors"
                          style={{ color: '#D61672', borderColor: '#fce7f3', background: 'white' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fdf2f8'}
                          onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                          <Edit2 size={11} /> Editar
                        </button>

                        {/* PDF */}
                        <button onClick={() => printVisitPDF(makeTaskForPDF(visit), visit)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                          <FileText size={11} /> PDF
                        </button>

                        {/* WhatsApp */}
                        <button onClick={() => shareVisitWhatsApp(makeTaskForPDF(visit), visit)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                          📱 WA
                        </button>

                        {/* Eliminar */}
                        <button onClick={() => setDeleteConfirm(visit.id)}
                          className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-red-500 border border-red-200 hover:bg-red-50 transition-colors">
                          <Trash2 size={11} /> Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
