import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { getAbonosRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';
import { logAudit } from '../services/auditService';
import { abonoAuditMeta } from '../utils/auditMeta';

export function useAbonos() {
  const tenantId  = useAppStore(s => s.tenantId);
  const [abonos,    setAbonos]    = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) { setAbonos([]); setIsLoading(false); return; }
    const unsub = onSnapshot(
      query(getAbonosRef(), orderBy('fecha', 'asc')),
      snap => {
        setAbonos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setIsLoading(false);
      },
      err => { console.error('useAbonos:', err); setIsLoading(false); }
    );
    return unsub;
  }, [tenantId]);

  // Agrupados por visitId para lookup O(1) en la tabla
  const abonosByVisit = useMemo(() => {
    const map = {};
    abonos.forEach(a => {
      if (!map[a.visitId]) map[a.visitId] = [];
      map[a.visitId].push(a);
    });
    return map;
  }, [abonos]);

  const addAbono = async (data) => {
    await addDoc(getAbonosRef(), { ...data, createdAt: new Date().toISOString() });
  };

  // Anular: el abono se conserva con status 'Anulado' y deja de contar en el
  // total programado y el cronograma (ver computeCuotasPagadas).
  const annulAbono = async (id) => {
    const { user } = useAppStore.getState();
    if (!user) return false;
    const prev = abonos.find(a => a.id === id);
    if (!prev || prev.status === 'Anulado') return false;
    try {
      await updateDoc(doc(getAbonosRef(), id), {
        status:     'Anulado',
        annulledAt: new Date().toISOString(),
        annulledBy: user.email || '',
      });
      logAudit(user, 'abono_annulled', 'abono', id, abonoAuditMeta(prev));
      return true;
    } catch (error) {
      console.error('Error al anular abono programado:', error);
      return false;
    }
  };

  const deleteAbono = async (id) => {
    await deleteDoc(doc(getAbonosRef(), id));
  };

  return { abonos, abonosByVisit, isLoading, addAbono, annulAbono, deleteAbono };
}
