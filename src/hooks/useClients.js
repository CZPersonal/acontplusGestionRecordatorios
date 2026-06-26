import { useState, useEffect } from 'react';
import { doc, setDoc, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

export function useClients(user) {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (!user) return;
    const colRef    = getCollectionRef('clients');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(data);
    });
    return () => unsubscribe();
  }, [user]);

  // ─── Crear / actualizar cliente desde TaskForm ─────────────────────────────
  const saveClient = async (clientData) => {
    if (!user) return null;
    if (!clientData.identification || !clientData.identification.trim()) return null;

    const clientId = clientData.identification.replace(/\s/g, '');
    const client = {
      id:             clientId,
      name:           clientData.clientName,
      phone:          clientData.clientPhone   || '',
      address:        clientData.clientAddress || '',
      email:          clientData.clientEmail   || clientData.email || '',
      identification: clientData.identification,
      foreign:        clientData.foreign       ?? false,
      ciudad:         clientData.ciudad        || '',
      ubicacion:      clientData.ubicacion     || '',
      observacion:    clientData.observacion   || '',
      active:         true,
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
    };
    try {
      await setDoc(
        doc(getCollectionRef('clients'), clientId),
        client,
        { merge: true }
      );
      return client;
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      return null;
    }
  };

  // ─── Crear cliente directamente desde ClientsManager ──────────────────────
  const createClient = async ({ name, identification, phone, address, email, foreign, ciudad, ubicacion, observacion }) => {
    if (!user || !identification?.trim() || !name?.trim()) return false;
    const clientId = identification.replace(/\s/g, '');
    try {
      await setDoc(
        doc(getCollectionRef('clients'), clientId),
        {
          id:             clientId,
          name:           name.trim(),
          identification: identification.trim(),
          phone:          phone?.trim()      || '',
          address:        address?.trim()    || '',
          email:          email?.trim()      || '',
          foreign:        foreign            ?? false,
          ciudad:         ciudad?.trim()     || '',
          ubicacion:      ubicacion?.trim()  || '',
          observacion:    observacion?.trim() || '',
          active:         true,
          createdAt:      new Date().toISOString(),
          updatedAt:      new Date().toISOString(),
        }
      );
      return true;
    } catch (error) {
      console.error('Error al crear cliente:', error);
      return false;
    }
  };

  // ─── Editar cliente existente ──────────────────────────────────────────────
  const updateClient = async (id, { name, phone, address, email, foreign, ciudad, ubicacion, observacion }) => {
    if (!user || !name?.trim()) return false;
    try {
      await updateDoc(
        doc(getCollectionRef('clients'), id),
        {
          name:       name.trim(),
          phone:      phone?.trim()       || '',
          address:    address?.trim()     || '',
          email:      email?.trim()       || '',
          foreign:    foreign             ?? false,
          ciudad:     ciudad?.trim()      || '',
          ubicacion:  ubicacion?.trim()   || '',
          observacion: observacion?.trim() || '',
          updatedAt:  new Date().toISOString(),
        }
      );
      return true;
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      return false;
    }
  };

  // ─── Inactivar / reactivar cliente ────────────────────────────────────────
  const setClientActive = async (id, active) => {
    if (!user) return false;
    try {
      await updateDoc(
        doc(getCollectionRef('clients'), id),
        { active, updatedAt: new Date().toISOString() }
      );
      return true;
    } catch (error) {
      console.error('Error al cambiar estado cliente:', error);
      return false;
    }
  };

  // ─── Importar lote de clientes con writeBatch (grupos de 100) ─────────────
  // onProgress(done, total) se llama después de cada batch para actualizar la barra
  const importClients = async (rows, onProgress) => {
    if (!user) return { ok: 0, errors: [] };

    const BATCH_SIZE = 100;
    let ok = 0;
    const errors = [];
    const total = rows.length;

    // Dividir en grupos de 100
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      for (const row of chunk) {
        if (!row.identification?.trim() || !row.name?.trim()) {
          errors.push({ row, reason: 'Nombre o cédula vacíos' });
          continue;
        }
        const clientId = row.identification.replace(/\s/g, '');
        const ref = doc(getCollectionRef('clients'), clientId);
        batch.set(ref, {
          id:             clientId,
          name:           row.name.trim(),
          identification: row.identification.trim(),
          phone:          row.phone?.trim()        || '',
          address:        row.address?.trim()      || '',
          email:          row.email?.trim()        || '',
          foreign:        row.foreign              ?? false,
          ciudad:         row.ciudad?.trim()       || '',
          ubicacion:      row.ubicacion?.trim()    || '',
          observacion:    row.observacion?.trim()  || '',
          active:         true,
          createdAt:      new Date().toISOString(),
          updatedAt:      new Date().toISOString(),
        }, { merge: true });
      }

      try {
        await batch.commit();
        ok += chunk.filter(r => r.identification?.trim() && r.name?.trim()).length;
      } catch (err) {
        // Si el batch falla, registrar todos los del chunk como error
        chunk.forEach(row => errors.push({ row, reason: err.message }));
      }

      // Notificar progreso después de cada batch
      if (onProgress) onProgress(Math.min(i + BATCH_SIZE, total), total);
    }

    return { ok, errors };
  };

  // Sincronizar clientes al store
  useEffect(() => {
    useAppStore.setState({ clients });
  }, [clients]);

  // Registrar acciones de clientes al store cuando cambia el usuario
  useEffect(() => {
    useAppStore.setState({ saveClient, createClient, updateClient, setClientActive, importClients });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { clients, saveClient, createClient, updateClient, setClientActive, importClients };
}
