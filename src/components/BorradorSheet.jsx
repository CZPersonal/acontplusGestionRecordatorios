import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, X, User, Hash, MapPin, Phone, Mail, Calendar, Clock,
  FileText, ChevronDown, Pencil, CheckCircle2, Loader2, AlertCircle,
  Search, Ban, Wrench, UserPlus,
} from 'lucide-react';
import { useBorradores } from '../hooks/useBorradores';
import { useTecnicos } from '../hooks/useTecnicos';
import { useAppStore } from '../lib/store';
import { getClientContacts } from '../hooks/useClients.js';
import { ClientForm } from './ClientsManager.jsx';
import { formatDateOnly, formatDateTime } from '../utils/dates.js';

function localToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
}

const EMPTY_FORM = {
  clientName:    '',
  clientIdNumber:'',
  clientAddress: '',
  clientPhone:   '',
  clientEmail:   '',
  scheduledDate: localToday(),
  scheduledTime: '',
  motivo:        '',
};

// ─── Modal: crear nuevo cliente desde el borrador ─────────────────────────────

function ClientCreateModal({ onClose, onClientCreated }) {
  const clients      = useAppStore(s => s.clients);
  const createClient = useAppStore(s => s.createClient);
  const addToast     = useAppStore(s => s.addToast);
  const [saving, setSaving] = useState(false);

  const existingIds = useMemo(
    () => new Set(clients.map(c => c.identification?.replace(/\s/g, '')).filter(Boolean)),
    [clients]
  );

  const handleSave = async (data) => {
    setSaving(true);
    const ok = await createClient(data);
    setSaving(false);
    if (ok) {
      addToast({ type: 'success', title: '✅ Cliente creado', body: `${data.name} registrado correctamente.` });
      const clientId = data.identification?.replace(/\s/g, '');
      onClientCreated({
        id:             clientId,
        name:           data.name,
        identification: data.identification,
        foreign:        data.foreign ?? false,
        contacts:       data.contacts || [],
        active:         true,
      });
    } else {
      addToast({ type: 'error', title: '❌ Error', body: 'No se pudo crear el cliente.' });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: '95vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" />
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-base font-bold text-slate-800">Nuevo cliente</p>
            <p className="text-xs text-slate-400 mt-0.5">Completa los datos del cliente</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ClientForm
            initial={null}
            onSave={handleSave}
            onCancel={onClose}
            isLoading={saving}
            existingIds={existingIds}
            allClients={clients}
            onActivateExisting={() => {}}
            noBorder
          />
        </div>
      </div>
    </div>
  );
}

// ─── Formulario (reutilizado para crear y editar) ─────────────────────────────

function BorradorForm({ initial, onSave, onClose, isEdit, isLoading, userEmail, borradores }) {
  const [form, setForm] = useState(initial || { ...EMPTY_FORM, scheduledDate: localToday() });
  const [errors, setErrors] = useState({});
  const tasks   = useAppStore(s => s.tasks);
  const clients = useAppStore(s => s.clients);

  // Estado de cliente seleccionado
  const [selectedClientId,  setSelectedClientId]  = useState(initial?.clientId  || null);
  const [selectedContactId, setSelectedContactId] = useState(initial?.contactId || null);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  // Buscador
  const [clientSearch,    setClientSearch]    = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // ── Datos derivados del cliente seleccionado ──
  const selectedClient = useMemo(
    () => selectedClientId ? clients.find(c => c.id === selectedClientId) : null,
    [clients, selectedClientId]
  );
  const clientContacts = useMemo(
    () => selectedClient ? getClientContacts(selectedClient) : [],
    [selectedClient]
  );
  const selectedContact = useMemo(
    () => selectedContactId ? clientContacts.find(c => c.id === selectedContactId) : null,
    [clientContacts, selectedContactId]
  );

  // Sugerencias: busca también en los teléfonos de las ubicaciones
  const suggestions = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return clients
      .filter(c => c.active !== false)
      .filter(c =>
        (c.name           || '').toLowerCase().includes(q) ||
        (c.identification || '').toLowerCase().includes(q) ||
        getClientContacts(c).some(ct => ct.phone?.includes(q))
      )
      .slice(0, 6);
  }, [clients, clientSearch]);

  // ── Aplicar datos de un contacto al formulario ──
  const applyContact = (contact) => {
    setForm(prev => ({
      ...prev,
      clientPhone:   contact.phone || '',
      clientEmail:   contact.email || '',
      clientAddress: [contact.ubicacion, contact.ciudad, contact.address].filter(Boolean).join(' · ') || '',
    }));
  };

  const selectContact = (contact) => {
    setSelectedContactId(contact.id);
    applyContact(contact);
  };

  // ── Al elegir cliente del buscador ──
  const selectClient = (c) => {
    const contacts = getClientContacts(c);
    setSelectedClientId(c.id);
    setForm(prev => ({
      ...prev,
      clientName:     c.name           || '',
      clientIdNumber: c.identification || '',
    }));
    if (contacts.length === 1) {
      setSelectedContactId(contacts[0].id);
      applyContact(contacts[0]);
    } else {
      setSelectedContactId(null);
      setForm(prev => ({ ...prev, clientPhone: '', clientEmail: '', clientAddress: '' }));
    }
    setErrors(prev => ({ ...prev, clientName: null }));
    setClientSearch('');
    setShowSuggestions(false);
  };

  // ── Auto-refresh: cuando el admin edita el cliente, actualiza los campos ──
  useEffect(() => {
    if (!selectedClientId) return;
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    setForm(prev => ({ ...prev, clientName: client.name || prev.clientName }));
    if (!selectedContactId) return;
    const contact = getClientContacts(client).find(c => c.id === selectedContactId);
    if (!contact) return;
    setForm(prev => ({
      ...prev,
      clientPhone:   contact.phone || prev.clientPhone,
      clientEmail:   contact.email || prev.clientEmail,
      clientAddress: [contact.ubicacion, contact.ciudad, contact.address].filter(Boolean).join(' · ') || prev.clientAddress,
    }));
  }, [clients, selectedClientId, selectedContactId]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Visitas propias programadas para el día seleccionado
  const visitasDelDia = useMemo(() => {
    if (!form.scheduledDate || !userEmail) return [];
    const lista = [];
    tasks.forEach(task => {
      (task.visits || []).forEach(visit => {
        const esMia = visit.technicianEmail === userEmail || visit.technician === userEmail;
        const activa = visit.status === 'Programada' || visit.status === 'Confirmada';
        const esHoy  = visit.scheduledDate === form.scheduledDate;
        if (esMia && activa && esHoy) lista.push({ visit, task });
      });
    });
    return lista.sort((a, b) =>
      (a.visit.scheduledTime || '99:99').localeCompare(b.visit.scheduledTime || '99:99')
    );
  }, [tasks, form.scheduledDate, userEmail]);

  // Borradores propios pendientes para el día seleccionado
  const borradoresDelDia = useMemo(() => {
    if (!form.scheduledDate) return [];
    return (borradores || []).filter(b =>
      b.scheduledDate === form.scheduledDate &&
      b.status === 'Pendiente' &&
      b.id !== initial?.id
    ).sort((a, b) => (a.scheduledTime || '99:99').localeCompare(b.scheduledTime || '99:99'));
  }, [borradores, form.scheduledDate, initial?.id]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.clientName.trim()) e.clientName = 'Requerido';
    if (!form.scheduledDate)     e.scheduledDate = 'Requerido';
    if (!form.motivo.trim())     e.motivo = 'Requerido';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const ok = await onSave({
      clientId:       selectedClientId  || null,
      contactId:      selectedContactId || null,
      clientName:     form.clientName.trim(),
      clientIdNumber: form.clientIdNumber.trim(),
      clientAddress:  form.clientAddress.trim(),
      clientPhone:    form.clientPhone.trim(),
      clientEmail:    form.clientEmail.trim().toLowerCase(),
      scheduledDate:  form.scheduledDate,
      scheduledTime:  form.scheduledTime,
      motivo:         form.motivo.trim(),
    });
    if (ok) onClose();
  };

  const handleTimeInput = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
    set('scheduledTime', formatted);
  };

  const inp = (hasErr) =>
    `w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors bg-white ${
      hasErr ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-pink-400'
    }`;
  const lbl = 'block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5';

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">

        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-slate-100">
          <div>
            <p className="text-base font-bold text-slate-800">
              {isEdit ? 'Editar borrador' : 'Nuevo borrador de visita'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEdit ? 'Modifica los datos del borrador' : 'El administrador lo convertirá en visita formal'}
            </p>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Campos scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Sección cliente ── */}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Datos del cliente</p>

          {/* Fila: buscador + botón nuevo cliente */}
          <div className="flex gap-2 items-end">
            <div ref={searchRef} className="relative flex-1">
              <label className={lbl}>Buscar cliente existente</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => { if (clientSearch.trim().length >= 2) setShowSuggestions(true); }}
                  placeholder="Nombre, cédula o teléfono…"
                  className="w-full pl-9 pr-8 py-3 text-sm border-2 border-slate-200 rounded-xl focus:outline-none focus:border-pink-400 transition-colors bg-white"
                />
                {clientSearch && (
                  <button type="button"
                    onClick={() => { setClientSearch(''); setShowSuggestions(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Dropdown sugerencias */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-pink-200 rounded-2xl shadow-xl overflow-hidden">
                  {suggestions.map(c => {
                    const contacts = getClientContacts(c);
                    const mainPhone = contacts[0]?.phone || c.phone || '';
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => selectClient(c)}
                        className="w-full px-4 py-3 text-left hover:bg-pink-50 transition-colors border-b border-slate-100 last:border-0"
                      >
                        <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {c.identification && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Hash size={10} />{c.identification}
                            </span>
                          )}
                          {mainPhone && (
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Phone size={10} />{mainPhone}
                            </span>
                          )}
                          {contacts.length > 1 && (
                            <span className="text-xs font-semibold text-blue-500">
                              {contacts.length} ubicaciones
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {showSuggestions && clientSearch.trim().length >= 2 && suggestions.length === 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-slate-200 rounded-2xl shadow-xl px-4 py-3">
                  <p className="text-sm text-slate-400">Sin resultados para "{clientSearch}"</p>
                </div>
              )}
            </div>

            {/* Botón nuevo cliente */}
            <button
              type="button"
              onClick={() => setShowNewClientModal(true)}
              title="Crear nuevo cliente"
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3 rounded-xl text-xs font-bold text-white transition-opacity active:opacity-80 mb-0"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}
            >
              <UserPlus size={15} />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          </div>

          {/* ── Selector de ubicación (cuando hay múltiples contactos) ── */}
          {selectedClient && clientContacts.length > 1 && (
            <div>
              <label className={`${lbl} text-blue-600`}>
                <MapPin size={11} className="inline mr-1" />
                Selecciona la ubicación
              </label>
              <div className="space-y-2">
                {clientContacts.map(contact => {
                  const summary = [contact.ubicacion, contact.ciudad].filter(Boolean).join(' · ')
                    || contact.address || 'Ubicación sin nombre';
                  const isSelected = selectedContactId === contact.id;
                  return (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => selectContact(contact)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-pink-400 bg-pink-50 shadow-sm'
                          : 'border-slate-200 hover:border-pink-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          isSelected ? 'border-pink-500 bg-pink-500' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{summary}</p>
                          {contact.phone && (
                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                              <Phone size={9} />{contact.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Equipos de esta ubicación como chips */}
                      {contact.installations?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pl-6">
                          {contact.installations.map(inst => (
                            <span key={inst.id}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              <Wrench size={8} />{inst.serviceType || 'Equipo'}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Instalaciones de la ubicación seleccionada (cliente con 1 sola ubicación) ── */}
          {selectedContact && selectedContact.installations?.length > 0 && clientContacts.length === 1 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Wrench size={11} /> Equipos / Servicios en esta ubicación
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedContact.installations.map(inst => (
                  <div key={inst.id}
                    className="flex items-start gap-1.5 px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg">
                    <Wrench size={10} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800 leading-tight">
                        {inst.serviceType || 'Sin tipo'}
                      </p>
                      {inst.observacion && (
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{inst.observacion}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Campos del cliente (editables manualmente) ── */}
          <div>
            <label className={lbl}>Nombre y apellido <span className="text-red-400">*</span></label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={form.clientName} onChange={e => set('clientName', e.target.value)}
                placeholder="Ej. Juan Pérez García" autoFocus
                className={`${inp(errors.clientName)} pl-9`} />
            </div>
            {errors.clientName && <p className="text-xs text-red-600 mt-1">⚠️ {errors.clientName}</p>}
          </div>

          <div>
            <label className={lbl}>Cédula / RUC</label>
            <div className="relative">
              <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={form.clientIdNumber} onChange={e => set('clientIdNumber', e.target.value)}
                placeholder="0000000000"
                className={`${inp(false)} pl-9`} />
            </div>
          </div>

          <div>
            <label className={lbl}>Dirección</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-3.5 text-slate-400" />
              <textarea value={form.clientAddress} onChange={e => set('clientAddress', e.target.value)}
                placeholder="Calle, número, sector…" rows={2}
                className={`${inp(false)} pl-9 resize-none`} />
            </div>
          </div>

          <div>
            <label className={lbl}>Teléfono</label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="tel" value={form.clientPhone} onChange={e => set('clientPhone', e.target.value)}
                placeholder="09XXXXXXXX"
                className={`${inp(false)} pl-9`} />
            </div>
          </div>

          <div>
            <label className={lbl}>Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" value={form.clientEmail} onChange={e => set('clientEmail', e.target.value)}
                placeholder="correo@ejemplo.com"
                className={`${inp(false)} pl-9`} />
            </div>
          </div>

          {/* ── Sección visita ── */}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pt-2">Visita</p>

          <div>
            <label className={lbl}>Fecha <span className="text-red-400">*</span></label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="date" value={form.scheduledDate} onChange={e => set('scheduledDate', e.target.value)}
                required className={`${inp(errors.scheduledDate)} pl-9`} />
            </div>
            {errors.scheduledDate && <p className="text-xs text-red-600 mt-1">⚠️ {errors.scheduledDate}</p>}
          </div>

          {/* Mini-agenda del día */}
          {form.scheduledDate && (
            visitasDelDia.length === 0 && borradoresDelDia.length === 0 ? (
              <div className="rounded-xl px-3 py-2.5 border bg-green-50 border-green-200">
                <p className="text-xs font-bold text-green-700 flex items-center gap-1.5">
                  <CheckCircle2 size={12} />Día libre — sin visitas ni borradores
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                {visitasDelDia.length > 0 && (
                  <div className="bg-amber-50 border-b border-amber-100">
                    <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
                      <AlertCircle size={12} />Visitas programadas — {visitasDelDia.length}
                    </p>
                    <div className="space-y-1 px-3 pb-2.5">
                      {visitasDelDia.map(({ visit, task }) => (
                        <div key={visit.id || task.id + visit.scheduledTime}
                          className="flex items-center gap-2 text-xs text-amber-800">
                          <span className="font-bold w-10 flex-shrink-0">{visit.scheduledTime || 'S/H'}</span>
                          <span className="truncate">{task.clientName}</span>
                          {visit.confirmed && (
                            <span className="flex-shrink-0 font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {borradoresDelDia.length > 0 && (
                  <div className="bg-blue-50">
                    <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5 px-3 pt-2.5 pb-1.5">
                      <FileText size={12} />Borradores pendientes — {borradoresDelDia.length}
                    </p>
                    <div className="space-y-1 px-3 pb-2.5">
                      {borradoresDelDia.map(b => (
                        <div key={b.id} className="flex items-center gap-2 text-xs text-blue-800">
                          <span className="font-bold w-10 flex-shrink-0">{b.scheduledTime || 'S/H'}</span>
                          <span className="truncate">{b.clientName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          <div>
            <label className={lbl}>Hora <span className="text-slate-400 font-normal normal-case">(Ej. 10:30)</span></label>
            <div className="relative">
              <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={form.scheduledTime} onChange={handleTimeInput}
                placeholder="10:30" inputMode="numeric" maxLength={5}
                className={`${inp(false)} pl-9`} />
            </div>
          </div>

          <div>
            <label className={lbl}>Motivo de la visita <span className="text-red-400">*</span></label>
            <div className="relative">
              <FileText size={14} className="absolute left-3 top-3.5 text-slate-400" />
              <textarea value={form.motivo} onChange={e => set('motivo', e.target.value)}
                placeholder="Describe brevemente el motivo o trabajo a realizar…" rows={3}
                className={`${inp(errors.motivo)} pl-9 resize-none`} />
            </div>
            {errors.motivo && <p className="text-xs text-red-600 mt-1">⚠️ {errors.motivo}</p>}
          </div>

        </div>

        {/* Botones */}
        <div className="flex gap-3 px-5 py-4 border-t border-slate-100 flex-shrink-0">
          <button type="button" onClick={onClose} disabled={isLoading}
            className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={isLoading}
            className="flex-1 py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
            style={{ background: isLoading ? '#f9a8d4' : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
            {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {isLoading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar borrador'}
          </button>
        </div>
      </form>

      {/* Modal crear nuevo cliente */}
      {showNewClientModal && (
        <ClientCreateModal
          onClose={() => setShowNewClientModal(false)}
          onClientCreated={(client) => {
            setShowNewClientModal(false);
            if (client) selectClient(client);
          }}
        />
      )}
    </>
  );
}

// ─── Tarjeta de borrador (lista del técnico) ──────────────────────────────────

function BorradorCard({ b, onEdit, onAnular }) {
  const isPendiente  = b.status === 'Pendiente';
  const isAnulado    = b.status === 'Anulado';
  const isOffline    = b._pending === true;
  const [confirmAnular, setConfirmAnular] = useState(false);

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${
      isPendiente ? 'border-amber-200 bg-amber-50'
      : isAnulado  ? 'border-red-200 bg-red-50'
      : 'border-slate-200 bg-white'
    }`}>
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{b.clientName}</p>
            {b.clientPhone && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone size={10} className="flex-shrink-0" />{b.clientPhone}
              </p>
            )}
          </div>
          <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
            isPendiente ? 'bg-amber-200 text-amber-800'
            : isAnulado  ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
          }`}>
            {isPendiente ? '⏳ Pendiente' : isAnulado ? '🚫 Anulado' : '✅ Convertido'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {b.scheduledDate && (
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar size={10} className="flex-shrink-0" />
              {formatDateOnly(b.scheduledDate)}
              {b.scheduledTime && ` ${b.scheduledTime}`}
            </span>
          )}
        </div>
        {b.motivo && (
          <p className="text-xs text-slate-500 italic mt-1 line-clamp-2">📝 {b.motivo}</p>
        )}
        {b.status === 'Convertido' && b.convertedAt && (
          <p className="text-xs text-green-600 mt-1.5">
            Convertido el {formatDateTime(b.convertedAt)} por {b.convertedBy}
          </p>
        )}
        {isAnulado && b.anuladoAt && (
          <p className="text-xs text-red-600 mt-1.5">
            Anulado el {formatDateTime(b.anuladoAt)} por {b.anuladoPor}
          </p>
        )}
      </div>
      {isPendiente && (
        <div className="px-4 pb-3">
          {isOffline ? (
            <p className="text-xs text-slate-400 flex items-center gap-1">
              📶 Sin conexión — se enviará cuando haya internet
            </p>
          ) : confirmAnular ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-red-700">¿Confirmar anulación?</span>
              <button onClick={() => { onAnular(b); setConfirmAnular(false); }}
                className="text-xs font-bold text-white bg-red-600 px-2.5 py-1 rounded-lg">
                Sí
              </button>
              <button onClick={() => setConfirmAnular(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700">
                No
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button onClick={() => onEdit(b)}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors">
                <Pencil size={12} />Editar borrador
              </button>
              <button onClick={() => setConfirmAnular(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors">
                <Ban size={12} />Anular
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal exportado ──────────────────────────────────────────

export default function BorradorSheet({ user, showList = false }) {
  const { borradores, isLoading, addBorrador, updateBorrador, anuladoBorrador } = useBorradores(user, { onlyMine: true });
  const { tecnicos }  = useTecnicos(user);
  const saveClient    = useAppStore(s => s.saveClient);
  const addToast      = useAppStore(s => s.addToast);

  const technicianName = useMemo(
    () => tecnicos.find(t => t.email === user.email)?.nombre || user.displayName || user.email,
    [tecnicos, user.email, user.displayName]
  );

  const [open,         setOpen]         = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter,   setDateFilter]   = useState('');

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') closeSheet(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const openNew  = ()  => { setEditing(null); setOpen(true); };
  const openEdit = (b) => { setEditing(b); setOpen(true); };
  const closeSheet = () => { setOpen(false); setEditing(null); };

  const handleAnular = async (b) => {
    const ok = await anuladoBorrador(b.id, { nombre: technicianName, email: user.email });
    if (ok) addToast({ type: 'success', title: '🚫 Borrador anulado', body: `El borrador de ${b.clientName} fue anulado.` });
    else    addToast({ type: 'error',   title: '❌ Error',            body: 'No se pudo anular el borrador.' });
  };

  const handleSave = async (data) => {
    try {
      const offline = !navigator.onLine;
      if (data.clientIdNumber?.trim() && data.clientName && !offline) {
        await saveClient({
          identification: data.clientIdNumber,
          clientName:     data.clientName,
          clientPhone:    data.clientPhone    || '',
          clientAddress:  data.clientAddress  || '',
          clientEmail:    data.clientEmail    || '',
        });
      }
      const ok = editing
        ? await updateBorrador(editing.id, data)
        : await addBorrador({ ...data, technicianName });
      return ok;
    } catch {
      return false;
    }
  };

  const pendientesCount = useMemo(() => borradores.filter(b => b.status === 'Pendiente').length, [borradores]);

  const filtered = useMemo(() => {
    let list = borradores;
    if (statusFilter === 'pendiente')  list = list.filter(b => b.status === 'Pendiente');
    if (statusFilter === 'convertido') list = list.filter(b => b.status === 'Convertido');
    if (statusFilter === 'anulado')    list = list.filter(b => b.status === 'Anulado');
    if (dateFilter) list = list.filter(b => b.scheduledDate === dateFilter);
    return list;
  }, [borradores, statusFilter, dateFilter]);

  return (
    <>
      {/* ── Lista con filtros (solo cuando showList=true) ── */}
      {showList && (
        <div className="mt-4 space-y-3">

          {/* Filtros */}
          <div className="flex flex-col gap-2">
            <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
              {[
                { id: 'todos',      label: 'Todos' },
                { id: 'pendiente',  label: 'Pendientes' },
                { id: 'convertido', label: 'Convertidos' },
                { id: 'anulado',    label: 'Anulados' },
              ].map(f => (
                <button key={f.id} onClick={() => setStatusFilter(f.id)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === f.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {f.label}
                  {f.id === 'pendiente' && pendientesCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                      {pendientesCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border-2 border-slate-200 rounded-xl focus:outline-none focus:border-pink-400 transition-colors bg-white"
                />
              </div>
              {dateFilter && (
                <button onClick={() => setDateFilter('')}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 border-2 border-slate-200 bg-white transition-colors">
                  <X size={12} />Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          {borradores.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Sin borradores registrados</p>
              <p className="text-xs mt-1">Usa el botón <span className="font-bold text-pink-500">+</span> para registrar tu primer borrador</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <FileText size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">Sin resultados para este filtro</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(b => (
                <BorradorCard key={b.id} b={b} onEdit={openEdit} onAnular={handleAnular} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button
        onClick={openNew}
        className="fixed z-40 w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center transition-transform active:scale-95"
        style={{
          bottom: '84px', right: '16px',
          background: 'linear-gradient(135deg, #D61672, #FFA901)',
          boxShadow: '0 4px 20px rgba(214,22,114,0.45)',
        }}
        title="Registrar borrador de visita"
      >
        <Plus size={26} />
      </button>

      {/* ── Bottom Sheet ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(2px)' }}
            onClick={closeSheet}
          />
          <div
            className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 flex-shrink-0" />
            <BorradorForm
              initial={editing ? {
                id:             editing.id,
                clientId:       editing.clientId       || null,
                contactId:      editing.contactId      || null,
                clientName:     editing.clientName     || '',
                clientIdNumber: editing.clientIdNumber || '',
                clientAddress:  editing.clientAddress  || '',
                clientPhone:    editing.clientPhone    || '',
                clientEmail:    editing.clientEmail    || '',
                scheduledDate:  editing.scheduledDate  || localToday(),
                scheduledTime:  editing.scheduledTime  || '',
                motivo:         editing.motivo         || '',
              } : null}
              onSave={handleSave}
              onClose={closeSheet}
              isEdit={!!editing}
              isLoading={isLoading}
              userEmail={user.email}
              borradores={borradores}
            />
          </div>
        </div>
      )}
    </>
  );
}
