import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Verificar actualizaciones cada hora
      r && setInterval(() => r.update(), 60 * 60 * 1000);
    },
    onRegisterError(e) {
      console.error('SW registration error:', e);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-fade-in">
      <div
        className="rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3"
        style={{ background: '#1e293b' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Nueva versión disponible</p>
          <p className="text-xs text-slate-400 mt-0.5">Toca Actualizar para aplicar los cambios</p>
        </div>
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-opacity hover:opacity-80 active:scale-95"
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
    </div>
  );
}
