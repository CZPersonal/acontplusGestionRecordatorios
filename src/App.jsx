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

const TENANT_LOOKUP_TIMEOUT_MS = 9000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('tenant-lookup-timeout')), ms)),
  ]);
}

// Contador global de intentos de resolución de tenant. Permite descartar el
// resultado de una lectura lenta que finalmente responde después de que un
// reintento más reciente ya concluyó — evita que datos obsoletos pisen un
// estado más nuevo.
let resolutionToken = 0;

// Resuelve tenantId/tenantIds/rol para un usuario ya autenticado. Se llama al
// iniciar sesión y también desde el botón "Reintentar" de la pantalla de
// reconexión, por eso vive fuera del efecto.
async function resolveTenantForUser(u) {
  const myToken = ++resolutionToken;
  const isStale = () => myToken !== resolutionToken;

  useAppStore.setState({ user: u, isAuthLoading: true, authConnectionIssue: false });

  // Fire-and-forget: se encola offline, no bloquea el arranque
  setDoc(doc(db, 'users', u.uid), { email: u.email, lastLogin: new Date().toISOString() }, { merge: true })
    .catch(() => {});

  let userData = {};
  // fromCache: la respuesta vino del caché local de Firestore, no confirmada
  // por el servidor — puede estar desactualizada. A diferencia de
  // navigator.onLine (que solo indica si hay ALGUNA interfaz de red activa,
  // no si Firestore es alcanzable), este flag del propio SDK es la señal
  // correcta de "esto podría no ser el estado real todavía".
  let dataFromCache = false;
  // Solo true si el servidor respondió activamente (no timeout, no error,
  // no caché) — es la única condición que autoriza a concluir "sin tenant".
  let confirmedByServer = false;
  try {
    const snap = await withTimeout(getDoc(doc(db, 'users', u.uid)), TENANT_LOOKUP_TIMEOUT_MS);
    userData = snap.exists() ? snap.data() : {};
    dataFromCache = snap.metadata.fromCache;
    confirmedByServer = !dataFromCache;
  } catch {
    // Sin red, timeout o sin caché de Firestore — recuperar ids de localStorage
    const s = loadSession();
    if (s.tenantId) userData = { tenantIds: s.tenantIds || [s.tenantId] };
    dataFromCache = true;
  }

  if (isStale()) return;

  // Migrar tenantId (string) → tenantIds (array) si es necesario
  let ids = userData.tenantIds ?? [];
  if (ids.length === 0 && userData.tenantId) {
    ids = [userData.tenantId];
    setDoc(doc(db, 'users', u.uid), { tenantIds: arrayUnion(userData.tenantId) }, { merge: true })
      .catch(() => {});
  }

  if (ids.length === 0) {
    // Sin empresa según esta lectura — rescatar localStorage solo si la
    // sesión guardada es de este mismo usuario en este mismo dispositivo.
    const s = loadSession();
    if (s.tenantId && s.uid === u.uid) {
      useAppStore.setState({
        user: u, tenantId: s.tenantId, tenantIds: s.tenantIds || [s.tenantId],
        availableTenants: [], tenantName: s.tenantName || '', tenantRuc: s.tenantRuc || '',
        userRole: s.userRole || 'tecnico', isAuthLoading: false, authConnectionIssue: false,
      });
    } else if (confirmedByServer) {
      // El servidor confirmó activamente que no hay tenant — veredicto real,
      // no hay nada más que rescatar y sí corresponde ir a TenantSetup.
      useAppStore.setState({ user: u, tenantId: null, tenantIds: [], availableTenants: [], tenantName: '', tenantRuc: '', isAuthLoading: false, authConnectionIssue: false });
    } else {
      // Ambiguo: ni el servidor confirmó nada, ni hay sesión local que
      // rescatar (típico de un dispositivo donde el usuario nunca inició
      // sesión). No hay evidencia de "sin empresa" — pedir reintento en vez
      // de asumirlo, para no mandar a un usuario con tenant real a TenantSetup.
      useAppStore.setState({ isAuthLoading: false, authConnectionIssue: true });
    }
  } else if (ids.length === 1) {
    // Una sola empresa — seleccionar automáticamente
    try {
      const [td, memberSnap] = await withTimeout(Promise.all([
        getDoc(doc(db, 'tenants', ids[0])),
        getDoc(doc(db, 'tenants', ids[0], 'members', u.uid)),
      ]), TENANT_LOOKUP_TIMEOUT_MS);
      if (isStale()) return;
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
      useAppStore.setState({ user: u, tenantId: ids[0], tenantIds: ids, availableTenants: [], tenantName, tenantRuc, userRole: role, memberEstablecimientos: memberEsts, memberEstablecimientoDefault: memberEstDefault, isAuthLoading: false, authConnectionIssue: false });
    } catch {
      if (isStale()) return;
      // Timeout o sin red: el tenant YA es conocido (viene de esta misma
      // lectura o de la sesión local), así que se usa igual — solo el rol y
      // nombre pueden quedar desactualizados hasta la próxima reconexión.
      const s = loadSession();
      useAppStore.setState({
        user: u, tenantId: ids[0], tenantIds: ids, availableTenants: [],
        tenantName: s.tenantName || '', tenantRuc: s.tenantRuc || '',
        userRole: s.userRole || 'tecnico', isAuthLoading: false, authConnectionIssue: false,
      });
    }
  } else {
    // Múltiples empresas — cargar lista y mostrar selector
    try {
      const docs = await withTimeout(Promise.all(ids.map(id => getDoc(doc(db, 'tenants', id)))), TENANT_LOOKUP_TIMEOUT_MS);
      if (isStale()) return;
      const available = docs.map(d => ({ id: d.id, name: d.data()?.name ?? '', ruc: d.data()?.ruc ?? '' }));
      useAppStore.setState({ user: u, tenantId: null, tenantIds: ids, availableTenants: available, tenantName: '', tenantRuc: '', isAuthLoading: false, authConnectionIssue: false });
    } catch {
      if (isStale()) return;
      useAppStore.setState({ user: u, tenantId: null, tenantIds: ids, availableTenants: [], tenantName: '', tenantRuc: '', isAuthLoading: false, authConnectionIssue: false });
    }
  }
}

export default function App() {
  const user             = useAppStore(s => s.user);
  const isAuthLoading    = useAppStore(s => s.isAuthLoading);
  const authConnectionIssue = useAppStore(s => s.authConnectionIssue);
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
        resolveTenantForUser(u);
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

  if (!user) return <Login />;

  // No se pudo confirmar ni descartar la empresa del usuario (timeout/error
  // de red sin caché ni sesión local que rescatar) — nunca se asume "sin
  // empresa" en este caso, se pide reintentar la conexión.
  if (authConnectionIssue) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <img src="/logo.png" alt="Acontplus" className="w-16 h-16 object-contain mb-4" />
        <p className="text-sm font-semibold text-slate-700 mb-1">No se pudo confirmar tu empresa</p>
        <p className="text-xs text-slate-500 mb-4 text-center max-w-xs">
          Parece que la conexión está inestable. Verifica tu internet e intenta de nuevo.
        </p>
        <button
          onClick={() => resolveTenantForUser(auth.currentUser ?? user)}
          className="px-5 py-2.5 rounded-xl text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg, #D61672, #FFA901)' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (tenantIds.length === 0)            return <TenantSetup />;
  if (!tenantId && tenantIds.length > 1) return <CompanySelector />;

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
