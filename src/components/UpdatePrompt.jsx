import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (!r) return;
      // Verificar inmediatamente al registrar
      r.update();
      // Verificar cada hora
      setInterval(() => r.update(), 60 * 60 * 1000);
    },
    onRegisterError(e) {
      console.error('SW registration error:', e);
    },
  });

  useEffect(() => {
    // Verificar actualizacion cada vez que el usuario vuelve a la app
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker?.getRegistration().then(r => r?.update());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleUpdate = async () => {
    setNeedRefresh(false);
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        // Esperar brevemente a que el nuevo SW tome control
        await new Promise(r => setTimeout(r, 250));
      }
    } catch (e) {
      console.error('SW update error:', e);
    }
    window.location.reload();
  };

  if (!needRefresh) return null;

  return (
    <div
      className="fixed left-0 right-0 md:left-auto md:right-4 md:w-80 z-[9999]"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div
        className="mx-4 md:mx-0 mt-3 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3"
        style={{
          background: '#1e293b',
          animation: 'slideDown 0.3s ease-out',
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">🔄 Nueva versión disponible</p>
          <p className="text-xs text-slate-400 mt-0.5">Toca Actualizar para aplicar los cambios</p>
        </div>
        <button
          onClick={handleUpdate}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white active:scale-95 transition-transform"
          style={{ background: '#D61672' }}
        >
          <RefreshCw size={12} />
          Actualizar
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
          title="Ignorar"
        >
          <X size={14} />
        </button>
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
