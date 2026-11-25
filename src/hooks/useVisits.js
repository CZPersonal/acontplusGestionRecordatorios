import { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, deleteDoc, updateDoc, onSnapshot, getDocs, query, where, runTransaction, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getVisitsFlatRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';
import { logAudit } from '../services/auditService';
import { visitAuditMeta } from '../utils/auditMeta';
import { windowStartDate, mergeVisits, prefixRange, searchVariants } from '../utils/visitWindow';

// Campos por los que se busca en todo el historial (cada uno es una consulta de un solo campo).
const HISTORY_SEARCH_FIELDS = ['serviceOrder', 'visitNumber', 'clientName'];

export function useVisits(user) {
  const tenantId = useAppStore(s => s.tenantId);
  const [windowVisits,  setWindowVisits]  = useState([]);
  const [historyVisits, setHistoryVisits] = useState([]);
  const visits = useMemo(() => mergeVisits(historyVisits, windowVisits), [windowVisits, historyVisits]);
  const [isLoadingVisits, setIsLoading]   = useState(true);

  // tenantId en las dependencias: sin esto, cambiar de empresa en
  // CompanySelector no volvía a suscribir la lectura, y el usuario seguía
  // viendo las visitas de la empresa anterior.
  useEffect(() => {
    if (!user || !tenantId) {
      setWindowVisits([]);
      setHistoryVisits([]);
      setIsLoading(false);
      return;
    }

    setHistoryVisits([]);

    // P9: ya no se carga "las 200 más recientes por createdAt" (dejaba fuera
    // visitas antiguas y rompía la búsqueda por OS). Se suscriben tres consultas
    // de un solo campo (sin índices compuestos) y se unen por id:
    //   1) visitas con fecha programada dentro de la ventana (últimos 90 días y futuro)
    //   2) todas las Programadas, sin importar la fecha (atrasadas y seguimiento)
    //   3) todas las que tienen valor a cobrar (Cobros)
    const ref = getVisitsFlatRef();
    const queries = [
      query(ref, where('scheduledDate', '>=', windowStartDate())),
      query(ref, where('status', '==', 'Programada')),
      query(ref, where('valorCobrar', '>', 0)),
    ];
    const results = queries.map(() => []);
    const ready   = queries.map(() => false);

    const unsubs = queries.map((q, i) => onSnapshot(q, (snap) => {
      results[i] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      ready[i] = true;
      setWindowVisits(mergeVisits(...results));
      if (ready.every(Boolean)) setIsLoading(false);
    }, (err) => {
      console.error('Error cargando visitas:', err);
      ready[i] = true;
      if (ready.every(Boolean)) setIsLoading(false);
    }));

    const unsub = () => unsubs.forEach(u => u());

    return () => unsub();
  }, [user, tenantId]);

  // ─── Buscar en todo el historial (P9) ───────────────────────────────────────
  // Consulta por prefijo de OS, Nº de visita y cliente; los resultados se suman
  // a la lista de la sesión. Devuelve cuántas visitas nuevas aportó.
  const searchVisitsHistory = async (term) => {
    const variants = searchVariants(term);
    if (variants.length === 0) return { added: 0, found: 0, tooShort: true };
    try {
      const ref = getVisitsFlatRef();
      const snaps = await Promise.all(
        HISTORY_SEARCH_FIELDS.flatMap(field => variants.map(t => {
          const [lo, hi] = prefixRange(t);
          return getDocs(query(ref, where(field, '>=', lo), where(field, '<=', hi)));
        }))
      );
      const found = mergeVisits(snaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const known = new Set(useAppStore.getState().visits.map(v => v.id));
      const added = found.filter(v => !known.has(v.id)).length;
      setHistoryVisits(prev => mergeVisits(prev, found));
      return { added, found: found.length, tooShort: false };
    } catch (err) {
      console.error('Error buscando en el historial:', err);
      return null;
    }
  };

  // ─── Crear visita (transacción atómica: contador + visita) ──────────────────
  const addVisit = async (data) => {
    const { user: u, tenantId } = useAppStore.getState();
    if (!u || !tenantId) return false;
    const visitId    = crypto.randomUUID();
    const counterRef = doc(db, 'tenants', tenantId, 'counters', 'visits');
    const visitRef   = doc(db, 'tenants', tenantId, 'visits', visitId);
    try {
      let visitNumber;
      const transactionPromise = runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        const next = (snap.exists() ? (snap.data().last ?? 0) : 0) + 1;
        visitNumber = `V-${String(next).padStart(4, '0')}`;
        tx.set(counterRef, { last: next }, { merge: true });
        tx.set(visitRef, {
          ...data,
          id:          visitId,
          visitNumber,
          status:      data.status  || 'Programada',
          urgency:     data.urgency || 'Media',
          createdBy:   u.email,
          createdAt:   new Date().toISOString(),
          updatedAt:   new Date().toISOString(),
          completedAt:         null,
          completedBy:         null,
          closingObservations: '',
          confirmed:   false,
          confirmedAt: null,
          confirmedBy: null,
          parentVisitId: data.parentVisitId || null,
        });
      });
      // Las transacciones de Firestore requieren ida y vuelta real al servidor
      // (no tienen camino rápido por caché local como setDoc/updateDoc) — si
      // la conexión se degrada a mitad de la transacción puede quedar
      // esperando indefinidamente y el botón "Guardando..." nunca se libera.
      // Este timeout defensivo libera la UI aunque la transacción de fondo
      // rara vez tarde tanto; si igual llega a completarse después, no rompe
      // nada (el conteo/documento ya se habría creado correctamente).
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado al crear la visita')), 15000)
      );
      await Promise.race([transactionPromise, timeoutPromise]);
      logAudit(u, 'visit_created', 'visit', visitId, { clientName: data.clientName, visitNumber });
      return visitId;
    } catch (err) {
      console.error('Error al crear visita:', err);
      return false;
    }
  };

  // ─── Crear serie de visitas periódicas (transacción atómica única) ───────────
  // A diferencia de llamar addVisit N veces, esto asigna los N números de visita
  // secuenciales y escribe todos los documentos + el contador en una sola
  // transacción: o se crea toda la serie, o ninguna (sin series a medias si algo
  // falla). baseData es la visitData común (sin scheduledDate, que viene de
  // cada elemento de `dates`); cada visita creada comparte recurrenceGroupId.
  const addVisitSeries = async (baseData, dates) => {
    const { user: u, tenantId } = useAppStore.getState();
    if (!u || !tenantId) return false;
    if (!dates || dates.length === 0) return false;

    const recurrenceGroupId = crypto.randomUUID();
    const counterRef  = doc(db, 'tenants', tenantId, 'counters', 'visits');
    const visitEntries = dates.map(scheduledDate => {
      const visitId = crypto.randomUUID();
      return { visitId, scheduledDate, ref: doc(db, 'tenants', tenantId, 'visits', visitId) };
    });

    try {
      const transactionPromise = runTransaction(db, async (tx) => {
        const snap = await tx.get(counterRef);
        let next = snap.exists() ? (snap.data().last ?? 0) : 0;
        const nowIso = new Date().toISOString();
        visitEntries.forEach((entry, i) => {
          next += 1;
          tx.set(entry.ref, {
            ...baseData,
            id:            entry.visitId,
            scheduledDate: entry.scheduledDate,
            visitNumber:   `V-${String(next).padStart(4, '0')}`,
            status:        baseData.status  || 'Programada',
            urgency:       baseData.urgency || 'Media',
            createdBy:     u.email,
            createdAt:     nowIso,
            updatedAt:     nowIso,
            completedAt:         null,
            completedBy:         null,
            closingObservations: '',
            confirmed:   false,
            confirmedAt: null,
            confirmedBy: null,
            parentVisitId: baseData.parentVisitId || null,
            recurrenceGroupId,
            recurrenceIndex: i + 1,
            recurrenceTotal: dates.length,
          });
        });
        tx.set(counterRef, { last: next }, { merge: true });
      });
      // Mismo timeout defensivo que addVisit, escalado con la cantidad de
      // visitas (una transacción más grande puede tardar algo más en confirmar).
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado al crear la serie de visitas')), Math.max(15000, dates.length * 500))
      );
      await Promise.race([transactionPromise, timeoutPromise]);
      logAudit(u, 'visit_series_created', 'visit', recurrenceGroupId, { clientName: baseData.clientName, total: dates.length });
      return visitEntries.map(e => e.visitId);
    } catch (err) {
      console.error('Error al crear la serie de visitas:', err);
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
  // El valor registrado al cerrar la visita se vincula directamente con Cobros:
  // se guarda como visitValue (dato de campo) y también como valorCobrar
  // (monto a cobrar), listo para registrar abonos sin volver a digitarlo.
  const completeVisit = async (visitId, closingData) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    try {
      const visitValue = parseFloat(closingData.visitValue) || 0;
      await updateDoc(doc(getVisitsFlatRef(), visitId), {
        status:              'Realizada',
        closingObservations: closingData.closingObservations || '',
        completedAt:         new Date().toISOString(),
        completedBy:         u.email,
        updatedAt:           new Date().toISOString(),
        ...(closingData.visitValue !== undefined && { visitValue }),
        ...(visitValue > 0 && { valorCobrar: visitValue }),
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
      const prev = useAppStore.getState().visits.find(v => v.id === visitId);
      await updateDoc(doc(getVisitsFlatRef(), visitId), {
        status:      'Cancelada',
        cancelledAt: new Date().toISOString(),
        cancelledBy: u.email,
        updatedAt:   new Date().toISOString(),
      });
      logAudit(u, 'visit_cancelled', 'visit', visitId, visitAuditMeta(prev));
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
      // Se lee antes del update: el store aún tiene el estado previo.
      const prev = useAppStore.getState().visits.find(v => v.id === visitId);
      await updateDoc(doc(getVisitsFlatRef(), visitId), {
        status:     'Anulada',
        annulledAt: new Date().toISOString(),
        annulledBy: u.email,
        updatedAt:  new Date().toISOString(),
      });
      logAudit(u, 'visit_annulled', 'visit', visitId, visitAuditMeta(prev));
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

  // ─── Deshacer confirmación (portal técnico) ───────────────────────────────────
  const unconfirmVisit = async (visitId) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    try {
      const nowIso = new Date().toISOString();
      await updateDoc(doc(getVisitsFlatRef(), visitId), {
        confirmed:   false,
        confirmedAt: null,
        confirmedBy: null,
        updatedAt:   nowIso,
        history:     arrayUnion({ type: 'confirmacion_deshecha', by: u.email, at: nowIso }),
      });
      logAudit(u, 'visit_confirmation_undone', 'visit', visitId, {});
      return true;
    } catch (err) {
      console.error('Error al deshacer confirmación:', err);
      return false;
    }
  };

  // ─── Reprogramar visita (portal técnico) ──────────────────────────────────────
  // Quita la confirmación anterior — era para la fecha/hora vieja. Guarda un
  // historial completo (no solo el último cambio) para trazabilidad.
  const rescheduleVisit = async (visitId, { previousDate, previousTime, newDate, newTime }) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    try {
      const nowIso = new Date().toISOString();
      await updateDoc(doc(getVisitsFlatRef(), visitId), {
        scheduledDate: newDate,
        scheduledTime: newTime || '',
        confirmed:     false,
        confirmedAt:   null,
        confirmedBy:   null,
        updatedAt:     nowIso,
        history: arrayUnion({
          type: 'reprogramada', by: u.email, at: nowIso,
          previousDate, previousTime: previousTime || '',
          newDate,      newTime:      newTime      || '',
        }),
      });
      logAudit(u, 'visit_rescheduled', 'visit', visitId, { previousDate, newDate });
      return true;
    } catch (err) {
      console.error('Error al reprogramar visita:', err);
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
      clientEmail: parentVisit.clientEmail || '',
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
      addVisit, addVisitSeries, editVisit, deleteVisit,
      completeVisit, cancelVisit, annulVisit,
      revertVisit, confirmVisit, unconfirmVisit, rescheduleVisit, generateSupportVisit,
      searchVisitsHistory,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return {
    visits, isLoadingVisits,
    addVisit, addVisitSeries, editVisit, deleteVisit,
    completeVisit, cancelVisit, annulVisit,
    revertVisit, confirmVisit, unconfirmVisit, rescheduleVisit, generateSupportVisit,
    searchVisitsHistory,
  };
}
