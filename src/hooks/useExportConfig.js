import { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

// ─── Definición canónica de columnas por reporte ───────────────────────────────
// Cada columna tiene: key (ID único), label (nombre visible), enabled (por defecto)
// El orden del array define el orden de exportación por defecto.

export const TASK_COLUMNS = [
  { key: 'serviceOrder',         label: 'Orden de Servicio',          enabled: true  },
  { key: 'clientName',           label: 'Cliente',                    enabled: true  },
  { key: 'identification',       label: 'Cédula / RUC',               enabled: true  },
  { key: 'clientPhone',          label: 'Teléfono',                   enabled: true  },
  { key: 'clientAddress',        label: 'Dirección',                  enabled: false },
  { key: 'serviceType',          label: 'Tipo inst./equipo/servicio', enabled: true  },
  { key: 'type',                 label: 'Tipo de visita',             enabled: true  },
  { key: 'urgency',              label: 'Urgencia',                   enabled: true  },
  { key: 'status',               label: 'Estado',                     enabled: true  },
  { key: 'dueDate',              label: 'Fecha Vencimiento',          enabled: true  },
  { key: 'observations',         label: 'Observaciones',              enabled: true  },
  { key: 'createdBy',            label: 'Creado Por',                 enabled: true  },
  { key: 'createdAt',            label: 'Fecha Creación',             enabled: true  },
  { key: 'completedBy',          label: 'Completado Por',             enabled: false },
  { key: 'completedAt',          label: 'Fecha Completado',           enabled: false },
  { key: 'completionObservations',label: 'Obs. Cierre',               enabled: false },
];

export const VISIT_COLUMNS = [
  { key: 'scheduledDate',       label: 'Fecha visita',               enabled: true  },
  { key: 'scheduledTime',       label: 'Hora',                       enabled: true  },
  { key: 'clientName',          label: 'Cliente',                    enabled: true  },
  { key: 'clientPhone',         label: 'Teléfono',                   enabled: true  },
  { key: 'serviceOrder',        label: 'Orden Servicio',             enabled: true  },
  { key: 'serviceType',         label: 'Tipo inst./equipo/servicio', enabled: true  },
  { key: 'visitType',           label: 'Tipo visita',                enabled: true  },
  { key: 'urgency',             label: 'Urgencia',                   enabled: true  },
  { key: 'visitStatus',         label: 'Estado visita',              enabled: true  },
  { key: 'technician',          label: 'Técnico',                    enabled: true  },
  { key: 'observations',        label: 'Observaciones',              enabled: true  },
  { key: 'completedAt',         label: 'Fecha realizada',            enabled: true  },
  { key: 'closingObservations', label: 'Obs. cierre',                enabled: true  },
  { key: 'valorCobrar',         label: 'Valor a pagar',              enabled: true  },
  { key: 'completedBy',         label: 'Completado por',             enabled: false },
  { key: 'taskStatus',          label: 'Estado tarea',               enabled: false },
];

export const BILLING_COLUMNS = [
  { key: 'scheduledDate',  label: 'Fecha visita',               enabled: true  },
  { key: 'clientName',     label: 'Cliente',                    enabled: true  },
  { key: 'serviceOrder',   label: 'Orden Servicio',             enabled: true  },
  { key: 'serviceType',    label: 'Tipo inst./equipo/servicio', enabled: true  },
  { key: 'visitType',      label: 'Tipo visita',                enabled: true  },
  { key: 'visitStatus',    label: 'Estado visita',              enabled: true  },
  { key: 'totalValor',     label: 'Valor cobrar',               enabled: true  },
  { key: 'totalAbonado',   label: 'Total abonado',              enabled: true  },
  { key: 'totalSaldo',     label: 'Saldo pendiente',            enabled: true  },
  { key: 'payStatus',      label: 'Estado cobro',               enabled: true  },
  { key: 'commitmentDate', label: 'Fecha compromiso',           enabled: true  },
  { key: 'paymentMethods', label: 'Formas de pago',             enabled: false },
];

const DEFAULTS = {
  tasks:   TASK_COLUMNS,
  visits:  VISIT_COLUMNS,
  billing: BILLING_COLUMNS,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useExportConfig(user) {
  const [configs, setConfigs] = useState({
    tasks:   TASK_COLUMNS,
    visits:  VISIT_COLUMNS,
    billing: BILLING_COLUMNS,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(getCollectionRef('export_config'), 'columns');
    const unsub  = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // Merge con defaults: añadir columnas nuevas que no existan aún en la config guardada
        setConfigs({
          tasks:   mergeWithDefaults(data.tasks,   TASK_COLUMNS),
          visits:  mergeWithDefaults(data.visits,  VISIT_COLUMNS),
          billing: mergeWithDefaults(data.billing, BILLING_COLUMNS),
        });
      }
    });
    return () => unsub();
  }, [user]);

  // Columnas guardadas + nuevas columnas del default que no existen aún
  function mergeWithDefaults(saved, defaults) {
    if (!saved?.length) return defaults;
    const savedKeys = new Set(saved.map(c => c.key));
    const newCols   = defaults.filter(c => !savedKeys.has(c.key));
    return [...saved, ...newCols];
  }

  const saveConfig = async (type, columns) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await setDoc(
        doc(getCollectionRef('export_config'), 'columns'),
        { [type]: columns },
        { merge: true }
      );
    } catch (err) {
      console.error('Error guardando config exportación:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetConfig = async (type) => {
    await saveConfig(type, DEFAULTS[type]);
  };

  // Devuelve solo las columnas activas en el orden guardado
  const getActiveColumns = (type) =>
    (configs[type] || DEFAULTS[type]).filter(c => c.enabled);

  // Sincronizar al store (getActiveColumns es acción del store que lee exportConfigs via get())
  useEffect(() => {
    useAppStore.setState({
      exportConfigs:  configs,
      configLoading:  isLoading,
      saveConfig,
      resetConfig,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs, isLoading]);

  return { configs, isLoading, saveConfig, resetConfig, getActiveColumns };
}
