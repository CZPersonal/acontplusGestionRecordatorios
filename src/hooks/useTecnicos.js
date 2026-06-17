// src/hooks/useTecnicos.js
import { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getCollectionRef } from '../lib/firebase';

export function useTecnicos(user) {
  const [tecnicos, setTecnicos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const colRef = getCollectionRef('tecnicos');
    const unsub = onSnapshot(colRef, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setTecnicos(data);
    });
    return () => unsub();
  }, [user]);

  const addTecnico = async ({ nombre, email }) => {
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

  const deleteTecnico = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(getCollectionRef('tecnicos'), id));
    } catch (e) {
      console.error('Error al eliminar técnico:', e);
    }
  };

  return { tecnicos, isLoading, addTecnico, deleteTecnico };
}
