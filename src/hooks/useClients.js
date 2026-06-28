import { useState, useEffect } from 'react';
import { doc, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

// ─── Helpers exportados ────────────────────────────────────────────────────────

export const emptyInstallation = (fields = {}) => ({
  id:          crypto.randomUUID(),
  serviceType: fields.serviceType || '',
  observacion: fields.observacion || '',
});

export const emptyContact = (fields = {}) => ({
  id:            crypto.randomUUID(),
  ubicacion:     fields.ubicacion     || '',
  ciudad:        fields.ciudad        || '',
  address:       fields.address       || '',
  phone:         fields.phone         || '',
  email:         fields.email         || '',
  observacion:   fields.observacion   || '',
  installations: fields.installations || [],
});

// Compatibilidad hacia atrás: clientes con campos planos → array contacts
export const getClientContacts = (client) => {
  if (client.contacts?.length > 0) return client.contacts;
  const hasLegacy = client.phone || client.address || client.email
    || client.ciudad || client.ubicacion || client.observacion;
  if (!hasLegacy) return [];
  return [emptyContact({
    phone:       client.phone,
    address:     client.address,
    email:       client.email,
    ciudad:      client.ciudad,
    ubicacion:   client.ubicacion,
    observacion: client.observacion,
  })];
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useClients(user) {
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(getCollectionRef('clients'), (snapshot) => {
      setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // ─── saveClient: llamado desde TaskForm al crear/actualizar tarea ──────────
  // Acepta: { identification, clientName, foreign, contacts[] }
  // O campos legacy: { clientPhone, clientAddress, clientEmail, ciudad, ubicacion, observacion }
  const saveClient = async (clientData) => {
    if (!user || !clientData.identification?.trim()) return null;

    const clientId = clientData.identification.replace(/\s/g, '');

    // Construir contacts desde el payload del formulario
    let incoming = clientData.contacts || [];
    if (incoming.length === 0) {
      const hasLegacy = clientData.clientPhone || clientData.clientAddress;
      if (hasLegacy) {
        incoming = [emptyContact({
          phone:       clientData.clientPhone,
          address:     clientData.clientAddress,
          email:       clientData.clientEmail,
          ciudad:      clientData.ciudad,
          ubicacion:   clientData.ubicacion,
          observacion: clientData.observacion,
        })];
      }
    }

    try {
      const existing = clients.find(c => c.id === clientId);

      if (existing) {
        const existingContacts = getClientContacts(existing);
        if (incoming.length > 0) {
          if (existingContacts.length === 0) {
            existingContacts.push(...incoming);
          } else {
            // Actualizar contacts[0] con campos no vacíos (no sobreescribir si vacío)
            const inc = incoming[0];
            existingContacts[0] = {
              ...existingContacts[0],
              ...(inc.phone       ? { phone:       inc.phone }       : {}),
              ...(inc.address     ? { address:     inc.address }     : {}),
              ...(inc.email       ? { email:       inc.email }       : {}),
              ...(inc.ciudad      ? { ciudad:      inc.ciudad }      : {}),
              ...(inc.ubicacion   ? { ubicacion:   inc.ubicacion }   : {}),
              ...(inc.observacion ? { observacion: inc.observacion } : {}),
            };
            // Agregar contactos adicionales (idx >= 1) si vinieron del formulario
            for (let i = 1; i < incoming.length; i++) {
              const alreadyExists = existingContacts.some(c => c.id === incoming[i].id);
              if (!alreadyExists) existingContacts.push(incoming[i]);
            }
          }
        }
        // Agregar ubicaciones nuevas para cliente existente (desde TaskForm)
        if (clientData.additionalContacts?.length > 0) {
          for (const c of clientData.additionalContacts) {
            const alreadyExists = existingContacts.some(ec => ec.id === c.id);
            if (!alreadyExists) existingContacts.push(c);
          }
        }
        await updateDoc(doc(getCollectionRef('clients'), clientId), {
          name:      clientData.clientName || existing.name,
          contacts:  existingContacts,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await setDoc(doc(getCollectionRef('clients'), clientId), {
          id:             clientId,
          name:           clientData.clientName,
          identification: clientData.identification,
          foreign:        clientData.foreign ?? false,
          contacts:       incoming,
          active:         true,
          createdAt:      new Date().toISOString(),
          updatedAt:      new Date().toISOString(),
        });
      }

      return { id: clientId, name: clientData.clientName, contacts: incoming };
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      return null;
    }
  };

  // ─── createClient: desde ClientsManager (nuevo cliente) ───────────────────
  const createClient = async ({ name, identification, foreign, contacts }) => {
    if (!user || !identification?.trim() || !name?.trim()) return false;
    const clientId = identification.replace(/\s/g, '');
    try {
      await setDoc(doc(getCollectionRef('clients'), clientId), {
        id:             clientId,
        name:           name.trim(),
        identification: identification.trim(),
        foreign:        foreign ?? false,
        contacts:       (contacts || []).map(c => ({ ...c, id: c.id || crypto.randomUUID() })),
        active:         true,
        createdAt:      new Date().toISOString(),
        updatedAt:      new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error al crear cliente:', error);
      return false;
    }
  };

  // ─── updateClient: desde ClientsManager (editar cliente) ──────────────────
  const updateClient = async (id, { name, foreign, contacts, identification }) => {
    if (!user || !name?.trim()) return false;

    const newId     = identification?.trim().replace(/\s/g, '') || id;
    const idChanged = newId !== id;

    const baseData = {
      name:      name.trim(),
      foreign:   foreign ?? false,
      contacts:  (contacts || []).map(c => ({ ...c, id: c.id || crypto.randomUUID() })),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (!idChanged) {
        await updateDoc(doc(getCollectionRef('clients'), id), baseData);
        return true;
      }

      // Rename: crear nuevo doc, actualizar tareas, borrar viejo
      const existing = clients.find(c => c.id === id);
      const oldIdentification = existing?.identification || id;

      await setDoc(doc(getCollectionRef('clients'), newId), {
        ...baseData,
        id:             newId,
        identification: identification.trim(),
        active:         existing?.active ?? true,
        createdAt:      existing?.createdAt || new Date().toISOString(),
      });

      const tasksSnap = await getDocs(
        query(getCollectionRef('water_filter_tasks'), where('identification', '==', oldIdentification))
      );
      if (!tasksSnap.empty) {
        const BATCH_LIMIT = 500;
        const taskDocs = tasksSnap.docs;
        for (let i = 0; i < taskDocs.length; i += BATCH_LIMIT) {
          const batch = writeBatch(db);
          taskDocs.slice(i, i + BATCH_LIMIT).forEach(d =>
            batch.update(d.ref, { identification: identification.trim() })
          );
          await batch.commit();
        }
      }

      await deleteDoc(doc(getCollectionRef('clients'), id));
      return true;
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      return false;
    }
  };

  // ─── setClientActive ───────────────────────────────────────────────────────
  const setClientActive = async (id, active) => {
    if (!user) return false;
    try {
      await updateDoc(doc(getCollectionRef('clients'), id), {
        active, updatedAt: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error('Error al cambiar estado cliente:', error);
      return false;
    }
  };

  // ─── importClients: lote desde Excel/CSV ──────────────────────────────────
  const importClients = async (rows, onProgress) => {
    if (!user) return { ok: 0, errors: [] };

    const BATCH_SIZE = 100;
    let ok = 0;
    const errors = [];
    const total = rows.length;

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
          foreign:        row.foreign ?? false,
          contacts: [emptyContact({
            phone:       row.phone,
            address:     row.address,
            email:       row.email,
            ciudad:      row.ciudad,
            ubicacion:   row.ubicacion,
            observacion: row.observacion,
          })],
          active:    true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      try {
        await batch.commit();
        ok += chunk.filter(r => r.identification?.trim() && r.name?.trim()).length;
      } catch (err) {
        chunk.forEach(row => errors.push({ row, reason: err.message }));
      }

      if (onProgress) onProgress(Math.min(i + BATCH_SIZE, total), total);
    }

    return { ok, errors };
  };

  useEffect(() => { useAppStore.setState({ clients }); }, [clients]);

  useEffect(() => {
    useAppStore.setState({ saveClient, createClient, updateClient, setClientActive, importClients });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { clients, saveClient, createClient, updateClient, setClientActive, importClients };
}
