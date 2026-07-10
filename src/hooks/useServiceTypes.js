import { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot, query, limit } from 'firebase/firestore';
import { getCollectionRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';

export function useServiceTypes(user) {
  const tenantId = useAppStore(s => s.tenantId);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [isLoading, setIsLoading]       = useState(false);

  // tenantId en las dependencias: sin esto, cambiar de empresa en
  // CompanySelector no volvía a suscribir la lectura, y el usuario seguía
  // viendo los tipos de servicio de la empresa anterior.
  useEffect(() => {
    if (!user || !tenantId) return;
    const unsub     = onSnapshot(query(getCollectionRef('service_types'), limit(200)), (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setServiceTypes(data);
    });
    return () => unsub();
  }, [user, tenantId]);

  const addServiceType = async ({ name, description }) => {
    if (!user || !name?.trim()) return false;
    setIsLoading(true);
    try {
      const id  = crypto.randomUUID();
      await setDoc(
        doc(getCollectionRef('service_types'), id),
        {
          id,
          name:        name.trim(),
          description: description?.trim() || '',
          createdAt:   new Date().toISOString(),
          createdBy:   user.email,
        }
      );
      return true;
    } catch (err) {
      console.error('Error al guardar tipo:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateServiceType = async (id, { name, description }) => {
    if (!user || !name?.trim()) return false;
    setIsLoading(true);
    try {
      await setDoc(
        doc(getCollectionRef('service_types'), id),
        { id, name: name.trim(), description: description?.trim() || '', updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.error('Error al actualizar tipo:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteServiceType = async (id) => {
    if (!user) return false;
    setIsLoading(true);
    try {
      await deleteDoc(doc(getCollectionRef('service_types'), id));
      return true;
    } catch (err) {
      console.error('Error al eliminar tipo:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    useAppStore.setState({ serviceTypes });
  }, [serviceTypes]);

  useEffect(() => {
    useAppStore.setState({ addServiceType });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { serviceTypes, isLoading, addServiceType, updateServiceType, deleteServiceType };
}
