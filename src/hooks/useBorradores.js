import { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, query, limit, where } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

// Guarda el cliente en Firestore si el borrador tiene cédula y nombre.
// merge:true evita sobreescribir datos de un cliente que ya exista.
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

// ID determinístico para items viejos sin docId: email + createdAt
// Garantiza que reintentos del sync no creen documentos duplicados
function buildFallbackDocId(data) {
  const email = (data.technicianEmail || 'unknown').replace(/[.@]/g, '_');
  const ts    = (data.createdAt       || '').replace(/[:.]/g, '-');
  return `${email}_${ts}`;
}

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
        // Deduplicar por technicianEmail|createdAt para ocultar duplicados
        // que pudieran existir en BD de versiones anteriores
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
      },
      err => console.error('useBorradores onSnapshot:', err)
    );
    return () => unsub();
  }, [user, tenantId, onlyMine]);

  // ─── Sincronizar cola localStorage → Firestore al recuperar red ───────────
  useEffect(() => {
    if (!user || !tenantId) return;

    let syncing = false;

    const sync = async () => {
      if (!navigator.onLine || syncing) return;
      syncing = true;
      try {
        const all  = loadPending();
        const mine = all.filter(p =>
          p.tenantId === tenantId &&
          (!onlyMine || p.data.technicianEmail === user.email)
        );
        if (!mine.length) return;

        const failed = [];
        for (const item of mine) {
          // ── Paso 1: borrador (siempre setDoc idempotente, nunca addDoc) ──
          // Tanto items nuevos (con docId) como viejos (sin docId) usan un ID
          // determinístico → reintentar el sync nunca crea documentos duplicados.
          const docId = item.docId || buildFallbackDocId(item.data);
          let borradorOk = false;
          try {
            await setDoc(doc(getCollectionRef('borradores'), docId), item.data);
            borradorOk = true;
          } catch {
            failed.push(item);
          }

          // ── Paso 2: cliente (try-catch independiente) ─────────────────────
          // Si falla, se loga pero NO impide limpiar el borrador de la cola.
          if (borradorOk) {
            try {
              await syncClientFromBorrador(item.data);
            } catch (e) {
              console.error('syncClientFromBorrador:', e);
            }
          }
        }

        savePending([
          ...all.filter(p => p.tenantId !== tenantId || (onlyMine && p.data.technicianEmail !== user.email)),
          ...failed,
        ]);
        if (failed.length < mine.length) {
          const failedCreatedAts = new Set(failed.map(f => f.data.createdAt));
          setLocalPending(prev => prev.filter(b => failedCreatedAts.has(b.createdAt)));
        }
      } finally {
        syncing = false;
      }
    };

    window.addEventListener('online', sync);
    sync();
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

  return { borradores, isLoading, addBorrador, updateBorrador, convertBorrador, anuladoBorrador };
}
