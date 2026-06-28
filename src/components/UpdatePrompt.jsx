import { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

const CURRENT_HASH = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : null;
const POLL_INTERVAL = 60_000; // 60 segundos

export default function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isReloading, setIsReloading]         = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!CURRENT_HASH) return; // dev mode sin hash definido

    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { v } = await res.json();
        if (v && v !== CURRENT_HASH) setUpdateAvailable(true);
      } catch {
        // sin conexión o archivo no existe — ignorar
      }
    };

    // Primera comprobación a los 30 s (dar tiempo a que el SW kill-switch termine)
    const firstTimer = setTimeout(check, 30_000);
    intervalRef.current = setInterval(check, POLL_INTERVAL);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(intervalRef.current);
    };
  }, []);

  const handleUpdate = () => {
    setIsReloading(true);
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3
                 bg-slate-800 text-white px-4 py-3 shadow-lg"
      role="alert"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-lg">🆕</span>
        <span>Nueva versión disponible — recarga para actualizar</span>
      </div>
      <button
        onClick={handleUpdate}
        disabled={isReloading}
        className="flex items-center gap-2 rounded-lg bg-[#D61672] hover:bg-pink-600
                   disabled:opacity-60 px-4 py-1.5 text-sm font-bold transition-colors"
      >
        <RefreshCw size={14} className={isReloading ? 'animate-spin' : ''} />
        {isReloading ? 'Actualizando…' : 'Actualizar'}
      </button>
    </div>
  );
}
