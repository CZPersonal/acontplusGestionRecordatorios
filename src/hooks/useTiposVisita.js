// src/hooks/useTiposVisita.js
import { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getCollectionRef } from '../lib/firebase';

export function useTiposVisita(user) {
  const [tipos, setTipos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const colRef = getCollectionRef('tipos_visita');
    const unsub = onSnapshot(colRef, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      setTipos(data);
    });
    return () => unsub();
  }, [user]);

  const addTipo = async (nombre) => {
    if (!user || !nombre.trim()) return false;
    setIsLoading(true);
    const id = crypto.randomUUID();
    try {
      await setDoc(
        doc(getCollectionRef('tipos_visita'), id),
        { id, nombre: nombre.trim(), createdAt: new Date().toISOString() }
      );
      return true;
    } catch (e) {
      console.error('Error al agregar tipo de visita:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTipo = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(getCollectionRef('tipos_visita'), id));
    } catch (e) {
      console.error('Error al eliminar tipo de visita:', e);
    }
  };

  // Lista de nombres para usar en selects — solo desde Firestore
  const tiposParaSelect = tipos.map(t => t.nombre);

  return { tipos, tiposParaSelect, isLoading, addTipo, deleteTipo };
}
