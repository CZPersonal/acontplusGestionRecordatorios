import { useState, useEffect } from 'react';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, onSnapshot, writeBatch, getDocs, query, where } from 'firebase/firestore';
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
  mapsLink:      fields.mapsLink      || '',
  referencia:    fields.referencia    || '',
  installations: fields.installations || [],
});

// Compatibilidad hacia atrás: clientes con campos planos → array contacts
export const getClientContacts = (client) => {
  if (client.contacts?.length > 0) return client.contacts;
  const hasLegacy = client.phone || client.address || client.email
    || client.ciudad || client.ubicacion;
  if (!hasLegacy) return [];
  return [emptyContact({
    phone:      client.phone,
    address:    client.address,
    email:      client.email,
    ciudad:     client.ciudad,
    ubicacion:  client.ubicacion,
    mapsLink:   client.mapsLink   || '',
    referencia: client.referencia || '',
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

    const clientId  = clientData.identification.replace(/\s/g, '');
    const clientRef = doc(getCollectionRef('clients'), clientId);

    // Construir contacts desde el payload del formulario
    let incoming = clientData.contacts || [];
    if (incoming.length === 0) {
      const hasLegacy = clientData.clientPhone || clientData.clientAddress;
      if (hasLegacy) {
        incoming = [emptyContact({
          phone:      clientData.clientPhone,
          address:    clientData.clientAddress,
          email:      clientData.clientEmail,
          ciudad:     clientData.ciudad,
          ubicacion:  clientData.ubicacion,
          referencia: clientData.referencia || '',
          mapsLink:   clientData.mapsLink   || '',
        })];
      }
    }

    try {
      // Leer siempre desde Firestore para evitar estado React desactualizado.
      // Usando el estado React (clients.find) se arriesga a obtener un snapshot
      // congelado desde el login, lo que provoca setDoc sin merge y pérdida de datos.
      const snap     = await getDoc(clientRef);
      const existing = snap.exists() ? snap.data() : null;

      if (existing) {
        const existingContacts = getClientContacts(existing);
        if (incoming.length > 0) {
          if (existingContacts.length === 0) {
            existingContacts.push(...incoming);
          } else {
            // Actualizar contacts[0] solo con campos no vacíos (preserva instalaciones)
            const inc = incoming[0];
            existingContacts[0] = {
              ...existingContacts[0],
              ...(inc.phone       ? { phone:       inc.phone }       : {}),
              ...(inc.address     ? { address:     inc.address }     : {}),
              ...(inc.email       ? { email:       inc.email }       : {}),
              ...(inc.ciudad      ? { ciudad:      inc.ciudad }      : {}),
              ...(inc.ubicacion   ? { ubicacion:   inc.ubicacion }   : {}),
              ...(inc.mapsLink    ? { mapsLink:    inc.mapsLink }    : {}),
              ...(inc.referencia  ? { referencia:  inc.referencia }  : {}),
            };
            for (let i = 1; i < incoming.length; i++) {
              const alreadyExists = existingContacts.some(c => c.id === incoming[i].id);
              if (!alreadyExists) existingContacts.push(incoming[i]);
            }
          }
        }
        if (clientData.additionalContacts?.length > 0) {
          for (const c of clientData.additionalContacts) {
            const alreadyExists = existingContacts.some(ec => ec.id === c.id);
            if (!alreadyExists) existingContacts.push(c);
          }
        }
        await updateDoc(clientRef, {
          name:      clientData.clientName || existing.name,
          contacts:  existingContacts,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Cliente nuevo — setDoc sin merge (documento no existía)
        await setDoc(clientRef, {
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
      // persistentLocalCache confirma la escritura desde IndexedDB de inmediato
      // (online y offline). Awaitar confirmación del servidor bloquea la UI
      // indefinidamente en este setup — el SDK sincroniza en segundo plano.
      setDoc(doc(getCollectionRef('clients'), clientId), {
        id:             clientId,
        name:           name.trim(),
        identification: identification.trim(),
        foreign:        foreign ?? false,
        contacts:       (contacts || []).map(c => ({ ...c, id: c.id || crypto.randomUUID() })),
        active:         true,
        createdAt:      new Date().toISOString(),
        updatedAt:      new Date().toISOString(),
      }).catch(e => console.error('createClient:', e));
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
        // Mismo patrón que createClient: persistentLocalCache garantiza la
        // escritura local. No awaitar el servidor para no bloquear la UI.
        updateDoc(doc(getCollectionRef('clients'), id), baseData)
          .catch(e => console.error('updateClient:', e));
        return true;
      }

      // Rename: requiere servidor para consultar y actualizar tareas vinculadas.
      if (!navigator.onLine) return false;

      const existing          = clients.find(c => c.id === id);
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
        const taskDocs    = tasksSnap.docs;
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

  // ─── deleteClient: eliminación definitiva (solo panel de administrador) ───
  const deleteClient = async (id) => {
    if (!user) return false;
    try {
      await deleteDoc(doc(getCollectionRef('clients'), id));
      return true;
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      return false;
    }
  };

  // ─── importClients: lote desde Excel/CSV ──────────────────────────────────
  // `groups` viene de importValidation.js: uno por cliente (RUC), cada uno con
  // `rows` = sus ubicaciones (1 o más). Los clientes que ya existen en Firestore
  // se omiten por completo — no se tocan sus contacts[] para no sobreescribir
  // ubicaciones e instalaciones ingresadas manualmente.
  const importClients = async (groups, onProgress) => {
    if (!user) return { ok: 0, skipped: 0, errors: [] };

    const BATCH_SIZE = 100;
    let ok = 0;
    let skipped = 0;
    const errors = [];
    const total = groups.length;

    const existingIds = new Set(clients.map(c => c.id));

    for (let i = 0; i < groups.length; i += BATCH_SIZE) {
      const chunk = groups.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      const toWrite = [];

      for (const group of chunk) {
        if (!group.identification?.trim() || !group.name?.trim()) {
          errors.push({ row: group, reason: 'Nombre o cédula vacíos' });
          continue;
        }
        const clientId = group.identification.replace(/\s/g, '');

        if (existingIds.has(clientId)) {
          skipped++;
          continue;
        }

        const ref = doc(getCollectionRef('clients'), clientId);
        batch.set(ref, {
          id:             clientId,
          name:           group.name.trim(),
          identification: group.identification.trim(),
          foreign:        group.foreign ?? false,
          contacts: group.rows.map(r => emptyContact({
            phone:         r.phone,
            address:       r.address,
            email:         r.email,
            ciudad:        r.ciudad,
            ubicacion:     r.ubicacion,
            installations: r.serviceType ? [emptyInstallation({
              serviceType: r.serviceType,
              // r.observacion también alimenta serviceType cuando Equipo viene vacío
              // (ver normalizeRow) — en ese caso no se duplica el mismo texto en los dos campos.
              observacion: r.observacion && r.observacion !== r.serviceType ? r.observacion : '',
            })] : [],
          })),
          active:    true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        toWrite.push(group);
      }

      try {
        await batch.commit();
        ok += toWrite.length;
      } catch (err) {
        toWrite.forEach(group => errors.push({ row: group, reason: err.message }));
      }

      if (onProgress) onProgress(Math.min(i + BATCH_SIZE, total), total);
    }

    return { ok, skipped, errors };
  };

  useEffect(() => { useAppStore.setState({ clients }); }, [clients]);

  useEffect(() => {
    useAppStore.setState({ saveClient, createClient, updateClient, setClientActive, deleteClient, importClients });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { clients, saveClient, createClient, updateClient, setClientActive, deleteClient, importClients };
}
