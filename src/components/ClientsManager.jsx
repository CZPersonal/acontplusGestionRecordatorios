import { useState, useMemo } from 'react';
import {
  Search, Plus, Pencil, UserX, UserCheck, X,
  CheckCircle, Loader2, Upload, Users, Phone,
  MapPin, CreditCard, Filter
} from 'lucide-react';
import Pagination from './Pagination.jsx';
import { usePagination } from '../hooks/usePagination.js';
import ClientImportModal from './ClientImportModal.jsx';
import { emptyContact, getClientContacts } from '../hooks/useClients.js';

// ─── Formulario inline crear / editar ─────────────────────────────────────────
function ClientForm({ initial, onSave, onCancel, isLoading, existingIds }) {
  const isEdit = !!initial;

  const [form, setForm] = useState({
    name:           initial?.name           || '',
    identification: initial?.identification || '',
    foreign:        initial?.foreign        ?? false,
  });
  const [errors,   setErrors]   = useState({});
  const [contacts, setContacts] = useState(() => {
    const existing = getClientContacts(initial || {});
    return existing.length > 0 ? existing.map(c => ({ ...c })) : [emptyContact()];
  });

  const validate = () => {
    const errs  = {};
    const newId = form.identification.replace(/\s/g, '');
    const oldId = initial?.identification?.replace(/\s/g, '') || '';
    const idChanged = newId !== oldId;

    if (!form.name.trim())
      errs.name = 'El nombre es obligatorio';

    if (!form.identification.trim()) {
      errs.identification = 'La cédula/RUC o pasaporte es obligatorio';
    } else if (existingIds.has(newId) && newId !== oldId) {
      errs.identification = 'Ya existe un cliente con este documento';
    } else if (!form.foreign && (!isEdit || idChanged)) {
      const digits = newId;
      if (!/^\d+$/.test(digits))
        errs.identification = 'Solo se permiten números para clientes nacionales';
      else if (digits.length !== 10 && digits.length !== 13)
        errs.identification = 'Debe tener 10 dígitos (cédula) o 13 dígitos (RUC)';
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    await onSave({ ...form, contacts });
  };

  const addContact    = () => setContacts(prev => [...prev, emptyContact()]);
  const removeContact = (idx) => setContacts(prev => prev.filter((_, i) => i !== idx));
  const setContactField = (idx, field, value) =>
    setContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));

  const inp = (err) =>
    `w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors ${
      err ? 'border-red-400' : 'border-slate-200 focus:border-pink-400'
    }`;
  const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

  return (
    <form onSubmit={handleSubmit}
      className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-5 mb-4 space-y-4">
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D61672' }}>
        {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
      </p>

      {/* ── Fila 1: Toggle + Cédula/RUC ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <button type="button"
            onClick={() => {
              setForm(p => ({ ...p, foreign: !p.foreign, identification: '' }));
              setErrors(p => ({ ...p, identification: '' }));
            }}
            disabled={isEdit}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
              form.foreign ? 'bg-blue-500' : 'bg-slate-200'
            } ${isEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              form.foreign ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-blue-800 truncate">🌐 Extranjero</p>
            <p className="text-xs text-blue-600 leading-tight">
              {form.foreign ? 'Pasaporte / doc. extranjero' : '10 o 13 dígitos'}
            </p>
          </div>
        </div>

        <div>
          <label className={lbl}>
            {form.foreign ? 'Pasaporte / ID' : 'Cédula / RUC'} <span className="text-red-400">*</span>
          </label>
          <input
            type={form.foreign ? 'text' : 'tel'}
            value={form.identification}
            onChange={e => {
              const val = form.foreign ? e.target.value : e.target.value.replace(/\D/g, '');
              setForm(p => ({ ...p, identification: val }));
              setErrors(p => ({ ...p, identification: '' }));
            }}
            placeholder={form.foreign ? 'Pasaporte...' : 'Ej: 1712345678'}
            className={`${inp(errors.identification)} font-mono`}
            maxLength={form.foreign ? 30 : 13}
          />
          {errors.identification && <p className="text-xs text-red-500 mt-1">⚠️ {errors.identification}</p>}
        </div>
      </div>

      {/* ── Fila 2: Nombre ── */}
      <div>
        <label className={lbl}>Nombre <span className="text-red-400">*</span></label>
        <input type="text" value={form.name} autoFocus
          onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })); }}
          placeholder="Nombre completo o razón social"
          className={inp(errors.name)} />
        {errors.name && <p className="text-xs text-red-500 mt-1">⚠️ {errors.name}</p>}
      </div>

      {/* ── Sección Contactos / Ubicaciones ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Ubicaciones / Contactos
          </p>
          <button type="button" onClick={addContact}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
            <Plus size={11} /> Agregar
          </button>
        </div>

        {contacts.map((contact, idx) => (
          <div key={contact.id}
            className="bg-white rounded-xl border border-slate-200 p-3 space-y-2.5 relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Ubicación {idx + 1}
              </span>
              {contacts.length > 1 && (
                <button type="button" onClick={() => removeContact(idx)}
                  className="p-0.5 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Ubicación + Ciudad */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Ubicación</label>
                <input type="text" value={contact.ubicacion}
                  onChange={e => setContactField(idx, 'ubicacion', e.target.value)}
                  placeholder="Sector, barrio, referencia..."
                  className={inp(false)} />
              </div>
              <div>
                <label className={lbl}>Ciudad</label>
                <input type="text" value={contact.ciudad}
                  onChange={e => setContactField(idx, 'ciudad', e.target.value)}
                  placeholder="Quito, Coca..."
                  className={inp(false)} />
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className={lbl}>Dirección</label>
              <input type="text" value={contact.address}
                onChange={e => setContactField(idx, 'address', e.target.value)}
                placeholder="Calle, número, edificio..."
                className={inp(false)} />
            </div>

            {/* Teléfono + Email */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={lbl}>Teléfono</label>
                <input type="tel" value={contact.phone}
                  onChange={e => setContactField(idx, 'phone', e.target.value)}
                  placeholder="0991234567"
                  className={inp(false)} />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input type="email" value={contact.email}
                  onChange={e => setContactField(idx, 'email', e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className={inp(false)} />
              </div>
            </div>

            {/* Observación */}
            <div>
              <label className={lbl}>Observación</label>
              <textarea value={contact.observacion}
                onChange={e => setContactField(idx, 'observacion', e.target.value)}
                placeholder="Notas sobre esta ubicación..."
                rows={2}
                className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors border-slate-200 focus:border-pink-400 resize-none" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Botones ── */}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          {isLoading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear cliente'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Fila de cliente ───────────────────────────────────────────────────────────
function ClientRow({ client, taskCount, onEdit, onToggleActive, isLoading }) {
  const contacts    = getClientContacts(client);
  const firstC      = contacts[0] || {};
  const extraCount  = contacts.length - 1;

  return (
    <tr className={`hover:bg-slate-50 transition-colors group ${!client.active ? 'opacity-60' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${client.active ? 'bg-green-400' : 'bg-slate-300'}`} />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-slate-800">{client.name}</p>
              {client.foreign && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  🌐 Extranjero
                </span>
              )}
            </div>
            {client.identification && (
              <div className="flex items-center gap-1 mt-0.5">
                <CreditCard size={10} className="text-slate-400" />
                <span className="text-xs font-mono text-slate-500">{client.identification}</span>
              </div>
            )}
            {firstC.observacion && (
              <p className="text-xs text-slate-400 mt-0.5 italic truncate max-w-xs" title={firstC.observacion}>
                {firstC.observacion}
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="space-y-0.5">
          {firstC.phone
            ? <div className="flex items-center gap-1 text-sm text-slate-600">
                <Phone size={12} className="text-slate-400" />{firstC.phone}
              </div>
            : <span className="text-slate-300 text-xs">—</span>}
          {extraCount > 0 && (
            <span className="text-xs text-slate-400">+{extraCount} ubicación{extraCount > 1 ? 'es' : ''}</span>
          )}
        </div>
      </td>

      <td className="px-4 py-3">
        {firstC.address || firstC.ciudad || firstC.ubicacion ? (
          <div className="space-y-0.5">
            {firstC.address && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                <span className="truncate max-w-xs">{firstC.address}</span>
              </div>
            )}
            {(firstC.ciudad || firstC.ubicacion) && (
              <p className="text-xs text-slate-400 ml-3.5 truncate max-w-xs">
                {[firstC.ciudad, firstC.ubicacion].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>

      <td className="px-4 py-3 text-center">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          taskCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
        }`}>
          {taskCount} tarea{taskCount !== 1 ? 's' : ''}
        </span>
      </td>

      <td className="px-4 py-3 text-center">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          client.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {client.active !== false ? 'Activo' : 'Inactivo'}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <button onClick={() => onEdit(client)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Editar">
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onToggleActive(client)}
            disabled={isLoading}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
              client.active !== false
                ? 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
            }`}
            title={client.active !== false ? 'Inactivar cliente' : 'Activar cliente'}>
            {client.active !== false ? <UserX size={14} /> : <UserCheck size={14} />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ClientsManager({ clients, tasks, useClientsHook }) {
  const { createClient, updateClient, setClientActive, importClients } = useClientsHook;

  const [search,       setSearch]       = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [isLoading,    setIsLoading]    = useState(false);
  const [showImport,   setShowImport]   = useState(false);

  const existingIds = useMemo(() =>
    new Set(clients.map(c => c.identification?.replace(/\s/g, ''))),
    [clients]
  );

  const taskCountMap = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      const key = t.identification?.replace(/\s/g, '') || t.clientName;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients
      .filter(c => showInactive ? true : c.active !== false)
      .filter(c => {
        if (!q) return true;
        const firstPhone = getClientContacts(c)[0]?.phone || '';
        return (
          c.name?.toLowerCase().includes(q) ||
          c.identification?.includes(q) ||
          firstPhone.includes(q)
        );
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [clients, search, showInactive]);

  const pagination = usePagination(filtered, 15);

  const handleSave = async (formData) => {
    setIsLoading(true);
    try {
      if (editing) {
        await updateClient(editing.id, formData);
      } else {
        await createClient(formData);
      }
      setShowForm(false);
      setEditing(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (client) => {
    setEditing(client);
    setShowForm(true);
  };

  const handleToggleActive = async (client) => {
    setIsLoading(true);
    try {
      await setClientActive(client.id, client.active === false ? true : false);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCount   = clients.filter(c => c.active !== false).length;
  const inactiveCount = clients.filter(c => c.active === false).length;

  return (
    <div className="space-y-4">

      {/* ── Cabecera ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeCount} activo{activeCount !== 1 ? 's' : ''}
            {inactiveCount > 0 && ` · ${inactiveCount} inactivo${inactiveCount !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Upload size={15} />
            <span>Importar Excel</span>
          </button>

          {!showForm && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-white font-bold rounded-lg text-sm"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
              <Plus size={15} />
              Nuevo cliente
            </button>
          )}
        </div>
      </div>

      {/* ── Formulario crear / editar ── */}
      {showForm && (
        <ClientForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          isLoading={isLoading}
          existingIds={existingIds}
        />
      )}

      {/* ── Buscador y filtro ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula/RUC o teléfono..."
            className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-pink-400 transition-colors" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
            showInactive
              ? 'text-white border-transparent'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
          style={showInactive ? { background: 'linear-gradient(135deg, #D61672, #FFA901)' } : {}}>
          <Filter size={14} />
          {showInactive ? 'Ver solo activos' : 'Ver inactivos'}
        </button>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">Sin clientes que coincidan</p>
            {!showForm && (
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="mt-4 flex items-center gap-1.5 mx-auto px-4 py-2 text-white text-sm font-bold rounded-xl"
                style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                <Plus size={14} />
                Crear primer cliente
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Teléfono</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Dirección</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Tareas</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagination.paginatedItems.map(client => {
                    const key   = client.identification?.replace(/\s/g, '') || client.name;
                    const count = taskCountMap[key] || 0;
                    return (
                      <ClientRow
                        key={client.id}
                        client={client}
                        taskCount={count}
                        onEdit={handleEdit}
                        onToggleActive={handleToggleActive}
                        isLoading={isLoading}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100">
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={pagination.goToPage}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                totalItems={pagination.totalItems}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal importación */}
      {showImport && (
        <ClientImportModal
          existingClients={clients}
          onImport={async (rows) => await importClients(rows)}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
