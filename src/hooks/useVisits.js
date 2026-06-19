import { useState, useEffect } from 'react';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getVisitsRef } from '../lib/tenantDb';

export function useVisits(task, user) {
  const [visits,    setVisits]    = useState(task?.visits || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setVisits(task?.visits || []);
  }, [task]);

  // Persiste todos los documentos de visita en la subcollección.
  // Al escribir el array completo, los datos legacy del campo embebido quedan migrados.
  const saveAllVisits = async (updatedVisits) => {
    const batch = writeBatch(db);
    updatedVisits.forEach(v => {
      batch.set(doc(getVisitsRef(task.id), v.id), v);
    });
    await batch.commit();
    setVisits(updatedVisits);
  };

  // ─── Agregar visita ──────────────────────────────────────────────────────────
  const addVisit = async (visitData) => {
    if (!user || !task) return false;
    setIsLoading(true);
    const newVisit = {
      id:            crypto.randomUUID(),
      scheduledDate: visitData.scheduledDate,
      scheduledTime: visitData.scheduledTime || '',
      type:          visitData.type          || '',
      urgency:       visitData.urgency       || 'Media',
      visitStatus:   visitData.visitStatus   || 'Pendiente',
      observations:  visitData.observations  || '',
      technician:      visitData.technician      || user.email,
      technicianEmail: visitData.technicianEmail || '',
      status:          'Programada',
      createdBy:     user.email,
      createdAt:     new Date().toISOString(),
      completedAt:   null,
      completedBy:   null,
      closingObservations: '',
    };
    try {
      await saveAllVisits([...visits, newVisit]);
      return true;
    } catch (error) {
      console.error('Error al agregar visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Editar visita ───────────────────────────────────────────────────────────
  const editVisit = async (visitId, visitData) => {
    if (!user || !task) return false;
    setIsLoading(true);
    try {
      const updated = visits.map(v =>
        v.id === visitId
          ? {
              ...v,
              scheduledDate: visitData.scheduledDate,
              scheduledTime: visitData.scheduledTime || '',
              type:          visitData.type          || v.type,
              urgency:       visitData.urgency       || v.urgency,
              observations:  visitData.observations  ?? v.observations,
              technician:      visitData.technician      || v.technician,
              technicianEmail: visitData.technicianEmail !== undefined ? visitData.technicianEmail : (v.technicianEmail || ''),
              updatedAt:       new Date().toISOString(),
              updatedBy:     user.email,
            }
          : v
      );
      await saveAllVisits(updated);
      return true;
    } catch (error) {
      console.error('Error al editar visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Completar visita ────────────────────────────────────────────────────────
  const completeVisit = async (visitId, closingData) => {
    if (!user || !task) return false;
    setIsLoading(true);
    try {
      const updated = visits.map(v =>
        v.id === visitId
          ? {
              ...v,
              status:              'Realizada',
              closingObservations: closingData.closingObservations || '',
              completedAt:         new Date().toISOString(),
              completedBy:         user.email,
            }
          : v
      );
      await saveAllVisits(updated);
      return true;
    } catch (error) {
      console.error('Error al completar visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Cancelar visita (reversible) ───────────────────────────────────────────
  const cancelVisit = async (visitId) => {
    if (!user || !task) return false;
    setIsLoading(true);
    try {
      const updated = visits.map(v =>
        v.id === visitId ? { ...v, status: 'Cancelada' } : v
      );
      await saveAllVisits(updated);
      return true;
    } catch (error) {
      console.error('Error al cancelar visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Revertir visita → Programada ────────────────────────────────────────────
  const revertVisit = async (visitId) => {
    if (!user || !task) return false;
    setIsLoading(true);
    try {
      const updated = visits.map(v =>
        v.id === visitId
          ? {
              ...v,
              status:     'Programada',
              revertedAt: new Date().toISOString(),
              revertedBy: user.email,
            }
          : v
      );
      await saveAllVisits(updated);
      return true;
    } catch (error) {
      console.error('Error al revertir visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Anular visita (más fuerte que cancelar) ─────────────────────────────────
  const annulVisit = async (visitId) => {
    if (!user || !task) return false;
    setIsLoading(true);
    try {
      const updated = visits.map(v =>
        v.id === visitId
          ? {
              ...v,
              status:     'Anulada',
              annulledAt: new Date().toISOString(),
              annulledBy: user.email,
            }
          : v
      );
      await saveAllVisits(updated);
      return true;
    } catch (error) {
      console.error('Error al anular visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    visits, isLoading,
    addVisit, editVisit, completeVisit,
    cancelVisit, revertVisit, annulVisit,
  };
}
