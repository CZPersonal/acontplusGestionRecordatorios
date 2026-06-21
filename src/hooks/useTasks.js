import { useState, useEffect, useRef, useMemo } from 'react';
import {
  doc, setDoc, deleteDoc, onSnapshot,
  getDocsFromCache, getDocs, query, orderBy, limit, startAfter,
} from 'firebase/firestore';
import { getCollectionRef, getVisitsRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';
import { logAudit } from '../services/auditService';

const TASKS_PAGE_SIZE = 200;

export function useTasks(user) {
  const refreshKey = useAppStore(s => s.refreshKey);

  const [rawTasks,       setRawTasks]       = useState([]);
  const [extraTasks,     setExtraTasks]     = useState([]);
  const [visitsMap,      setVisitsMap]      = useState({});
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [hasMoreTasks,   setHasMoreTasks]   = useState(false);
  const [isLoadingMore,  setIsLoadingMore]  = useState(false);

  const initialLoadDone  = useRef(false);
  const visitUnsubsRef   = useRef(new Map());
  const lastDocRef       = useRef(null);
  const extraTaskIdsRef  = useRef(new Set());
  const isLoadingMoreRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setRawTasks([]);
      setExtraTasks([]);
      setVisitsMap({});
      setHasMoreTasks(false);
      setIsLoadingTasks(false);
      initialLoadDone.current = false;
      lastDocRef.current = null;
      extraTaskIdsRef.current.clear();
      visitUnsubsRef.current.forEach(unsub => unsub());
      visitUnsubsRef.current.clear();
      return;
    }

    const q = query(
      getCollectionRef('water_filter_tasks'),
      orderBy('createdAt', 'desc'),
      limit(TASKS_PAGE_SIZE),
    );

    // Warm-up desde IndexedDB con la misma query ordenada
    getDocsFromCache(q)
      .then(snap => {
        if (!snap.empty && !initialLoadDone.current) {
          setRawTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setIsLoadingTasks(false);
        }
      })
      .catch(() => {}); // Cache miss en primera sesión — onSnapshot lo resuelve

    const unsubTasks = onSnapshot(q, (snapshot) => {
      lastDocRef.current = snapshot.docs.at(-1) ?? null;
      setHasMoreTasks(snapshot.docs.length === TASKS_PAGE_SIZE);

      const currentIds = new Set(snapshot.docs.map(d => d.id));

      // Abrir listener de visitas para cada tarea nueva del snapshot
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

      // Cerrar listeners de tareas eliminadas (preservar las de "cargar más")
      visitUnsubsRef.current.forEach((unsub, taskId) => {
        if (!currentIds.has(taskId) && !extraTaskIdsRef.current.has(taskId)) {
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
      lastDocRef.current = null;
      extraTaskIdsRef.current.clear();
    };
  }, [user, refreshKey]);

  // ─── Combinar primera página (real-time) con páginas extra (getDocs) ─────────
  const allRawTasks = useMemo(() => {
    if (extraTasks.length === 0) return rawTasks;
    const freshIds = new Set(rawTasks.map(t => t.id));
    return [...rawTasks, ...extraTasks.filter(t => !freshIds.has(t.id))];
  }, [rawTasks, extraTasks]);

  const tasks = useMemo(() =>
    allRawTasks.map(task => ({
      ...task,
      visits: visitsMap[task.id]?.length > 0
        ? visitsMap[task.id]
        : (task.visits || []),
    })),
    [allRawTasks, visitsMap]
  );

  // ─── Sincronizar estado al store ───────────────────────────────────────────
  useEffect(() => {
    useAppStore.setState({ tasks, rawTasks: allRawTasks, isLoadingTasks, hasMoreTasks, isLoadingMore });
  }, [tasks, allRawTasks, isLoadingTasks, hasMoreTasks, isLoadingMore]);

  // ─── Acciones ─────────────────────────────────────────────────────────────

  const addTask = async (task, userEmail) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    const taskId = task.id || crypto.randomUUID();
    const { visits: _visits, ...taskWithoutVisits } = task;
    try {
      await setDoc(
        doc(getCollectionRef('water_filter_tasks'), taskId),
        {
          ...taskWithoutVisits,
          id:        taskId,
          createdAt: task.createdAt || new Date().toISOString(),
          createdBy: task.createdBy || userEmail || u.email || '—',
        }
      );
      logAudit(u, 'task_created', 'task', taskId, { clientName: task.clientName });
      return true;
    } catch (error) {
      console.error("Error al guardar:", error);
      return false;
    }
  };

  const deleteTask = async (id) => {
    const { user: u } = useAppStore.getState();
    if (!u) return false;
    try {
      await deleteDoc(doc(getCollectionRef('water_filter_tasks'), id));
      logAudit(u, 'task_deleted', 'task', id);
      return true;
    } catch (error) {
      console.error("Error al eliminar:", error);
      return false;
    }
  };

  const markAsCompleted = async (id, completionData) => {
    const { user: u, rawTasks: rt } = useAppStore.getState();
    if (!u) return false;
    const taskToUpdate = rt.find(t => t.id === id);
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
      logAudit(u, 'task_completed', 'task', id, { completedBy: completionData.completedBy });
      return true;
    } catch (error) {
      console.error("Error al completar:", error);
      return false;
    }
  };

  const loadMoreTasks = async () => {
    if (!lastDocRef.current || isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const q = query(
        getCollectionRef('water_filter_tasks'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDocRef.current),
        limit(TASKS_PAGE_SIZE),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setHasMoreTasks(false);
        return;
      }
      lastDocRef.current = snap.docs.at(-1);
      setHasMoreTasks(snap.docs.length === TASKS_PAGE_SIZE);

      const newTasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Abrir listeners de visitas para las tareas recién cargadas
      newTasks.forEach(task => {
        extraTaskIdsRef.current.add(task.id);
        if (!visitUnsubsRef.current.has(task.id)) {
          const unsubVisits = onSnapshot(getVisitsRef(task.id), (visSnap) => {
            const visits = visSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setVisitsMap(prev => ({ ...prev, [task.id]: visits }));
          });
          visitUnsubsRef.current.set(task.id, unsubVisits);
        }
      });

      setExtraTasks(prev => [...prev, ...newTasks]);
    } catch (e) {
      console.error("Error al cargar más tareas:", e);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  };

  // Registrar acciones en el store (una vez en mount)
  useEffect(() => {
    useAppStore.setState({
      addTask,
      deleteTask,
      markAsCompleted,
      loadMoreTasks,
      updateTaskVisits: async () => true,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    tasks, isLoadingTasks,
    hasMoreTasks, isLoadingMore, loadMoreTasks,
    addTask, deleteTask, markAsCompleted,
    updateTaskVisits: async () => true,
  };
}
