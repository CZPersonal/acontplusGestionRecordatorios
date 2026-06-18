import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('login'); // 'login' | 'reset'
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Email o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email.trim()) { setError('Ingresa tu email primero.'); return; }
    setError(''); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err) {
      setError('No se encontró una cuenta con ese email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #D61672 0%, #a8105a 50%, #7a0c42 100%)' }}>

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header con logo */}
        <div className="px-8 pt-10 pb-6 text-center"
          style={{ background: 'linear-gradient(180deg, #fff8fb 0%, #ffffff 100%)' }}>
          <img
            src="/logo.png"
            alt="Acontplus"
            className="w-20 h-20 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold" style={{ color: '#D61672' }}>
            ACONTPLUS
          </h1>
          <p className="text-sm font-medium mt-0.5" style={{ color: '#FFA901' }}>
            Recordatorios
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Facturar nunca fue tan fácil
          </p>
        </div>

        {/* Formulario */}
        <div className="px-8 pb-8">
          <h2 className="text-base font-semibold text-slate-700 mb-5 text-center">
            {view === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}
          </h2>

          {/* ── Login ── */}
          {view === 'login' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                  onFocus={e => e.target.style.borderColor = '#D61672'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => { setView('reset'); setError(''); setResetSent(false); }}
                    className="text-xs font-medium hover:underline"
                    style={{ color: '#D61672' }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                  onFocus={e => e.target.style.borderColor = '#D61672'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && handleSubmit(e)}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !email || !password}
                className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #D61672, #FFA901)' }}
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </div>
          )}

          {/* ── Recuperar contraseña ── */}
          {view === 'reset' && (
            <div className="space-y-4">
              {resetSent ? (
                <div className="text-center space-y-3 py-2">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <span className="text-2xl">✉️</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Email enviado</p>
                  <p className="text-xs text-slate-500">
                    Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue el enlace para restablecer tu contraseña.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 text-center">
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleReset()}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                      onFocus={e => e.target.style.borderColor = '#D61672'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      placeholder="tu@email.com"
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleReset}
                    disabled={loading || !email}
                    className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #D61672, #FFA901)' }}
                  >
                    {loading ? 'Enviando...' : 'Enviar enlace'}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => { setView('login'); setError(''); setResetSent(false); }}
                className="w-full text-xs font-medium text-slate-500 hover:text-slate-700 pt-1"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          )}

          <p className="text-center text-xs text-slate-400 mt-6">
            Acontplus © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}