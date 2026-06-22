// Helpers de Firestore con awareness de tenant.
// Leen tenantId desde el store en el momento de la llamada (no en import time),
// lo que permite que los hooks funcionen correctamente tras el setup del tenant.
import { collection } from 'firebase/firestore';
import { db } from './firebase';
import { useAppStore } from './store';

export const getCollectionRef = (name) => {
  const { tenantId } = useAppStore.getState();
  return collection(db, 'tenants', tenantId, name);
};

export const getVisitsRef = (taskId) => {
  const { tenantId } = useAppStore.getState();
  return collection(db, 'tenants', tenantId, 'water_filter_tasks', taskId, 'visits');
};

export const getAbonosRef = () => {
  const { tenantId } = useAppStore.getState();
  return collection(db, 'tenants', tenantId, 'abonos');
};
