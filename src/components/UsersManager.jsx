import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { X, Shield, Wrench, Users, Loader2 } from 'lucide-react';

export default function UsersManager({ onClose }) {
  const tenantId = useAppStore(s => s.tenantId);
  const currentUser = useAppStore(s => s.user);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    getDocs(collection(db, 'tenants', tenantId, 'members'))
      .then(snap => {
        const list = snap.docs.map(d => ({ uid: d.id, role: 'admin', ...d.data() }));
        list.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        setMembers(list);
      })
      .catch(e => { console.error(e); setError('No se pudo cargar la lista de usuarios.'); })
      .finally(() => setLoading(false));
  }, [tenantId]);

  const handleRoleChange = async (uid, newRole) => {
    setSaving(uid);
    setError('');
    try {
      await updateDoc(doc(db, 'tenants', tenantId, 'members', uid), { role: newRole });
      setMembers(prev => prev.map(m => m.uid === uid ? { ...m, role: newRole } : m));
    } catch (e) {
      console.error(e);
      setError('No se pudo cambiar el rol. Verifica permisos.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
              <Users size={18} className="text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Usuarios y roles</h3>
              <p className="text-xs text-slate-400">Gestiona el acceso de cada miembro</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin miembros registrados</p>
              <p className="text-xs mt-1 text-slate-300">
                Los usuarios aparecen aquí cuando inician sesión por primera vez.
              </p>
            </div>
          ) : (
            members.map(member => {
              const isMe = member.uid === currentUser?.uid;
              return (
                <div key={member.uid}
                  className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      member.role === 'admin' ? 'bg-blue-100' : 'bg-amber-100'
                    }`}>
                      {member.role === 'admin'
                        ? <Shield size={16} className="text-blue-600" />
                        : <Wrench size={16} className="text-amber-600" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {member.email}
                        {isMe && <span className="ml-1.5 text-xs font-normal text-slate-400">(tú)</span>}
                      </p>
                      {member.joinedAt && (
                        <p className="text-xs text-slate-400">
                          Desde {member.joinedAt.slice(0, 10)}
                        </p>
                      )}
                    </div>
                  </div>

                  <select
                    value={member.role || 'admin'}
                    disabled={saving === member.uid || isMe}
                    onChange={e => handleRoleChange(member.uid, e.target.value)}
                    className="text-xs font-semibold border-2 border-slate-200 rounded-lg px-2 py-1.5 bg-white disabled:opacity-50 focus:outline-none focus:border-blue-400"
                    title={isMe ? 'No puedes cambiar tu propio rol' : ''}
                  >
                    <option value="admin">Admin</option>
                    <option value="tecnico">Técnico</option>
                  </select>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-400 text-center">
            Los técnicos acceden a un portal simplificado con sus visitas asignadas.
            Los administradores tienen acceso completo al sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
