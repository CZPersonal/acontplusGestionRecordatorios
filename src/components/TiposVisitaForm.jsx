// src/components/TiposVisitaForm.jsx
import { useState } from 'react';
import { Plus, Wrench, X } from 'lucide-react';
import { useTiposVisita } from '../hooks/useTiposVisita';

export default function TiposVisitaForm({ user, onClose }) {
  const { tipos, isLoading, addTipo } = useTiposVisita(user);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) {
      setError('Ingresa un nombre para el tipo de visita');
      return;
    }
    const existe = tipos.some(t => t.nombre.toLowerCase() === nuevoNombre.trim().toLowerCase());
    if (existe) {
      setError('Ya existe un tipo con ese nombre');
      return;
    }
    setSaving(true);
    const ok = await addTipo(nuevoNombre);
    if (ok) {
      setNuevoNombre('');
      setError('');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              <Wrench size={18} className="text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-white">Tipos de visita</p>
              <p className="text-xs text-white" style={{ opacity: 0.8 }}>
                {tipos.length} tipo{tipos.length !== 1 ? 's' : ''} registrado{tipos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-xl text-white transition-colors"
            style={{ opacity: 0.8 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.opacity = 1; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = 0.8; }}>
            <X size={20} />
          </button>
        </div>

        {/* Formulario para agregar */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
          <form onSubmit={handleAdd} className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Agregar nuevo tipo
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={nuevoNombre}
                onChange={e => { setNuevoNombre(e.target.value); setError(''); }}
                placeholder="Ej: Revisión de garantía"
                className="flex-1 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-colors bg-white"
                onFocus={e => e.target.style.borderColor = '#D61672'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                autoFocus
              />
              <button
                type="submit"
                disabled={saving || !nuevoNombre.trim()}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                {saving ? <span className="animate-spin">⏳</span> : <Plus size={16} />}
                <span>{saving ? 'Guardando...' : 'Agregar'}</span>
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-600 flex items-center space-x-1">
                <span>⚠️</span><span>{error}</span>
              </p>
            )}
          </form>
        </div>

        {/* Lista de tipos */}
        <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
          {isLoading && (
            <div className="text-center py-6 text-slate-400 text-sm">Cargando...</div>
          )}
          {tipos.length === 0 && !isLoading && (
            <div className="text-center py-10 text-slate-400">
              <Wrench size={36} className="mx-auto mb-2 opacity-20" />
              <p className="text-sm font-medium">Sin tipos registrados</p>
              <p className="text-xs mt-1">Agrega el primer tipo arriba</p>
            </div>
          )}
          <ul className="divide-y divide-slate-50">
            {tipos.map(tipo => (
              <li key={tipo.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-pink-100">
                    <Wrench size={13} style={{ color: '#D61672' }} />
                  </div>
                  <span className="text-sm text-slate-700 font-medium">{tipo.nombre}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-white flex justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
