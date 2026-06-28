import { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot, query } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

export function useEstablecimientos(user) {
  const [establecimientos, setEstablecimientos] = useState([]);
  const tenantId = useAppStore(s => s.tenantId);

  useEffect(() => {
    if (!user || !tenantId) return;
    const unsub = onSnapshot(
      query(getCollectionRef('establecimientos')),
      snap => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        setEstablecimientos(data);
      },
      err => console.error('useEstablecimientos error:', err)
    );
    return () => unsub();
  }, [user, tenantId]);

  const addEstablecimiento = async ({ nombre, codigo, direccion }) => {
    if (!user || !nombre?.trim()) return false;
    const id = crypto.randomUUID();
    try {
      await setDoc(doc(getCollectionRef('establecimientos'), id), {
        id,
        nombre:    nombre.trim(),
        codigo:    codigo?.trim()    || '',
        direccion: direccion?.trim() || '',
        createdAt: new Date().toISOString(),
        createdBy: user.email,
      });
      return id;
    } catch (err) {
      console.error('Error al crear establecimiento:', err);
      return false;
    }
  };

  const updateEstablecimiento = async (id, { nombre, codigo, direccion }) => {
    if (!user || !nombre?.trim()) return false;
    try {
      await setDoc(
        doc(getCollectionRef('establecimientos'), id),
        { nombre: nombre.trim(), codigo: codigo?.trim() || '', direccion: direccion?.trim() || '', updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.error('Error al actualizar establecimiento:', err);
      return false;
    }
  };

  const deleteEstablecimiento = async (id) => {
    if (!user) return false;
    try {
      await deleteDoc(doc(getCollectionRef('establecimientos'), id));
      return true;
    } catch (err) {
      console.error('Error al eliminar establecimiento:', err);
      return false;
    }
  };

  useEffect(() => {
    useAppStore.setState({ establecimientos });
  }, [establecimientos]);

  useEffect(() => {
    useAppStore.setState({ addEstablecimiento, updateEstablecimiento, deleteEstablecimiento });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { establecimientos, addEstablecimiento, updateEstablecimiento, deleteEstablecimiento };
}
