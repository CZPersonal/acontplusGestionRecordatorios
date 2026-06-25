import { useState, useEffect } from 'react';
import { doc, addDoc, updateDoc, onSnapshot, query, limit, where } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

export function useBorradores(user, { onlyMine = false } = {}) {
  const [borradores, setBorradores] = useState([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const tenantId = useAppStore(s => s.tenantId);

  useEffect(() => {
    if (!user || !tenantId) return;
    const col = getCollectionRef('borradores');
    // Sin orderBy en Firestore: documentos sin el campo quedan excluidos silenciosamente.
    // Se ordena siempre en el cliente para garantizar que todos los docs aparecen.
    const q = onlyMine
      ? query(col, where('technicianEmail', '==', user.email), limit(50))
      : query(col, limit(200));

    const unsub = onSnapshot(q,
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setBorradores(docs);
      },
      err => console.error('useBorradores onSnapshot:', err)
    );
    return () => unsub();
  }, [user, tenantId, onlyMine]);

  const addBorrador = (data) => {
    if (!user || !tenantId) return Promise.resolve(false);
    setIsLoading(true);
    const { technicianName: nameOverride, ...rest } = data;
    // Fire-and-forget: persistentLocalCache escribe en IndexedDB y sincroniza
    // cuando vuelve la red. No esperamos confirmación del servidor.
    addDoc(getCollectionRef('borradores'), {
      ...rest,
      status:          'Pendiente',
      technicianEmail: user.email,
      technicianName:  nameOverride || user.displayName || user.email,
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
      convertedAt:     null,
      convertedBy:     null,
      taskId:          null,
      visitId:         null,
    }).catch(e => console.error('addBorrador sync:', e));
    setIsLoading(false);
    return Promise.resolve(true);
  };

  const updateBorrador = (id, data) => {
    if (!user) return Promise.resolve(false);
    setIsLoading(true);
    updateDoc(doc(getCollectionRef('borradores'), id), {
      ...data,
      updatedAt: new Date().toISOString(),
    }).catch(e => console.error('updateBorrador sync:', e));
    setIsLoading(false);
    return Promise.resolve(true);
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

  const anuladoBorrador = (id, { nombre, email }) => {
    updateDoc(doc(getCollectionRef('borradores'), id), {
      status:          'Anulado',
      anuladoAt:       new Date().toISOString(),
      anuladoPor:      nombre,
      anuladoPorEmail: email,
      updatedAt:       new Date().toISOString(),
    }).catch(e => console.error('anuladoBorrador sync:', e));
    return Promise.resolve(true);
  };

  return { borradores, isLoading, addBorrador, updateBorrador, convertBorrador, anuladoBorrador };
}
