// src/hooks/useTiposVisita.js
import { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot, query, limit } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';

export function useTiposVisita(user) {
  const [tipos, setTipos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(getCollectionRef('tipos_visita'), limit(200)), (snap) => {
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

  const updateTipo = async (id, nombre) => {
    if (!user || !nombre.trim()) return false;
    setIsLoading(true);
    try {
      await setDoc(
        doc(getCollectionRef('tipos_visita'), id),
        { nombre: nombre.trim(), updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return true;
    } catch (e) {
      console.error('Error al actualizar tipo de visita:', e);
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

  const tiposParaSelect = tipos.map(t => t.nombre);

  return { tipos, tiposParaSelect, isLoading, addTipo, updateTipo, deleteTipo };
}
