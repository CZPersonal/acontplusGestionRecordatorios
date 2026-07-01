import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../lib/store';
import { getClientContacts } from '../hooks/useClients.js';
import { useTecnicos } from '../hooks/useTecnicos';
import { useTiposVisita } from '../hooks/useTiposVisita';
import { useBorradores } from '../hooks/useBorradores';
import { ClientForm } from './ClientsManager.jsx';
import {
  X, Search, User, Phone, MapPin, CreditCard, Plus, Wrench, Calendar, Building2, Clock, Edit2,
} from 'lucide-react';

// ─── Selector de tipo con botón "+" para crearlo inline ──────────────────────
function ServiceTypeSelector({ value, onChange, serviceTypes, onAdd, className = '' }) {
  const [adding,  setAdding]  = useState(false);
  const [newName, setNewName] = useState('');
  const [saving,  setSaving]  = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const ok = await onAdd({ name: newName.trim(), description: '' });
    if (ok) { onChange(newName.trim()); setNewName(''); setAdding(false); }
    setSaving(false);
  };

  const baseInp = `border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white transition-colors ${className}`;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <select value={value} onChange={e => onChange(e.target.value)} className={`flex-1 ${baseInp}`}>
          <option value="">— Seleccionar tipo —</option>
          {serviceTypes.map(st => <option key={st.id} value={st.name}>{st.name}</option>)}
        </select>
        <button type="button" onClick={() => { setAdding(p => !p); setNewName(''); }}
          title="Crear nuevo tipo"
          className="flex-shrink-0 px-3 py-2.5 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors text-sm font-bold">
          <Plus size={14} />
        </button>
      </div>
      {adding && (
        <div className="flex gap-2 items-center">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } if (e.key === 'Escape') setAdding(false); }}
            placeholder="Nombre del tipo..."
            className="flex-1 border-2 border-amber-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 bg-white" />
          <button type="button" onClick={handleAdd} disabled={saving || !newName.trim()}
            className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {saving ? '...' : 'Crear'}
          </button>
          <button type="button" onClick={() => setAdding(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// ─── Búsqueda de cliente ──────────────────────────────────────────────────────
function ClientPicker({ clients, selected, onSelect, onClear }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const lq = q.toLowerCase();
    return clients.filter(c =>
      c.name?.toLowerCase().includes(lq) ||
      c.identification?.includes(q) ||
      getClientContacts(c)[0]?.phone?.includes(q)
    ).slice(0, 8);
  }, [clients, q]);

  if (selected) {
    const contacts = getClientContacts(selected);
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 rounded-full">
            <User size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">{selected.name}</p>
            <p className="text-xs text-blue-600 font-mono">{selected.identification}</p>
            <p className="text-xs text-slate-400">{contacts.length} ubicación{contacts.length !== 1 ? 'es' : ''}</p>
          </div>
        </div>
        <button type="button" onClick={onClear}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, cédula o teléfono..."
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-pink-400 bg-white"
        />
      </div>
      {open && q.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {results.length > 0 ? (
            <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
              {results.map(c => {
                const fc = getClientContacts(c)[0] || {};
                return (
                  <button key={c.id} type="button"
                    onClick={() => { onSelect(c); setQ(''); setOpen(false); }}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors">
                    <p className="font-semibold text-slate-800 text-sm">{c.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-purple-600 font-mono flex items-center gap-1">
                        <CreditCard size={10} />{c.identification}
                      </span>
                      {fc.phone && <span className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} />{fc.phone}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">Sin resultados</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Formulario principal ─────────────────────────────────────────────────────

export default function VisitFormUnified({ initialVisit, onClose }) {
  const clients            = useAppStore(s => s.clients);
  const serviceTypes                = useAppStore(s => s.serviceTypes);
  const addServiceType              = useAppStore(s => s.addServiceType);
  const handleAddVisit              = useAppStore(s => s.handleAddVisit);
  const handleEditVisit             = useAppStore(s => s.handleEditVisit);
  const addToast                    = useAppStore(s => s.addToast);
  const openNewVisit                = useAppStore(s => s.openNewVisit);
  const newVisitDefaults            = useAppStore(s => s.newVisitDefaults);
  const closeNewVisitModal          = useAppStore(s => s.closeNewVisitModal);
  const user                        = useAppStore(s => s.user);
  const updateClient                = useAppStore(s => s.updateClient);
  const createClient                = useAppStore(s => s.createClient);
  const establecimientos            = useAppStore(s => s.establecimientos);
  const memberEstablecimientos      = useAppStore(s => s.memberEstablecimientos);
  const memberEstablecimientoDefault = useAppStore(s => s.memberEstablecimientoDefault);
  const userRole                    = useAppStore(s => s.userRole);

  const visits                      = useAppStore(s => s.visits);
  const { tecnicos }               = useTecnicos(user);
  const { tipos: tiposVisita = [] } = useTiposVisita(user);
  const { borradores }             = useBorradores(user, { onlyMine: false });

  // isEdit: solo cuando hay un id de Firestore existente con status (visita real, no defaults de soporte)
  const isEdit = !!(initialVisit?.id && initialVisit?.status);

  // ─── Estado del formulario ────────────────────────────────────────────────
  const [client,         setClient]         = useState(null);
  const [selectedContactId, setContactId]   = useState('');
  const [selectedInstId,    setInstId]      = useState('');
  const [showEditClient, setShowEditClient] = useState(false);
  const [showNewClient,  setShowNewClient]  = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const pendingClientIdRef = useRef(null);

  const [form, setForm] = useState({
    scheduledDate:   today(),
    scheduledTime:   '',
    type:            '',
    urgency:         'Media',
    observations:    '',
    technician:      '',
    technicianEmail: '',
    technicianPhone: '',
    serviceOrder:    '',
  });
  const [selectedEstId, setEstId] = useState('');
  const [isSaving, setIsSaving]   = useState(false);

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // ─── Inicializar si hay defaults o edición ────────────────────────────────
  useEffect(() => {
    const defaults = initialVisit || newVisitDefaults;
    if (!defaults) return;

    if (defaults.clientId) {
      const c = clients.find(cl => cl.id === defaults.clientId);
      if (c) setClient(c);
    }
    if (defaults.contactId)       setContactId(defaults.contactId);
    if (defaults.installationId)  setInstId(defaults.installationId);
    if (defaults.establecimientoId) setEstId(defaults.establecimientoId);

    setForm({
      scheduledDate:   defaults.scheduledDate   || today(),
      scheduledTime:   defaults.scheduledTime   || '',
      type:            defaults.type            || '',
      urgency:         defaults.urgency         || 'Media',
      observations:    defaults.observations    || '',
      technician:      defaults.technician      || '',
      technicianEmail: defaults.technicianEmail || '',
      technicianPhone: defaults.technicianPhone || '',
      serviceOrder:    defaults.serviceOrder    || '',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Derivaciones ─────────────────────────────────────────────────────────
  const contacts = client ? getClientContacts(client) : [];
  const selectedContact = contacts.find(c => c.id === selectedContactId) || null;
  const installations = selectedContact?.installations || [];
  const selectedInst  = installations.find(i => i.id === selectedInstId) || null;

  // Establecimientos visibles: admin ve todos, técnico solo los asignados
  const visibleEstablecimientos = useMemo(() => {
    if (userRole === 'admin' || memberEstablecimientos.length === 0) return establecimientos;
    return establecimientos.filter(e => memberEstablecimientos.includes(e.id));
  }, [establecimientos, memberEstablecimientos, userRole]);

  // Pre-seleccionar establecimiento por defecto al abrir en modo creación
  useEffect(() => {
    if (isEdit || selectedEstId) return;
    if (memberEstablecimientoDefault) setEstId(memberEstablecimientoDefault);
    else if (visibleEstablecimientos.length === 1) setEstId(visibleEstablecimientos[0].id);
  }, [memberEstablecimientoDefault, visibleEstablecimientos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-seleccionar si solo hay uno
  useEffect(() => {
    if (contacts.length === 1 && !selectedContactId) setContactId(contacts[0].id);
  }, [contacts, selectedContactId]);
  useEffect(() => {
    if (installations.length === 1 && !selectedInstId) setInstId(installations[0].id);
  }, [installations, selectedInstId]);

  // ─── Índice de IDs existentes (para validación en ClientForm) ────────────
  const existingIds = useMemo(
    () => new Set(clients.map(c => c.identification?.replace(/\s/g, '')).filter(Boolean)),
    [clients]
  );

  // ─── Sincronizar cliente local cuando el store se actualiza ──────────────
  useEffect(() => {
    // Refrescar cliente editado
    if (client?.id) {
      const fresh = clients.find(c => c.id === client.id);
      if (fresh) setClient(fresh);
    }
    // Asignar cliente recién creado en cuanto aparezca en el store
    if (pendingClientIdRef.current) {
      const newClient = clients.find(c => c.id === pendingClientIdRef.current);
      if (newClient) {
        setClient(newClient);
        setContactId('');
        setInstId('');
        pendingClientIdRef.current = null;
      }
    }
  }, [clients]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Guardar edición de cliente ───────────────────────────────────────────
  const handleEditClientSave = async (formData) => {
    if (!client) return;
    setIsSavingClient(true);
    await updateClient(client.id, formData);
    setIsSavingClient(false);
    setShowEditClient(false);
  };

  // ─── Guardar nuevo cliente y asignarlo ────────────────────────────────────
  const handleNewClientSave = async (formData) => {
    setIsSavingClient(true);
    const ok = await createClient(formData);
    if (ok) {
      const clientId = formData.identification?.replace(/\s/g, '');
      // Intentar asignar de inmediato (si el listener ya actualizó el store)
      const fresh = useAppStore.getState().clients.find(c => c.id === clientId);
      if (fresh) {
        setClient(fresh);
        setContactId('');
        setInstId('');
      } else {
        // Si aún no llegó, esperar al useEffect que vigila clients
        pendingClientIdRef.current = clientId;
      }
      setShowNewClient(false);
    }
    setIsSavingClient(false);
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!client) {
      addToast({ type: 'warning', title: '⚠️ Cliente requerido', body: 'Selecciona un cliente para la visita.' });
      return;
    }
    if (!selectedContactId && contacts.length > 0) {
      addToast({ type: 'warning', title: '⚠️ Ubicación requerida', body: 'Selecciona una ubicación para la visita.' });
      return;
    }

    setIsSaving(true);

    const selectedEst = visibleEstablecimientos.find(e => e.id === selectedEstId) || null;

    const visitData = {
      // Referencias
      clientId:       client.id,
      contactId:      selectedContactId || null,
      installationId: selectedInstId    || null,
      // Snapshot de display
      clientName:  client.name,
      serviceType: selectedInst?.serviceType || form.type || '',
      address:     selectedContact?.address  || '',
      ubicacion:   selectedContact?.ubicacion || '',
      ciudad:      selectedContact?.ciudad    || '',
      phone:       selectedContact?.phone     || '',
      clientEmail: selectedContact?.email    || '',
      // Establecimiento
      establecimientoId:     selectedEst?.id     || null,
      establecimientoNombre: selectedEst?.nombre || '',
      // Datos de visita
      ...form,
      parentVisitId: initialVisit?.parentVisitId || null,
    };

    let ok = false;
    if (isEdit) {
      ok = await handleEditVisit(initialVisit.id, visitData);
    } else {
      ok = await handleAddVisit(visitData);
    }

    setIsSaving(false);
    if (ok) {
      closeNewVisitModal();
      if (onClose) onClose();
    }
  };

  // ─── Agenda del técnico en la fecha seleccionada ─────────────────────────
  const tecnicoAgenda = useMemo(() => {
    if (!form.technician || !form.scheduledDate) return null;
    const visitas = visits.filter(v =>
      v.technician === form.technician &&
      v.scheduledDate === form.scheduledDate &&
      (v.status === 'Programada' || v.status === 'Confirmada') &&
      (!isEdit || v.id !== initialVisit?.id)
    ).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
    const borraDia = borradores.filter(b =>
      b.technicianName === form.technician &&
      b.scheduledDate === form.scheduledDate &&
      !b.convertedAt
    ).sort((a, b) => (a.scheduledTime || '').localeCompare(b.scheduledTime || ''));
    if (!visitas.length && !borraDia.length) return null;
    return { visitas, borradores: borraDia };
  }, [form.technician, form.scheduledDate, visits, borradores, isEdit, initialVisit?.id]);

  // ─── Estilos comunes ──────────────────────────────────────────────────────
  const inp   = "w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pink-400 bg-white transition-colors";
  const lbl   = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5";
  const sectionTitle = "text-sm font-bold text-slate-700 mb-3 flex items-center gap-2";
  const accentBtn = "flex items-center gap-1.5 text-xs font-semibold text-pink-600 hover:text-pink-800 py-1 px-2 rounded-lg hover:bg-pink-50 transition-colors";

  const URGENCY = {
    Alta:  { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
    Media: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
    Baja:  { color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { closeNewVisitModal(); onClose?.(); }} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {isEdit ? 'Editar visita' : initialVisit?.parentVisitId ? '🔧 Visita de soporte' : 'Nueva visita'}
            </h2>
            {initialVisit?.parentVisitId && (
              <p className="text-xs text-slate-400 mt-0.5">Generada desde visita #{initialVisit.parentVisitId.slice(-6)}</p>
            )}
          </div>
          <button type="button" onClick={() => { closeNewVisitModal(); onClose?.(); }}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── A. Establecimiento / Sucursal ── */}
          {visibleEstablecimientos.length > 0 && (
            <div>
              <p className={sectionTitle}>
                <Building2 size={16} className="text-cyan-500" />
                Establecimiento / Sucursal
              </p>
              <select value={selectedEstId} onChange={e => setEstId(e.target.value)} className={inp}>
                <option value="">— Sin especificar —</option>
                {visibleEstablecimientos.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}{e.codigo ? ` (${e.codigo})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── B. Cliente ── */}
          <div>
            <p className={sectionTitle}>
              <User size={16} className="text-pink-500" />
              Cliente
            </p>
            <ClientPicker
              clients={clients}
              selected={client}
              onSelect={(c) => { setClient(c); setContactId(''); setInstId(''); }}
              onClear={() => { setClient(null); setContactId(''); setInstId(''); }}
            />
            <div className="mt-2 flex items-center gap-2">
              {client ? (
                <button type="button" onClick={() => setShowEditClient(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 py-1 px-2 rounded-lg hover:bg-indigo-50 transition-colors">
                  <Edit2 size={13} /> Editar cliente
                </button>
              ) : (
                <button type="button" onClick={() => setShowNewClient(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-pink-600 hover:text-pink-800 py-1 px-2 rounded-lg hover:bg-pink-50 transition-colors">
                  <Plus size={13} /> Nuevo cliente
                </button>
              )}
            </div>
          </div>

          {/* ── B. Ubicación / Contacto ── */}
          {client && (
            <div>
              <p className={sectionTitle}>
                <MapPin size={16} className="text-blue-500" />
                Ubicación
              </p>

              {contacts.length > 0 && (
                <div className="space-y-2 mb-3">
                  {contacts.map(c => (
                    <label key={c.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        selectedContactId === c.id
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}>
                      <input type="radio" name="contact" value={c.id}
                        checked={selectedContactId === c.id}
                        onChange={() => { setContactId(c.id); setInstId(''); }}
                        className="mt-0.5 accent-blue-500" />
                      <div className="min-w-0">
                        {c.ubicacion && <p className="font-semibold text-slate-800 text-sm">{c.ubicacion}</p>}
                        {c.ciudad    && <p className="text-xs text-slate-500">{c.ciudad}</p>}
                        {c.address   && <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} />{c.address}</p>}
                        {c.phone     && <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} />{c.phone}</p>}
                        {!c.ubicacion && !c.ciudad && !c.address && (
                          <p className="text-xs text-slate-400 italic">Sin datos de ubicación</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ── C. Instalación / Servicio ── */}
          {selectedContactId && (
            <div>
              <p className={sectionTitle}>
                <Wrench size={16} className="text-amber-500" />
                Equipo / Instalación / Servicio
              </p>

              {installations.length > 0 && (
                <div className="space-y-2 mb-3">
                  {installations.map(inst => (
                    <label key={inst.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        selectedInstId === inst.id
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}>
                      <input type="radio" name="installation" value={inst.id}
                        checked={selectedInstId === inst.id}
                        onChange={() => setInstId(inst.id)}
                        className="mt-0.5 accent-amber-500" />
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{inst.serviceType || 'Sin tipo'}</p>
                        {inst.observacion && <p className="text-xs text-slate-400">{inst.observacion}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ── E. Detalles de visita ── */}
          <div>
            <p className={sectionTitle}>
              <Calendar size={16} className="text-slate-500" />
              Detalles de la visita
            </p>
            <div className="grid grid-cols-2 gap-4">

              {/* Técnico — primero para poder mostrar la agenda */}
              <div className="col-span-2">
                <label className={lbl}>Técnico asignado</label>
                <select value={form.technician}
                  onChange={e => {
                    const t = tecnicos.find(tc => tc.nombre === e.target.value);
                    setF('technician', t?.nombre || '');
                    setForm(p => ({ ...p, technicianEmail: t?.email || '', technicianPhone: t?.phone || '' }));
                  }}
                  className={inp}>
                  <option value="">— Sin asignar —</option>
                  {tecnicos.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                </select>
              </div>

              {/* Panel de ocupación del técnico */}
              {tecnicoAgenda && (
                <div className="col-span-2 rounded-xl border-2 border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                    <Clock size={13} />
                    Ocupaciones en esta fecha — {tecnicoAgenda.visitas.length + tecnicoAgenda.borradores.length} registro{tecnicoAgenda.visitas.length + tecnicoAgenda.borradores.length !== 1 ? 's' : ''}
                  </p>
                  <div className="space-y-1.5">
                    {tecnicoAgenda.visitas.map(v => (
                      <div key={v.id} className="flex items-center gap-2 text-xs bg-white rounded-lg px-2.5 py-1.5 border border-amber-100">
                        <span className="font-mono text-slate-500 w-12 shrink-0">{v.scheduledTime || '—:——'}</span>
                        <span className="font-semibold text-slate-700 truncate flex-1">{v.clientName || 'Sin cliente'}</span>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${v.status === 'Confirmada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {v.status}
                        </span>
                      </div>
                    ))}
                    {tecnicoAgenda.borradores.map(b => (
                      <div key={b.id} className="flex items-center gap-2 text-xs bg-white rounded-lg px-2.5 py-1.5 border border-amber-100">
                        <span className="font-mono text-slate-500 w-12 shrink-0">{b.scheduledTime || '—:——'}</span>
                        <span className="font-semibold text-slate-700 truncate flex-1">{b.clientName || 'Sin cliente'}</span>
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                          Borrador
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fecha */}
              <div>
                <label className={lbl}>Fecha programada *</label>
                <input type="date" required value={form.scheduledDate}
                  onChange={e => setF('scheduledDate', e.target.value)} className={inp} />
              </div>

              {/* Hora */}
              <div>
                <label className={lbl}>Hora (opcional)</label>
                <input type="time" value={form.scheduledTime}
                  onChange={e => setF('scheduledTime', e.target.value)} className={inp} />
              </div>

              {/* Tipo */}
              <div>
                <label className={lbl}>Tipo de visita</label>
                <select value={form.type} onChange={e => setF('type', e.target.value)} className={inp}>
                  <option value="">— Seleccionar —</option>
                  {tiposVisita.map(t => <option key={t.id} value={t.nombre}>{t.nombre}</option>)}
                </select>
              </div>

              {/* Urgencia */}
              <div>
                <label className={lbl}>Urgencia</label>
                <div className="flex gap-2">
                  {Object.entries(URGENCY).map(([level, cfg]) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setF('urgency', level)}
                      style={form.urgency === level
                        ? { background: cfg.bg, borderColor: cfg.border, color: cfg.color }
                        : {}}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${
                        form.urgency === level ? '' : 'border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}>
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orden de servicio */}
              <div className="col-span-2">
                <label className={lbl}>N° Orden de servicio (opcional)</label>
                <input value={form.serviceOrder} onChange={e => setF('serviceOrder', e.target.value)}
                  placeholder="Ej: OS-2024-001"
                  className={inp} />
              </div>

              {/* Observaciones */}
              <div className="col-span-2">
                <label className={lbl}>Observaciones</label>
                <textarea
                  value={form.observations}
                  onChange={e => setF('observations', e.target.value)}
                  rows={3}
                  placeholder="Descripción del trabajo a realizar, notas previas..."
                  className={`${inp} resize-none`}
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex gap-3">
          <button type="button"
            onClick={() => { closeNewVisitModal(); onClose?.(); }}
            className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || !client}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-50"
            style={{ background: isSaving ? '#94a3b8' : '#D61672' }}>
            {isSaving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear visita'}
          </button>
        </div>
      </div>

      {/* ── Modal editar cliente ── */}
      {showEditClient && client && (
        <div className="absolute inset-0 z-10 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm rounded-2xl p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full">
            <ClientForm
              initial={client}
              onSave={handleEditClientSave}
              onCancel={() => setShowEditClient(false)}
              isLoading={isSavingClient}
              existingIds={existingIds}
              allClients={clients}
              onActivateExisting={() => {}}
            />
          </div>
        </div>
      )}

      {/* ── Modal nuevo cliente ── */}
      {showNewClient && (
        <div className="absolute inset-0 z-10 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm rounded-2xl p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full">
            <ClientForm
              initial={null}
              onSave={handleNewClientSave}
              onCancel={() => setShowNewClient(false)}
              isLoading={isSavingClient}
              existingIds={existingIds}
              allClients={clients}
              onActivateExisting={async (clientId) => {
                const existing = clients.find(c => c.id === clientId);
                if (existing) { setClient(existing); setContactId(''); setInstId(''); }
                setShowNewClient(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
