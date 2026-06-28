import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { X, Building2, Plus, Edit2, Trash2, MapPin } from 'lucide-react';

export default function EstablecimientosManager({ user, onClose }) {
  const establecimientos      = useAppStore(s => s.establecimientos);
  const addEstablecimiento    = useAppStore(s => s.addEstablecimiento);
  const updateEstablecimiento = useAppStore(s => s.updateEstablecimiento);
  const deleteEstablecimiento = useAppStore(s => s.deleteEstablecimiento);
  const tenantId              = useAppStore(s => s.tenantId);

  const [tab,        setTab]       = useState('establecimientos');
  const [editingId,  setEditingId] = useState(null);
  const [draft,      setDraft]     = useState({ nombre: '', codigo: '', direccion: '' });
  const [isAdding,   setIsAdding]  = useState(false);
  const [busy,       setBusy]      = useState(false);

  const [members,        setMembers]        = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [savingMember,   setSavingMember]   = useState(null);

  useEffect(() => {
    if (tab !== 'asignaciones' || !tenantId) return;
    setLoadingMembers(true);
    getDocs(collection(db, 'tenants', tenantId, 'members'))
      .then(snap => {
        const list = snap.docs
          .map(d => ({ uid: d.id, email: '', role: 'admin', establecimientos: [], establecimientoDefault: null, ...d.data() }))
          .sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        setMembers(list);
      })
      .catch(console.error)
      .finally(() => setLoadingMembers(false));
  }, [tab, tenantId]);

  const handleSaveEst = async () => {
    if (!draft.nombre.trim()) return;
    setBusy(true);
    if (editingId) {
      await updateEstablecimiento(editingId, draft);
      setEditingId(null);
    } else {
      await addEstablecimiento(draft);
      setIsAdding(false);
    }
    setDraft({ nombre: '', codigo: '', direccion: '' });
    setBusy(false);
  };

  const handleToggleEst = async (memberUid, estId) => {
    const m = members.find(x => x.uid === memberUid);
    if (!m) return;
    const current = m.establecimientos || [];
    const updated = current.includes(estId)
      ? current.filter(id => id !== estId)
      : [...current, estId];
    const newDefault = m.establecimientoDefault === estId && !updated.includes(estId)
      ? (updated[0] || null)
      : m.establecimientoDefault;
    setSavingMember(memberUid);
    try {
      await updateDoc(doc(db, 'tenants', tenantId, 'members', memberUid), {
        establecimientos: updated,
        establecimientoDefault: newDefault,
      });
      setMembers(prev => prev.map(x => x.uid === memberUid
        ? { ...x, establecimientos: updated, establecimientoDefault: newDefault }
        : x
      ));
    } catch (err) { console.error(err); }
    finally { setSavingMember(null); }
  };

  const handleSetDefault = async (memberUid, estId) => {
    const m = members.find(x => x.uid === memberUid);
    if (!m) return;
    const current = m.establecimientos || [];
    const updated = current.includes(estId) ? current : [...current, estId];
    setSavingMember(memberUid);
    try {
      await updateDoc(doc(db, 'tenants', tenantId, 'members', memberUid), {
        establecimientos: updated,
        establecimientoDefault: estId,
      });
      setMembers(prev => prev.map(x => x.uid === memberUid
        ? { ...x, establecimientos: updated, establecimientoDefault: estId }
        : x
      ));
    } catch (err) { console.error(err); }
    finally { setSavingMember(null); }
  };

  const inp = 'w-full border-2 border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-400 bg-white transition-colors';
  const lbl = 'block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center">
              <Building2 size={18} className="text-cyan-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Establecimientos</h3>
              <p className="text-xs text-slate-400">Sucursales y puntos de atención</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3">
          {[
            { id: 'establecimientos', label: 'Establecimientos' },
            { id: 'asignaciones',     label: 'Asignar a usuarios' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                tab === t.id ? 'bg-cyan-100 text-cyan-700' : 'text-slate-500 hover:bg-slate-100'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* ── Establecimientos CRUD ── */}
          {tab === 'establecimientos' && (
            <>
              {establecimientos.length === 0 && !isAdding && (
                <div className="text-center py-10 text-slate-400">
                  <Building2 size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aún no hay establecimientos</p>
                </div>
              )}

              {establecimientos.map(est => (
                <div key={est.id} className="border-2 border-slate-200 rounded-xl p-3">
                  {editingId === est.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={lbl}>Nombre *</label>
                          <input autoFocus value={draft.nombre}
                            onChange={e => setDraft(p => ({ ...p, nombre: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleSaveEst()}
                            className={inp} />
                        </div>
                        <div>
                          <label className={lbl}>Código</label>
                          <input value={draft.codigo}
                            onChange={e => setDraft(p => ({ ...p, codigo: e.target.value }))}
                            placeholder="001" className={inp} />
                        </div>
                      </div>
                      <div>
                        <label className={lbl}>Dirección</label>
                        <input value={draft.direccion}
                          onChange={e => setDraft(p => ({ ...p, direccion: e.target.value }))}
                          className={inp} />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button onClick={handleSaveEst} disabled={busy || !draft.nombre.trim()}
                          className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-bold hover:bg-cyan-700 disabled:opacity-50">
                          {busy ? '...' : 'Guardar'}
                        </button>
                        <button onClick={() => { setEditingId(null); setDraft({ nombre: '', codigo: '', direccion: '' }); }}
                          className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {est.nombre}
                          {est.codigo && <span className="ml-2 text-xs font-mono text-slate-400">({est.codigo})</span>}
                        </p>
                        {est.direccion && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={10} />{est.direccion}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => {
                          setEditingId(est.id);
                          setDraft({ nombre: est.nombre, codigo: est.codigo || '', direccion: est.direccion || '' });
                          setIsAdding(false);
                        }} className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={async () => { setBusy(true); await deleteEstablecimiento(est.id); setBusy(false); }}
                          disabled={busy}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isAdding ? (
                <div className="border-2 border-dashed border-cyan-200 rounded-xl p-4 bg-cyan-50/50 space-y-2">
                  <p className="text-xs font-bold text-cyan-700 uppercase tracking-wide">Nuevo establecimiento</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={lbl}>Nombre *</label>
                      <input autoFocus value={draft.nombre}
                        onChange={e => setDraft(p => ({ ...p, nombre: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEst()}
                        placeholder="Ej: Matriz Quito" className={inp} />
                    </div>
                    <div>
                      <label className={lbl}>Código</label>
                      <input value={draft.codigo}
                        onChange={e => setDraft(p => ({ ...p, codigo: e.target.value }))}
                        placeholder="001" className={inp} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Dirección</label>
                    <input value={draft.direccion}
                      onChange={e => setDraft(p => ({ ...p, direccion: e.target.value }))}
                      placeholder="Av. Principal 123" className={inp} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSaveEst} disabled={busy || !draft.nombre.trim()}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-xl text-xs font-bold hover:bg-cyan-700 disabled:opacity-50">
                      {busy ? '...' : 'Guardar'}
                    </button>
                    <button onClick={() => { setIsAdding(false); setDraft({ nombre: '', codigo: '', direccion: '' }); }}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setIsAdding(true); setEditingId(null); setDraft({ nombre: '', codigo: '', direccion: '' }); }}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-semibold text-slate-500 hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50/50 transition-colors">
                  <Plus size={16} /> Agregar establecimiento
                </button>
              )}
            </>
          )}

          {/* ── Asignaciones ── */}
          {tab === 'asignaciones' && (
            <>
              <p className="text-xs text-slate-500 px-1">
                Asigna los establecimientos accesibles para cada usuario. Marca ⭐ para definir el establecimiento predeterminado al crear visitas. Los administradores ven todos los establecimientos por defecto.
              </p>

              {loadingMembers && (
                <div className="text-center py-8 text-slate-400 text-sm">Cargando usuarios...</div>
              )}

              {!loadingMembers && establecimientos.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Primero crea establecimientos en la pestaña anterior.
                </div>
              )}

              {!loadingMembers && establecimientos.length > 0 && members.map(m => (
                <div key={m.uid} className="border-2 border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {(m.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{m.email}</p>
                      <p className="text-xs text-slate-400">{m.role === 'admin' ? '🛡️ Admin' : '👷 Técnico'}</p>
                    </div>
                    {savingMember === m.uid && (
                      <span className="text-xs text-slate-400">Guardando...</span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {establecimientos.map(est => {
                      const assigned  = (m.establecimientos || []).includes(est.id);
                      const isDefault = m.establecimientoDefault === est.id;
                      return (
                        <div key={est.id}
                          className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                            assigned ? 'border-cyan-200 bg-cyan-50' : 'border-slate-100 bg-white hover:bg-slate-50'
                          }`}>
                          <input type="checkbox" checked={assigned}
                            onChange={() => handleToggleEst(m.uid, est.id)}
                            className="w-4 h-4 rounded accent-cyan-600 flex-shrink-0" />
                          <span className="text-sm text-slate-700 flex-1">
                            {est.nombre}
                            {est.codigo && <span className="ml-1.5 text-xs text-slate-400 font-mono">({est.codigo})</span>}
                          </span>
                          {assigned && (
                            <button
                              onClick={() => handleSetDefault(m.uid, est.id)}
                              title={isDefault ? 'Establecimiento predeterminado' : 'Marcar como predeterminado'}
                              className={`text-base transition-colors ${isDefault ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}>
                              ⭐
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
