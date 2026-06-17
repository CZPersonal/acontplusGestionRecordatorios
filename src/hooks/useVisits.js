import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { getCollectionRef } from '../lib/firebase';

export function useVisits(task, user) {
  const [visits,    setVisits]    = useState(task?.visits || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setVisits(task?.visits || []);
  }, [task]);

  // ─── Persistencia base ──────────────────────────────────────────────────
  const saveVisits = async (updatedVisits) => {
    await updateDoc(
      doc(getCollectionRef('water_filter_tasks'), task.id),
      { visits: updatedVisits }
    );
    setVisits(updatedVisits);
  };

  // ─── Agregar visita ──────────────────────────────────────────────────────
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
      technician:    visitData.technician    || user.email,
      status:        'Programada',
      createdBy:     user.email,
      createdAt:     new Date().toISOString(),
      completedAt:   null,
      completedBy:   null,
      closingObservations: '',
    };
    try {
      await saveVisits([...visits, newVisit]);
      return true;
    } catch (error) {
      console.error('Error al agregar visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Editar visita ───────────────────────────────────────────────────────
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
              technician:    visitData.technician    || v.technician,
              updatedAt:     new Date().toISOString(),
              updatedBy:     user.email,
            }
          : v
      );
      await saveVisits(updated);
      return true;
    } catch (error) {
      console.error('Error al editar visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Completar visita ────────────────────────────────────────────────────
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
      await saveVisits(updated);
      return true;
    } catch (error) {
      console.error('Error al completar visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Cancelar visita (reversible) ───────────────────────────────────────
  const cancelVisit = async (visitId) => {
    if (!user || !task) return false;
    setIsLoading(true);
    try {
      const updated = visits.map(v =>
        v.id === visitId ? { ...v, status: 'Cancelada' } : v
      );
      await saveVisits(updated);
      return true;
    } catch (error) {
      console.error('Error al cancelar visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Revertir visita → Programada ────────────────────────────────────────
  //     Aplica tanto a "Cancelada" como a "Anulada"
  const revertVisit = async (visitId) => {
    if (!user || !task) return false;
    setIsLoading(true);
    try {
      const updated = visits.map(v =>
        v.id === visitId
          ? {
              ...v,
              status:    'Programada',
              revertedAt: new Date().toISOString(),
              revertedBy: user.email,
            }
          : v
      );
      await saveVisits(updated);
      return true;
    } catch (error) {
      console.error('Error al revertir visita:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Anular visita (inactiva, más fuerte que cancelar) ───────────────────
  const annulVisit = async (visitId) => {
    if (!user || !task) return false;
    setIsLoading(true);
    try {
      const updated = visits.map(v =>
        v.id === visitId
          ? {
              ...v,
              status:    'Anulada',
              annulledAt: new Date().toISOString(),
              annulledBy: user.email,
            }
          : v
      );
      await saveVisits(updated);
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
