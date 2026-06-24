import { create } from 'zustand';

// Estado global de la app. Los hooks de Firestore sincronizan su estado aquí
// (write-through). Los componentes leen con selectores: useAppStore(s => s.tasks).

export const useAppStore = create((set, get) => ({

  // ─── Auth ─────────────────────────────────────────────────────────────────
  user:          null,
  isAuthLoading: true,
  userRole:      'admin',   // 'admin' | 'tecnico' — poblado en App.jsx tras leer members/{uid}

  // ─── Tenant (poblado en App.jsx tras auth) ────────────────────────────────
  tenantId:         null,   // UUID del tenant activo
  tenantName:       '',
  tenantRuc:        '',
  tenantIds:        [],     // array de todos los tenants a los que pertenece el usuario
  availableTenants: [],     // [{ id, name, ruc }] para el selector de empresa

  // ─── Network ──────────────────────────────────────────────────────────────
  isOnline: navigator.onLine,

  // ─── UI Navigation ────────────────────────────────────────────────────────
  activeTab:          'dashboard',
  editingTask:        null,
  showExportConfig:   false,
  formSource:         null,   // 'calendar' | null — indica desde dónde se abrió el formulario
  highlightedTaskId:  null,   // ID de tarea recién guardada para resaltar en AllVisitsManager
  setActiveTab:       (tab)  => set({ activeTab: tab }),
  setEditingTask:     (task) => set({ editingTask: task }),
  setShowExportConfig: (show) => set({ showExportConfig: show }),
  setHighlightedTaskId: (id) => set({ highlightedTaskId: id }),

  // ─── Tasks (poblado por useTasks) ─────────────────────────────────────────
  tasks:           [],
  rawTasks:        [],
  isLoadingTasks:  true,
  hasMoreTasks:    false,
  isLoadingMore:   false,
  refreshKey:      0,       // incrementar para forzar recarga de listeners Firestore
  addTask:         async () => false,
  deleteTask:      async () => false,
  markAsCompleted: async () => false,
  loadMoreTasks:   async () => {},
  updateTaskVisits: async () => true,

  // ─── Clients (poblado por useClients) ─────────────────────────────────────
  clients:         [],
  saveClient:      async () => null,
  createClient:    async () => false,
  updateClient:    async () => false,
  setClientActive: async () => false,
  importClients:   async () => ({ ok: 0, errors: [] }),

  // ─── Service Types (poblado por useServiceTypes) ──────────────────────────
  serviceTypes: [],

  // ─── Configuración de empresa (poblado por useConfiguracion) ────────────────
  empresaConfig: {
    empresaNombre:   'ACONTPLUS',
    empresaSlogan:   'Recordatorios',
    empresaTag:      'Facturar nunca fue tan fácil',
    whatsappNumero:  '',
    whatsappPrefijo: '593',
    logoUrl:         '',
  },

  // ─── Export Config (poblado por useExportConfig) ──────────────────────────
  exportConfigs: {},   // defaults inyectados por useExportConfig en el primer render
  configLoading: false,
  saveConfig:    async () => {},
  resetConfig:   async () => {},
  getActiveColumns: (type) =>
    (get().exportConfigs[type] || []).filter(c => c.enabled),

  // ─── Toasts / Notificaciones (poblado por App.jsx desde useNotifications) ──
  toasts:               [],
  notificationPermission: null,
  showAlerts:           () => {},
  requestNotifications: () => {},
  addToast:             () => {},
  removeToast:          () => {},

  // ─── Handlers de app (usan get() para estado siempre fresco) ─────────────
  handleAddTask: async (task) => {
    const { saveClient, addTask, user, addToast } = get();
    if (task.identification?.trim() && task.clientName) await saveClient(task);
    const savedId = await addTask(task, user.email);
    if (savedId) set({ activeTab: 'all-visits', editingTask: null, formSource: null, highlightedTaskId: savedId });
    else addToast({ type: 'error', title: '❌ Error al guardar', body: 'No se pudo guardar la tarea. Verifica tu conexión o los permisos.' });
  },
  handleEdit: (task) => set({ editingTask: task, activeTab: 'form' }),
  handleDelete: async (id) => {
    const { deleteTask, addToast } = get();
    if (!await deleteTask(id))
      addToast({ type: 'error', title: '❌ Error al eliminar', body: 'No se pudo eliminar la tarea. Verifica tu conexión.' });
  },
  handleComplete: async (id, data) => {
    const { markAsCompleted, addToast } = get();
    if (!await markAsCompleted(id, data))
      addToast({ type: 'error', title: '❌ Error al completar', body: 'No se pudo marcar la tarea como completada. Verifica tu conexión.' });
  },
  handleVisitsUpdate: async () => true,
}));
