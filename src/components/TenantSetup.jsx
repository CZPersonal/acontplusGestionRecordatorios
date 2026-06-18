import { useState } from 'react';
import { doc, setDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { Building2, Users, Copy, Check } from 'lucide-react';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateJoinCode = () =>
  Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

export default function TenantSetup() {
  const user = useAppStore(s => s.user);
  const [tab,       setTab]       = useState('create'); // 'create' | 'join'
  const [name,      setName]      = useState('');
  const [ruc,       setRuc]       = useState('');
  const [joinCode,  setJoinCode]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [created,   setCreated]   = useState(null); // { tenantId, joinCode }
  const [copied,    setCopied]    = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { setError('Ingresa el nombre de la empresa.'); return; }
    if (!/^\d{13}$/.test(ruc.trim())) { setError('El RUC debe tener exactamente 13 dígitos.'); return; }
    setError(''); setLoading(true);
    try {
      const tenantId = crypto.randomUUID();
      const code     = generateJoinCode();
      await setDoc(doc(db, 'tenants', tenantId), {
        id:        tenantId,
        name:      name.trim(),
        ruc:       ruc.trim(),
        joinCode:  code,
        adminUid:  user.uid,
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'users', user.uid), { tenantId, email: user.email }, { merge: true });
      setCreated({ tenantId, joinCode: code });
      useAppStore.setState({ tenantId, tenantName: name.trim() });
    } catch (e) {
      setError('Error al crear la empresa. Intenta de nuevo.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) { setError('El código debe tener 6 caracteres.'); return; }
    setError(''); setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'tenants'), where('joinCode', '==', code))
      );
      if (snap.empty) { setError('Código incorrecto. Verifica con el administrador.'); return; }
      const tenant = snap.docs[0].data();
      await setDoc(doc(db, 'users', user.uid), { tenantId: tenant.id, email: user.email }, { merge: true });
      useAppStore.setState({ tenantId: tenant.id, tenantName: tenant.name });
    } catch (e) {
      setError('Error al unirse. Intenta de nuevo.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(created.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Pantalla de éxito: tenant creado, muestra el código
  if (created) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">¡Empresa creada!</h2>
          <p className="text-sm text-slate-500">
            Comparte este código con tus compañeros para que se unan:
          </p>
          <div className="flex items-center justify-center gap-3 bg-slate-100 rounded-xl px-4 py-3">
            <span className="text-2xl font-mono font-bold tracking-widest text-slate-800">
              {created.joinCode}
            </span>
            <button onClick={copyCode} className="text-slate-400 hover:text-slate-700">
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Puedes consultarlo en cualquier momento en Configuración.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full space-y-6">

        <div className="text-center">
          <img src="/logo.png" alt="Acontplus" className="w-14 h-14 object-contain mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-800">Configura tu empresa</h1>
          <p className="text-sm text-slate-500 mt-1">
            Crea una nueva empresa o únete a una existente.
          </p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 rounded-xl p-1">
          {[
            { id: 'create', icon: <Building2 size={15} />, label: 'Crear empresa' },
            { id: 'join',   icon: <Users size={15} />,    label: 'Unirme' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); }}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Crear */}
        {tab === 'create' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Nombre de la empresa
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: Acontplus S.A.S"
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#D61672' }}
                onFocus={e => e.target.style.borderColor = '#D61672'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                RUC (13 dígitos)
              </label>
              <input
                type="text"
                value={ruc}
                onChange={e => setRuc(e.target.value.replace(/\D/g, '').slice(0, 13))}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="0000000000001"
                maxLength={13}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#D61672' }}
                onFocus={e => e.target.style.borderColor = '#D61672'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}
            >
              {loading ? 'Creando...' : 'Crear empresa'}
            </button>
          </div>
        )}

        {/* Unirse */}
        {tab === 'join' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Código de invitación
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="ABC123"
                maxLength={6}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm font-mono tracking-widest text-center uppercase focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#D61672' }}
                onFocus={e => e.target.style.borderColor = '#D61672'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}
            >
              {loading ? 'Verificando...' : 'Unirme a la empresa'}
            </button>
          </div>
        )}

        <p className="text-xs text-center text-slate-400">{user?.email}</p>
      </div>
    </div>
  );
}
