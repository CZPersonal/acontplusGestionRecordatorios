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

    // Fuerza a cualquier Service Worker ya registrado (p. ej. uno antiguo que
    // quedó cacheando agresivamente antes de migrar a este sistema de
    // polling) a re-chequear su script de inmediato, en vez de esperar el
    // heurístico pasivo del navegador (~24h) — ese SW viejo puede estar
    // sirviendo un index.html/JS obsoleto para siempre si nadie lo fuerza.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => regs.forEach(reg => reg.update().catch(() => {})))
        .catch(() => {});
    }

    // Primera comprobación a los 30 s (dar tiempo a que el SW kill-switch termine)
    const firstTimer = setTimeout(check, 30_000);
    intervalRef.current = setInterval(check, POLL_INTERVAL);

    // Re-chequear de inmediato al volver a la app: en móvil el navegador suele
    // congelar temporizadores en segundo plano, así que sin esto la próxima
    // comprobación podría tardar mucho más de 60s tras reabrir la PWA.
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      clearTimeout(firstTimer);
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
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
