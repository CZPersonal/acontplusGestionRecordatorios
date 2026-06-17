import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useTasks } from './hooks/useTasks';
import { useNotifications } from './hooks/useNotifications';
import { useClients } from './hooks/useClients';
import { useServiceTypes } from './hooks/useServiceTypes';
import { useExportConfig } from './hooks/useExportConfig.js';
import Login from './components/Login.jsx';
import AppRouter from './components/AppRouter.jsx';

const STATUSES = ['Pendiente', 'En Proceso', 'Completado', 'Cancelado'];

export default function App() {
  const [activeTab,        setActiveTab]        = useState('dashboard');
  const [user,             setUser]             = useState(null);
  const [isLoading,        setIsLoading]        = useState(true);
  const [editingTask,      setEditingTask]      = useState(null);
  const [isOnline,         setIsOnline]         = useState(navigator.onLine);
  const [showExportConfig, setShowExportConfig] = useState(false);

  const { tasks, isLoadingTasks, addTask, deleteTask, markAsCompleted, updateTaskVisits } = useTasks(user);
  const { clients, saveClient, createClient, updateClient, setClientActive, importClients } = useClients(user);
  const { serviceTypes }   = useServiceTypes(user);
  const { configs: exportConfigs, isLoading: configLoading, saveConfig, resetConfig, getActiveColumns } = useExportConfig(user);
  const { permission: notificationPermission, requestPermission: requestNotifications, toasts, removeToast, showAlerts, addToast } = useNotifications(tasks);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setIsLoading(false); });
    return () => unsub();
  }, []);

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handleAddTask = async (task) => {
    if (task.identification?.trim() && task.clientName) await saveClient(task);
    const ok = await addTask(task, user.email);
    if (ok) { setActiveTab('list'); setEditingTask(null); }
    else addToast({ type: 'error', title: '❌ Error al guardar', body: 'No se pudo guardar la tarea. Verifica tu conexión o los permisos.' });
  };

  const handleEdit = (task) => { setEditingTask(task); setActiveTab('form'); };

  const handleDelete = async (id) => {
    if (!await deleteTask(id))
      addToast({ type: 'error', title: '❌ Error al eliminar', body: 'No se pudo eliminar la tarea. Verifica tu conexión.' });
  };

  const handleComplete = async (id, data) => {
    if (!await markAsCompleted(id, data))
      addToast({ type: 'error', title: '❌ Error al completar', body: 'No se pudo marcar la tarea como completada. Verifica tu conexión.' });
  };

  const handleVisitsUpdate = async (taskId, updatedVisits) => {
    if (!await updateTaskVisits(taskId, updatedVisits, user.email))
      addToast({ type: 'error', title: '❌ Error al actualizar visitas', body: 'No se pudieron guardar los cambios. Verifica tu conexión.' });
  };

  if (isLoading || (isLoadingTasks && tasks.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <img src="/logo.png" alt="Acontplus" className="w-20 h-20 object-contain mb-4 animate-bounce" />
        <p className="text-sm font-semibold" style={{ color: '#D61672' }}>Cargando...</p>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <AppRouter
      user={user}
      isOnline={isOnline}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      editingTask={editingTask}
      setEditingTask={setEditingTask}
      showExportConfig={showExportConfig}
      setShowExportConfig={setShowExportConfig}
      tasks={tasks}
      clients={clients}
      serviceTypes={serviceTypes}
      statuses={STATUSES}
      exportConfigs={exportConfigs}
      configLoading={configLoading}
      saveConfig={saveConfig}
      resetConfig={resetConfig}
      getActiveColumns={getActiveColumns}
      toasts={toasts}
      removeToast={removeToast}
      notificationPermission={notificationPermission}
      requestNotifications={requestNotifications}
      showAlerts={showAlerts}
      useClientsHook={{ createClient, updateClient, setClientActive, importClients }}
      onAddTask={handleAddTask}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onComplete={handleComplete}
      onVisitsUpdate={handleVisitsUpdate}
    />
  );
}
