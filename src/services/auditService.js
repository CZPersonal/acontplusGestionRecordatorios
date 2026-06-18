import { addDoc, serverTimestamp } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

/**
 * Registra una entrada en audit_log. Fire-and-forget: los fallos solo se
 * logean en consola y nunca propagan al llamador.
 *
 * @param {object} user      - Objeto Firebase Auth (uid, email)
 * @param {string} action    - Ej: 'task_created', 'task_deleted', 'task_completed'
 * @param {string} entityType - Tipo de entidad: 'task', 'client', 'visit'…
 * @param {string} entityId  - ID del documento afectado
 * @param {object} metadata  - Campos adicionales opcionales (clientName, completedBy…)
 */
export async function logAudit(user, action, entityType, entityId, metadata = {}) {
  if (!user) return;
  try {
    const { tenantId } = useAppStore.getState();
    await addDoc(getCollectionRef('audit_log'), {
      action,
      entityType,
      entityId,
      userId:    user.uid,
      userEmail: user.email,
      tenantId,
      timestamp: serverTimestamp(),
      metadata,
    });
  } catch (e) {
    console.error('[audit] write failed:', e);
  }
}
