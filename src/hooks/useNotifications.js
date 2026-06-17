import { useState, useEffect, useRef, useCallback } from 'react';
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

// ── Obtiene TODAS las visitas relevantes de una tarea (retrasadas, hoy, urgentes) ──
function getRelevantVisits(task, today) {
  if (!task.visits?.length) return [];
  return task.visits
    .filter(v => v.status === 'Programada')
    .filter(v => {
      const isOverdue = v.scheduledDate < today;
      const isToday   = v.scheduledDate === today;
      const isUrgent  = v.urgency === 'Alta';
      return isOverdue || isToday || isUrgent;
    })
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

// ── Construye un toast para una visita específica ──────────────────────────
function buildToast(task, visit, id) {
  const today     = localDateStr();
  const isOverdue = visit.scheduledDate < today;
  const isToday   = visit.scheduledDate === today;

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

export function useNotifications(tasks) {
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
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    notifiedIds.current.clear();
    hasInitialized.current = false;
    return result;
  };

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
