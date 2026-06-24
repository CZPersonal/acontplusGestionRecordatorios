import { useState, useEffect } from 'react';
import { doc, addDoc, updateDoc, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

export function useBorradores(user, { onlyMine = false } = {}) {
  const [borradores, setBorradores] = useState([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const tenantId = useAppStore(s => s.tenantId);

  useEffect(() => {
    if (!user || !tenantId) return;
    const col = getCollectionRef('borradores');
    const q = onlyMine
      ? query(col, where('technicianEmail', '==', user.email), orderBy('createdAt', 'desc'), limit(50))
      : query(col, orderBy('createdAt', 'desc'), limit(200));

    const unsub = onSnapshot(q,
      snap => setBorradores(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      err  => console.error('useBorradores onSnapshot:', err)
    );
    return () => unsub();
  }, [user, tenantId, onlyMine]);

  const addBorrador = async (data) => {
    if (!user || !tenantId) return false;
    setIsLoading(true);
    try {
      await addDoc(getCollectionRef('borradores'), {
        ...data,
        status:          'Pendiente',
        technicianEmail: user.email,
        technicianName:  user.displayName || user.email,
        createdAt:       new Date().toISOString(),
        updatedAt:       new Date().toISOString(),
        convertedAt:     null,
        convertedBy:     null,
        taskId:          null,
        visitId:         null,
      });
      return true;
    } catch (e) {
      console.error('addBorrador:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBorrador = async (id, data) => {
    if (!user) return false;
    setIsLoading(true);
    try {
      await updateDoc(doc(getCollectionRef('borradores'), id), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (e) {
      console.error('updateBorrador:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const convertBorrador = async (id, { taskId = null, visitId = null, adminEmail }) => {
    try {
      await updateDoc(doc(getCollectionRef('borradores'), id), {
        status:      'Convertido',
        convertedAt: new Date().toISOString(),
        convertedBy: adminEmail,
        taskId,
        visitId,
        updatedAt:   new Date().toISOString(),
      });
      return true;
    } catch (e) {
      console.error('convertBorrador:', e);
      return false;
    }
  };

  return { borradores, isLoading, addBorrador, updateBorrador, convertBorrador };
}
