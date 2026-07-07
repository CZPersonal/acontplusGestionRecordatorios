import { useState, useEffect, useRef, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, messaging } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { localDateStr } from '../utils/dates.js';

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);


async function showSystemNotification(title, body, icon) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    if (isMobile && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, { body, icon });
    } else {
      new Notification(title, { body, icon });
    }
  } catch (err) {
    console.warn('Notificación del sistema no disponible:', err.message);
  }
}

// Retorna la hora actual en formato HH:MM
function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// Una visita está retrasada si su fecha es anterior a hoy,
// O si es hoy y tiene hora programada que ya pasó.
function visitIsOverdue(visit, today) {
  if (visit.scheduledDate < today) return true;
  if (visit.scheduledDate === today && visit.scheduledTime) {
    return visit.scheduledTime < currentTime();
  }
  return false;
}

// ── Obtiene TODAS las visitas relevantes de una tarea (retrasadas, hoy, urgentes) ──
function getRelevantVisits(task, today) {
  if (!task.visits?.length) return [];
  return task.visits
    .filter(v => v.status === 'Programada')
    .filter(v => {
      const isOverdue = visitIsOverdue(v, today);
      const isToday   = v.scheduledDate === today && !isOverdue;
      const isUrgent  = v.urgency === 'Alta';
      return isOverdue || isToday || isUrgent;
    })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

// ── Construye un toast para una visita específica ──────────────────────────
function buildToast(task, visit, id) {
  const today     = localDateStr();
  const isOverdue = visitIsOverdue(visit, today);
  const isToday   = visit.scheduledDate === today && !isOverdue;

  let type, title;

  if (isOverdue) {
    type  = 'overdue';
    title = '⚠️ Visita atrasada';
  } else if (isToday) {
    type  = 'today';
    title = '📅 Visita para hoy';
  } else {
    type  = 'urgent';
    title = '🔴 Visita urgente';
  }

  return {
    id,
    type,
    title,
    // Datos estructurados de la visita para el ToastItem
    clientName:    task.clientName,
    serviceOrder:  task.serviceOrder || '',
    visitDate:     visit.scheduledDate,
    visitTime:     visit.scheduledTime || '',
    visitType:     visit.type || '',
    urgency:       visit.urgency || '',
    technician:    visit.technician || '',
    observations:  visit.observations || '',
    // Backward compat: body y task para acciones PDF/WhatsApp
    body:          `${task.clientName}${visit.type ? ' — ' + visit.type : ''}`,
    task,
    visit,
  };
}

// Registra el FCM token del dispositivo en users/{uid} para recibir push remotos.
// Devuelve { ok, reason } en vez de fallar en silencio, para poder mostrarle al
// usuario (vía toast) si quedó activo o por qué no.
async function registerFcmToken(uid) {
  if (!messaging)                                return { ok: false, reason: 'Este navegador no soporta notificaciones push.' };
  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY)  return { ok: false, reason: 'Falta configuración del servidor (VAPID key).' };
  try {
    const sw    = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const token = await getToken(messaging, {
      vapidKey:                  import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: sw,
    });
    if (!token) return { ok: false, reason: 'No se pudo generar el token del dispositivo.' };
    await updateDoc(doc(db, 'users', uid), { fcmToken: token });
    return { ok: true };
  } catch (e) {
    console.warn('[FCM] Token registration failed:', e);
    return { ok: false, reason: e.message || 'Error desconocido al registrar el dispositivo.' };
  }
}

export function useNotifications(tasks) {
  const user = useAppStore(s => s.user);

  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [toasts,         setToasts]         = useState([]);
  const notifiedIds    = useRef(new Set());
  const hasInitialized = useRef(false);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast) => {
    setToasts(prev => [...prev, { id: `toast-${Date.now()}`, ...toast }]);
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      addToast({ type: 'error', title: '❌ No soportado', body: 'Este navegador no soporta notificaciones.' });
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    notifiedIds.current.clear();
    hasInitialized.current = false;
    if (result === 'granted' && user) {
      const res = await registerFcmToken(user.uid);
      if (res.ok) {
        addToast({ type: 'success', title: '🔔 Notificaciones activadas', body: 'Recibirás avisos aunque la app esté cerrada.' });
      } else {
        addToast({ type: 'error', title: '⚠️ No se pudo activar', body: res.reason });
      }
    } else if (result !== 'granted') {
      addToast({ type: 'error', title: '🔕 Permiso no concedido', body: 'Actívalo desde la configuración de notificaciones del navegador para este sitio.' });
    }
    return result;
  };

  // Si el permiso ya está concedido al cargar (sesión anterior), registrar token
  useEffect(() => {
    if (permission === 'granted' && user) registerFcmToken(user.uid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Mensajes FCM en primer plano — mostrar como toast
  useEffect(() => {
    if (!messaging) return;
    const unsub = onMessage(messaging, (payload) => {
      const n = payload.notification || {};
      setToasts(prev => [...prev, {
        id:    `fcm-${Date.now()}`,
        type:  'urgent',
        title: n.title || 'Acontplus',
        body:  n.body  || '',
        clientName: '', task: null, visit: null,
      }]);
    });
    return unsub;
  }, []);

  // ── showAlerts: genera un item por cada visita relevante de cada tarea ──
  const showAlerts = useCallback(() => {
    const today   = localDateStr();
    const pending = tasks.filter(t => t.status !== 'Completado' && t.status !== 'Cancelado');

    const alertItems = [];
    pending.forEach((task) => {
      const relevantVisits = getRelevantVisits(task, today);
      relevantVisits.forEach((visit, vi) => {
        alertItems.push(
          buildToast(task, visit, `alert-${task.id}-${visit.id || vi}-${Date.now()}`)
        );
      });
    });

    if (alertItems.length === 0) {
      setToasts([{
        id:           `no-alerts-${Date.now()}`,
        type:         'today',
        title:        '✅ Todo al día',
        body:         'No hay visitas urgentes ni atrasadas.',
        clientName:   '',
        observations: '',
        task:         null,
        visit:        null,
      }]);
      return;
    }
    setToasts(alertItems);
  }, [tasks]);

  // ── Carga inicial: genera toasts por cada visita relevante ────────────
  useEffect(() => {
    if (tasks.length === 0) return;

    const today   = localDateStr();
    const pending = tasks.filter(t => t.status !== 'Completado' && t.status !== 'Cancelado');

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      const newToasts = [];

      pending.forEach((task) => {
        const relevantVisits = getRelevantVisits(task, today);
        if (relevantVisits.length === 0) {
          notifiedIds.current.add(task.id);
          return;
        }
        if (notifiedIds.current.has(task.id)) return;
        notifiedIds.current.add(task.id);

        relevantVisits.forEach((visit, vi) => {
          const toast = buildToast(task, visit, `init-${task.id}-${visit.id || vi}-${Date.now()}`);
          newToasts.push(toast);
          setTimeout(
            () => showSystemNotification(toast.title, toast.body, '/logo.png'),
            newToasts.length * 800
          );
        });
      });

      if (newToasts.length > 0) setToasts(newToasts);
      return;
    }

    // Tareas nuevas añadidas tras la carga inicial
    pending.forEach((task) => {
      if (notifiedIds.current.has(task.id)) return;

      const relevantVisits = getRelevantVisits(task, today);
      if (relevantVisits.length === 0) return;

      notifiedIds.current.add(task.id);
      relevantVisits.forEach((visit, vi) => {
        const toast = buildToast(task, visit, `new-${task.id}-${visit.id || vi}-${Date.now()}`);
        setToasts(prev => [...prev, toast]);
        showSystemNotification(toast.title, toast.body, '/logo.png');
      });
    });
  }, [tasks, permission]);

  return { permission, requestPermission, toasts, removeToast, showAlerts, addToast };
}
