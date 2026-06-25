import { useState, useEffect } from 'react';
import { doc, addDoc, updateDoc, onSnapshot, query, limit, where } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

// ─── Cola offline en localStorage ─────────────────────────────────────────────
const PENDING_KEY = 'acontplus_pending_borradores';
const loadPending = () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; } };
const savePending = (l) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(l)); } catch {} };

export function useBorradores(user, { onlyMine = false } = {}) {
  const [borradores, setBorradores] = useState([]);
  const [isLoading,  setIsLoading]  = useState(false);
  const tenantId = useAppStore(s => s.tenantId);

  // ─── Listener Firestore ────────────────────────────────────────────────────
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

  // ─── Sincronizar cola localStorage → Firestore al recuperar red ───────────
  useEffect(() => {
    if (!user || !tenantId) return;

    const sync = async () => {
      if (!navigator.onLine) return;
      const all  = loadPending();
      const mine = all.filter(p => p.tenantId === tenantId);
      if (!mine.length) return;

      const failed = [];
      for (const item of mine) {
        try {
          await addDoc(getCollectionRef('borradores'), item.data);
        } catch {
          failed.push(item);
        }
      }
      savePending([...all.filter(p => p.tenantId !== tenantId), ...failed]);
    };

    window.addEventListener('online', sync);
    sync(); // También al montar: sincroniza borradores de sesiones anteriores
    return () => window.removeEventListener('online', sync);
  }, [user, tenantId]);

  // ─── Escrituras ────────────────────────────────────────────────────────────
  const addBorrador = (data) => {
    if (!user || !tenantId) return Promise.resolve(false);
    const { technicianName: nameOverride, ...rest } = data;
    const docData = {
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
    };

    if (!navigator.onLine) {
      // Sin red: guardar en localStorage; el efecto de sync lo enviará cuando vuelva
      const pending = loadPending();
      pending.push({ tenantId, data: docData });
      savePending(pending);
    } else {
      addDoc(getCollectionRef('borradores'), docData)
        .catch(e => console.error('addBorrador:', e));
    }
    return Promise.resolve(true);
  };

  const updateBorrador = (id, data) => {
    if (!user) return Promise.resolve(false);
    updateDoc(doc(getCollectionRef('borradores'), id), {
      ...data,
      updatedAt: new Date().toISOString(),
    }).catch(e => console.error('updateBorrador:', e));
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
    }).catch(e => console.error('anuladoBorrador:', e));
    return Promise.resolve(true);
  };

  return { borradores, isLoading, addBorrador, updateBorrador, convertBorrador, anuladoBorrador };
}
