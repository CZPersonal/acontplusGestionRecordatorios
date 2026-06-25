import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useAppStore } from './lib/store';
import { useTasks } from './hooks/useTasks';
import { useNotifications } from './hooks/useNotifications';
import { useClients } from './hooks/useClients';
import { useServiceTypes } from './hooks/useServiceTypes';
import { useExportConfig } from './hooks/useExportConfig.js';
import Login from './components/Login.jsx';
import TenantSetup from './components/TenantSetup.jsx';
import CompanySelector from './components/CompanySelector.jsx';
import AppRouter from './components/AppRouter.jsx';
import TechPortal from './components/TechPortal.jsx';

export default function App() {
  const user             = useAppStore(s => s.user);
  const isAuthLoading    = useAppStore(s => s.isAuthLoading);
  const tenantId         = useAppStore(s => s.tenantId);
  const tenantIds        = useAppStore(s => s.tenantIds);
  const isLoadingTasks   = useAppStore(s => s.isLoadingTasks);
  const tasks            = useAppStore(s => s.tasks);
  const userRole         = useAppStore(s => s.userRole);

  // ─── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Fire-and-forget: se encola offline, no bloquea el arranque
        setDoc(doc(db, 'users', u.uid), { email: u.email, lastLogin: new Date().toISOString() }, { merge: true })
          .catch(() => {});

        let userData = {};
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          userData = snap.exists() ? snap.data() : {};
        } catch {
          // Sin red y sin caché — continuar con datos vacíos
        }

        // Migrar tenantId (string) → tenantIds (array) si es necesario
        let ids = userData.tenantIds ?? [];
        if (ids.length === 0 && userData.tenantId) {
          ids = [userData.tenantId];
          setDoc(doc(db, 'users', u.uid), { tenantIds: arrayUnion(userData.tenantId) }, { merge: true })
            .catch(() => {});
        }

        if (ids.length === 0) {
          // Sin empresa — mostrar TenantSetup
          useAppStore.setState({ user: u, tenantId: null, tenantIds: [], availableTenants: [], tenantName: '', tenantRuc: '', isAuthLoading: false });
        } else if (ids.length === 1) {
          // Una sola empresa — seleccionar automáticamente
          try {
            const [td, memberSnap] = await Promise.all([
              getDoc(doc(db, 'tenants', ids[0])),
              getDoc(doc(db, 'tenants', ids[0], 'members', u.uid)),
            ]);
            let role = 'admin';
            if (memberSnap.exists()) {
              role = memberSnap.data().role || 'admin';
            } else {
              setDoc(doc(db, 'tenants', ids[0], 'members', u.uid), {
                uid: u.uid, email: u.email, role: 'admin', joinedAt: new Date().toISOString(),
              }).catch(() => {});
            }
            useAppStore.setState({ user: u, tenantId: ids[0], tenantIds: ids, availableTenants: [], tenantName: td.data()?.name ?? '', tenantRuc: td.data()?.ruc ?? '', userRole: role, isAuthLoading: false });
          } catch {
            // Sin red: usar tenant conocido con rol por defecto
            useAppStore.setState({ user: u, tenantId: ids[0], tenantIds: ids, availableTenants: [], tenantName: '', tenantRuc: '', userRole: 'tecnico', isAuthLoading: false });
          }
        } else {
          // Múltiples empresas — cargar lista y mostrar selector
          try {
            const docs = await Promise.all(ids.map(id => getDoc(doc(db, 'tenants', id))));
            const available = docs.map(d => ({ id: d.id, name: d.data()?.name ?? '', ruc: d.data()?.ruc ?? '' }));
            useAppStore.setState({ user: u, tenantId: null, tenantIds: ids, availableTenants: available, tenantName: '', tenantRuc: '', isAuthLoading: false });
          } catch {
            useAppStore.setState({ user: u, tenantId: null, tenantIds: ids, availableTenants: [], tenantName: '', tenantRuc: '', isAuthLoading: false });
          }
        }
      } else {
        useAppStore.setState({ user: null, tenantId: null, tenantIds: [], availableTenants: [], tenantName: '', tenantRuc: '', isAuthLoading: false });
      }
    });
    return () => unsub();
  }, []);

  // ─── Role refresh (multi-tenant: cuando el usuario selecciona empresa) ─────
  useEffect(() => {
    if (!user || !tenantId) return;
    getDoc(doc(db, 'tenants', tenantId, 'members', user.uid))
      .then(async snap => {
        if (snap.exists()) {
          useAppStore.setState({ userRole: snap.data().role || 'admin' });
        } else {
          // Usuario existente sin registro de rol → crearlo como admin
          await setDoc(doc(db, 'tenants', tenantId, 'members', user.uid), {
            uid: user.uid, email: user.email, role: 'admin', joinedAt: new Date().toISOString(),
          });
          useAppStore.setState({ userRole: 'admin' });
        }
      })
      .catch(() => {});
  }, [user?.uid, tenantId]);

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
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <img src="/logo.png" alt="Acontplus" className="w-20 h-20 object-contain mb-4 animate-bounce" />
        <p className="text-sm font-semibold" style={{ color: '#D61672' }}>Cargando...</p>
      </div>
    );
  }

  if (!user)                                         return <Login />;
  if (tenantIds.length === 0)                        return <TenantSetup />;
  if (!tenantId && tenantIds.length > 1)             return <CompanySelector />;

  if (isLoadingTasks && tasks.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <img src="/logo.png" alt="Acontplus" className="w-20 h-20 object-contain mb-4 animate-bounce" />
        <p className="text-sm font-semibold" style={{ color: '#D61672' }}>Cargando...</p>
      </div>
    );
  }

  if (userRole === 'tecnico') return <TechPortal user={user} />;
  return <AppRouter />;
}
