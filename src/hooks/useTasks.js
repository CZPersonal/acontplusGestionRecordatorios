import { useState, useEffect, useRef, useMemo } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getCollectionRef, getVisitsRef } from '../lib/firebase';

export function useTasks(user) {
  const [rawTasks,      setRawTasks]      = useState([]);
  const [visitsMap,     setVisitsMap]     = useState({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const initialLoadDone = useRef(false);
  const visitUnsubsRef  = useRef(new Map()); // taskId → unsubscribe fn

  useEffect(() => {
    if (!user) {
      setRawTasks([]);
      setVisitsMap({});
      setIsLoadingTasks(false);
      initialLoadDone.current = false;
      visitUnsubsRef.current.forEach(unsub => unsub());
      visitUnsubsRef.current.clear();
      return;
    }

    const colRef = getCollectionRef('water_filter_tasks');

    const unsubTasks = onSnapshot(colRef, (snapshot) => {
      const currentIds = new Set(snapshot.docs.map(d => d.id));

      // Suscribirse a la subcollección de visitas para cada tarea nueva
      snapshot.docs.forEach(taskDoc => {
        const taskId = taskDoc.id;
        if (!visitUnsubsRef.current.has(taskId)) {
          const unsubVisits = onSnapshot(getVisitsRef(taskId), (visSnap) => {
            const visits = visSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setVisitsMap(prev => ({ ...prev, [taskId]: visits }));
          });
          visitUnsubsRef.current.set(taskId, unsubVisits);
        }
      });

      // Limpiar suscripciones de tareas eliminadas
      visitUnsubsRef.current.forEach((unsub, taskId) => {
        if (!currentIds.has(taskId)) {
          unsub();
          visitUnsubsRef.current.delete(taskId);
          setVisitsMap(prev => {
            const next = { ...prev };
            delete next[taskId];
            return next;
          });
        }
      });

      setRawTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        setIsLoadingTasks(false);
      }
    }, (error) => {
      console.error("Error cargando tareas:", error);
      setIsLoadingTasks(false);
    });

    return () => {
      unsubTasks();
      visitUnsubsRef.current.forEach(unsub => unsub());
      visitUnsubsRef.current.clear();
      initialLoadDone.current = false;
    };
  }, [user]);

  // Visitas: usa subcollección si tiene datos; si no, fallback al array embebido (datos legacy)
  const tasks = useMemo(() =>
    rawTasks.map(task => ({
      ...task,
      visits: visitsMap[task.id]?.length > 0
        ? visitsMap[task.id]
        : (task.visits || []),
    })),
    [rawTasks, visitsMap]
  );

  const addTask = async (task, userEmail) => {
    if (!user) return false;
    const taskId = task.id || crypto.randomUUID();
    // Las visitas viven en la subcollección — no se persisten en el documento tarea
    const { visits: _visits, ...taskWithoutVisits } = task;
    try {
      await setDoc(
        doc(getCollectionRef('water_filter_tasks'), taskId),
        {
          ...taskWithoutVisits,
          id:        taskId,
          createdAt: task.createdAt || new Date().toISOString(),
          createdBy: task.createdBy || userEmail || user.email || '—',
        }
      );
      return true;
    } catch (error) {
      console.error("Error al guardar:", error);
      return false;
    }
  };

  const deleteTask = async (id) => {
    if (!user) return false;
    try {
      await deleteDoc(doc(getCollectionRef('water_filter_tasks'), id));
      return true;
    } catch (error) {
      console.error("Error al eliminar:", error);
      return false;
    }
  };

  const markAsCompleted = async (id, completionData) => {
    if (!user) return false;
    const taskToUpdate = rawTasks.find(t => t.id === id);
    if (!taskToUpdate) return false;
    const { visits: _v, ...taskData } = taskToUpdate;
    try {
      await setDoc(
        doc(getCollectionRef('water_filter_tasks'), id),
        {
          ...taskData,
          status:                 'Completado',
          completionObservations: completionData.completionObservations,
          completedAt:            completionData.completedAt,
          completedBy:            completionData.completedBy,
        }
      );
      return true;
    } catch (error) {
      console.error("Error al completar:", error);
      return false;
    }
  };

  // No-op: las visitas se gestionan directamente en la subcollección via useVisits/visitBilling.
  // Se mantiene para que la cadena BillingModal → handleVisitsUpdate no genere errores.
  const updateTaskVisits = async (_taskId, _updatedVisits, _userEmail) => true;

  return { tasks, isLoadingTasks, addTask, deleteTask, markAsCompleted, updateTaskVisits };
}
