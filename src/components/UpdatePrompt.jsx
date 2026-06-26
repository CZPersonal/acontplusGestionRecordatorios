import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdatePrompt() {
  const [showBanner, setShowBanner] = useState(false);

  // Verificar actualizaciones cada hora
  useRegisterSW({
    onRegistered(r) {
      if (!r) return;
      r.update();
      setInterval(() => r.update(), 60 * 60 * 1000);
    },
    onRegisteredSW() {},
    onNeedRefresh()  {},
    onOfflineReady() {},
  });

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Guardar si había un SW activo al cargar la página (si no, es primera instalación)
    const hadController = !!navigator.serviceWorker.controller;

    navigator.serviceWorker.ready.then(registration => {
      registration.addEventListener('updatefound', () => {
        const newSW = registration.installing;
        if (!newSW) return;

        newSW.addEventListener('statechange', () => {
          // Solo mostrar banner cuando el nuevo SW está completamente activado
          // y había uno anterior (no es primera instalación).
          // En este punto el nuevo cache está completo y es seguro recargar.
          if (newSW.state === 'activated' && hadController) {
            setShowBanner(true);
          }
        });
      });
    });
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className="fixed left-0 right-0 md:left-auto md:right-4 md:w-80 z-[9999]"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        className="mx-4 md:mx-0 mt-3 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3"
        style={{ background: '#1e293b', animation: 'slideDown 0.3s ease-out' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">🔄 Nueva versión disponible</p>
          <p className="text-xs text-slate-400 mt-0.5">Toca Recargar para aplicar la actualización</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white active:scale-95 transition-transform"
          style={{ background: '#D61672' }}
        >
          <RefreshCw size={12} />
          Recargar
        </button>
        <button
          onClick={() => setShowBanner(false)}
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
