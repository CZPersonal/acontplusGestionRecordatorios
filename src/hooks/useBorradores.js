import { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, limit, where, orderBy } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

// ─── Flag global de sync ───────────────────────────────────────────────────────
// Compartido entre TODAS las instancias del hook (TechPortal + BorradorSheet +
// VisitsModal pueden estar montados simultáneamente). Un solo sync corre a la vez.
let _globalSyncing = false;

// ─── Guardar cliente al sincronizar borrador ───────────────────────────────────
async function syncClientFromBorrador(docData) {
  const id = docData.clientIdNumber?.replace(/\s/g, '');
  if (!id || !docData.clientName) return;
  await setDoc(
    doc(getCollectionRef('clients'), id),
    {
      id,
      name:           docData.clientName,
      identification: docData.clientIdNumber,
      phone:          docData.clientPhone   || '',
      address:        docData.clientAddress || '',
      email:          docData.clientEmail   || '',
      foreign:        false,
      active:         true,
      updatedAt:      new Date().toISOString(),
    },
    { merge: true }
  );
}

// ─── Cola offline en localStorage ─────────────────────────────────────────────
const PENDING_KEY = 'acontplus_pending_borradores';
const loadPending = () => { try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch { return []; } };
const savePending = (l) => { try { localStorage.setItem(PENDING_KEY, JSON.stringify(l)); } catch {} };

// ID determinístico basado en uid + createdAt (nuevos borradores)
function buildDocId(uid, createdAt) {
  return `${uid}_${createdAt.replace(/[:.]/g, '-')}`;
}

// ID determinístico para items viejos sin docId almacenado
function buildFallbackDocId(data) {
  const email = (data.technicianEmail || 'unknown').replace(/[.@]/g, '_');
  const ts    = (data.createdAt       || '').replace(/[:.]/g, '-');
  return `${email}_${ts}`;
}

export function useBorradores(user, { onlyMine = false } = {}) {
  const [firestoreDocs, setFirestoreDocs] = useState([]);
  const [localPending,  setLocalPending]  = useState([]);
  const [isLoading,     setIsLoading]     = useState(true);
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
      ? query(col, where('technicianEmail', '==', user.email), orderBy('createdAt', 'desc'), limit(200))
      : query(col, limit(200));

    const unsub = onSnapshot(q,
      snap => {
        const seen = new Set();
        const docs = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(d => {
            const key = `${d.technicianEmail ?? ''}|${d.createdAt ?? ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        docs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setFirestoreDocs(docs);
        setIsLoading(false);
      },
      err => { console.error('useBorradores onSnapshot:', err); setIsLoading(false); }
    );
    return () => unsub();
  }, [user, tenantId, onlyMine]);

  // ─── Auto-limpiar localPending cuando el borrador ya llegó a Firestore ─────
  // Cubre el caso en que el sync corrió en OTRA instancia del hook y esta
  // instancia no llegó a llamar setLocalPending.
  useEffect(() => {
    if (!localPending.length || !firestoreDocs.length) return;
    const fsKeys = new Set(
      firestoreDocs.map(d => `${d.technicianEmail ?? ''}|${d.createdAt ?? ''}`)
    );
    const synced = localPending.filter(b =>
      fsKeys.has(`${b.technicianEmail ?? ''}|${b.createdAt ?? ''}`)
    );
    if (!synced.length) return;
    const syncedKeys = new Set(synced.map(b => `${b.technicianEmail ?? ''}|${b.createdAt ?? ''}`));
    setLocalPending(prev =>
      prev.filter(b => !syncedKeys.has(`${b.technicianEmail ?? ''}|${b.createdAt ?? ''}`))
    );
    // Limpiar también de localStorage para no volver a encolarlos
    const all = loadPending();
    const remaining = all.filter(p =>
      !syncedKeys.has(`${p.data?.technicianEmail ?? ''}|${p.data?.createdAt ?? ''}`)
    );
    if (remaining.length < all.length) savePending(remaining);
  }, [firestoreDocs]);

  // ─── Sincronizar cola localStorage → Firestore al recuperar red ───────────
  useEffect(() => {
    if (!user || !tenantId) return;

    const sync = async () => {
      if (!navigator.onLine || _globalSyncing) return;
      _globalSyncing = true;
      try {
        const all  = loadPending();
        const mine = all.filter(p =>
          p.tenantId === tenantId &&
          (!onlyMine || p.data.technicianEmail === user.email)
        );
        if (!mine.length) return;

        const failed = [];
        for (const item of mine) {
          // ── Borrador: siempre setDoc con ID determinístico ──────────────
          const docId = item.docId || buildFallbackDocId(item.data);
          let borradorOk = false;
          try {
            await setDoc(doc(getCollectionRef('borradores'), docId), item.data);
            borradorOk = true;
          } catch {
            failed.push(item);
          }

          // ── Cliente: try/catch separado — fallo no afecta la cola ──────
          if (borradorOk) {
            try {
              await syncClientFromBorrador(item.data);
            } catch (e) {
              console.error('syncClientFromBorrador:', e);
            }
          }
        }

        savePending([
          ...all.filter(p =>
            p.tenantId !== tenantId ||
            (onlyMine && p.data.technicianEmail !== user.email)
          ),
          ...failed,
        ]);
        if (failed.length < mine.length) {
          const failedCreatedAts = new Set(failed.map(f => f.data.createdAt));
          setLocalPending(prev => prev.filter(b => failedCreatedAts.has(b.createdAt)));
        }
      } finally {
        _globalSyncing = false;
      }
    };

    window.addEventListener('online', sync);
    sync();
    return () => window.removeEventListener('online', sync);
  }, [user, tenantId, onlyMine]);

  // ─── Merge: pendientes locales + Firestore (sin duplicados) ───────────────
  const borradores = useMemo(() => {
    const fsKeys    = new Set(firestoreDocs.map(b => `${b.technicianEmail ?? ''}|${b.createdAt ?? ''}`));
    const uniqueLocal = localPending.filter(
      b => !fsKeys.has(`${b.technicianEmail ?? ''}|${b.createdAt ?? ''}`)
    );
    return [...uniqueLocal, ...firestoreDocs].sort(
      (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
    );
  }, [firestoreDocs, localPending]);

  // ─── Escrituras ────────────────────────────────────────────────────────────
  const addBorrador = (data) => {
    if (!user || !tenantId) return Promise.resolve(false);
    const { technicianName: nameOverride, ...rest } = data;
    const createdAt = new Date().toISOString();
    const docId     = buildDocId(user.uid, createdAt);
    const docData   = {
      ...rest,
      status:          'Pendiente',
      technicianEmail: user.email,
      technicianName:  nameOverride || user.displayName || user.email,
      createdAt,
      updatedAt:       createdAt,
      convertedAt:     null,
      convertedBy:     null,
      taskId:          null,
      visitId:         null,
    };

    if (!navigator.onLine) {
      const pending = loadPending();
      pending.push({ tenantId, docId, data: docData });
      savePending(pending);
      setLocalPending(prev => [{ ...docData, id: `pending_${createdAt}`, _pending: true }, ...prev]);
    } else {
      setDoc(doc(getCollectionRef('borradores'), docId), docData)
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

  const deleteBorrador = async (id) => {
    try {
      await deleteDoc(doc(getCollectionRef('borradores'), id));
      return true;
    } catch (e) {
      console.error('deleteBorrador:', e);
      return false;
    }
  };

  return { borradores, isLoading, addBorrador, updateBorrador, convertBorrador, anuladoBorrador, deleteBorrador };
}
