import { useState } from 'react';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../lib/firebase';

// Pantalla de confirmación de restablecimiento de contraseña, propia de la app
// (no la página por defecto de Firebase). El primer paso ("interstitial") no
// hace ninguna llamada a Firebase — el código de un solo uso (oobCode) solo se
// valida/consume cuando el usuario hace clic real, para que un escaneo
// automático de enlaces de seguridad del correo (que solo "mira" la página, sin
// interactuar) no lo invalide antes de que el usuario llegue a usarlo.
export default function ResetPasswordConfirm({ oobCode }) {
  const [step, setStep] = useState('interstitial'); // 'interstitial' | 'form' | 'success' | 'error'
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const errorMessage = (err) => {
    if (err.code === 'auth/expired-action-code' || err.code === 'auth/invalid-action-code') {
      return 'Este enlace ya expiró o ya fue usado. Solicita uno nuevo desde la pantalla de inicio de sesión.';
    }
    if (err.code === 'auth/user-disabled' || err.code === 'auth/user-not-found') {
      return 'No se encontró una cuenta válida para este enlace.';
    }
    return 'No se pudo procesar la solicitud. Intenta solicitar un nuevo enlace.';
  };

  const handleContinue = async () => {
    setError(''); setLoading(true);
    try {
      const userEmail = await verifyPasswordResetCode(auth, oobCode);
      setEmail(userEmail);
      setStep('form');
    } catch (err) {
      setError(errorMessage(err));
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    setError(''); setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStep('success');
    } catch (err) {
      setError(errorMessage(err));
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #D61672 0%, #a8105a 50%, #7a0c42 100%)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-8 pt-10 pb-6 text-center"
          style={{ background: 'linear-gradient(180deg, #fff8fb 0%, #ffffff 100%)' }}>
          <img src="/logo.png" alt="Acontplus" className="w-20 h-20 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold" style={{ color: '#D61672' }}>ACONTPLUS</h1>
          <p className="text-sm font-medium mt-0.5" style={{ color: '#FFA901' }}>Recordatorios</p>
        </div>

        <div className="px-8 pb-8">
          {step === 'interstitial' && (
            <div className="space-y-4 text-center">
              <h2 className="text-base font-semibold text-slate-700">Restablecer contraseña</h2>
              <p className="text-sm text-slate-500">
                Toca el botón para continuar con el restablecimiento de tu contraseña.
              </p>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 text-left">
                  {error}
                </div>
              )}
              <button onClick={handleContinue} disabled={loading}
                className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm tracking-wide disabled:opacity-50 shadow-lg"
                style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                {loading ? 'Verificando...' : 'Continuar'}
              </button>
            </div>
          )}

          {step === 'form' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-700 text-center">Nueva contraseña</h2>
              <p className="text-xs text-slate-400 text-center">Para la cuenta <strong>{email}</strong></p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl pl-4 pr-11 py-3 text-sm focus:outline-none transition-colors"
                      onFocus={e => e.target.style.borderColor = '#D61672'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-0 top-0 h-full px-3 flex items-center text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Confirmar contraseña
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                    onFocus={e => e.target.style.borderColor = '#D61672'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    placeholder="••••••••"
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading || !newPassword || !confirmPassword}
                  className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm tracking-wide disabled:opacity-50 shadow-lg"
                  style={{ background: loading ? '#94a3b8' : 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                  {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </form>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-3 py-2">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle size={28} className="text-green-600" />
              </div>
              <p className="text-sm font-semibold text-slate-700">¡Contraseña actualizada!</p>
              <p className="text-xs text-slate-500">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button onClick={() => { window.location.href = '/'; }}
                className="w-full text-white font-bold py-3 rounded-xl transition-all text-sm tracking-wide shadow-lg"
                style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}>
                Ir a iniciar sesión
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="space-y-4 text-center">
              <div className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 text-left">
                {error}
              </div>
              <button onClick={() => { window.location.href = '/'; }}
                className="w-full py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Volver al inicio de sesión
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
