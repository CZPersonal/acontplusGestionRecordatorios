import { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { getVisitsFlatRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';
import { logAudit } from '../services/auditService';

const VISITS_PAGE_SIZE = 200;

export function useVisits(user) {
  const [visits,        setVisits]        = useState([]);
  const [isLoadingVisits, setIsLoading]   = useState(true);

  useEffect(() => {
    if (!user) {
      setVisits([]);
      setIsLoading(false);
      return;
    }

    const q = query(
      getVisitsFlatRef(),
      orderBy('createdAt', 'desc'),
      limit(VISITS_PAGE_SIZE),
    );

    const unsub = onSnapshot(q, (snap) => {
      setVisits(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    }, (err) => {
      console.error('Error cargando visitas:', err);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user]);

  // ─── Crear visita ────────────────────────────────────────────────────────────
  const addVisit = async (data) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    const visitId = crypto.randomUUID();
    try {
      await setDoc(doc(getVisitsFlatRef(), visitId), {
        ...data,
        id:        visitId,
        status:    data.status    || 'Programada',
        urgency:   data.urgency   || 'Media',
        createdBy: u.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Campos de cierre — vacíos al crear
        completedAt:         null,
        completedBy:         null,
        closingObservations: '',
        // Campos de confirmación técnico
        confirmed:   false,
        confirmedAt: null,
        confirmedBy: null,
        // Soporte: referencia a visita original
        parentVisitId: data.parentVisitId || null,
      });
      logAudit(u, 'visit_created', 'visit', visitId, { clientName: data.clientName });
      return visitId;
    } catch (err) {
      console.error('Error al crear visita:', err);
      return false;
    }
  };

  // ─── Editar visita ───────────────────────────────────────────────────────────
  const editVisit = async (visitId, data) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    try {
      await updateDoc(doc(getVisitsFlatRef(), visitId), {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: u.email,
      });
      return true;
    } catch (err) {
      console.error('Error al editar visita:', err);
      return false;
    }
  };

  // ─── Eliminar visita ─────────────────────────────────────────────────────────
  const deleteVisit = async (visitId) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    try {
      await deleteDoc(doc(getVisitsFlatRef(), visitId));
      logAudit(u, 'visit_deleted', 'visit', visitId);
      return true;
    } catch (err) {
      console.error('Error al eliminar visita:', err);
      return false;
    }
  };

  // ─── Completar visita ────────────────────────────────────────────────────────
  const completeVisit = async (visitId, closingData) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    try {
      await updateDoc(doc(getVisitsFlatRef(), visitId), {
        status:              'Realizada',
        closingObservations: closingData.closingObservations || '',
        completedAt:         new Date().toISOString(),
        completedBy:         u.email,
        updatedAt:           new Date().toISOString(),
      });
      logAudit(u, 'visit_completed', 'visit', visitId, { completedBy: u.email });
      return true;
    } catch (err) {
      console.error('Error al completar visita:', err);
      return false;
    }
  };

  // ─── Cancelar visita ─────────────────────────────────────────────────────────
  const cancelVisit = async (visitId) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    try {
      await updateDoc(doc(getVisitsFlatRef(), visitId), {
        status:    'Cancelada',
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.error('Error al cancelar visita:', err);
      return false;
    }
  };

  // ─── Anular visita ────────────────────────────────────────────────────────────
  const annulVisit = async (visitId) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    try {
      await updateDoc(doc(getVisitsFlatRef(), visitId), {
        status:     'Anulada',
        annulledAt: new Date().toISOString(),
        annulledBy: u.email,
        updatedAt:  new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.error('Error al anular visita:', err);
      return false;
    }
  };

  // ─── Revertir visita → Programada ────────────────────────────────────────────
  const revertVisit = async (visitId) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    try {
      await updateDoc(doc(getVisitsFlatRef(), visitId), {
        status:     'Programada',
        revertedAt: new Date().toISOString(),
        revertedBy: u.email,
        updatedAt:  new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.error('Error al revertir visita:', err);
      return false;
    }
  };

  // ─── Confirmar visita (portal técnico) ───────────────────────────────────────
  const confirmVisit = async (visitId) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    try {
      await updateDoc(doc(getVisitsFlatRef(), visitId), {
        confirmed:   true,
        confirmedAt: new Date().toISOString(),
        confirmedBy: u.email,
        updatedAt:   new Date().toISOString(),
      });
      return true;
    } catch (err) {
      console.error('Error al confirmar visita:', err);
      return false;
    }
  };

  // ─── Generar visita de soporte ────────────────────────────────────────────────
  // Crea una nueva visita pre-llenada con los datos de la original
  const generateSupportVisit = async (parentVisit) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    const today = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();
    const supportData = {
      // Referencias del cliente (misma ubicación e instalación)
      clientId:       parentVisit.clientId,
      contactId:      parentVisit.contactId,
      installationId: parentVisit.installationId,
      // Snapshot de visualización
      clientName:  parentVisit.clientName,
      serviceType: parentVisit.serviceType,
      address:     parentVisit.address,
      ubicacion:   parentVisit.ubicacion,
      ciudad:      parentVisit.ciudad,
      phone:       parentVisit.phone,
      // Datos de la nueva visita
      scheduledDate: today,
      scheduledTime: '',
      type:          parentVisit.type || '',
      urgency:       'Media',
      observations:  '',
      technician:    parentVisit.technician || '',
      technicianEmail: parentVisit.technicianEmail || '',
      serviceOrder:  '',
      // Referencia a la visita original
      parentVisitId: parentVisit.id,
    };
    return await addVisit(supportData);
  };

  // ─── Sincronizar al store ─────────────────────────────────────────────────────
  useEffect(() => {
    useAppStore.setState({ visits, isLoadingVisits });
  }, [visits, isLoadingVisits]);

  useEffect(() => {
    useAppStore.setState({
      addVisit, editVisit, deleteVisit,
      completeVisit, cancelVisit, annulVisit,
      revertVisit, confirmVisit, generateSupportVisit,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    visits, isLoadingVisits,
    addVisit, editVisit, deleteVisit,
    completeVisit, cancelVisit, annulVisit,
    revertVisit, confirmVisit, generateSupportVisit,
  };
}
