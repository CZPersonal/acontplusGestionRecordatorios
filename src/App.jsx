import { useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, arrayUnion, disableNetwork, enableNetwork } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useAppStore } from './lib/store';
import { useTasks } from './hooks/useTasks';
import { useVisits } from './hooks/useVisits';
import { useNotifications } from './hooks/useNotifications';
import { useClients } from './hooks/useClients';
import { useServiceTypes } from './hooks/useServiceTypes';
import { useExportConfig } from './hooks/useExportConfig.js';
import { useEstablecimientos } from './hooks/useEstablecimientos';
import { useConfiguracion } from './hooks/useConfiguracion';
import Login from './components/Login.jsx';
import TenantSetup from './components/TenantSetup.jsx';
import CompanySelector from './components/CompanySelector.jsx';
import AppRouter from './components/AppRouter.jsx';
import TechPortal from './components/TechPortal.jsx';
import ResetPasswordConfirm from './components/ResetPasswordConfirm.jsx';
import { saveSession, loadSession } from './lib/session.js';

export default function App() {
  const user             = useAppStore(s => s.user);
  const isAuthLoading    = useAppStore(s => s.isAuthLoading);
  const tenantId         = useAppStore(s => s.tenantId);
  const tenantIds        = useAppStore(s => s.tenantIds);
  const isLoadingTasks   = useAppStore(s => s.isLoadingTasks);
  const tasks            = useAppStore(s => s.tasks);
  const userRole         = useAppStore(s => s.userRole);
  const isOnline         = useAppStore(s => s.isOnline);

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
          // Sin red y sin caché de Firestore — recuperar ids de localStorage
          const s = loadSession();
          if (s.tenantId) userData = { tenantIds: s.tenantIds || [s.tenantId] };
        }

        // Migrar tenantId (string) → tenantIds (array) si es necesario
        let ids = userData.tenantIds ?? [];
        if (ids.length === 0 && userData.tenantId) {
          ids = [userData.tenantId];
          setDoc(doc(db, 'users', u.uid), { tenantIds: arrayUnion(userData.tenantId) }, { merge: true })
            .catch(() => {});
        }

        if (ids.length === 0) {
          // Sin empresa en Firestore — solo rescatar localStorage si estamos
          // offline (Firestore no pudo confirmar el estado real) Y la sesión
          // guardada es de este mismo usuario. Si hay red, Firestore ya dio
          // la respuesta autoritativa (sin tenant) y no hay que usar datos
          // de otra sesión/usuario que haya quedado en este navegador.
          const s = loadSession();
          if (!navigator.onLine && s.tenantId && s.uid === u.uid) {
            useAppStore.setState({
              user: u, tenantId: s.tenantId, tenantIds: s.tenantIds || [s.tenantId],
              availableTenants: [], tenantName: s.tenantName || '', tenantRuc: s.tenantRuc || '',
              userRole: s.userRole || 'tecnico', isAuthLoading: false,
            });
          } else {
            useAppStore.setState({ user: u, tenantId: null, tenantIds: [], availableTenants: [], tenantName: '', tenantRuc: '', isAuthLoading: false });
          }
        } else if (ids.length === 1) {
          // Una sola empresa — seleccionar automáticamente
          try {
            const [td, memberSnap] = await Promise.all([
              getDoc(doc(db, 'tenants', ids[0])),
              getDoc(doc(db, 'tenants', ids[0], 'members', u.uid)),
            ]);
            let role = 'admin';
            let memberEsts = [];
            let memberEstDefault = null;
            if (memberSnap.exists()) {
              const md = memberSnap.data();
              role = md.role || 'admin';
              memberEsts = md.establecimientos || [];
              memberEstDefault = md.establecimientoDefault || null;
            } else {
              setDoc(doc(db, 'tenants', ids[0], 'members', u.uid), {
                uid: u.uid, email: u.email, role: 'admin', joinedAt: new Date().toISOString(),
              }).catch(() => {});
            }
            const tenantName = td.data()?.name ?? '';
            const tenantRuc  = td.data()?.ruc  ?? '';
            saveSession({ uid: u.uid, email: u.email, displayName: u.displayName || '', tenantId: ids[0], tenantIds: ids, userRole: role, tenantName, tenantRuc });
            useAppStore.setState({ user: u, tenantId: ids[0], tenantIds: ids, availableTenants: [], tenantName, tenantRuc, userRole: role, memberEstablecimientos: memberEsts, memberEstablecimientoDefault: memberEstDefault, isAuthLoading: false });
          } catch {
            // Sin red: usar tenant conocido, priorizar rol guardado en localStorage
            const s = loadSession();
            useAppStore.setState({
              user: u, tenantId: ids[0], tenantIds: ids, availableTenants: [],
              tenantName: s.tenantName || '', tenantRuc: s.tenantRuc || '',
              userRole: s.userRole || 'tecnico', isAuthLoading: false,
            });
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
        // Sin sesión Firebase: si estamos offline y hay sesión guardada, restaurar
        // sin mostrar pantalla de login (técnico de campo sin red)
        const s = loadSession();
        if (!navigator.onLine && s.uid && s.tenantId) {
          useAppStore.setState({
            user:          { uid: s.uid, email: s.email, displayName: s.displayName || s.email },
            tenantId:      s.tenantId,
            tenantIds:     s.tenantIds  || [s.tenantId],
            tenantName:    s.tenantName || '',
            tenantRuc:     s.tenantRuc  || '',
            userRole:      s.userRole   || 'tecnico',
            isAuthLoading: false,
          });
        } else {
          useAppStore.setState({ user: null, tenantId: null, tenantIds: [], availableTenants: [], tenantName: '', tenantRuc: '', isAuthLoading: false });
        }
      }
    });
    return () => unsub();
  }, []);

  // ─── Reconectar Firestore al volver de una pestaña inactiva por mucho rato ──
  // Las conexiones en tiempo real (onSnapshot) de una pestaña que llevó horas
  // en segundo plano (o la máquina entró en reposo) a veces quedan obsoletas
  // sin que el SDK lo detecte de inmediato — los cambios de otros usuarios
  // (ej. un técnico confirmando una visita) no llegaban hasta un refresco
  // manual (Ctrl+F5). Forzar un ciclo de desconexión/reconexión al volver a
  // primer plano, si estuvo oculta más de RECONNECT_THRESHOLD_MS, resuelve
  // esto sin necesidad de que el usuario recargue la página a mano.
  useEffect(() => {
    const RECONNECT_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutos
    let hiddenAt = null;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt === null) return;
      const elapsed = Date.now() - hiddenAt;
      hiddenAt = null;
      if (elapsed < RECONNECT_THRESHOLD_MS) return;
      try {
        await disableNetwork(db);
        await enableNetwork(db);
      } catch (e) {
        console.warn('Error al forzar reconexión de Firestore:', e);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ─── Role refresh + datos de establecimientos del miembro ────────────────
  useEffect(() => {
    if (!user || !tenantId) return;
    getDoc(doc(db, 'tenants', tenantId, 'members', user.uid))
      .then(async snap => {
        if (snap.exists()) {
          const d = snap.data();
          useAppStore.setState({
            userRole:                    d.role || 'admin',
            memberEstablecimientos:      d.establecimientos      || [],
            memberEstablecimientoDefault: d.establecimientoDefault || null,
          });
        } else {
          // Usuario existente sin registro de rol → crearlo como admin
          await setDoc(doc(db, 'tenants', tenantId, 'members', user.uid), {
            uid: user.uid, email: user.email, role: 'admin', joinedAt: new Date().toISOString(),
          });
          useAppStore.setState({ userRole: 'admin', memberEstablecimientos: [], memberEstablecimientoDefault: null });
        }
      })
      .catch(() => {});
  }, [user?.uid, tenantId]);

  // ─── Cierre de sesión forzado del técnico al cruzar la medianoche ──────────
  // El técnico debe volver a iniciar sesión cada nuevo día — se compara la
  // fecha (hora Ecuador) de su último inicio de sesión real contra la fecha
  // actual; si cambió el día, se cierra la sesión. Se revisa al cargar y luego
  // cada 5 minutos, para detectar el cruce aunque la app quede abierta toda la
  // noche. No aplica a admins ni a la sesión restaurada offline desde
  // localStorage (esa no tiene `metadata.lastSignInTime`, es un objeto plano).
  useEffect(() => {
    if (!user || userRole !== 'tecnico') return;
    const lastSignIn = user.metadata?.lastSignInTime;
    if (!lastSignIn) return;

    const ecuadorDateStr = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
    const signInDateStr  = ecuadorDateStr(new Date(lastSignIn));

    const checkAndSignOut = () => {
      if (ecuadorDateStr(new Date()) !== signInDateStr) signOut(auth);
    };

    checkAndSignOut();
    const interval = setInterval(checkAndSignOut, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, userRole]);

  // ─── Network ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const on = () => {
      useAppStore.setState({ isOnline: true });
      // Si el usuario fue restaurado desde localStorage (sin sesión Firebase real)
      // y el internet acaba de volver, limpiar el store para que vaya a Login y
      // se re-autentique con credenciales reales — de lo contrario Firestore
      // rechaza todas las lecturas con PERMISSION_DENIED.
      if (!auth.currentUser && useAppStore.getState().user) {
        useAppStore.setState({
          user: null, tenantId: null, tenantIds: [], availableTenants: [],
          tenantName: '', tenantRuc: '', isAuthLoading: false,
        });
      }
    };
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
  useVisits(effectiveUser);
  useClients(effectiveUser);
  useServiceTypes(effectiveUser);
  useExportConfig(effectiveUser);
  useEstablecimientos(effectiveUser);
  useConfiguracion(effectiveUser);

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
  // Enlace de restablecimiento de contraseña (ver ResetPasswordConfirm.jsx) —
  // se revisa antes que cualquier estado de sesión, ya que el usuario llega
  // sin haber iniciado sesión.
  const resetParams = new URLSearchParams(window.location.search);
  if (resetParams.get('mode') === 'resetPassword' && resetParams.get('oobCode')) {
    return <ResetPasswordConfirm oobCode={resetParams.get('oobCode')} />;
  }

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

  // Offline: no bloquear con spinner si no hay red aunque las tareas no hayan cargado
  if (isLoadingTasks && tasks.length === 0 && isOnline) {
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
