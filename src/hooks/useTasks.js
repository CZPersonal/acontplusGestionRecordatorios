import { useState, useEffect, useRef } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';

export function useTasks(user) {
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setIsLoadingTasks(false);
      initialLoadDone.current = false;
      return;
    }

    const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'water_filter_tasks');

    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(data);
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        setIsLoadingTasks(false);
      }
    }, (error) => {
      console.error("Error cargando tareas:", error);
      setIsLoadingTasks(false);
    });

    return () => {
      unsubscribe();
      initialLoadDone.current = false;
    };
  }, [user]);

  const addTask = async (task, userEmail) => {
    if (!user) return false;
    const taskId = task.id || crypto.randomUUID();
    const taskData = {
      ...task,
      id: taskId,
      createdAt: task.createdAt || new Date().toISOString(),
      createdBy: task.createdBy || userEmail || user.email || '—',
    };
    try {
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'water_filter_tasks', taskId),
        taskData
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
      await deleteDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'water_filter_tasks', id)
      );
      return true;
    } catch (error) {
      console.error("Error al eliminar:", error);
      return false;
    }
  };

  const markAsCompleted = async (id, completionData) => {
    if (!user) return false;
    const taskToUpdate = tasks.find(t => t.id === id);
    if (!taskToUpdate) return false;
    try {
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'water_filter_tasks', id),
        {
          ...taskToUpdate,
          status: 'Completado',
          completionObservations: completionData.completionObservations,
          completedAt: completionData.completedAt,
          completedBy: completionData.completedBy,
        }
      );
      return true;
    } catch (error) {
      console.error("Error al completar:", error);
      return false;
    }
  };

  return { tasks, isLoadingTasks, addTask, deleteTask, markAsCompleted };
}