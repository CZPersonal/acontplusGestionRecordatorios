import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { getAbonosRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

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

  const deleteAbono = async (id) => {
    await deleteDoc(doc(getAbonosRef(), id));
  };

  return { abonos, abonosByVisit, isLoading, addAbono, deleteAbono };
}
