import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { CheckCircle, X } from 'lucide-react';

export default function UpdatePrompt() {
  const [showBanner, setShowBanner] = useState(false);
  const [isUpdated,  setIsUpdated]  = useState(false);

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

  // Mostrar aviso cuando el nuevo SW toma control (autoUpdate)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Si ya había un SW activo, el próximo controllerchange es una actualización
    const hadController = !!navigator.serviceWorker.controller;

    const handleControllerChange = () => {
      if (!hadController) return; // primera instalación, no es actualización
      setIsUpdated(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 6000);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className="fixed left-0 right-0 md:left-auto md:right-4 md:w-80 z-[9999]"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        className="mx-4 md:mx-0 mt-3 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3"
        style={{
          background: isUpdated ? '#0f766e' : '#1e293b',
          animation: 'slideDown 0.3s ease-out',
        }}
      >
        <CheckCircle size={20} className={isUpdated ? 'text-teal-200 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">
            {isUpdated ? 'App actualizada' : 'Nueva versión disponible'}
          </p>
          <p className={`text-xs mt-0.5 ${isUpdated ? 'text-teal-200' : 'text-slate-400'}`}>
            {isUpdated ? 'Ya estás usando la última versión' : 'Recarga la página para aplicar los cambios'}
          </p>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="flex-shrink-0 p-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
          title="Cerrar"
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
