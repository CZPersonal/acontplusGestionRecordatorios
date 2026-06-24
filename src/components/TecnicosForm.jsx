import { useState } from 'react';
import { Plus, Trash2, User, X, Check, Mail, Phone, Pencil, Loader2 } from 'lucide-react';
import { useTecnicos } from '../hooks/useTecnicos';

export default function TecnicosForm({ user, onClose }) {
  const { tecnicos, isLoading, addTecnico, updateTecnico, deleteTecnico } = useTecnicos(user);

  const [form,          setForm]          = useState({ nombre: '', email: '', phone: '' });
  const [editing,       setEditing]       = useState(null); // tecnico object o null
  const [saving,        setSaving]        = useState(false);
  const [errors,        setErrors]        = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) { e.nombre = 'El nombre es obligatorio'; return e; }
    const existe = tecnicos.some(t =>
      t.nombre.toLowerCase() === form.nombre.trim().toLowerCase() && t.id !== editing?.id
    );
    if (existe) e.nombre = 'Ya existe un técnico con ese nombre';
    return e;
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    const ok = editing
      ? await updateTecnico(editing.id, { nombre: form.nombre, email: form.email, phone: form.phone })
      : await addTecnico({ nombre: form.nombre, email: form.email, phone: form.phone });
    if (ok) { setForm({ nombre: '', email: '', phone: '' }); setErrors({}); setEditing(null); }
    setSaving(false);
  };

  const handleEdit = (t) => {
    setEditing(t);
    setForm({ nombre: t.nombre, email: t.email || '', phone: t.phone || '' });
    setErrors({});
    setConfirmDelete(null);
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setForm({ nombre: '', email: '', phone: '' });
    setErrors({});
  };

  const handleDelete = async (id) => {
    await deleteTecnico(id);
    setConfirmDelete(null);
    if (editing?.id === id) handleCancelEdit();
  };

  const handleChange = (field) => (ev) => {
    setForm(prev => ({ ...prev, [field]: ev.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
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
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white bg-opacity-20">
              <User size={18} className="text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Técnicos</p>
              <p className="text-xs text-white opacity-80">
                {tecnicos.length} técnico{tecnicos.length !== 1 ? 's' : ''} registrado{tecnicos.length !== 1 ? 's' : ''}
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
              {editing ? '✏️ Editar técnico' : '➕ Agregar técnico'}
            </label>

            <div>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={form.nombre} onChange={handleChange('nombre')}
                  placeholder="Nombre completo del técnico" autoFocus
                  className={`${inp} pl-9 ${errors.nombre ? 'border-red-400' : ''}`}
                  onFocus={e => e.target.style.borderColor = errors.nombre ? '#f87171' : '#2563eb'}
                  onBlur={e => e.target.style.borderColor = errors.nombre ? '#f87171' : '#e2e8f0'} />
              </div>
              {errors.nombre && <p className="text-xs text-red-600 mt-1">⚠️ {errors.nombre}</p>}
            </div>

            <div>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={form.email} onChange={handleChange('email')}
                  placeholder="Email (opcional)"
                  className={`${inp} pl-9`}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
            </div>

            <div>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="tel" value={form.phone} onChange={handleChange('phone')}
                  placeholder="Teléfono (opcional)"
                  className={`${inp} pl-9`}
                  onFocus={e => e.target.style.borderColor = '#2563eb'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving || !form.nombre.trim()}
                className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /><span>Guardando...</span></>
                  : editing
                    ? <><Check size={14} /><span>Guardar cambios</span></>
                    : <><Plus size={14} /><span>Agregar técnico</span></>}
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
          {tecnicos.length === 0 && !isLoading && (
            <div className="text-center py-10 text-slate-400">
              <User size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">Sin técnicos registrados</p>
              <p className="text-xs mt-1">Agrega el primer técnico arriba</p>
            </div>
          )}
          <ul className="divide-y divide-slate-50">
            {tecnicos.map(t => (
              <li key={t.id}
                className={`flex items-center justify-between px-5 py-3 transition-colors ${editing?.id === t.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: editing?.id === t.id ? '#dbeafe' : '#f1f5f9' }}>
                    <User size={14} className={editing?.id === t.id ? 'text-blue-600' : 'text-slate-500'} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-700 font-semibold truncate">{t.nombre}</p>
                    {t.email && (
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                        <Mail size={10} />{t.email}
                      </p>
                    )}
                    {t.phone && (
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                        <Phone size={10} />{t.phone}
                      </p>
                    )}
                  </div>
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
