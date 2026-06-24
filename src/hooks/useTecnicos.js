// src/hooks/useTecnicos.js
import { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot, query, limit } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

export function useTecnicos(user) {
  const [tecnicos, setTecnicos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const tenantId = useAppStore(s => s.tenantId);

  useEffect(() => {
    if (!user || !tenantId) return;
    const unsub = onSnapshot(
      query(getCollectionRef('tecnicos'), limit(200)),
      (snap) => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
        setTecnicos(data);
      },
      (err) => console.error('useTecnicos onSnapshot error:', err)
    );
    return () => unsub();
  }, [user, tenantId]);

  const addTecnico = async ({ nombre, email, phone }) => {
    if (!user || !nombre.trim()) return false;
    setIsLoading(true);
    const id = crypto.randomUUID();
    try {
      await setDoc(
        doc(getCollectionRef('tecnicos'), id),
        {
          id,
          nombre: nombre.trim(),
          email:  email?.trim() || '',
          phone:  phone?.trim() || '',
          createdAt: new Date().toISOString(),
        }
      );
      return true;
    } catch (e) {
      console.error('Error al agregar técnico:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTecnico = async (id, { nombre, email, phone }) => {
    if (!user || !nombre.trim()) return false;
    setIsLoading(true);
    try {
      await setDoc(
        doc(getCollectionRef('tecnicos'), id),
        { nombre: nombre.trim(), email: email?.trim() || '', phone: phone?.trim() || '', updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return true;
    } catch (e) {
      console.error('Error al actualizar técnico:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTecnico = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(getCollectionRef('tecnicos'), id));
    } catch (e) {
      console.error('Error al eliminar técnico:', e);
    }
  };

  return { tecnicos, isLoading, addTecnico, updateTecnico, deleteTecnico };
}
