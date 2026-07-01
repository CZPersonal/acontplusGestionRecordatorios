import { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, limit, where, orderBy } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

// ─── Flag global de sync ───────────────────────────────────────────────────────
// Compartido entre TODAS las instancias del hook. Un solo sync corre a la vez.
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

// ID determinístico basado en uid + createdAt
function buildDocId(uid, createdAt) {
  return `${uid}_${createdAt.replace(/[:.]/g, '-')}`;
}

// ID determinístico para items viejos sin docId almacenado
function buildFallbackDocId(data) {
  const email = (data.technicianEmail || 'unknown').replace(/[.@]/g, '_');
  const ts    = (data.createdAt       || '').replace(/[:.]/g, '-');
  return `${email}_${ts}`;
}

// Obtener el docId real de un item de la cola
function getItemDocId(item) {
  return item.docId || buildFallbackDocId(item.data);
}

export function useBorradores(user, { onlyMine = false } = {}) {
  const [firestoreDocs, setFirestoreDocs] = useState([]);
  const [localPending,  setLocalPending]  = useState([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const tenantId = useAppStore(s => s.tenantId);
  const addToast = useAppStore(s => s.addToast);

  // ─── Cargar pendientes de localStorage al arrancar ─────────────────────────
  useEffect(() => {
    if (!tenantId || !user) return;
    const items = loadPending().filter(p =>
      p.tenantId === tenantId &&
      p.op !== 'update' &&                          // updates no se muestran como pending
      (!onlyMine || p.data.technicianEmail === user.email)
    );
    setLocalPending(items.map(p => ({
      ...p.data,
      id:       `pending_${p.data.createdAt}`,
      _pending: true,
    })));
  }, [tenantId, user?.email, onlyMine]);

  // ─── Listener Firestore ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !tenantId) return;
    const col = getCollectionRef('borradores');
    const q = onlyMine
      ? query(col, where('technicianEmail', '==', user.email), orderBy('createdAt', 'desc'), limit(200))
      : query(col, orderBy('createdAt', 'desc'), limit(200));

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
  // Cubre el caso en que el sync corrió en otra instancia del hook y esta
  // instancia no llegó a llamar setLocalPending directamente.
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
    const all = loadPending();
    const remaining = all.filter(p =>
      p.op === 'update' ||
      !syncedKeys.has(`${p.data?.technicianEmail ?? ''}|${p.data?.createdAt ?? ''}`)
    );
    if (remaining.length < all.length) savePending(remaining);
  }, [firestoreDocs]);

  // ─── Sincronizar cola localStorage → Firestore ────────────────────────────
  useEffect(() => {
    if (!user || !tenantId) return;

    const sync = async () => {
      if (!navigator.onLine || _globalSyncing) return;
      _globalSyncing = true;
      let syncedCount = 0;
      try {
        const all  = loadPending();
        const mine = all.filter(p =>
          p.tenantId === tenantId &&
          (!onlyMine || p.data.technicianEmail === user.email)
        );
        if (!mine.length) return;

        const col    = getCollectionRef('borradores');
        const failed = [];

        for (const item of mine) {
          const docId = getItemDocId(item);
          let ok = false;
          try {
            if (item.op === 'update') {
              // Actualización diferida de borrador ya existente en Firestore
              await updateDoc(doc(col, docId), {
                ...item.data,
                updatedAt: new Date().toISOString(),
              });
            } else {
              // Creación nueva (add)
              await setDoc(doc(col, docId), item.data);
            }
            ok = true;
            syncedCount++;
          } catch (e) {
            console.error('sync borrador:', docId, e);
            failed.push(item);
          }
          // Sincronizar cliente solo para operaciones de creación
          if (ok && item.op !== 'update') {
            try { await syncClientFromBorrador(item.data); } catch {}
          }
        }

        // Persistir en localStorage: retener otros tenants/usuarios + fallidos
        savePending([
          ...all.filter(p =>
            p.tenantId !== tenantId ||
            (onlyMine && p.data.technicianEmail !== user.email)
          ),
          ...failed,
        ]);

        // Limpiar localPending de los items que sí se sincronizaron
        if (syncedCount > 0) {
          const failedCreatedAts = new Set(
            failed.filter(f => f.op !== 'update').map(f => f.data.createdAt)
          );
          setLocalPending(prev =>
            prev.filter(b => failedCreatedAts.has(b.createdAt))
          );
        }

        if (syncedCount > 0) {
          addToast?.({
            type:  'success',
            title: '📡 Sincronizado',
            body:  syncedCount === 1
              ? '1 borrador subido al servidor.'
              : `${syncedCount} borradores subidos al servidor.`,
          });
        }
      } finally {
        _globalSyncing = false;
      }
    };

    // Disparar sync al recuperar red (evento 'online')
    window.addEventListener('online', sync);
    // Disparar sync al volver al tab/app (visibilitychange)
    const onVisible = () => { if (!document.hidden) sync(); };
    document.addEventListener('visibilitychange', onVisible);
    // Intento inmediato al montar (cubre reload estando online)
    sync();

    return () => {
      window.removeEventListener('online', sync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, tenantId, onlyMine]);

  // ─── Merge: pendientes locales + Firestore (sin duplicados) ───────────────
  const borradores = useMemo(() => {
    const fsKeys = new Set(
      firestoreDocs.map(b => `${b.technicianEmail ?? ''}|${b.createdAt ?? ''}`)
    );
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

    // Write-ahead log: siempre guardar en localStorage primero.
    // Si la app se cierra antes de que Firestore confirme, el borrador no se pierde.
    const pending = loadPending();
    pending.push({ tenantId, docId, data: docData });
    savePending(pending);
    setLocalPending(prev => [{ ...docData, id: `pending_${createdAt}`, _pending: true }, ...prev]);

    // Si hay red, intentar subir inmediatamente. El auto-clean lo retira de
    // localPending cuando onSnapshot confirma la llegada a Firestore.
    if (navigator.onLine) {
      setDoc(doc(getCollectionRef('borradores'), docId), docData)
        .catch(e => console.error('addBorrador:', e));
    }

    return Promise.resolve(true);
  };

  const updateBorrador = (id, data) => {
    if (!user) return Promise.resolve(false);

    // Caso: borrador pendiente (aún no llegó a Firestore)
    if (id.startsWith('pending_')) {
      const createdAt = id.slice('pending_'.length);
      const updatedAt = new Date().toISOString();
      const all       = loadPending();
      const updated   = all.map(p =>
        p.data.createdAt === createdAt && p.tenantId === tenantId
          ? { ...p, data: { ...p.data, ...data, updatedAt } }
          : p
      );
      savePending(updated);
      setLocalPending(prev =>
        prev.map(b => b.id === id ? { ...b, ...data, updatedAt } : b)
      );
      // Si hay red, intentar subir el estado actualizado inmediatamente
      if (navigator.onLine) {
        const item = updated.find(p => p.data.createdAt === createdAt && p.tenantId === tenantId);
        if (item) {
          setDoc(doc(getCollectionRef('borradores'), getItemDocId(item)), item.data)
            .catch(e => console.error('updateBorrador (pending):', e));
        }
      }
      return Promise.resolve(true);
    }

    // Caso: borrador ya en Firestore, dispositivo offline → encolar actualización
    if (!navigator.onLine) {
      const all         = loadPending();
      const existingIdx = all.findIndex(
        p => p.docId === id && p.op === 'update' && p.tenantId === tenantId
      );
      if (existingIdx >= 0) {
        // Fusionar con actualización pendiente existente para el mismo doc
        all[existingIdx] = {
          ...all[existingIdx],
          data: { ...all[existingIdx].data, ...data },
        };
      } else {
        all.push({ tenantId, docId: id, op: 'update', data });
      }
      savePending(all);
      return Promise.resolve(true);
    }

    // Caso: borrador ya en Firestore, dispositivo online → escribir directo
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

  const anuladoBorrador = async (id, { nombre, email }) => {
    // Caso: borrador pendiente (nunca llegó a Firestore) → borrar de la cola
    if (id.startsWith('pending_')) {
      const createdAt = id.slice('pending_'.length);
      const all       = loadPending();
      savePending(all.filter(p =>
        !(p.data.createdAt === createdAt && p.tenantId === tenantId)
      ));
      setLocalPending(prev => prev.filter(b => b.id !== id));
      return true;
    }
    // Caso: borrador en Firestore → actualizar status
    try {
      await updateDoc(doc(getCollectionRef('borradores'), id), {
        status:          'Anulado',
        anuladoAt:       new Date().toISOString(),
        anuladoPor:      nombre,
        anuladoPorEmail: email,
        updatedAt:       new Date().toISOString(),
      });
      return true;
    } catch (e) {
      console.error('anuladoBorrador:', e);
      return false;
    }
  };

  const deleteBorrador = async (id) => {
    // Caso: borrador pendiente → borrar solo de la cola local
    if (id.startsWith('pending_')) {
      const createdAt = id.slice('pending_'.length);
      const all       = loadPending();
      savePending(all.filter(p =>
        !(p.data.createdAt === createdAt && p.tenantId === tenantId)
      ));
      setLocalPending(prev => prev.filter(b => b.id !== id));
      return true;
    }
    // Caso: borrador en Firestore
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
