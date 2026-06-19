import { useState } from 'react';
import { X, Plus, Pencil, Trash2, Check, Loader2, CalendarCheck } from 'lucide-react';
import { useTiposVisita } from '../hooks/useTiposVisita';

export default function TiposVisitaManager({ user, onClose }) {
  const { tipos, isLoading, addTipo, updateTipo, deleteTipo } = useTiposVisita(user);

  const [nombre,        setNombre]        = useState('');
  const [editing,       setEditing]       = useState(null); // objeto tipo o null
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const validate = (val) => {
    if (!val.trim()) return 'El nombre es obligatorio.';
    const existe = tipos.some(t =>
      t.nombre.toLowerCase() === val.trim().toLowerCase() && t.id !== editing?.id
    );
    if (existe) return 'Ya existe un tipo con ese nombre.';
    return '';
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const err = validate(nombre);
    if (err) { setError(err); return; }
    setSaving(true);
    const ok = editing
      ? await updateTipo(editing.id, nombre)
      : await addTipo(nombre);
    if (ok) { setNombre(''); setEditing(null); setError(''); }
    setSaving(false);
  };

  const handleEdit = (t) => {
    setEditing(t);
    setNombre(t.nombre);
    setError('');
    setConfirmDelete(null);
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setNombre('');
    setError('');
  };

  const handleDelete = async (id) => {
    await deleteTipo(id);
    setConfirmDelete(null);
    if (editing?.id === id) handleCancelEdit();
  };

  const inp = "w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors bg-white";

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0"
        style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        style={{ maxHeight: '85vh' }}>

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white bg-opacity-20">
              <CalendarCheck size={18} className="text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Tipos de visita</p>
              <p className="text-xs text-white opacity-80">
                {tipos.length} tipo{tipos.length !== 1 ? 's' : ''} registrado{tipos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-white opacity-70 hover:opacity-100 hover:bg-white hover:bg-opacity-20 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
          <form onSubmit={handleSave} className="space-y-3">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
              {editing ? '✏️ Editar tipo de visita' : '➕ Agregar tipo de visita'}
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => { setNombre(e.target.value); setError(''); }}
              placeholder="Ej: Mantenimiento preventivo"
              autoFocus
              className={`${inp} ${error ? 'border-red-400' : ''}`}
              onFocus={e => e.target.style.borderColor = error ? '#f87171' : '#7c3aed'}
              onBlur={e => e.target.style.borderColor = error ? '#f87171' : '#e2e8f0'}
            />
            {error && <p className="text-xs text-red-600">⚠️ {error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving || !nombre.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /><span>Guardando...</span></>
                  : editing
                    ? <><Check size={14} /><span>Guardar cambios</span></>
                    : <><Plus size={14} /><span>Agregar tipo</span></>}
              </button>
              {editing && (
                <button type="button" onClick={handleCancelEdit}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {tipos.length === 0 && !isLoading && (
            <div className="text-center py-10 text-slate-400">
              <CalendarCheck size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">Sin tipos de visita registrados</p>
              <p className="text-xs mt-1">Agrega el primer tipo arriba</p>
            </div>
          )}
          <ul className="divide-y divide-slate-50">
            {tipos.map(t => (
              <li key={t.id}
                className={`flex items-center justify-between px-5 py-3 transition-colors ${editing?.id === t.id ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: editing?.id === t.id ? '#ede9fe' : '#f1f5f9' }}>
                    <CalendarCheck size={14} className={editing?.id === t.id ? 'text-violet-600' : 'text-slate-500'} />
                  </div>
                  <p className="text-sm text-slate-700 font-semibold truncate">{t.nombre}</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {confirmDelete === t.id ? (
                    <>
                      <span className="text-xs text-slate-500 mr-1">¿Eliminar?</span>
                      <button onClick={() => handleDelete(t.id)}
                        className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">
                        <Check size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(t)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        title="Editar">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmDelete(t.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-white flex-shrink-0 flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
