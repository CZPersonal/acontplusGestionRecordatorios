import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAppStore } from './lib/store';
import { useTasks } from './hooks/useTasks';
import { useNotifications } from './hooks/useNotifications';
import { useClients } from './hooks/useClients';
import { useServiceTypes } from './hooks/useServiceTypes';
import { useExportConfig } from './hooks/useExportConfig.js';
import Login from './components/Login.jsx';
import AppRouter from './components/AppRouter.jsx';

export default function App() {
  const user          = useAppStore(s => s.user);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);
  const isLoadingTasks = useAppStore(s => s.isLoadingTasks);
  const tasks          = useAppStore(s => s.tasks);

  // ─── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      useAppStore.setState({ user: u, isAuthLoading: false });
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

  // ─── Firestore subscriptions (sincronizan su estado al store internamente) ─
  useTasks(user);
  useClients(user);
  useServiceTypes(user);
  useExportConfig(user);

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

  if (!user) return <Login />;

  return <AppRouter />;
}
