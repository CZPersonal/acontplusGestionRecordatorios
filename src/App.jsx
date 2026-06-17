import { useState, useEffect } from 'react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useTasks } from './hooks/useTasks';
import { useNotifications } from './hooks/useNotifications';
import { useClients } from './hooks/useClients';
import { useServiceTypes } from './hooks/useServiceTypes';
import { useExportConfig } from './hooks/useExportConfig.js';
import Login from './components/Login.jsx';
import NavItem from './components/NavItem.jsx';
import Dashboard from './components/Dashboard.jsx';
import TaskList from './components/TaskList.jsx';
import TaskForm from './components/TaskForm.jsx';
import Reports from './components/Reports.jsx';
import VisitsReport from './components/VisitsReport.jsx';
import BillingReport from './components/BillingReport.jsx';
import ExportConfigManager from './components/ExportConfigManager.jsx';
import ClientsManager from './components/ClientsManager.jsx';
import Toast from './components/Toast.jsx';
import CalendarView from './components/CalendarView.jsx';
import {
  Home, Wrench, FileText, Bell, BellOff,
  Cloud, CloudOff, LogOut, CalendarDays, ClipboardList, Wallet, Users
} from 'lucide-react';

const STATUSES = ['Pendiente', 'En Proceso', 'Completado', 'Cancelado'];

export default function App() {
  const [activeTab,        setActiveTab]        = useState('dashboard');
  const [user,             setUser]             = useState(null);
  const [isLoading,        setIsLoading]        = useState(true);
  const [editingTask,      setEditingTask]      = useState(null);
  const [isOnline,         setIsOnline]         = useState(navigator.onLine);
  const [showExportConfig, setShowExportConfig] = useState(false);

  const { tasks, isLoadingTasks, addTask, deleteTask, markAsCompleted } = useTasks(user);
  const {
    clients, saveClient, createClient, updateClient, setClientActive, importClients
  } = useClients(user);
  const { serviceTypes }          = useServiceTypes(user);
  const {
    configs:      exportConfigs,
    isLoading:    configLoading,
    saveConfig,
    resetConfig,
    getActiveColumns,
  } = useExportConfig(user);

  const {
    permission: notificationPermission,
    requestPermission: requestNotifications,
    toasts,
    removeToast,
    showAlerts,
    addToast,
  } = useNotifications(tasks);

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Estado de red
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleAddTask = async (task) => {
    if (task.identification && task.identification.trim() && task.clientName) {
      await saveClient(task);
    }
    const success = await addTask(task, user.email);
    if (success !== false) {
      setActiveTab('list');
      setEditingTask(null);
    } else {
      addToast({
        type:  'error',
        title: '❌ Error al guardar',
        body:  'No se pudo guardar la tarea. Verifica tu conexión o los permisos.',
      });
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setActiveTab('form');
  };

  const handleDelete = async (id) => {
    const ok = await deleteTask(id);
    if (!ok) {
      addToast({
        type:  'error',
        title: '❌ Error al eliminar',
        body:  'No se pudo eliminar la tarea. Verifica tu conexión.',
      });
    }
  };

  const handleComplete = async (id, completionData) => {
    const ok = await markAsCompleted(id, completionData);
    if (!ok) {
      addToast({
        type:  'error',
        title: '❌ Error al completar',
        body:  'No se pudo marcar la tarea como completada. Verifica tu conexión.',
      });
    }
  };

  // Actualizar visitas de una tarea específica desde BillingReport
  const handleVisitsUpdate = async (taskId, updatedVisits) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const ok = await addTask({ ...task, visits: updatedVisits }, user.email);
    if (!ok) {
      addToast({
        type:  'error',
        title: '❌ Error al actualizar visitas',
        body:  'No se pudieron guardar los cambios. Verifica tu conexión.',
      });
    }
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 md:pb-0 md:flex">

      {/* Navegación */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 md:relative md:w-64 md:border-t-0 md:border-r md:h-screen md:flex-shrink-0 z-10">
        <div className="flex justify-around p-2 md:flex-col md:p-6 md:space-y-2">

          {/* Logo desktop */}
          <div className="hidden md:flex items-center space-x-3 mb-8 px-1">
            <img src="/logo.png" alt="Acontplus" className="w-10 h-10 object-contain flex-shrink-0" />
            <div>
              <h1 className="text-base font-bold leading-tight" style={{ color: '#D61672' }}>ACONTPLUS</h1>
              <p className="text-xs font-medium" style={{ color: '#FFA901' }}>Recordatorios</p>
            </div>
          </div>

          <NavItem icon={<Home />}         label="Panel"      isActive={activeTab === 'dashboard'}     onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Wrench />}       label="Tareas"     isActive={activeTab === 'list'}          onClick={() => setActiveTab('list')} />
          <NavItem icon={<Users />}        label="Clientes"   isActive={activeTab === 'clients'}       onClick={() => setActiveTab('clients')} />
          <NavItem icon={<CalendarDays />} label="Calendario" isActive={activeTab === 'calendar'}      onClick={() => setActiveTab('calendar')} />
          <NavItem icon={<FileText />}     label="Reportes"   isActive={activeTab === 'reports'}       onClick={() => setActiveTab('reports')} />
          <NavItem icon={<ClipboardList />}label="Visitas"    isActive={activeTab === 'visits-report'} onClick={() => setActiveTab('visits-report')} />
          <NavItem icon={<Wallet />}       label="Cobros"     isActive={activeTab === 'billing'}       onClick={() => setActiveTab('billing')} />

          {/* Logout desktop */}
          <div className="hidden md:block mt-auto pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-400 mb-2 truncate px-2">{user.email}</div>
            <button
              onClick={() => signOut(auth)}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">

        {/* Barra superior */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center space-x-2 md:hidden">
            <img src="/logo.png" alt="Acontplus" className="w-8 h-8 object-contain" />
            <span className="text-sm font-bold" style={{ color: '#D61672' }}>ACONTPLUS</span>
          </div>

          <div className="flex items-center space-x-2 ml-auto">
            {/* Indicador online/offline */}
            <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isOnline ? <Cloud size={13} /> : <CloudOff size={13} />}
              <span className="hidden sm:inline">{isOnline ? 'En línea' : 'Sin conexión'}</span>
            </div>

            {/* Campana notificaciones */}
            <button
              onClick={notificationPermission === 'granted' ? showAlerts : requestNotifications}
              className={`p-2 rounded-full transition-colors ${
                notificationPermission === 'granted' ? 'bg-pink-50' : 'text-slate-400 bg-slate-100'
              }`}
              style={notificationPermission === 'granted' ? { color: '#D61672' } : {}}
              title={notificationPermission === 'granted' ? 'Alertas activadas' : 'Activar alertas'}
            >
              {notificationPermission === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
            </button>

            {/* Logout mobile */}
            <button
              onClick={() => signOut(auth)}
              className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors md:hidden"
              title="Cerrar sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Vistas */}
        {activeTab === 'dashboard' && (
          <Dashboard
            tasks={tasks}
            onNavigate={setActiveTab}
            notificationPermission={notificationPermission}
            onRequestNotifications={requestNotifications}
            onShowAlerts={showAlerts}
            user={user}
          />
        )}
        {activeTab === 'list' && (
          <TaskList
            tasks={tasks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onComplete={handleComplete}
            onNewTask={() => { setEditingTask(null); setActiveTab('form'); }}
            user={user}
          />
        )}
        {activeTab === 'clients' && (
          <ClientsManager
            clients={clients}
            tasks={tasks}
            useClientsHook={{ createClient, updateClient, setClientActive, importClients }}
          />
        )}
        {activeTab === 'form' && (
          <TaskForm
            onSubmit={handleAddTask}
            initialData={editingTask}
            statuses={STATUSES}
            onCancel={() => setActiveTab('list')}
            clients={clients}
            serviceTypes={serviceTypes}
            user={user}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarView
            tasks={tasks}
            user={user}
            onNewTask={() => { setEditingTask(null); setActiveTab('form'); }}
          />
        )}
        {activeTab === 'reports' && (
          <Reports
            tasks={tasks}
            exportConfig={getActiveColumns('tasks')}
            onOpenConfig={() => setShowExportConfig(true)}
          />
        )}
        {activeTab === 'visits-report' && (
          <VisitsReport
            tasks={tasks}
            exportConfig={getActiveColumns('visits')}
            onOpenConfig={() => setShowExportConfig(true)}
          />
        )}
        {activeTab === 'billing' && (
          <BillingReport
            tasks={tasks}
            onTasksUpdate={handleVisitsUpdate}
            user={user}
            exportConfig={getActiveColumns('billing')}
            onOpenConfig={() => setShowExportConfig(true)}
          />
        )}
      </main>

      {/* Toasts */}
      <Toast toasts={toasts} onClose={removeToast} />

      {/* Modal configuración columnas exportación */}
      {showExportConfig && (
        <ExportConfigManager
          configs={exportConfigs}
          isLoading={configLoading}
          onSave={saveConfig}
          onReset={resetConfig}
          onClose={() => setShowExportConfig(false)}
        />
      )}
    </div>
  );
}
