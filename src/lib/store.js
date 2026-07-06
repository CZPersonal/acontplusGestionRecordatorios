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
  activeTab:           'dashboard',
  editingTask:         null,
  editingVisit:        null,   // visita en edición en el nuevo sistema
  showExportConfig:    false,
  formSource:          null,   // 'calendar' | 'clients' | null
  highlightedTaskId:   null,
  highlightedVisitId:  null,   // ID de visita recién guardada para resaltar
  openNewVisit:        false,  // abre el modal de nueva visita
  newVisitDefaults:    null,   // pre-selección de cliente/contacto/instalación
  setActiveTab:        (tab)  => set({ activeTab: tab }),
  setEditingTask:      (task) => set({ editingTask: task }),
  setEditingVisit:     (visit) => set({ editingVisit: visit }),
  setShowExportConfig: (show)  => set({ showExportConfig: show }),
  setHighlightedTaskId: (id)  => set({ highlightedTaskId: id }),
  setHighlightedVisitId: (id) => set({ highlightedVisitId: id }),
  openNewVisitModal: (defaults = null) => set({ openNewVisit: true,  newVisitDefaults: defaults }),
  closeNewVisitModal: ()               => set({ openNewVisit: false, newVisitDefaults: null }),

  // ─── Tasks legacy (poblado por useTasks — solo lectura histórica) ───────────
  tasks:           [],
  rawTasks:        [],
  isLoadingTasks:  true,
  hasMoreTasks:    false,
  isLoadingMore:   false,
  refreshKey:      0,
  addTask:         async () => false,
  deleteTask:      async () => false,
  markAsCompleted: async () => false,
  loadMoreTasks:   async () => {},
  updateTaskVisits: async () => true,

  // ─── Visits (poblado por useVisits) — nueva colección plana ──────────────
  visits:              [],
  isLoadingVisits:     true,
  addVisit:            async () => false,
  addVisitSeries:      async () => false,
  editVisit:           async () => false,
  deleteVisit:         async () => false,
  completeVisit:       async () => false,
  cancelVisit:         async () => false,
  annulVisit:          async () => false,
  revertVisit:         async () => false,
  confirmVisit:        async () => false,
  unconfirmVisit:      async () => false,
  rescheduleVisit:     async () => false,
  generateSupportVisit: async () => false,

  // ─── Clients (poblado por useClients) ─────────────────────────────────────
  clients:         [],
  saveClient:      async () => null,
  createClient:    async () => false,
  updateClient:    async () => false,
  setClientActive: async () => false,
  importClients:   async () => ({ ok: 0, errors: [] }),

  // ─── Service Types (poblado por useServiceTypes) ──────────────────────────
  serviceTypes:    [],
  addServiceType:  async () => false,

  // ─── Establecimientos (poblado por useEstablecimientos) ──────────────────
  establecimientos:             [],
  memberEstablecimientos:       [],   // IDs asignados al usuario ([] = sin restricción)
  memberEstablecimientoDefault: null, // ID del establecimiento por defecto del usuario
  addEstablecimiento:           async () => false,
  updateEstablecimiento:        async () => false,
  deleteEstablecimiento:        async () => false,

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

  // ─── Handlers de visits (nueva arquitectura) ─────────────────────────────
  handleAddVisit: async (visitData) => {
    const { addVisit, addToast } = get();
    const savedId = await addVisit(visitData);
    if (savedId) {
      set({ openNewVisit: false, newVisitDefaults: null, editingVisit: null, highlightedVisitId: savedId });
    } else {
      addToast({ type: 'error', title: '❌ Error al guardar', body: 'No se pudo guardar la visita. Verifica tu conexión.' });
    }
    return savedId;
  },
  handleAddVisitSeries: async (baseData, dates) => {
    const { addVisitSeries, addToast } = get();
    const savedIds = await addVisitSeries(baseData, dates);
    if (savedIds) {
      set({ openNewVisit: false, newVisitDefaults: null, editingVisit: null, highlightedVisitId: savedIds[0] });
      addToast({ type: 'success', title: '✅ Serie creada', body: `Se crearon ${savedIds.length} visitas correctamente.` });
    } else {
      addToast({ type: 'error', title: '❌ Error al guardar', body: 'No se pudo crear la serie de visitas. Verifica tu conexión e intenta nuevamente.' });
    }
    return savedIds;
  },
  handleEditVisit: async (visitId, data) => {
    const { editVisit, addToast } = get();
    const ok = await editVisit(visitId, data);
    if (ok) set({ editingVisit: null });
    else addToast({ type: 'error', title: '❌ Error al editar', body: 'No se pudo actualizar la visita.' });
    return ok;
  },
  handleDeleteVisit: async (visitId) => {
    const { deleteVisit, addToast } = get();
    if (!await deleteVisit(visitId))
      addToast({ type: 'error', title: '❌ Error al eliminar', body: 'No se pudo eliminar la visita.' });
  },
  handleGenerateSupport: (parentVisit) => {
    const todayStr = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    })();
    const defaults = {
      clientId:        parentVisit.clientId,
      contactId:       parentVisit.contactId,
      installationId:  parentVisit.installationId,
      clientName:      parentVisit.clientName,
      serviceType:     parentVisit.serviceType,
      address:         parentVisit.address,
      ubicacion:       parentVisit.ubicacion,
      ciudad:          parentVisit.ciudad,
      phone:           parentVisit.phone,
      clientEmail:     parentVisit.clientEmail || '',
      scheduledDate:   todayStr,
      scheduledTime:   '',
      type:            parentVisit.type            || '',
      urgency:         'Media',
      observations:    '',
      technician:      parentVisit.technician      || '',
      technicianEmail: parentVisit.technicianEmail || '',
      serviceOrder:    '',
      parentVisitId:   parentVisit.id,
    };
    set({ openNewVisit: true, newVisitDefaults: defaults, editingVisit: null });
  },

  // ─── Handlers de tasks legacy ─────────────────────────────────────────────
  handleAddTask: async (task) => {
    const { saveClient, addTask, user, addToast } = get();
    if (task.identification?.trim() && task.clientName) await saveClient(task);
    const { contacts: _c, additionalContacts: _ac, ...taskData } = task;
    const savedId = await addTask(taskData, user.email);
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
