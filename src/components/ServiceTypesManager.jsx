import { useState } from 'react';
import { X, Plus, Pencil, Loader2, CheckCircle, Package } from 'lucide-react';
import { useServiceTypes } from '../hooks/useServiceTypes';

// ─── Formulario inline (crear / editar) ───────────────────────────────────────
function ServiceTypeForm({ initial, onSave, onCancel, isLoading }) {
  const [name,        setName]        = useState(initial?.name        || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [error,       setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    setError('');
    await onSave({ name, description });
  };

  const inp = "w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit}
      className="bg-pink-50 border-2 border-pink-200 rounded-xl p-4 space-y-3 mb-3">
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D61672' }}>
        {initial ? '✏️ Editar tipo' : '➕ Nuevo tipo'}
      </p>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Nombre <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          placeholder="Ej: Instalación de filtros de agua"
          className={inp}
          autoFocus
          onFocus={e => e.target.style.borderColor = '#D61672'}
          onBlur={e => e.target.style.borderColor = error ? '#f87171' : '#e2e8f0'}
        />
        {error && <p className="text-xs text-red-500 mt-1">⚠️ {error}</p>}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          Descripción <span className="text-slate-400 font-normal normal-case">(opcional)</span>
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          placeholder="Breve descripción del tipo de servicio..."
          className={`${inp} resize-none`}
          onFocus={e => e.target.style.borderColor = '#D61672'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-white text-sm font-bold rounded-xl disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          {isLoading
            ? <Loader2 size={14} className="animate-spin" />
            : <CheckCircle size={14} />}
          {isLoading ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Fila de tipo existente ────────────────────────────────────────────────────
function ServiceTypeRow({ st, onEdit }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-white transition-colors group">
      <div className="p-1.5 rounded-lg bg-pink-50 flex-shrink-0 mt-0.5">
        <Package size={14} style={{ color: '#D61672' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{st.name}</p>
        {st.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{st.description}</p>
        )}
      </div>
      <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(st)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Editar">
          <Pencil size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Modal principal ───────────────────────────────────────────────────────────
export default function ServiceTypesManager({ user, onClose }) {
  const { serviceTypes, isLoading, addServiceType, updateServiceType } =
    useServiceTypes(user);

  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);   // objeto st o null

  const handleSave = async (data) => {
    let ok;
    if (editing) {
      ok = await updateServiceType(editing.id, data);
    } else {
      ok = await addServiceType(data);
    }
    if (ok) { setShowForm(false); setEditing(null); }
  };

  const handleEdit = (st) => {
    setEditing(st);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="px-5 py-4 text-white flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <div>
            <h3 className="font-bold text-base">Tipos de instalación / equipo / servicio</h3>
            <p className="text-xs opacity-80 mt-0.5">
              {serviceTypes.length} tipo{serviceTypes.length !== 1 ? 's' : ''} registrado{serviceTypes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* Formulario crear / editar */}
          {showForm && (
            <ServiceTypeForm
              initial={editing}
              onSave={handleSave}
              onCancel={handleCloseForm}
              isLoading={isLoading}
            />
          )}

          {/* Botón abrir formulario */}
          {!showForm && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="w-full flex items-center justify-center gap-1.5 py-2 mb-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-pink-300 hover:bg-pink-50 transition-colors text-xs font-semibold text-slate-400 hover:text-pink-600">
              <Plus size={13} />
              Agregar nuevo tipo
            </button>
          )}

          {/* Lista */}
          {serviceTypes.length === 0 && !showForm ? (
            <div className="text-center py-10 text-slate-400">
              <Package size={36} className="mx-auto mb-2 opacity-25" />
              <p className="text-sm font-medium">Sin tipos registrados</p>
              <p className="text-xs mt-1">Agrega el primer tipo de servicio</p>
            </div>
          ) : (
            <div className="space-y-2">
              {serviceTypes.map(st => (
                <ServiceTypeRow
                  key={st.id}
                  st={st}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0 bg-slate-50">
          <button onClick={onClose}
            className="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
