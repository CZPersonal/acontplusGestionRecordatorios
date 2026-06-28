import { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../lib/store';
import { getClientContacts, emptyContact, emptyInstallation } from '../hooks/useClients.js';
import { useTecnicos } from '../hooks/useTecnicos';
import { useTiposVisita } from '../hooks/useTiposVisita';
import {
  X, Search, User, Phone, MapPin, CreditCard, Plus, Wrench,
  ChevronRight, Calendar, Clock, AlertTriangle,
} from 'lucide-react';

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
  const clients           = useAppStore(s => s.clients);
  const handleAddVisit    = useAppStore(s => s.handleAddVisit);
  const handleEditVisit   = useAppStore(s => s.handleEditVisit);
  const addToast          = useAppStore(s => s.addToast);
  const openNewVisit      = useAppStore(s => s.openNewVisit);
  const newVisitDefaults  = useAppStore(s => s.newVisitDefaults);
  const closeNewVisitModal = useAppStore(s => s.closeNewVisitModal);
  const user              = useAppStore(s => s.user);

  const { tecnicos }        = useTecnicos(user);
  const { tiposVisita }     = useTiposVisita(user);

  // isEdit: solo cuando hay un id de Firestore existente con status (visita real, no defaults de soporte)
  const isEdit = !!(initialVisit?.id && initialVisit?.status);

  // ─── Estado del formulario ────────────────────────────────────────────────
  const [client,         setClient]         = useState(null);
  const [selectedContactId, setContactId]   = useState('');
  const [selectedInstId,    setInstId]      = useState('');
  const [isAddingContact,   setAddContact]  = useState(false);
  const [isAddingInst,      setAddInst]     = useState(false);
  const [contactDraft,   setContactDraft]   = useState(emptyContact());
  const [instDraft,      setInstDraft]      = useState(emptyInstallation());

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
  const [isSaving, setIsSaving] = useState(false);

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  // ─── Inicializar si hay defaults o edición ────────────────────────────────
  useEffect(() => {
    const defaults = initialVisit || newVisitDefaults;
    if (!defaults) return;

    if (defaults.clientId) {
      const c = clients.find(cl => cl.id === defaults.clientId);
      if (c) setClient(c);
    }
    if (defaults.contactId)  setContactId(defaults.contactId);
    if (defaults.installationId) setInstId(defaults.installationId);

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

  // Auto-seleccionar si solo hay uno
  useEffect(() => {
    if (contacts.length === 1 && !selectedContactId) setContactId(contacts[0].id);
  }, [contacts, selectedContactId]);
  useEffect(() => {
    if (installations.length === 1 && !selectedInstId) setInstId(installations[0].id);
  }, [installations, selectedInstId]);

  // ─── Guardar contacto nuevo ───────────────────────────────────────────────
  const saveNewContact = () => {
    if (!client) return;
    const updatedClient = {
      ...client,
      contacts: [...getClientContacts(client), contactDraft],
    };
    // Actualizar en BD a través del store
    useAppStore.getState().updateClient(client.id, {
      name:     client.name,
      foreign:  client.foreign ?? false,
      contacts: updatedClient.contacts,
    });
    setClient(updatedClient);
    setContactId(contactDraft.id);
    setContactDraft(emptyContact());
    setAddContact(false);
  };

  // ─── Guardar instalación nueva ────────────────────────────────────────────
  const saveNewInst = () => {
    if (!client || !selectedContact) return;
    const updatedContacts = getClientContacts(client).map(c =>
      c.id === selectedContact.id
        ? { ...c, installations: [...(c.installations || []), instDraft] }
        : c
    );
    const updatedClient = { ...client, contacts: updatedContacts };
    useAppStore.getState().updateClient(client.id, {
      name:     client.name,
      foreign:  client.foreign ?? false,
      contacts: updatedContacts,
    });
    setClient(updatedClient);
    setInstId(instDraft.id);
    setInstDraft(emptyInstallation());
    setAddInst(false);
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

          {/* ── A. Cliente ── */}
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

              {isAddingContact ? (
                <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 space-y-3 bg-blue-50/50">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Nueva ubicación</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['ubicacion', 'Ubicación / Referencia'],
                      ['ciudad',    'Ciudad'],
                      ['address',   'Dirección'],
                      ['phone',     'Teléfono'],
                    ].map(([k, lblText]) => (
                      <div key={k}>
                        <label className={lbl}>{lblText}</label>
                        <input value={contactDraft[k]} onChange={e => setContactDraft(p => ({ ...p, [k]: e.target.value }))}
                          className={inp} />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={saveNewContact}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700">
                      Guardar ubicación
                    </button>
                    <button type="button" onClick={() => setAddContact(false)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => { setContactDraft(emptyContact()); setAddContact(true); }} className={accentBtn}>
                  <Plus size={13} /> Agregar nueva ubicación
                </button>
              )}
            </div>
          )}

          {/* ── C. Instalación / Servicio ── */}
          {selectedContactId && (
            <div>
              <p className={sectionTitle}>
                <Wrench size={16} className="text-amber-500" />
                Instalación / Servicio
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

              {isAddingInst ? (
                <div className="border-2 border-dashed border-amber-200 rounded-xl p-4 space-y-3 bg-amber-50/50">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Nueva instalación</p>
                  <div>
                    <label className={lbl}>Tipo de servicio / equipo</label>
                    <input value={instDraft.serviceType} onChange={e => setInstDraft(p => ({ ...p, serviceType: e.target.value }))}
                      placeholder="Ej: Filtro de agua, Tanque 500L, Bomba sumergible..."
                      className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Observación</label>
                    <input value={instDraft.observacion} onChange={e => setInstDraft(p => ({ ...p, observacion: e.target.value }))}
                      className={inp} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={saveNewInst}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700">
                      Guardar instalación
                    </button>
                    <button type="button" onClick={() => setAddInst(false)}
                      className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => { setInstDraft(emptyInstallation()); setAddInst(true); }} className={accentBtn}>
                  <Plus size={13} /> Agregar instalación
                </button>
              )}
            </div>
          )}

          {/* ── D. Detalles de visita ── */}
          <div>
            <p className={sectionTitle}>
              <Calendar size={16} className="text-slate-500" />
              Detalles de la visita
            </p>
            <div className="grid grid-cols-2 gap-4">

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

              {/* Técnico */}
              <div className="col-span-2">
                <label className={lbl}>Técnico asignado</label>
                <select value={form.technician}
                  onChange={e => {
                    const t = tecnicos.find(tc => tc.name === e.target.value);
                    setF('technician', t?.name || '');
                    setForm(p => ({ ...p, technicianEmail: t?.email || '', technicianPhone: t?.phone || '' }));
                  }}
                  className={inp}>
                  <option value="">— Sin asignar —</option>
                  {tecnicos.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className={lbl}>Tipo de visita</label>
                <select value={form.type} onChange={e => setF('type', e.target.value)} className={inp}>
                  <option value="">— Seleccionar —</option>
                  {tiposVisita.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
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
    </div>
  );
}
