import { useState, useEffect, useMemo, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAppStore } from '../lib/store';
import { useBorradores } from '../hooks/useBorradores';
import { playNotificationSound } from '../utils/sound.js';
import NavItem from './NavItem.jsx';
import Dashboard from './Dashboard.jsx';
import BillingReport from './BillingReport.jsx';
import ExportConfigManager from './ExportConfigManager.jsx';
import ClientsManager from './ClientsManager.jsx';
import Toast from './Toast.jsx';
import CalendarView from './CalendarView.jsx';
import Configuracion from './Configuracion.jsx';
import AllVisitsManager from './AllVisitsManager.jsx';
import BorradoresAdmin from './BorradoresAdmin.jsx';
import VisitFormUnified from './VisitFormUnified.jsx';
import {
  Home, Bell, BellOff,
  Cloud, CloudOff, LogOut, CalendarDays, ClipboardList, Wallet, Users, Settings, BookOpen,
} from 'lucide-react';

export default function AppRouter() {
  const user             = useAppStore(s => s.user);
  const tenantName       = useAppStore(s => s.tenantName);
  const tenantRuc        = useAppStore(s => s.tenantRuc);
  const empresaConfig    = useAppStore(s => s.empresaConfig);

  // ─── Borradores: contador de pendientes + sonido al llegar uno nuevo ────────
  const { borradores } = useBorradores(user);
  const pendientesCount = useMemo(
    () => borradores.filter(b => b.status === 'Pendiente').length,
    [borradores]
  );
  const seenBorradorIds = useRef(null);
  useEffect(() => {
    const currentIds = new Set(borradores.filter(b => b.status === 'Pendiente').map(b => b.id));
    if (seenBorradorIds.current === null) {
      // Primera carga: solo registrar el estado inicial, sin sonar.
      seenBorradorIds.current = currentIds;
      return;
    }
    const hasNew = [...currentIds].some(id => !seenBorradorIds.current.has(id));
    if (hasNew) playNotificationSound();
    seenBorradorIds.current = currentIds;
  }, [borradores]);
  const isOnline         = useAppStore(s => s.isOnline);
  const activeTab        = useAppStore(s => s.activeTab);
  const setActiveTab     = useAppStore(s => s.setActiveTab);
  const editingTask      = useAppStore(s => s.editingTask);
  const editingVisit     = useAppStore(s => s.editingVisit);
  const setEditingTask   = useAppStore(s => s.setEditingTask);
  const showExportConfig = useAppStore(s => s.showExportConfig);
  const setShowExportConfig = useAppStore(s => s.setShowExportConfig);
  const openNewVisit     = useAppStore(s => s.openNewVisit);
  const newVisitDefaults = useAppStore(s => s.newVisitDefaults);
  const closeNewVisitModal = useAppStore(s => s.closeNewVisitModal);

  const tasks        = useAppStore(s => s.tasks);
  const clients      = useAppStore(s => s.clients);
  const serviceTypes = useAppStore(s => s.serviceTypes);

  const exportConfigs    = useAppStore(s => s.exportConfigs);
  const configLoading    = useAppStore(s => s.configLoading);
  const saveConfig       = useAppStore(s => s.saveConfig);
  const resetConfig      = useAppStore(s => s.resetConfig);
  const getActiveColumns = useAppStore(s => s.getActiveColumns);

  const toasts                = useAppStore(s => s.toasts);
  const removeToast           = useAppStore(s => s.removeToast);
  const notificationPermission = useAppStore(s => s.notificationPermission);
  const requestNotifications  = useAppStore(s => s.requestNotifications);
  const showAlerts            = useAppStore(s => s.showAlerts);

  const createClient    = useAppStore(s => s.createClient);
  const updateClient    = useAppStore(s => s.updateClient);
  const setClientActive = useAppStore(s => s.setClientActive);
  const deleteClient    = useAppStore(s => s.deleteClient);
  const importClients   = useAppStore(s => s.importClients);

  const [pendingClientHistorial, setPendingClientHistorial] = useState(null);

  const handleAddTask      = useAppStore(s => s.handleAddTask);
  const handleEdit         = useAppStore(s => s.handleEdit);
  const handleDelete       = useAppStore(s => s.handleDelete);
  const handleComplete     = useAppStore(s => s.handleComplete);
  const handleVisitsUpdate  = useAppStore(s => s.handleVisitsUpdate);
  const openNewVisitModal  = useAppStore(s => s.openNewVisitModal);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 md:pb-0 md:flex">

      {/* Navegación */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 md:relative md:w-64 md:border-t-0 md:border-r md:h-screen md:flex-shrink-0 z-10">
        <div className="flex justify-around p-2 md:flex-col md:p-6 md:space-y-2">

          {/* Logo desktop */}
          <div className="hidden md:flex items-center space-x-3 mb-8 px-1">
            <img src={empresaConfig.logoUrl || '/logo.png'} alt={empresaConfig.empresaNombre || 'Acontplus'} className="w-10 h-10 object-contain flex-shrink-0" />
            <div>
              <h1 className="text-base font-bold leading-tight" style={{ color: '#D61672' }}>{empresaConfig.empresaNombre || 'ACONTPLUS'}</h1>
              <p className="text-xs font-medium" style={{ color: '#FFA901' }}>{empresaConfig.empresaSlogan || 'Recordatorios'}</p>
            </div>
          </div>

          <NavItem icon={<Home />}         label="Panel"          isActive={activeTab === 'dashboard'}  onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Users />}        label="Clientes"       isActive={activeTab === 'clients'}    onClick={() => setActiveTab('clients')} />
          <NavItem icon={<CalendarDays />} label="Calendario"     isActive={activeTab === 'calendar'}   onClick={() => setActiveTab('calendar')} />
          <NavItem icon={<ClipboardList />}label="Gestión de visitas" isActive={activeTab === 'all-visits'} onClick={() => setActiveTab('all-visits')} />
          <NavItem icon={<Wallet />}       label="Cobros"         isActive={activeTab === 'billing'}      onClick={() => setActiveTab('billing')} />
          <NavItem icon={<BookOpen />}     label="Borradores"     isActive={activeTab === 'borradores'}  onClick={() => setActiveTab('borradores')} badge={pendientesCount} />
          <NavItem icon={<Settings />}     label="Config."        isActive={activeTab === 'config'}      onClick={() => setActiveTab('config')} />

          {/* Logout desktop */}
          <div className="hidden md:block mt-auto pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-400 mb-2 truncate px-2">{user?.email}</div>
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
            <img src={empresaConfig.logoUrl || '/logo.png'} alt={empresaConfig.empresaNombre || 'Acontplus'} className="w-8 h-8 object-contain" />
            <span className="text-sm font-bold" style={{ color: '#D61672' }}>{empresaConfig.empresaNombre || 'ACONTPLUS'}</span>
          </div>

          {/* Empresa info — visible en todas las vistas */}
          {(empresaConfig.empresaNombre || tenantName) && (
            <div className="hidden md:flex flex-col leading-tight">
              <span className="text-sm font-bold text-slate-800">{empresaConfig.empresaNombre || tenantName}</span>
              {(empresaConfig.ruc || tenantRuc) && <span className="text-xs text-slate-400">RUC: {empresaConfig.ruc || tenantRuc}</span>}
            </div>
          )}

          <div className="flex items-center space-x-2 ml-auto">
            <div className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {isOnline ? <Cloud size={13} /> : <CloudOff size={13} />}
              <span className="hidden sm:inline">{isOnline ? 'En línea' : 'Sin conexión'}</span>
            </div>

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
        {activeTab === 'clients' && (
          <ClientsManager
            clients={clients}
            tasks={tasks}
            useClientsHook={{ createClient, updateClient, setClientActive, deleteClient, importClients }}
            pendingClientHistorial={pendingClientHistorial}
            onClearPendingHistorial={() => setPendingClientHistorial(null)}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarView
            tasks={tasks}
            user={user}
            onNewTask={() => { useAppStore.setState({ formSource: 'calendar', editingTask: null }); setActiveTab('form'); }}
            onNewVisit={() => openNewVisitModal()}
            onViewClientHistorial={(clientId) => {
              setPendingClientHistorial(clientId);
              setActiveTab('clients');
            }}
          />
        )}
        {activeTab === 'all-visits' && (
          <AllVisitsManager user={user} />
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
        {activeTab === 'borradores' && (
          <BorradoresAdmin user={user} />
        )}
        {activeTab === 'config' && (
          <Configuracion user={user} />
        )}
      </main>

      {/* Toasts */}
      <Toast toasts={toasts} onClose={removeToast} />

      {/* Modal global nueva / editar visita */}
      {openNewVisit && (
        <VisitFormUnified
          initialVisit={editingVisit || newVisitDefaults}
          onClose={closeNewVisitModal}
        />
      )}

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
