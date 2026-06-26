import { useState, useMemo } from 'react';
import {
  Search, Plus, Pencil, UserX, UserCheck, X,
  CheckCircle, Loader2, Upload, Users, Phone,
  MapPin, CreditCard, ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import Pagination from './Pagination.jsx';
import { usePagination } from '../hooks/usePagination.js';
import ClientImportModal from './ClientImportModal.jsx';

// ─── Formulario inline crear / editar ─────────────────────────────────────────
function ClientForm({ initial, onSave, onCancel, isLoading, existingIds }) {
  const isEdit = !!initial;
  const [form,  setForm]  = useState({
    name:           initial?.name           || '',
    identification: initial?.identification || '',
    phone:          initial?.phone          || '',
    address:        initial?.address        || '',
    email:          initial?.email          || '',
    foreign:        initial?.foreign        ?? false,
    ciudad:         initial?.ciudad         || '',
    ubicacion:      initial?.ubicacion      || '',
    observacion:    initial?.observacion    || '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.name.trim())
      errs.name = 'El nombre es obligatorio';
    if (!form.identification.trim())
      errs.identification = 'La cédula/RUC o pasaporte es obligatorio';
    else if (!isEdit && existingIds.has(form.identification.replace(/\s/g, '')))
      errs.identification = 'Ya existe un cliente con este documento';
    else if (!form.foreign) {
      const digits = form.identification.replace(/\s/g, '');
      if (!/^\d+$/.test(digits))
        errs.identification = 'Solo se permiten números para clientes nacionales';
      else if (digits.length !== 10 && digits.length !== 13)
        errs.identification = 'Debe tener 10 dígitos (cédula) o 13 dígitos (RUC)';
    }
    if (!form.phone.trim())
      errs.phone = 'El teléfono es obligatorio';
    if (!form.address.trim())
      errs.address = 'La dirección es obligatoria';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    await onSave(form);
  };

  const inp = (err) =>
    `w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors ${
      err ? 'border-red-400' : 'border-slate-200 focus:border-pink-400'
    }`;

  return (
    <form onSubmit={handleSubmit}
      className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-5 mb-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D61672' }}>
        {isEdit ? '✏️ Editar cliente' : '➕ Nuevo cliente'}
      </p>

      <div className="space-y-3">

        {/* Fila 1: Toggle extranjero + Cédula/RUC */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setForm(p => ({ ...p, foreign: !p.foreign, identification: '' }));
                setErrors(p => ({ ...p, identification: '' }));
              }}
              disabled={isEdit}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                form.foreign ? 'bg-blue-500' : 'bg-slate-200'
              } ${isEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                form.foreign ? 'translate-x-4' : 'translate-x-0.5'
              }`} />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-blue-800 truncate">🌐 Cliente extranjero</p>
              <p className="text-xs text-blue-600 leading-tight">
                {form.foreign ? 'Pasaporte / doc. extranjero' : 'Solo números, 10 o 13 dígitos'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
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
              disabled={isEdit}
              maxLength={form.foreign ? 30 : 13}
            />
            {isEdit && <p className="text-xs text-slate-400 mt-0.5">No puede modificarse</p>}
            {errors.identification && <p className="text-xs text-red-500 mt-1">⚠️ {errors.identification}</p>}
          </div>
        </div>

        {/* Fila 2: Nombre — ancho completo */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Nombre <span className="text-red-400">*</span>
          </label>
          <input type="text" value={form.name}
            onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: '' })); }}
            placeholder="Nombre completo o razón social"
            className={inp(errors.name)} autoFocus />
          {errors.name && <p className="text-xs text-red-500 mt-1">⚠️ {errors.name}</p>}
        </div>

        {/* Fila 3: Dirección — ancho completo */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Dirección <span className="text-red-400">*</span>
          </label>
          <input type="text" value={form.address}
            onChange={e => { setForm(p => ({ ...p, address: e.target.value })); setErrors(p => ({ ...p, address: '' })); }}
            placeholder="Dirección del cliente"
            className={inp(errors.address)} />
          {errors.address && <p className="text-xs text-red-500 mt-1">⚠️ {errors.address}</p>}
        </div>

        {/* Fila 4: Teléfono + Ciudad */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Teléfono <span className="text-red-400">*</span>
            </label>
            <input type="tel" value={form.phone}
              onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setErrors(p => ({ ...p, phone: '' })); }}
              placeholder="0991234567"
              className={inp(errors.phone)} />
            {errors.phone && <p className="text-xs text-red-500 mt-1">⚠️ {errors.phone}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Ciudad
            </label>
            <input type="text" value={form.ciudad}
              onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))}
              placeholder="Quito, Guayaquil..."
              className={inp(false)} />
          </div>
        </div>

        {/* Fila 5: Ubicación — ancho completo */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Ubicación
          </label>
          <input type="text" value={form.ubicacion}
            onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))}
            placeholder="Sector, barrio, referencia de ubicación..."
            className={inp(false)} />
        </div>

        {/* Fila 6: Email — ancho completo */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Email
          </label>
          <input type="email" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            placeholder="correo@ejemplo.com"
            className={inp(false)} />
        </div>

        {/* Fila 7: Observación — textarea */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Observación
          </label>
          <textarea value={form.observacion}
            onChange={e => setForm(p => ({ ...p, observacion: e.target.value }))}
            placeholder="Notas adicionales sobre el cliente..."
            rows={2}
            className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors border-slate-200 focus:border-pink-400 resize-none" />
        </div>

      </div>

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
            {client.observacion && (
              <p className="text-xs text-slate-400 mt-0.5 italic truncate max-w-xs" title={client.observacion}>
                {client.observacion}
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        {client.phone
          ? <div className="flex items-center gap-1 text-sm text-slate-600"><Phone size={12} className="text-slate-400" />{client.phone}</div>
          : <span className="text-slate-300 text-xs">—</span>}
      </td>

      <td className="px-4 py-3">
        {client.address || client.ciudad || client.ubicacion ? (
          <div className="space-y-0.5">
            {client.address && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                <span className="truncate max-w-xs">{client.address}</span>
              </div>
            )}
            {(client.ciudad || client.ubicacion) && (
              <p className="text-xs text-slate-400 ml-3.5 truncate max-w-xs">
                {[client.ciudad, client.ubicacion].filter(Boolean).join(' · ')}
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

  // Tareas por cliente
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
      .filter(c => !q ||
        c.name?.toLowerCase().includes(q) ||
        c.identification?.includes(q) ||
        c.phone?.includes(q)
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [clients, search, showInactive]);

  const pagination = usePagination(filtered, 15);

  const handleSave = async (form) => {
    setIsLoading(true);
    try {
      if (editing) {
        await updateClient(editing.id, form);
      } else {
        await createClient(form);
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

  const handleImport = async (rows) => {
    return await importClients(rows);
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
          {/* Importar */}
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 bg-white rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            <Upload size={15} />
            <span>Importar Excel</span>
          </button>

          {/* Nuevo cliente */}
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
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
