import { useState } from 'react';
import { Phone, MapPin, FileText, CreditCard, User, Package, Settings, Plus, X } from 'lucide-react';
import ClientSearch from './ClientSearch.jsx';
import ServiceTypesManager from './ServiceTypesManager.jsx';
import { identificacionEcSchema, phoneSchema, emailSchema, serviceOrderSchema } from '../utils/validations.js';
import { emptyContact, getClientContacts } from '../hooks/useClients.js';

export default function TaskForm({ onSubmit, initialData, statuses, onCancel, clients, serviceTypes, user }) {

  const [selectedClient, setSelectedClient] = useState(() => {
    if (!initialData?.clientId) return null;
    // En modo edición buscar el cliente real (con contacts) en la lista cargada
    return clients.find(c => c.id === initialData.clientId) || {
      id:             initialData.clientId,
      name:           initialData.clientName,
      identification: initialData.identification,
      contacts:       [],
    };
  });

  const [formData, setFormData] = useState(initialData || {
    serviceOrder:      '',
    identification:    '',
    clientName:        '',
    clientPhone:       '',
    clientAddress:     '',
    clientEmail:       '',
    clientUbicacion:   '',
    clientCiudad:      '',
    clientObservacion: '',
    clientContactId:   '',
    serviceType:       '',
    foreign:           false,
    status:            'Pendiente',
    observations:      '',
  });

  // Estado para contactos del nuevo cliente
  const [contacts, setContacts] = useState(() => initialData ? [] : [emptyContact()]);

  // Estado para selección de contacto en cliente existente
  const [selectedContactId, setSelectedContactId] = useState(
    initialData?.clientContactId || null
  );
  const [isAddingContact,   setIsAddingContact]   = useState(false);
  const [contactDraft,      setContactDraft]      = useState(() => emptyContact());

  const [errors,          setErrors]          = useState({});
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [showTypeManager, setShowTypeManager] = useState(false);

  // ── Seleccionar cliente existente ─────────────────────────────────────────
  const handleSelectClient = (client) => {
    setSelectedClient(client);
    const clientContacts = getClientContacts(client);

    if (clientContacts.length === 1) {
      const c = clientContacts[0];
      setSelectedContactId(c.id);
      setFormData(prev => ({
        ...prev,
        clientId:          client.id,
        clientName:        client.name,
        identification:    client.identification || '',
        clientPhone:       c.phone       || '',
        clientAddress:     c.address     || '',
        clientEmail:       c.email       || '',
        clientUbicacion:   c.ubicacion   || '',
        clientCiudad:      c.ciudad      || '',
        clientObservacion: c.observacion || '',
        clientContactId:   c.id,
      }));
    } else {
      setSelectedContactId(null);
      setFormData(prev => ({
        ...prev,
        clientId:          client.id,
        clientName:        client.name,
        identification:    client.identification || '',
        clientPhone:       '',
        clientAddress:     '',
        clientEmail:       '',
        clientUbicacion:   '',
        clientCiudad:      '',
        clientObservacion: '',
        clientContactId:   '',
      }));
    }
    setErrors(prev => ({ ...prev, clientName: null, clientContact: null }));
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setSelectedContactId(null);
    setIsAddingContact(false);
    setContactDraft(emptyContact());
    setFormData(prev => ({
      ...prev,
      clientId:          '',
      clientName:        '',
      clientPhone:       '',
      clientAddress:     '',
      clientEmail:       '',
      clientUbicacion:   '',
      clientCiudad:      '',
      clientObservacion: '',
      clientContactId:   '',
      identification:    '',
    }));
  };

  // Seleccionar un contacto de cliente existente
  const handleSelectContact = (contact) => {
    setSelectedContactId(contact.id);
    setIsAddingContact(false);
    setFormData(prev => ({
      ...prev,
      clientPhone:       contact.phone       || '',
      clientAddress:     contact.address     || '',
      clientEmail:       contact.email       || '',
      clientUbicacion:   contact.ubicacion   || '',
      clientCiudad:      contact.ciudad      || '',
      clientObservacion: contact.observacion || '',
      clientContactId:   contact.id,
    }));
    setErrors(prev => ({ ...prev, clientContact: null }));
  };

  // ── Handlers nuevo cliente ─────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const addContact    = () => setContacts(prev => [...prev, emptyContact()]);
  const removeContact = (idx) => setContacts(prev => prev.filter((_, i) => i !== idx));
  const updateContact = (idx, field, value) =>
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));

  const updateDraft = (field, value) =>
    setContactDraft(prev => ({ ...prev, [field]: value }));

  // ── Validación ────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};

    if (formData.serviceOrder?.trim()) {
      const r = serviceOrderSchema.safeParse(formData.serviceOrder);
      if (!r.success) errs.serviceOrder = r.error.issues[0].message;
    }

    if (!formData.clientName?.trim())
      errs.clientName = 'Por favor ingresa o selecciona un cliente.';

    if (!selectedClient) {
      // Cliente nuevo: validar cédula/RUC
      if (formData.identification?.trim() && !formData.foreign) {
        const r = identificacionEcSchema.safeParse(formData.identification);
        if (!r.success) errs.identification = r.error.issues[0].message;
      }
      // Validar teléfono del primer contacto si fue ingresado
      const firstPhone = contacts[0]?.phone?.trim();
      if (firstPhone) {
        const r = phoneSchema.safeParse(firstPhone);
        if (!r.success) errs.clientPhone = r.error.issues[0].message;
      }
      // Validar email del primer contacto si fue ingresado
      const firstEmail = contacts[0]?.email?.trim();
      if (firstEmail) {
        const r = emailSchema.safeParse(firstEmail);
        if (!r.success) errs.clientEmail = r.error.issues[0].message;
      }
    } else {
      // Cliente existente con múltiples contactos: debe seleccionar uno
      const clientContacts = getClientContacts(selectedClient);
      if (clientContacts.length > 1 && !selectedContactId && !isAddingContact) {
        errs.clientContact = 'Selecciona una ubicación para esta tarea.';
      }
    }

    return errs;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setIsSubmitting(true);
    try {
      const data = { ...formData };

      if (!selectedClient) {
        // Nuevo cliente: enviar contacts para saveClient + snapshot del primer contacto
        data.contacts = contacts;
        if (contacts.length > 0) {
          const c = contacts[0];
          data.clientPhone       = c.phone       || '';
          data.clientAddress     = c.address     || '';
          data.clientEmail       = c.email       || '';
          data.clientUbicacion   = c.ubicacion   || '';
          data.clientCiudad      = c.ciudad      || '';
          data.clientObservacion = c.observacion || '';
        }
      } else if (isAddingContact) {
        // Cliente existente + nueva ubicación: agregar y usar
        data.additionalContacts = [contactDraft];
        data.clientPhone        = contactDraft.phone       || '';
        data.clientAddress      = contactDraft.address     || '';
        data.clientEmail        = contactDraft.email       || '';
        data.clientUbicacion    = contactDraft.ubicacion   || '';
        data.clientCiudad       = contactDraft.ciudad      || '';
        data.clientObservacion  = contactDraft.observacion || '';
        data.clientContactId    = contactDraft.id;
      }
      // Cliente existente + contacto existente: formData ya tiene todos los campos

      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors";
  const labelClass = "block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide";
  const focus = { onFocus: e => e.target.style.borderColor = '#D61672', onBlur: e => e.target.style.borderColor = '#e2e8f0' };

  // ── Render campo de contacto individual ───────────────────────────────────
  const renderContactFields = (contact, onChange, showDelete, onDelete) => (
    <div className="space-y-2">
      {/* Fila: Ubicación + Ciudad */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}><MapPin size={10} className="inline mr-0.5" />Ubicación</label>
          <input type="text" value={contact.ubicacion}
            onChange={e => onChange('ubicacion', e.target.value)}
            placeholder="Sector, barrio, referencia..."
            className={inputClass} {...focus} />
        </div>
        <div>
          <label className={labelClass}>Ciudad</label>
          <input type="text" value={contact.ciudad}
            onChange={e => onChange('ciudad', e.target.value)}
            placeholder="Quito, Coca..."
            className={inputClass} {...focus} />
        </div>
      </div>

      {/* Dirección */}
      <div>
        <label className={labelClass}>Dirección</label>
        <input type="text" value={contact.address}
          onChange={e => onChange('address', e.target.value)}
          placeholder="Calle, número, edificio..."
          className={inputClass} {...focus} />
      </div>

      {/* Teléfono + Email */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass}><Phone size={10} className="inline mr-0.5" />Teléfono</label>
          <input type="tel" value={contact.phone}
            onChange={e => onChange('phone', e.target.value)}
            placeholder="0991234567"
            className={`${inputClass} ${errors.clientPhone ? 'border-red-400' : ''}`} {...focus} />
          {errors.clientPhone && <p className="text-xs text-red-500 mt-0.5">⚠️ {errors.clientPhone}</p>}
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" value={contact.email}
            onChange={e => onChange('email', e.target.value)}
            placeholder="correo@ejemplo.com"
            className={`${inputClass} ${errors.clientEmail ? 'border-red-400' : ''}`} {...focus} />
          {errors.clientEmail && <p className="text-xs text-red-500 mt-0.5">⚠️ {errors.clientEmail}</p>}
        </div>
      </div>

      {/* Observación */}
      <div>
        <label className={labelClass}>Observación</label>
        <textarea value={contact.observacion}
          onChange={e => onChange('observacion', e.target.value)}
          rows={2}
          placeholder="Notas sobre esta ubicación..."
          className={`${inputClass} resize-none`} {...focus} />
      </div>
    </div>
  );

  return (
    <>
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <h2 className="text-lg font-bold">
            {initialData ? '✏️ Editar Tarea' : '➕ Nueva Tarea'}
          </h2>
          <p className="text-xs text-white text-opacity-80 mt-0.5">
            {initialData ? 'Modifica los datos de la tarea' : 'Registra una nueva tarea de mantenimiento'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Orden de servicio */}
          <div>
            <label className={labelClass}>
              <FileText size={12} className="inline mr-1" />Orden de Servicio
            </label>
            <input name="serviceOrder" value={formData.serviceOrder} onChange={handleChange}
              placeholder="Ej: OS-2026-001" maxLength={50}
              className={`${inputClass} font-mono tracking-wide ${errors.serviceOrder ? 'border-red-400' : ''}`}
              {...focus} />
            {errors.serviceOrder && <p className="text-xs text-red-500 mt-1">⚠️ {errors.serviceOrder}</p>}
          </div>

          {/* Buscador de cliente */}
          <div>
            <label className={labelClass}>
              <User size={12} className="inline mr-1" />Cliente
            </label>
            <ClientSearch
              clients={clients}
              onSelect={handleSelectClient}
              selectedClient={selectedClient}
              onClear={handleClearClient}
            />
            {errors.clientName && (
              <p className="text-xs text-red-600 mt-1">⚠️ {errors.clientName}</p>
            )}
          </div>

          {/* ── Selector de contacto (cliente existente) ── */}
          {selectedClient && (() => {
            const clientContacts = getClientContacts(selectedClient);
            return (
              <div className="space-y-2">
                <label className={labelClass}>
                  <MapPin size={12} className="inline mr-1" />Ubicación para esta tarea
                </label>

                {clientContacts.length === 0 && !isAddingContact && (
                  <p className="text-xs text-slate-400 italic">
                    Este cliente no tiene ubicaciones registradas.
                  </p>
                )}

                {clientContacts.map(contact => (
                  <button key={contact.id} type="button"
                    onClick={() => handleSelectContact(contact)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                      selectedContactId === contact.id && !isAddingContact
                        ? 'border-pink-400 bg-pink-50'
                        : 'border-slate-200 hover:border-pink-200 bg-white'
                    }`}>
                    <p className="text-sm font-semibold text-slate-700">
                      {contact.address || contact.ubicacion || 'Sin dirección'}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-0.5">
                      {contact.ciudad && (
                        <span className="text-xs text-slate-400">{contact.ciudad}</span>
                      )}
                      {contact.ubicacion && contact.address && (
                        <span className="text-xs text-slate-400">{contact.ubicacion}</span>
                      )}
                      {contact.phone && (
                        <span className="text-xs text-slate-400 flex items-center gap-0.5">
                          <Phone size={10} />{contact.phone}
                        </span>
                      )}
                    </div>
                  </button>
                ))}

                {/* Nueva ubicación inline */}
                {isAddingContact ? (
                  <div className="p-3 rounded-xl border-2 border-pink-300 bg-pink-50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Nueva ubicación
                      </span>
                      <button type="button" onClick={() => {
                        setIsAddingContact(false);
                        setContactDraft(emptyContact());
                      }}
                        className="p-0.5 rounded text-slate-400 hover:text-red-400 transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                    {renderContactFields(contactDraft, updateDraft, false, null)}
                  </div>
                ) : (
                  <button type="button"
                    onClick={() => { setIsAddingContact(true); setSelectedContactId(null); setContactDraft(emptyContact()); }}
                    className="flex items-center gap-1 text-xs font-bold mt-1"
                    style={{ color: '#D61672' }}>
                    <Plus size={12} /> Agregar nueva ubicación
                  </button>
                )}

                {errors.clientContact && (
                  <p className="text-xs text-red-600 mt-1">⚠️ {errors.clientContact}</p>
                )}
              </div>
            );
          })()}

          {/* ── Datos del nuevo cliente ── */}
          {!selectedClient && (
            <div className="space-y-3 p-4 bg-pink-50 rounded-xl border border-pink-100">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D61672' }}>
                Datos del nuevo cliente
              </p>

              {/* Fila 1: Toggle extranjero + Cédula/RUC */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <button type="button"
                    onClick={() => setFormData(prev => ({ ...prev, foreign: !prev.foreign, identification: '' }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                      formData.foreign ? 'bg-blue-500' : 'bg-slate-200'
                    }`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      formData.foreign ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-800 truncate">🌐 Extranjero</p>
                    <p className="text-xs text-blue-600 leading-tight">
                      {formData.foreign ? 'Pasaporte / doc. extranjero' : '10 o 13 dígitos'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    <CreditCard size={12} className="inline mr-1" />
                    {formData.foreign ? 'Pasaporte / ID' : 'Cédula / RUC'}
                  </label>
                  <input name="identification" value={formData.identification}
                    onChange={e => {
                      const val = formData.foreign ? e.target.value : e.target.value.replace(/\D/g, '');
                      setFormData(prev => ({ ...prev, identification: val }));
                      if (errors.identification) setErrors(prev => ({ ...prev, identification: null }));
                    }}
                    placeholder={formData.foreign ? 'Pasaporte...' : 'Ej: 0912345678'}
                    type={formData.foreign ? 'text' : 'tel'}
                    maxLength={formData.foreign ? 30 : 13}
                    className={`${inputClass} font-mono ${errors.identification ? 'border-red-400' : ''}`}
                    {...focus} />
                  {errors.identification && (
                    <p className="text-xs text-red-500 mt-1">⚠️ {errors.identification}</p>
                  )}
                </div>
              </div>

              {/* Fila 2: Nombre */}
              <div>
                <label className={labelClass}>
                  <User size={12} className="inline mr-1" />Nombre <span className="text-red-400">*</span>
                </label>
                <input name="clientName" value={formData.clientName} onChange={handleChange}
                  placeholder="Nombre completo o razón social"
                  className={`${inputClass} ${errors.clientName ? 'border-red-400' : ''}`}
                  {...focus} />
                {errors.clientName && (
                  <p className="text-xs text-red-500 mt-1">⚠️ {errors.clientName}</p>
                )}
              </div>

              {/* Contactos */}
              {contacts.map((contact, idx) => (
                <div key={contact.id}
                  className="bg-white rounded-xl border border-pink-200 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                      {idx === 0 ? 'Datos de contacto' : `Ubicación ${idx + 1}`}
                    </span>
                    {contacts.length > 1 && (
                      <button type="button" onClick={() => removeContact(idx)}
                        className="p-0.5 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  {renderContactFields(
                    contact,
                    (field, value) => updateContact(idx, field, value),
                    contacts.length > 1,
                    () => removeContact(idx)
                  )}
                </div>
              ))}

              <button type="button" onClick={addContact}
                className="flex items-center gap-1 text-xs font-bold mt-1"
                style={{ color: '#D61672' }}>
                <Plus size={12} /> Agregar otra ubicación
              </button>
            </div>
          )}

          {/* Tipo de instalación / equipo / servicio */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={labelClass}>
                <Package size={12} className="inline mr-1" />Tipo de instalación / equipo / servicio
              </label>
              <button type="button" onClick={() => setShowTypeManager(true)}
                className="flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80"
                style={{ color: '#D61672' }} title="Gestionar tipos">
                <Settings size={11} />
                Gestionar tipos
              </button>
            </div>

            {serviceTypes && serviceTypes.length > 0 ? (
              <select name="serviceType" value={formData.serviceType} onChange={handleChange}
                className={`${inputClass} bg-white`} {...focus}>
                <option value="">— Selecciona un tipo —</option>
                {serviceTypes.map(st => (
                  <option key={st.id} value={st.name}>{st.name}</option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                <Package size={18} className="text-slate-300 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">Sin tipos registrados</p>
                  <p className="text-xs text-slate-400">Crea tipos para poder seleccionarlos aquí</p>
                </div>
                <button type="button" onClick={() => setShowTypeManager(true)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-bold text-white rounded-lg"
                  style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                  + Agregar
                </button>
              </div>
            )}

            {formData.serviceType && serviceTypes && !serviceTypes.find(s => s.name === formData.serviceType) && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Tipo anterior: <strong>{formData.serviceType}</strong> — ya no está en la lista.
              </p>
            )}
          </div>

          {/* Estado */}
          <div>
            <label className={labelClass}>Estado</label>
            <select name="status" value={formData.status} onChange={handleChange}
              className={`${inputClass} bg-white`} {...focus}>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Observaciones generales */}
          <div>
            <label className={labelClass}>Observaciones generales</label>
            <textarea name="observations" value={formData.observations} onChange={handleChange}
              rows={3} placeholder="Descripción general del problema o trabajo..."
              className={`${inputClass} resize-none`} {...focus} />
          </div>

          {/* Botones */}
          <div className="flex space-x-3 pt-2">
            <button type="submit" disabled={isSubmitting}
              className="flex-1 text-white font-bold py-3 rounded-xl transition-all shadow-md text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              {isSubmitting ? 'Guardando...' : initialData ? '💾 Actualizar Tarea' : '✅ Guardar Tarea'}
            </button>
            {onCancel && (
              <button type="button" onClick={onCancel}
                className="px-6 py-3 border-2 border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm">
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Modal gestión de tipos */}
      {showTypeManager && (
        <ServiceTypesManager
          user={user}
          onClose={() => setShowTypeManager(false)}
        />
      )}
    </>
  );
}
