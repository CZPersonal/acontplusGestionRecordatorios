import { useState, useEffect, useMemo } from 'react';
import { doc, addDoc, updateDoc, onSnapshot, query, limit, where } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

// ─── Cola offline en localStorage ─────────────────────────────────────────────
const PENDING_KEY = 'acontplus_pending_borradores';
const loadPending = () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; } };
const savePending = (l) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(l)); } catch {} };

export function useBorradores(user, { onlyMine = false } = {}) {
  const [firestoreDocs, setFirestoreDocs] = useState([]);
  const [localPending,  setLocalPending]  = useState([]);
  const [isLoading,     setIsLoading]     = useState(false);
  const tenantId = useAppStore(s => s.tenantId);

  // ─── Cargar pendientes de localStorage al arrancar ─────────────────────────
  useEffect(() => {
    if (!tenantId || !user) return;
    const items = loadPending().filter(p =>
      p.tenantId === tenantId &&
      (!onlyMine || p.data.technicianEmail === user.email)
    );
    setLocalPending(items.map(p => ({ ...p.data, id: `pending_${p.data.createdAt}`, _pending: true })));
  }, [tenantId, user?.email, onlyMine]);

  // ─── Listener Firestore ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !tenantId) return;
    const col = getCollectionRef('borradores');
    const q = onlyMine
      ? query(col, where('technicianEmail', '==', user.email), limit(50))
      : query(col, limit(200));

    const unsub = onSnapshot(q,
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setFirestoreDocs(docs);
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
      const mine = all.filter(p =>
        p.tenantId === tenantId &&
        (!onlyMine || p.data.technicianEmail === user.email)
      );
      if (!mine.length) return;

      const failed = [];
      for (const item of mine) {
        try {
          await addDoc(getCollectionRef('borradores'), item.data);
        } catch {
          failed.push(item);
        }
      }
      // Guardar de vuelta solo los que fallaron + los de otros tenants/usuarios
      savePending([
        ...all.filter(p => p.tenantId !== tenantId || (onlyMine && p.data.technicianEmail !== user.email)),
        ...failed,
      ]);
      // Limpiar los que se sincronizaron de la vista local
      if (failed.length < mine.length) {
        const failedIds = new Set(failed.map(f => f.data.createdAt));
        setLocalPending(prev => prev.filter(b => failedIds.has(b.createdAt)));
      }
    };

    window.addEventListener('online', sync);
    sync(); // También al montar: sincroniza pendientes de sesiones anteriores
    return () => window.removeEventListener('online', sync);
  }, [user, tenantId, onlyMine]);

  // ─── Merge: pendientes locales + Firestore (sin duplicados) ───────────────
  const borradores = useMemo(() => {
    const fsCreatedAts = new Set(firestoreDocs.map(b => b.createdAt));
    const uniqueLocal  = localPending.filter(b => !fsCreatedAts.has(b.createdAt));
    return [...uniqueLocal, ...firestoreDocs].sort(
      (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  }, [firestoreDocs, localPending]);

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
      // Sin red: encolar en localStorage y mostrar en la lista con indicador visual
      const pending = loadPending();
      pending.push({ tenantId, data: docData });
      savePending(pending);
      setLocalPending(prev => [{ ...docData, id: `pending_${docData.createdAt}`, _pending: true }, ...prev]);
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
