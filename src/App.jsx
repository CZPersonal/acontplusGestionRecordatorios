import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useAppStore } from './lib/store';
import { useTasks } from './hooks/useTasks';
import { useNotifications } from './hooks/useNotifications';
import { useClients } from './hooks/useClients';
import { useServiceTypes } from './hooks/useServiceTypes';
import { useExportConfig } from './hooks/useExportConfig.js';
import Login from './components/Login.jsx';
import TenantSetup from './components/TenantSetup.jsx';
import AppRouter from './components/AppRouter.jsx';

export default function App() {
  const user           = useAppStore(s => s.user);
  const isAuthLoading  = useAppStore(s => s.isAuthLoading);
  const tenantId       = useAppStore(s => s.tenantId);
  const isLoadingTasks = useAppStore(s => s.isLoadingTasks);
  const tasks          = useAppStore(s => s.tasks);

  // ─── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Actualizar lastLogin sin sobreescribir tenantId existente
        await setDoc(
          doc(db, 'users', u.uid),
          { email: u.email, lastLogin: new Date().toISOString() },
          { merge: true }
        );
        // Leer tenantId del perfil — null si aún no está en ninguna empresa
        const snap = await getDoc(doc(db, 'users', u.uid));
        const tid  = snap.exists() ? (snap.data().tenantId ?? null) : null;
        const tname = tid
          ? await getDoc(doc(db, 'tenants', tid)).then(d => d.data()?.name ?? '')
          : '';
        useAppStore.setState({ user: u, tenantId: tid, tenantName: tname, isAuthLoading: false });
      } else {
        useAppStore.setState({ user: null, tenantId: null, tenantName: '', isAuthLoading: false });
      }
    });
    return () => unsub();
  }, []);

  // ─── Network ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const on  = () => useAppStore.setState({ isOnline: true });
    const off = () => useAppStore.setState({ isOnline: false });
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // effectiveUser es null hasta que tenantId esté listo:
  // así, los hooks de Firestore no arrancan antes de que getCollectionRef
  // pueda construir el path correcto de tenants/{tenantId}/...
  const effectiveUser = user && tenantId ? user : null;

  // ─── Firestore subscriptions (sincronizan su estado al store internamente) ─
  useTasks(effectiveUser);
  useClients(effectiveUser);
  useServiceTypes(effectiveUser);
  useExportConfig(effectiveUser);

  // ─── Notificaciones ────────────────────────────────────────────────────────
  const {
    permission, requestPermission, toasts,
    removeToast, showAlerts, addToast,
  } = useNotifications(tasks);

  useEffect(() => {
    useAppStore.setState({
      toasts,
      removeToast,
      addToast,
      notificationPermission:  permission,
      showAlerts,
      requestNotifications:    requestPermission,
    });
  }, [toasts, removeToast, addToast, permission, showAlerts, requestPermission]);

  // ─── Guards ────────────────────────────────────────────────────────────────
  if (isAuthLoading || (isLoadingTasks && tasks.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <img src="/logo.png" alt="Acontplus" className="w-20 h-20 object-contain mb-4 animate-bounce" />
        <p className="text-sm font-semibold" style={{ color: '#D61672' }}>Cargando...</p>
      </div>
    );
  }

  if (!user)     return <Login />;
  if (!tenantId) return <TenantSetup />;

  return <AppRouter />;
}
