# 🧠 Tracker de Mejoras: Acontplus Gestion Recordatorios

**Propósito:** Este documento sirve como memoria a largo plazo y guía de ejecución para agentes de IA (Claude Code) que trabajan en este repositorio.

## 🤖 Instrucciones Operativas para Claude Code
Cada vez que interactúes con este repositorio para realizar mejoras, DEBES seguir estas reglas estrictamente:
1. **Verificar el Estado:** Antes de modificar el código, lee las tareas pendientes en la sección `Roadmap de Tareas Pendientes` de este documento.
2. **Ejecución Atómica:** Resuelve una tarea a la vez para evitar romper la aplicación. No agrupes refactorizaciones masivas en un solo commit a menos que sea estrictamente necesario.
3. **Actualización Autónoma:** Cuando termines una tarea exitosamente y pases las pruebas, DEBES abrir este archivo (`AI_TRACKER.md`), marcar la casilla de la tarea con una `[x]`, y documentar brevemente el cambio en la sección `Registro de Cambios`.
4. **Principios Base:** Mantén el código modular (SOLID, DRY), prioriza la escalabilidad de consultas a la base de datos (evita N+1), y asegúrate de que no queden datos sensibles expuestos.

---

## 🚀 Roadmap de Tareas Pendientes

### 🔴 Fase 1: Mejoras Críticas (Alta Prioridad - Corto Plazo / Semanas 1–4)
- [x] **[C1 - Seguridad]:** Escapar HTML en exportService.js función exportExcel: reemplazar `<td>${c}</td>` por `<td>${escapeHtml(c)}</td>` con una función escapeHtml que reemplace <, >, &, ".
- [x] **[C2 - Seguridad]:** Eliminar import dinámico de CDN SheetJS. Instalar paquete local: `npm install xlsx`. Importar como `import * as XLSX from 'xlsx'`. ⚠️ Nota: xlsx@0.18.5 (última versión npm) tiene CVEs conocidos de Prototype Pollution y ReDoS sin fix disponible en npm. El riesgo es bajo en este contexto (archivos subidos por usuarios autenticados). Evaluar migración a `exceljs` como tarea futura si se requiere.
- [x] **[C3 - Seguridad]:** Sanitizar datos antes de generateTaskPDF() en TaskPDF.jsx: escapar caracteres HTML en todos los campos interpolados en el template literal.
- [x] **[C4 - Config]:** Crear .env.example con las mismas keys que .env pero con valores vacíos o descriptivos.
- [x] **[C5 - Manejo Errores]:** Reemplazar errores silenciosos en deleteTask, addTask, etc. con feedback al usuario (Toast de error ya existe en la app).
- [x] **[C6 - Seguridad]:** En ErrorBoundary.jsx, no mostrar el stack trace en producción. Usar process.env.NODE_ENV o una variable Vite para mostrar detalles solo en dev.

### 🟡 Fase 2: Mejoras Importantes (Media Prioridad - Mediano Plazo / Meses 1–3)
- [x] **[M1 - DRY / Calidad]:** Extraer localDateStr(), formatDateOnly(), fmtMoney() a un archivo src/utils/dates.js y src/utils/format.js. Eliminar las 5+ duplicaciones existentes.
- [x] **[M2 - Firestore / BD]:** Extraer una constante getCollectionRef(name) en src/lib/firebase.js que construya el path artifacts/{appId}/public/data/{name}. Usarla en todos los hooks.
- [x] **[M3 - Arquitectura]:** Dividir App.jsx en un componente de routing (AppRouter.jsx) y mover la lógica de handleAddTask/handleVisitsUpdate al hook useTasks.
- [x] **[M4 - Escalabilidad BD]:** Migrar visits y payments a subcollecciones Firestore independientes: water_filter_tasks/{taskId}/visits/{visitId} y .../visits/{visitId}/payments/{payId}.
- [x] **[M5 - Estado Global]:** Introducir Zustand o Jotai para estado compartido (tasks, clients). Eliminar prop drilling desde App.jsx.
- [x] **[M6 - Seguridad / Roles]:** Agregar campo companyId o tenantId a todos los documentos y actualizar Firestore rules: allow read: if request.auth != null && resource.data.companyId == request.auth.token.companyId.
- [x] **[M7 - Validaciones]:** Agregar validación de formato en TaskForm: teléfono (regex Ecuador/Colombia), email, longitud de serviceOrder. Usar una librería ligera como zod.
- [x] **[M8 - Testing]:** Configurar Vitest + React Testing Library. Escribir tests unitarios para: usePagination, calcPaymentSummary, validateRow (importación), localDateStr.

### 🔵 Fase 3: Mejoras Deseables (Baja Prioridad - Largo Plazo / 3–6 meses)
- [x] **[L1 - Backend / Cloud]:** Implementar Firebase Cloud Functions para: (a) envío de recordatorios por email (Resend/SendGrid) en fechas de visita, (b) trigger de notificación push con FCM al crear visita urgente.
- [x] **[L2 - Escalabilidad]:** Paginación server-side en Firestore con startAfter cursor para water_filter_tasks. La UI ya tiene Pagination.jsx, se necesita adaptar los hooks.
- [x] **[L3 - Observabilidad]:** Integrar Sentry (free tier disponible) para captura automática de errores de JS, performance monitoring y alertas.
- [x] **[L4 - Seguridad]:** Activar Firebase App Check (reCAPTCHA Enterprise o DeviceCheck) para asegurar que solo la app legítima accede a Firestore, incluso con la API key expuesta.
- [x] **[L5 - Architecture]:** Reemplazar el singleton configStore.js con un Context/Provider de React o Zustand slice.
- [x] **[L6 - BD / Auditoría]:** Agregar colección audit_log en Firestore para registrar quién creó/modificó/eliminó cada tarea, con timestamp e IP.
- [x] **[L7 - CI/CD]:** Configurar GitHub Actions para: lint + build en cada PR, deploy automático a Firebase Hosting en merge a main.
- [x] **[L8 - Multi-tenant]:** Diseñar modelo de datos con tenants/{tenantId}/tasks/... y sistema de invitación de usuarios por organización.
- [x] **[L9 - Monitoreo costos]:** Configurar alertas de presupuesto en Firebase y usar getDocsFromCache antes de llamadas de red en vistas de solo lectura.

### 🟣 Mejoras Post-Lanzamiento (Backlog)
- [ ] **[P1 - Reportes]:** Agregar filtro por rango de fecha de confirmación (`confirmedAt`) en el módulo de exportación/reportes de Gestión de Visitas. Permite sacar reportes como "todas las visitas confirmadas en junio". El campo `confirmedAt` ya se guarda en Firestore; solo falta exponer el filtro en la UI. También agregar columna `confirmedAt`/`confirmedBy` como campo opcional en la configuración de exportación.

---

## 📝 Registro de Cambios

| Fecha | Tarea | Descripción | Archivos modificados |
|---|---|---|---|
| 2026-06-20 | E4-AGENDA | **Simplificación recordatorios: dos agendas independientes + incluir atrasadas.** `functions/index.js`: `sendTechnicianDailyAgenda` reescrita para soportar dos tipos de agenda configurables por tenant: `agendaHoy` (visitas de hoy) y `agendaMañana` (visitas de mañana), cada una con toggle, hora y lista de destinatarios. Si `incluirAtrasadas=true`, se añade al final del email una sección "Visitas atrasadas" — técnicos solo ven sus propias atrasadas, destinatarios ven todas. Función usa `buildOverdueRow()` para filas atrasadas con fecha en rojo. `sendOverdueAlert` eliminado completamente (reemplazado por `incluirAtrasadas`). `src/components/Configuracion.jsx`: `TabNotificaciones` simplificada — estados `horaTech`, `horaAlerta`, `destinatariosAgenda`, `destinatariosAtrasadas` reemplazados por `agendaHoy: {activo, hora, destinatarios}`, `agendaMañana: {activo, hora, destinatarios}`, `incluirAtrasadas: boolean`. UI rediseñada: dos cards con toggle (hora + destinatarios visibles solo cuando activa) + checkbox "Incluir visitas atrasadas en la agenda". | `functions/index.js`, `src/components/Configuracion.jsx` |
| 2026-06-19 | E1-FIX | **Fix: `technicianEmail` separado del nombre para notificaciones.** El campo `technician` almacenaba el nombre del técnico (ej: "Juan Pérez"), no su email. La Cloud Function verificaba `!visit.technician.includes('@')` y abortaba siempre. Fix: (1) `VisitsModal.jsx` — el `onChange` del select ahora también resuelve `technicianEmail` buscando en `tecnicosParaSelect` por nombre. Se agrega `technicianEmail` al estado inicial del formulario. (2) `useVisits.js` — `addVisit` y `editVisit` persisten el campo `technicianEmail`. (3) `functions/index.js` — `notifyTechnicianOnVisit` y `sendTechnicianDailyAgenda` usan `emailDestino = visit.technicianEmail \|\| (visit.technician?.includes('@') ? visit.technician : null)` para backwards-compat con visitas antiguas cuyo técnico era un email directo. | `src/components/VisitsModal.jsx`, `src/hooks/useVisits.js`, `functions/index.js` |
| 2026-06-19 | E2/E3 | **Confirmación de cierre y alerta de atrasadas.** `notifyVisitCompleted`: `onDocumentUpdated` en visits — dispara solo cuando `before.status !== 'Realizada' && after.status === 'Realizada'`; envía email al `task.createdBy` con resumen de cierre (cliente, dirección, técnico, observaciones de cierre); incluye CC de `ccCorreos`. `sendOverdueAlert`: scheduler horario — consulta todas las visitas `Programada`, filtra `scheduledDate < today` en JS (evita índice adicional), agrupa por tenant y por admin, solo envía a la hora `horaAlertaAtrasadas` (default 9); email con listado de visitas ordenadas por fecha ascendente. `getTodayEcuador()` agregado como helper. Frontend: `TabNotificaciones` ampliado con tercer selector "Alerta de atrasadas"; grilla pasa de 2 a 3 columnas. | `functions/index.js`, `src/components/Configuracion.jsx` |
| 2026-06-19 | E1-CFG | **Configuración de horarios y CC para recordatorios.** Backend: `sendDailyReminders` y `sendTechnicianDailyAgenda` cambiados de schedule fijo a `every 1 hours`; leen `horaRecordatorioAdmin` (default 8) y `horaRecordatorioTecnicos` (default 7) del doc `tenants/{tenantId}/configuracion/config_empresa`; solo envían si `currentHour === horaConfigurada`; `sendDailyReminders` agrega `cc` con los emails de `ccCorreos` (filtrados por `@` y excluyendo al destinatario principal). Nuevo helper `getCurrentHourEcuador()` (UTC-5 fijo, sin DST). Helper `getTenantConfig()` con caché por ejecución para evitar lecturas Firestore repetidas. Frontend: nuevo tab "Notificaciones" en `Configuracion.jsx` con `TabNotificaciones` — selectores de hora (00:00–23:00) para técnicos y admin, y lista de CC con agregar/eliminar por email. Guarda en el mismo doc `config_empresa` via `saveConfig({ merge: true })`. | `functions/index.js`, `src/components/Configuracion.jsx` |
| 2026-06-19 | E1/E1-B | **Notificaciones de email a técnicos.** Agregado helper `escHtml()` para escapar valores de Firestore en HTML de emails (XSS). `notifyTechnicianOnVisit`: `onDocumentCreated` en visits — si `status=Programada` y `visit.technician` tiene `@`, envía email al técnico con cliente, dirección, fecha, hora, tipo, urgencia, orden y observaciones. `sendTechnicianDailyAgenda`: scheduler a las 7AM Ecuador — consulta visitas Programadas de mañana, agrupa por técnico, ordena por hora, envía un solo email por técnico con su agenda del día completa. Visitas sin hora quedan al final. | `functions/index.js` |
| 2026-06-18 | L8 | **Multi-tenant completo.** Modelo de datos migrado de `artifacts/{appId}/public/data/{col}` a `tenants/{tenantId}/{col}`. Nuevo `src/lib/tenantDb.js`: `getCollectionRef(name)` y `getVisitsRef(taskId)` leen `tenantId` del store en runtime. `firebase.js`: eliminados `getCollectionRef`, `getVisitsRef`, `companyId`, `appId`. `store.js`: agregados `tenantId` y `tenantName`. `App.jsx`: post-auth lee `users/{uid}.tenantId` de Firestore; si null muestra `TenantSetup`; hooks usan `effectiveUser = user && tenantId ? user : null` para no arrancar suscripciones hasta que el tenant esté listo. Nuevo `TenantSetup.jsx`: pantalla de primer setup con tabs "Crear empresa" (genera UUID tenant + código 6 chars) y "Unirme" (busca por joinCode). Muestra el código al crear para compartir. `Configuracion.jsx`: nueva sección `JoinCodeSection` para consultar el código en cualquier momento. `auditService.js`: campo `companyId` → `tenantId`. Todos los hooks: importan de `tenantDb.js`, eliminan `companyId` de los writes. `firestore.rules`: reescrito para el modelo tenant — función `isMember(tenantId)` vía `users/{uid}.tenantId`; reglas por colección bajo `tenants/{tenantId}/...`. `functions/index.js`: trigger de FCM actualizado de `artifacts/.../visits/{visitId}` a `tenants/{tenantId}/water_filter_tasks/{taskId}/visits/{visitId}`; consulta de usuarios por `tenantId` en lugar de `companyId`. `firestore.indexes.json`: sin cambios (collectionGroup `visits` sigue funcionando). | `src/lib/tenantDb.js` *(nuevo)*, `src/components/TenantSetup.jsx` *(nuevo)*, `src/lib/firebase.js`, `src/lib/store.js`, `src/App.jsx`, `firestore.rules`, `src/hooks/useTasks.js`, `src/hooks/useClients.js`, `src/hooks/useVisits.js`, `src/hooks/useServiceTypes.js`, `src/hooks/useTecnicos.js`, `src/hooks/useTiposVisita.js`, `src/hooks/useExportConfig.js`, `src/hooks/useConfiguracion.js`, `src/services/auditService.js`, `src/services/visitBilling.js`, `src/components/Configuracion.jsx`, `functions/index.js` |
| 2026-06-18 | L1 | **Cloud Functions v2** en `functions/` (Node 20): (1) `sendDailyReminders` — scheduled cron "every day 08:00" hora Ecuador; consulta `collectionGroup('visits')` filtrando `scheduledDate==mañana && status==Programada`; envía email via Resend a `task.createdBy`; usa secret `RESEND_API_KEY` y parámetro `FROM_EMAIL`. (2) `notifyUrgentVisit` — Firestore `onCreate` en `visits/{visitId}`; si `urgency=='Alta'` envía FCM push a usuarios de la misma empresa con `fcmToken`. Token expirado se limpia automáticamente. **Frontend**: `firebase.js` exporta `messaging` (inicializado async con `isSupported()` — null si el navegador no soporta Push). `useNotifications.js`: nueva función `registerFcmToken(uid)` — registra SW `firebase-messaging-sw.js` y obtiene VAPID token via `getToken`; se llama al conceder permiso y al detectar usuario con permiso previo. `onMessage` en primer plano muestra toast tipo 'urgent'. **SW** `public/firebase-messaging-sw.js`: maneja evento `push` sin CDN, compatible con `webpush.notification` del Admin SDK. **Índice** Firestore collection group `visits(scheduledDate ASC, status ASC)` en `firestore.indexes.json`. `VITE_FIREBASE_VAPID_KEY` agregada a `.env.example`, `ci.yml`, `deploy.yml`. Funciones deploy incluido en el `firebase deploy` existente. | `functions/index.js` *(nuevo)*, `functions/package.json` *(nuevo)*, `public/firebase-messaging-sw.js` *(nuevo)*, `src/lib/firebase.js`, `src/hooks/useNotifications.js`, `firebase.json`, `firestore.indexes.json`, `.env.example`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` |
| 2026-06-18 | L2 | `useTasks.js`: `onSnapshot` ahora usa `query(colRef, orderBy('createdAt','desc'), limit(200))` — carga máximo 200 tareas en tiempo real. Nuevo estado `hasMoreTasks` (true si se devolvieron exactamente 200 docs) y `isLoadingMore`. Nueva función `loadMoreTasks()`: usa `getDocs + startAfter(lastDocRef)` para cargar las siguientes 200, las mezcla con `extraTasks` (deduplicación por id), y abre listeners de visitas para las nuevas. El cleanup de useEffect cierra todos los listeners incluyendo los de `loadMoreTasks`. `store.js`: agregados `hasMoreTasks`, `isLoadingMore`, `loadMoreTasks` al estado inicial. `TaskList.jsx`: lee los 3 nuevos valores del store vía `useAppStore`; muestra botón "Cargar tareas anteriores" al pie cuando `hasMoreTasks=true`, con spinner mientras carga. Los filtros, visitas y paginación client-side existentes siguen funcionando sobre todas las tareas cargadas en memoria. | `src/hooks/useTasks.js`, `src/lib/store.js`, `src/components/TaskList.jsx` |
| 2026-06-18 | L6 | Nuevo `src/services/auditService.js`: función `logAudit(user, action, entityType, entityId, metadata)` — usa `addDoc` + `serverTimestamp()`, wrapeada en try/catch (fire-and-forget; fallos solo se logean, nunca rompen la operación principal). `useTasks.js`: importado `logAudit`; llamado después de cada write exitoso (`task_created` en `addTask`, `task_deleted` en `deleteTask`, `task_completed` en `markAsCompleted`). `deleteTask` refactorizado para exponer el user local. `firestore.rules`: nueva regla para `audit_log` — `create` requiere `companyId == userCompanyId()` y `userId == request.auth.uid`; `update`/`delete` denegados (inmutable); `read` permitido por companyId para futuro panel de auditoría. IP no registrada: no obtenible desde el navegador sin Cloud Functions. | `src/services/auditService.js` *(nuevo)*, `src/hooks/useTasks.js`, `firestore.rules` |
| 2026-06-17 | L4 | `firebase.js`: importado `initializeAppCheck` + `ReCaptchaV3Provider`. En DEV, se asigna `self.FIREBASE_APPCHECK_DEBUG_TOKEN` (usa `VITE_APP_CHECK_DEBUG_TOKEN` del .env o genera uno automático que se imprime en consola). En cualquier entorno, App Check se inicializa solo si `VITE_RECAPTCHA_SITE_KEY` está presente — sin la variable la app funciona igual que antes. App Check debe inicializarse ANTES de Auth y Firestore (orden preservado). Agregadas `VITE_RECAPTCHA_SITE_KEY` y `VITE_APP_CHECK_DEBUG_TOKEN` a `.env.example` con instrucciones. `VITE_RECAPTCHA_SITE_KEY` agregada a `ci.yml` y `deploy.yml`. La activación del modo enforcement en Firestore rules se hace en Firebase Console (no en código) para no romper usuarios existentes. | `src/lib/firebase.js`, `.env.example`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` |
| 2026-06-17 | L9 | `useTasks`: agregado warm-up con `getDocsFromCache` antes de `onSnapshot` — muestra datos de IndexedDB instantáneamente en sesiones repetidas sin esperar al servidor. Catálogos `useServiceTypes`, `useTecnicos`, `useTiposVisita`: envueltos con `query(colRef, limit(200))` como techo de seguridad contra lecturas desbocadas. `useTasks` y `useClients` excluidos del limit intencionalmente (cortarlos silenciosamente rompería la app — eso corresponde a L2). Alerta de presupuesto: configurar manualmente en Firebase Console → Billing → Budgets & Alerts. | `src/hooks/useTasks.js`, `src/hooks/useServiceTypes.js`, `src/hooks/useTecnicos.js`, `src/hooks/useTiposVisita.js` |
| 2026-06-17 | L3 | Instalado `@sentry/react`. `main.jsx`: inicialización condicional de Sentry (solo si `VITE_SENTRY_DSN` está presente) con `browserTracingIntegration` y `tracesSampleRate: 0.1`. `ErrorBoundary.jsx`: `componentDidCatch` ahora llama `Sentry.captureException(error, { extra: info })` — no-op si Sentry no fue inicializado. Agregado `VITE_SENTRY_DSN` a `.env.example` (vacío por defecto, con instrucciones), y a los env de build en `ci.yml` y `deploy.yml`. | `src/main.jsx`, `src/components/ErrorBoundary.jsx`, `.env.example`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` |
| 2026-06-17 | L7 | Creados `.github/workflows/ci.yml` (lint + build + test en cada PR a main) y `.github/workflows/deploy.yml` (build + `firebase deploy` en push a main). Ambos usan Node 20 con caché de npm. Build necesita los 7 secrets `VITE_FIREBASE_*`. Deploy necesita además `FIREBASE_SERVICE_ACCOUNT` (JSON de service account de Firebase). El archivo de credenciales se escribe en `/tmp` y se elimina siempre al final (`if: always()`). Despliega hosting + firestore:rules + firestore:indexes en un solo comando. | `.github/workflows/ci.yml` *(nuevo)*, `.github/workflows/deploy.yml` *(nuevo)* |
| 2026-06-17 | L5 | Eliminado singleton mutable `src/lib/configStore.js`. Agregado slice `empresaConfig` con defaults al store de Zustand. `useConfiguracion` ahora sincroniza con `useAppStore.setState({ empresaConfig })` en lugar de llamar `setConfigStore`. `VisitsModal`: reemplazado `getConfigStore()` por `useAppStore.getState().empresaConfig` en `generateVisitPDF` y `shareVisitWhatsApp`; `getEmpresaWhatsApp()` eliminada e inlineada como función pura local `formatEmpresaWhatsApp(cfg)`. Build y 36 tests siguen pasando. | `src/lib/store.js`, `src/hooks/useConfiguracion.js`, `src/components/VisitsModal.jsx`, ~~`src/lib/configStore.js`~~ *(eliminado)* |
| 2026-06-17 | M8 | Instalado `vitest@4.1.9`, `@testing-library/react@16`, `@testing-library/jest-dom@6`, `jsdom@29`. Configurado Vitest en `vite.config.js` (`environment: jsdom`, `globals: true`). Agregados scripts `test` y `test:watch`. Extraídas `normalizeRow` y `validateRow` de `ClientImportModal.jsx` a `src/utils/importValidation.js` para permitir imports en tests. 4 suites, 36 tests — todos pasando: `dates.test.js` (7), `visitBilling.test.js` (6), `importValidation.test.js` (13), `usePagination.test.js` (10). | `vite.config.js`, `package.json`, `src/utils/importValidation.js` *(nuevo)*, `src/components/ClientImportModal.jsx`, `src/test/setup.js` *(nuevo)*, `src/test/dates.test.js` *(nuevo)*, `src/test/visitBilling.test.js` *(nuevo)*, `src/test/importValidation.test.js` *(nuevo)*, `src/test/usePagination.test.js` *(nuevo)* |
| 2026-06-17 | M7 | Instalado `zod@4.4.3`. Creado `src/utils/validations.js` con esquemas exportables: `identificacionEcSchema` (10/13 dígitos), `phoneSchema` (Ecuador/Colombia, 7-15 dígitos), `emailSchema`, `serviceOrderSchema` (máx. 50 chars). `TaskForm.jsx`: `validate()` ampliada con los 4 esquemas vía `safeParse()`; campos de identificación, teléfono y email muestran error inline en rojo; `serviceOrder` tiene `maxLength={50}` y mensaje de error. Las validaciones de campos de nuevo cliente solo aplican cuando no hay cliente seleccionado en el buscador. | `src/utils/validations.js` *(nuevo)*, `src/components/TaskForm.jsx`, `package.json` |
| 2026-06-17 | M6 | Agregado campo `companyId` (= Firebase `projectId`) a todos los writes de Firestore. Perfil `users/{uid}` creado en `App.jsx` al login (garantiza que las reglas puedan hacer `get()` sobre él). Reglas actualizadas: helper `userCompanyId()` + `belongsToCompany()` tolerante a migración (permite docs sin campo hasta migrarse). Nuevas reglas para `tecnicos`, `tipos_visita`, `configuracion` (antes sin regla = denegado). Regla explícita para subcollección `visits`. | `src/lib/firebase.js`, `src/App.jsx`, `src/hooks/useTasks.js`, `src/hooks/useClients.js`, `src/hooks/useServiceTypes.js`, `src/hooks/useVisits.js`, `src/hooks/useExportConfig.js`, `src/hooks/useConfiguracion.js`, `src/hooks/useTecnicos.js`, `src/hooks/useTiposVisita.js`, `firestore.rules` |
| 2026-06-16 | C1 | Agregada función `escapeHtml()` en `exportService.js`. Aplicada en `<th>` y `<td>` de `exportExcel` para prevenir XSS cuando los datos del usuario contienen caracteres HTML especiales (`<`, `>`, `&`, `"`, `'`). | `src/services/exportService.js` |
| 2026-06-16 | C2 | Eliminado import dinámico de CDN `cdn.sheetjs.com`. Instalado `xlsx@0.18.5` como dependencia local. Import estático en cabecera del archivo. `parseFile` simplificado (ya no necesita `async`). | `src/components/ClientImportModal.jsx`, `package.json` |
| 2026-06-16 | M5 | Instalado `zustand@5`. Creado `src/lib/store.js` con todo el estado compartido y handlers de app usando `get()` para estado siempre fresco. Hooks sincronizan su estado al store con `useEffect` (write-through). Acciones de `useTasks` (`addTask`, `deleteTask`, `markAsCompleted`) reescritas para leer de `useAppStore.getState()` en vez de closures stale. `App.jsx` reducido a 72 líneas: solo configura auth/network, llama hooks para subscriptions, sincroniza `useNotifications` al store, y renderiza `<AppRouter />` sin props. `AppRouter.jsx` reescrito para leer todo el estado desde store con selectores individuales — interfaz de 0 props. | `src/lib/store.js` *(nuevo)*, `src/App.jsx`, `src/components/AppRouter.jsx`, `src/hooks/useTasks.js`, `src/hooks/useClients.js`, `src/hooks/useServiceTypes.js`, `src/hooks/useExportConfig.js` |
| 2026-06-16 | M4 | Visitas migradas a subcollección `water_filter_tasks/{taskId}/visits/{visitId}`. Pagos siguen embebidos en el documento visita. `getVisitsRef(taskId)` añadida a `firebase.js`. `useTasks`: composite loading con `rawTasks` + `visitsMap` (N+1 onSnapshot por tarea) + `useMemo`; fallback a array embebido si subcollección vacía (migración lazy). `addTask` y `markAsCompleted` ya no persisten campo `visits` en documentos tarea. `updateTaskVisits` convertida en no-op (escrituras de visitas ocurren directamente via `useVisits`/`visitBilling`). `useVisits`: reemplazado `saveVisits(array→taskDoc)` por `saveAllVisits(writeBatch→subcollección)` — migra automáticamente datos embebidos en primer uso. `visitBilling`: igual, reemplazada escritura `updateDoc(taskDoc)` por `saveVisitsToSubcollection(writeBatch)`. | `src/lib/firebase.js`, `src/hooks/useTasks.js`, `src/hooks/useVisits.js`, `src/services/visitBilling.js` |
| 2026-06-16 | M3 | Creado `src/components/AppRouter.jsx` con todo el JSX de navegación, routing de vistas, toasts y modal de exportación. `App.jsx` reducido de 315 → 109 líneas (65%): solo contiene hooks, estado UI, handlers y renderiza `<AppRouter>`. Añadido `updateTaskVisits(taskId, updatedVisits, userEmail)` a `useTasks` consolidando la lógica de actualización de visitas. | `src/App.jsx`, `src/components/AppRouter.jsx` *(nuevo)*, `src/hooks/useTasks.js` |
| 2026-06-16 | M2 | Añadida `getCollectionRef(name)` a `src/lib/firebase.js` como único punto de construcción del path `artifacts/{appId}/public/data/{name}`. Reemplazadas 27 ocurrencias del path literal en 9 archivos: `useTasks`, `useClients`, `useVisits`, `useConfiguracion`, `useExportConfig`, `useServiceTypes`, `useTecnicos`, `useTiposVisita`, `visitBilling`. Eliminados `appId` e importaciones de `collection` de todos los hooks consumidores. `useClients` conserva `db` porque usa `writeBatch(db)`. | `src/lib/firebase.js` + 9 hooks/servicios |
| 2026-06-16 | M1 | Creados `src/utils/dates.js` (`localDateStr`, `formatDateOnly`) y `src/utils/format.js` (`fmtMoney` con locale ES-EC, `fmtMoneyRaw` con `.toFixed(2)` para exports). Eliminadas 18 definiciones locales duplicadas en 12 archivos: `Dashboard`, `Reports`, `BillingReport`, `BillingModal`, `CalendarView`, `VisitsReport`, `TaskCard`, `TaskPDF` (2 instancias), `VisitsModal`, `Toast`, `exportService`, `useNotifications` (renombrado `getLocalDate` → `localDateStr`). | `src/utils/dates.js` *(nuevo)*, `src/utils/format.js` *(nuevo)*, 12 archivos consumidores |
| 2026-06-16 | C6 | `ErrorBoundary.jsx`: reemplazado título "Error detectado" por mensaje amigable genérico. Stack trace (`error.toString()`) ahora solo visible cuando `import.meta.env.DEV` es verdadero (desarrollo); en producción el build de Vite elimina ese bloque completamente. | `src/components/ErrorBoundary.jsx` |
| 2026-06-16 | C5 | Añadido `addToast` a `useNotifications`. Estilo `error` (rojo) añadido a `Toast.jsx`. `deleteTask` y `markAsCompleted` ahora retornan `true`/`false`. En `App.jsx`: reemplazado `alert()` por toast, creados `handleDelete` y `handleComplete` con feedback de error, y `handleVisitsUpdate` también muestra error. En `ClientImportModal`: reemplazado `alert()` por error inline con `parseError` state. Eliminados todos los `alert()` del proyecto. | `useNotifications.js`, `Toast.jsx`, `useTasks.js`, `App.jsx`, `ClientImportModal.jsx` |
| 2026-06-16 | C4 | Creado `.env.example` con las 7 variables requeridas y valores descriptivos. Corregido `.gitignore`: el patrón `.env.*` excluía también el ejemplo; añadida excepción `!.env.example` para que sea commiteado. | `.env.example`, `.gitignore` |
| 2026-06-16 | C3 | Añadida `escapeHtml()` al inicio de `TaskPDF.jsx`. Aplicada en las 16 interpolaciones de datos de usuario dentro del template HTML de `generateTaskPDF`: `clientName`, `serviceOrder`, `status`, `urgency`, `serviceType`, `identification`, `clientPhone`, `clientAddress`, `type`, `createdBy`, `observations`, `completedBy`, `completionObservations`. `shareViaWhatsApp` no requería cambios (genera texto plano con `encodeURIComponent`). | `src/components/TaskPDF.jsx` |
| 2026-06-24 | BORRADOR-HORA | **Auto-formato HH:MM en campo hora del formulario de borrador.** `BorradorSheet.jsx`: handler `handleTimeInput` extrae solo dígitos, inserta `:` automáticamente después del segundo dígito (ej. escribir `1030` → muestra `10:30`). Campo con `inputMode="numeric"` y `maxLength={5}`. | `src/components/BorradorSheet.jsx` |
| 2026-06-28 | VISIT-NUMBER + ESTABLECIMIENTOS | **Número de visita único por tenant (V-0001) + Gestión de establecimientos (sucursales).** `useVisits.js`: `addVisit` reescrito con `runTransaction` — atomicamente incrementa `tenants/{tenantId}/counters/visits.last` y crea la visita con `visitNumber: 'V-XXXX'`. `firestore.rules`: nuevas reglas para `counters` (read/write por miembros) y `establecimientos` (read por miembros, write por admins). `src/hooks/useEstablecimientos.js` *(nuevo)*: hook con `onSnapshot` sobre `tenants/{tenantId}/establecimientos`, funciones CRUD, sincroniza al store. `src/lib/store.js`: agregados `establecimientos`, `memberEstablecimientos`, `memberEstablecimientoDefault`, CRUD stubs. `src/components/EstablecimientosManager.jsx` *(nuevo)*: modal con dos tabs — CRUD de establecimientos y asignación a usuarios (checkboxes + estrella de default). `src/components/Configuracion.jsx`: nueva tarjeta "Establecimientos" en TabCatalogos, importa `EstablecimientosManager`. `src/App.jsx`: monta `useEstablecimientos(effectiveUser)`, lee `establecimientos`/`establecimientoDefault` del memberSnap en login y en role-refresh → almacena en store como `memberEstablecimientos`/`memberEstablecimientoDefault`. `src/components/VisitFormUnified.jsx`: selector de establecimiento (filtrado por permisos del usuario, pre-seleccionado con default), persiste `establecimientoId`/`establecimientoNombre` en visitData. `src/components/AllVisitsManager.jsx`: muestra `visitNumber` prominente en cabecera de tarjeta, `establecimientoNombre` en cuerpo, filtro por establecimiento en barra de filtros, corregido `t.name` → `t.nombre` en selector de técnicos. | `src/hooks/useVisits.js`, `firestore.rules`, `src/hooks/useEstablecimientos.js` *(nuevo)*, `src/lib/store.js`, `src/components/EstablecimientosManager.jsx` *(nuevo)*, `src/components/Configuracion.jsx`, `src/App.jsx`, `src/components/VisitFormUnified.jsx`, `src/components/AllVisitsManager.jsx` |
| 2026-06-24 | BORRADOR-CAMPOS | **Campos del formulario de borrador a fila completa en móvil.** `BorradorSheet.jsx`: Teléfono, Email, Fecha y Hora cambiados de `grid grid-cols-2` (mitad de ancho) a campos individuales de fila completa. Campo Hora cambiado de `type="time"` (selector nativo complejo) a `type="text"` con escritura libre. | `src/components/BorradorSheet.jsx` |
| 2026-06-24 | TECH-NOMBRE | **Fix: nombre del técnico desde catálogo en cabecera del portal.** `TechPortal.jsx`: `user.displayName` es null en Firebase Auth con email/contraseña. Se llama `useTecnicos(user)` y se busca el técnico por `email === user.email` para obtener su `nombre`. Fallback a `user.displayName` si no hay coincidencia. El nombre se muestra en rosa entre el nombre de empresa y el email. | `src/components/TechPortal.jsx` |
| 2026-06-24 | BORRADOR-FILTROS | **Filtros de estado y fecha en pestaña Borradores del portal técnico.** `BorradorSheet.jsx`: cuando `showList=true` muestra filtros de estado (Todos/Pendientes/Convertidos con badge de conteo) y selector de fecha por `scheduledDate` con botón limpiar. Ambos filtros se combinan. Estado vacío diferenciado (sin borradores vs sin resultados para el filtro). | `src/components/BorradorSheet.jsx` |
| 2026-06-24 | TECH-CONTACTO | **Teléfono y email como botones tapeables en tarjetas de visita del portal técnico.** `TechPortal.jsx`: reemplazado el link de texto pequeño de teléfono por dos botones grandes en fila — verde (`tel:`) y azul (`mailto:`). El email ahora también es visible en el portal del técnico (antes no aparecía). Si solo existe uno de los dos ocupa todo el ancho. | `src/components/TechPortal.jsx` |
| 2026-06-24 | PWA-BANNER-FIX | **Fix posición y detección del banner de actualización PWA.** `UpdatePrompt.jsx`: reposicionado a la parte superior (evita conflictos con barras de navegación inferiores); soporte `safe-area-inset-top` para iPhone; animación `slideDown` con CSS inline; `z-index: 9999`. `main.jsx`: `UpdatePrompt` movido fuera de `App.jsx` para montarse siempre independiente del estado de auth. Agrega `visibilitychange` listener para verificar al volver a la app. | `src/components/UpdatePrompt.jsx`, `src/main.jsx`, `src/App.jsx` |
| 2026-06-24 | PWA-UPDATE | **Banner de actualización automática via PWA Service Worker.** Instalado `vite-plugin-pwa@1.3.0`. `vite.config.js`: plugin `VitePWA` con `registerType: 'prompt'`, genera `sw.js` que precachea todos los assets del bundle. Nuevo `UpdatePrompt.jsx`: usa `useRegisterSW` de `virtual:pwa-register/react`; muestra banner oscuro con botón "Actualizar" cuando hay nueva versión disponible; verifica actualizaciones cada hora. | `vite.config.js`, `src/components/UpdatePrompt.jsx`, `src/main.jsx`, `package.json` |
| 2026-06-24 | BORRADOR-FIX | **Fix: borradores vacíos en portal técnico por falta de índice compuesto.** `useBorradores.js`: el query `onlyMine` combinaba `where(technicianEmail)` + `orderBy(createdAt)` en campos distintos, requiriendo índice compuesto en Firestore. Sin el índice la consulta fallaba silenciosamente. Solución: query solo con `where`, ordenamiento client-side por `createdAt` descendente. | `src/hooks/useBorradores.js` |
| 2026-07-01 | TECHPORTAL-MAPA | **Dirección y link de mapa en vista lista del portal técnico.** `TechPortal.jsx`: (1) `VisitCard` acepta nueva prop `mapsLink` y muestra botón "Abrir mapa" (azul, con ícono `Navigation`) debajo de la dirección del cliente. (2) `Section` ahora extrae y pasa `mapsLink` desde cada entry a `VisitCard` (antes solo `DayVisitCard` lo recibía). (3) `syntheticTask.clientAddress` corregido de `v.ubicacion` a `v.address \|\| v.ubicacion` para mostrar la dirección real de visitas nuevas (colección plana). | `src/components/TechPortal.jsx` |
| 2026-06-29 | CLIENT-HISTORIAL | **Historial de visitas por cliente (ClientHistorialModal).** Nuevo `ClientHistorialModal.jsx`: franja de 12 meses con puntos de color por estado, estadísticas (total, realizadas, última visita, próxima visita, alerta roja si han pasado +90 días), selector de año, panel de detalle al hacer clic en un mes. Modal admite `onNewVisit` opcional. Integrado en 4 puntos: (1) `ClientsManager.jsx` — botón "Historial" en menú Acciones; auto-abre si recibe `pendingClientHistorial` desde AppRouter vía `useEffect`. (2) `CalendarView.jsx` — botón "Historial cliente" en `EventDetailModal` para visitas nuevas (`event.visit.clientId`); llama `onViewClientHistorial` para navegar. (3) `AppRouter.jsx` — estado `pendingClientHistorial`; handler `onViewClientHistorial` activa pestaña Clientes y setea el cliente pendiente; `useState` añadido al import. (4) `TechPortal.jsx` — botón "Historial del cliente" en `VisitCard` (modo lectura, sin botón Nueva visita); busca el cliente por `identification` o `name` en la store. | `src/components/ClientHistorialModal.jsx` *(nuevo)*, `src/components/ClientsManager.jsx`, `src/components/CalendarView.jsx`, `src/components/AppRouter.jsx`, `src/components/TechPortal.jsx` |
| 2026-06-24 | BORRADOR-BUSCADOR | **Buscador de clientes en formulario de nuevo borrador del técnico.** `BorradorSheet.jsx`: campo de búsqueda al inicio de la sección "Datos del cliente" que filtra el catálogo de clientes (del store) por nombre, cédula o teléfono desde 2 caracteres. Muestra dropdown con hasta 6 sugerencias (nombre + cédula + teléfono). Al seleccionar un cliente auto-rellena `clientName`, `clientIdNumber`, `clientPhone`, `clientEmail` y `clientAddress`. Dropdown cierra al hacer clic fuera. Solo busca en clientes activos. Sin llamadas extra a Firestore. | `src/components/BorradorSheet.jsx` |
| 2026-06-24 | BORRADOR-FIX-ADMIN | **Fix: borradores del administrador excluidos por orderBy en Firestore.** `useBorradores.js`: query admin usaba `orderBy('createdAt','desc')`. Firestore excluye silenciosamente documentos sin ese campo. Solución: se elimina `orderBy` del query admin y se ordena siempre client-side (igual que ya se hizo para `onlyMine`). | `src/hooks/useBorradores.js` |
| 2026-06-24 | ADMIN-FILTRO-FECHA | **Filtro de fecha en lista de borradores del panel de administrador.** `BorradoresAdmin.jsx`: selector de fecha (`scheduledDate`) con botón "Limpiar" junto a los filtros de estado existentes. Búsqueda de texto en segunda fila. Los tres filtros se aplican en combinación. | `src/components/BorradoresAdmin.jsx` |
| 2026-06-24 | BORRADOR-AGENDA | **Mini-agenda del día en formulario de nuevo borrador del técnico.** `BorradorSheet.jsx`: bloque entre campo Fecha y Hora con visitas propias (Programadas/Confirmadas) para el día seleccionado, ordenadas por hora. Verde si día libre; ámbar con lista hora+cliente+badge si hay visitas. `useMemo` sobre `tasks` del store. | `src/components/BorradorSheet.jsx` |
| 2026-06-24 | BORRADOR-TAB | **Tab Borradores en portal técnico con badge de pendientes.** `TechPortal.jsx`: 4to tab "Borradores" junto a Lista/Día/Semana con badge naranja mostrando conteo de pendientes (blanco cuando el tab está activo). Filtro de visitas se oculta en vista borradores. FAB siempre visible en otras vistas. `BorradorSheet.jsx`: prop `showList` controla si muestra la lista o solo el FAB. | `src/components/TechPortal.jsx`, `src/components/BorradorSheet.jsx` |
| 2026-06-24 | E8-GRILLA-FORM | **Grilla horaria 07:00–22:00 + formulario de visita rediseñado.** `CalendarView.jsx`: constante `WORK_HOURS` (horas 7-22); `DayView` reemplazado por grilla `divide-y` — etiqueta hora grande en columna izquierda (rosa+negrita si ocupado, gris claro si libre), columna derecha muestra `WeekEventCard wide` por evento o texto "Libre" en itálica; sección "Sin hora asignada" al fondo en ámbar para visitas sin hora. `TechPortal.jsx`: misma grilla con `VisitCard`; `WORK_HOURS` añadido a nivel de módulo; `DayView` usa `useMemo` para `visitsByHour`/`noTimeVisits`. `VisitsModal.jsx`: añadidos `useMemo` y `Mail` a imports; `VisitFormModal` reestructurado — orden: Técnico (selector + indicador email con icono Mail) → Fecha → Panel agenda del técnico para esa fecha (lista de visitas programadas con hora exacta, urgencia y cliente, o "Día libre" si ninguna) → Hora → Tipo → Urgencia → Observaciones; `techSchedule` calculado con `useMemo` filtrando `tasks` del store por técnico+fecha+status=Programada. | `src/components/CalendarView.jsx`, `src/components/TechPortal.jsx`, `src/components/VisitsModal.jsx` |
| 2026-06-28 | GESTION-VISITAS | **Nueva arquitectura de gestión de visitas — colección plana `tenants/{id}/visits`.** Eliminado el modelo tarea→subcollección-visitas. Las visitas ahora viven en una colección plana independiente. Campos por visita: `clientId`, `contactId`, `installationId` (referencias) + `clientName`, `serviceType`, `address`, `ubicacion`, `ciudad`, `phone` (snapshot de display) + `scheduledDate`, `scheduledTime`, `type`, `urgency`, `status`, `serviceOrder`, `observations`, `technician`, `technicianEmail`, `parentVisitId` + campos de cierre/confirmación. `tenantDb.js`: nueva función `getVisitsFlatRef()`. `useClients.js`: `emptyInstallation()` exportado; `emptyContact()` incluye `installations: []`; `getClientContacts()` asegura `installations` presente. `useVisits.js`: completamente reescrito — hook independiente para colección plana; acciones `addVisit`, `editVisit`, `deleteVisit`, `completeVisit`, `cancelVisit`, `annulVisit`, `revertVisit`, `confirmVisit`; sincroniza al store. `store.js`: nuevo estado `visits`/`isLoadingVisits` + acciones + handlers `handleAddVisit`, `handleEditVisit`, `handleDeleteVisit`, `handleGenerateSupport`; estado de UI `openNewVisit`, `newVisitDefaults`, `editingVisit`. `App.jsx`: monta `useVisits(effectiveUser)`. `VisitFormUnified.jsx` *(nuevo)*: modal unificado de creación/edición con búsqueda de cliente, selector de contacto/ubicación con CRUD inline, selector de instalación/servicio con CRUD inline, todos los campos de visita. `ClientsManager.jsx`: sección de instalaciones dentro de cada card de contacto (CRUD); botón "Nueva visita" por fila. `AllVisitsManager.jsx`: reescrito — tab "Gestión de visitas" (nueva colección plana con acciones: completar, cancelar, anular, revertir, confirmar, generar soporte, editar, eliminar, PDF, WA) + tab "Historial legado" (datos de `water_filter_tasks`, solo lectura). `AppRouter.jsx`: menú "Tareas - Visitas" → "Gestión de visitas"; ruta `form` (TaskForm) eliminada; modal global `VisitFormUnified` montado. | `src/lib/tenantDb.js`, `src/hooks/useClients.js`, `src/hooks/useVisits.js`, `src/lib/store.js`, `src/App.jsx`, `src/components/VisitFormUnified.jsx` *(nuevo)*, `src/components/ClientsManager.jsx`, `src/components/AllVisitsManager.jsx`, `src/components/AppRouter.jsx` |
| 2026-06-27 | MULTI-CONTACT | **Modelo de datos multi-ubicación por cliente (contacts[]).** Reemplazados campos planos `phone/address/email/ciudad/ubicacion/observacion` del cliente por array `contacts: [{id, ubicacion, ciudad, address, phone, email, observacion}]`. `useClients.js`: exporta `emptyContact()` y `getClientContacts()` (retrocompat con clientes legados); `saveClient` maneja `contacts[]` y nuevo `additionalContacts[]`; `createClient`, `updateClient`, `importClients` guardan en la nueva estructura. `ClientsManager.jsx`: formulario con sección "Ubicaciones/Contactos" — CRUD inline de contactos (agregar, editar campos, eliminar por X); `ClientRow` muestra datos de `contacts[0]` con badge "+N ubicaciones". `ClientSearch.jsx`: busca por `contacts[0].phone`; tarjeta de cliente seleccionado muestra conteo de ubicaciones. `TaskForm.jsx`: nuevo cliente → campos en orden Cédula/RUC, Nombre, luego card de contacto con Ubicación+Ciudad, Dirección, Teléfono+Email, Observación, + botón "Agregar otra ubicación"; cliente existente → selector de ubicaciones (radio-cards) + opción "Agregar nueva ubicación" inline; al seleccionar contacto rellena `clientPhone/clientAddress/clientUbicacion/clientCiudad/clientObservacion/clientContactId` en el snapshot de la tarea. `store.js`: `handleAddTask` extrae `contacts` y `additionalContacts` antes de escribir la tarea (van al cliente, no a la tarea). | `src/hooks/useClients.js`, `src/components/ClientsManager.jsx`, `src/components/ClientSearch.jsx`, `src/components/TaskForm.jsx`, `src/lib/store.js` |
| 2026-06-26 | CLIENT-IMPORT-CAMPOS | **Nuevos campos Ciudad, Ubicación y Observación en importación masiva de clientes.** `importValidation.js`: `normalizeRow` ahora mapea `ciudad` (aliases: city, canton), `ubicacion` (aliases: sector, barrio, location, referencia) y `observacion` (aliases: observaciones, notas, notes) desde las columnas del Excel/CSV. Los 3 campos son opcionales, no añaden reglas de validación bloqueantes. `ClientImportModal.jsx`: plantilla descargable actualizada con 3 columnas nuevas + filas de ejemplo rellenas; instrucciones actualizadas separando obligatorias/opcionales; tabla de vista previa con columnas Ciudad, Ubicación y Observación (truncadas con tooltip). El guardado en BD usa `useClients.importClients()` ya actualizado en CLIENT-CAMPOS. | `src/utils/importValidation.js`, `src/components/ClientImportModal.jsx` |
| 2026-06-26 | CLIENT-CAMPOS | **Nuevos campos en tabla de clientes: Ciudad, Ubicación, Observación.** `useClients.js`: agregados `ciudad`, `ubicacion`, `observacion` en `saveClient`, `createClient`, `updateClient` e `importClients` (todos con `?.trim() \|\| ''`). `ClientsManager.jsx`: formulario ampliado con 4 filas nuevas — Teléfono+Ciudad en grid 2col, Ubicación fila completa, Email fila completa, Observación textarea 2 filas. `ClientRow`: celda Dirección muestra `address` + `ciudad · ubicacion` como línea secundaria; celda Cliente muestra `observacion` en itálica truncada con tooltip. Asociación al tenant ya correcta vía `tenants/{tenantId}/clients` implementada en L8. | `src/hooks/useClients.js`, `src/components/ClientsManager.jsx` |
| 2026-06-25 | BORRADOR-SYNC-FIX3 | **Fix definitivo de duplicados al sincronizar: flag global + auto-limpieza.** Causa raíz confirmada: `useBorradores` se monta 3 veces simultáneamente (TechPortal badge + BorradorSheet lista + VisitsModal). Cada instancia tenía su propio `let syncing = false` — no compartido. Las 3 instancias corrían `sync()` al mismo tiempo. Con `addDoc` (versiones anteriores) eso creaba 3 documentos distintos; con `setDoc` idempotente no crea duplicados en BD pero el `localPending` de cada instancia no se limpiaba si el sync corrió en otra. Solución: (1) `_globalSyncing` a nivel de módulo — compartido entre todas las instancias, solo un sync corre a la vez; (2) efecto `auto-limpiar localPending`: cada vez que `firestoreDocs` se actualiza (el borrador llegó a Firestore), elimina los items coincidentes de `localPending` y del localStorage, sin importar qué instancia hizo el sync; (3) `useMemo` y deduplicación en `onSnapshot` actualizados a clave `email|createdAt` para ser consistentes. | `src/hooks/useBorradores.js` |
| 2026-06-25 | BORRADOR-SYNC-FIX2 | **Fix definitivo de duplicados y cliente no guardado al sincronizar offline.** Dos bugs relacionados: (1) `syncClientFromBorrador` y el borrador compartían el mismo `try/catch` — si el cliente fallaba, el borrador iba a `failed` y en el siguiente reintento la ruta backward-compat usaba `addDoc` con ID aleatorio nuevo → documento duplicado en Firestore. (2) El cliente nunca se guardaba si fallaba porque el error marcaba el borrador como pendiente indefinidamente. Fix: (a) eliminado `addDoc` del código — todos los items (nuevos con `docId` y viejos sin él) usan `setDoc` con ID determinístico vía `buildFallbackDocId(data)` → `email_sanitized + createdAt_sanitized`; (b) separados en dos `try/catch` independientes: el borrador se limpia de la cola aunque el cliente falle; (c) fallo de cliente se loga con `console.error` y no bloquea el flujo. | `src/hooks/useBorradores.js` |
| 2026-06-25 | BORRADOR-SYNC-CLIENTE | **Registrar cliente al sincronizar borrador offline.** Al crear un borrador sin internet el cliente no se guardaba porque `handleSave` en `BorradorSheet.jsx` omite `saveClient` cuando `!navigator.onLine`. Fix: nueva función `syncClientFromBorrador(docData)` en `useBorradores.js` que escribe el cliente en la colección `clients` con `setDoc + merge:true` (no sobreescribe datos de clientes existentes). Se llama dentro del `sync()` después de que cada borrador se sube exitosamente a Firestore. Si el borrador no tiene `clientIdNumber` o `clientName`, la función es no-op. | `src/hooks/useBorradores.js` |
| 2026-06-25 | BORRADOR-DEDUP | **Fix: duplicación de borradores al sincronizar con internet.** Causa raíz: `addDoc` genera un ID aleatorio en Firestore cada vez que corre el sync — si el sync corría dos veces (race condition o coexistencia de escritura en IndexedDB de Firestore + cola localStorage), creaba dos documentos distintos con la misma data. Fix (tres capas): (1) `buildDocId(uid, createdAt)` genera un ID determinístico por borrador; (2) `addBorrador` y `sync` usan `setDoc(doc(ref, docId), data)` en lugar de `addDoc` — escribir dos veces el mismo docId sobreescribe sin crear duplicado; (3) `onSnapshot` desduplicar por `technicianEmail|createdAt` antes de setear estado — elimina duplicados ya existentes en BD de versiones anteriores; (4) flag `let syncing = false` previene ejecuciones simultáneas del sync. Backward-compat: items en localStorage sin `docId` (guardados con versión anterior) siguen usando `addDoc`. | `src/hooks/useBorradores.js` |
| 2026-06-20 | E5-TECHPORTAL | Portal de técnico con roles de usuario. Sistema de roles `admin`/`tecnico` en subcol. `tenants/{id}/members/{uid}`. Al crear empresa → `role: admin`; al unirse → `role: tecnico`. Login lée el rol y redirige al `TechPortal` (portal simplificado con visitas propias, botón "Confirmar asistencia", alertas atrasadas). Admin ve app completa; puede confirmar cualquier visita. Confirmación graba `confirmed: true`, `confirmedAt`, `confirmedBy: email`. Visitas confirmadas ya no aparecen en sección "atrasadas" (UI y Cloud Functions). Gestión de roles en Configuración → Catálogos → Usuarios. | `src/lib/store.js`, `src/App.jsx`, `src/components/TenantSetup.jsx`, `src/components/TechPortal.jsx` *(nuevo)*, `src/components/UsersManager.jsx` *(nuevo)*, `src/components/Configuracion.jsx`, `src/components/AllVisitsManager.jsx`, `functions/index.js`, `firestore.rules` |

---

## 📄 Informe Completo de Auditoría (Referencia Histórica)

A continuación se adjunta el reporte técnico original generado por la auditoría:

```text
Informe de Auditoría Técnica y de Seguridad

Acontplus Gestión Recordatorios — v0.0.0

Fecha: 2026-06-16 | Auditor: Claude Sonnet 4.6 (Arquitecto Fullstack Senior + Auditor de Seguridad)

---
Resumen Ejecutivo

La aplicación es una SPA (Single-Page Application) React 19 + Vite que utiliza Firebase (Auth +  
Firestore) como backend serverless y se despliega en Firebase Hosting. Está bien construida para 
un MVP funcional, pero tiene vulnerabilidades de seguridad críticas que deben corregirse antes de
escalar, además de deuda técnica acumulada que impactará la mantenibilidad a mediano plazo.      

Stack detectado:
- Frontend: React 19.2, Vite 8, TailwindCSS 4, Lucide-React
- Backend: Firebase 12 (Auth email/password, Firestore, Hosting)
- Exportación: SheetJS (CDN externo), HTML-to-Excel casero, CSV
- CI/CD: Firebase Hosting (deploy manual)
- Testing: Ninguno

---
1. Análisis de Arquitectura y Código

1.1 Puntos Fuertes

┌──────────────────────┬─────────────────────────────────────────────────────────────────────┐   
│       Aspecto        │                             Descripción                             │   
├──────────────────────┼─────────────────────────────────────────────────────────────────────┤   
│ Separación en Custom │ useTasks, useClients, useVisits, useNotifications, etc. aíslan      │   
│  Hooks               │ correctamente la lógica de datos de la UI                           │   
├──────────────────────┼─────────────────────────────────────────────────────────────────────┤   
│ Offline-first        │ persistentLocalCache() en Firestore + indicador online/offline +    │   
│                      │ onSnapshot para tiempo real                                         │   
├──────────────────────┼─────────────────────────────────────────────────────────────────────┤   
│ Import por lotes     │ writeBatch con grupos de 100 y barra de progreso funcional          │   
├──────────────────────┼─────────────────────────────────────────────────────────────────────┤   
│ ErrorBoundary        │ Hay un ErrorBoundary.jsx que captura errores de render              │   
├──────────────────────┼─────────────────────────────────────────────────────────────────────┤   
│ Validación de        │ 9 reglas de validación con agrupación de errores por tipo y fila    │   
│ importación          │                                                                     │   
├──────────────────────┼─────────────────────────────────────────────────────────────────────┤   
│ Responsive design    │ Navegación adaptativa móvil/desktop con Tailwind                     │   
├──────────────────────┼─────────────────────────────────────────────────────────────────────┤   
│ Paginación           │ Hook usePagination reutilizable                                     │   
├──────────────────────┼─────────────────────────────────────────────────────────────────────┤   
│ Firestore security   │ Reglas desplegadas con validación de schema mínima                  │   
│ rules                │                                                                     │   
└──────────────────────┴─────────────────────────────────────────────────────────────────────┘   

1.2 Vulnerabilidades y Puntos Débiles

CRÍTICO — Inyección HTML en exportación Excel (XSS)

Archivo: src/services/exportService.js líneas 141–143

// VULNERABLE: datos del usuario insertados sin escape en HTML
const html = `...
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
...`;

Si un atacante ingresa <script>alert(1)</script> en el campo clientName o observations, se       
ejecutará cuando el usuario abra el .xls generado en Excel o en un navegador. La función
exportCSV sí escapa correctamente ("${c.replace(/"/g, '""')}"), pero la de Excel no.

CRÍTICO — Dependencia de CDN externo sin integridad (Supply Chain Attack)

Archivo: src/components/ClientImportModal.jsx línea 34

const XLSX = await import('[https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs](https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs)');

Se carga SheetJS en tiempo de ejecución desde un servidor externo sin Subresource Integrity      
(SRI). Un atacante que comprometa el CDN de SheetJS podría ejecutar código arbitrario en el      
navegador de todos los usuarios de la app. Además, si el CDN cae, la importación de clientes     
queda completamente rota.

CRÍTICO — Credenciales Firebase expuestas en el .env local

Archivo: .env (en disco, NO en git)

VITE_FIREBASE_API_KEY=AIzaSyCLoizpo8euStS8eyDxw_34COvyN1g89A0
VITE_FIREBASE_MESSAGING_SENDER_ID=1019687901672

El .env está correctamente en .gitignore y no fue commiteado (verificado con git log). Sin       
embargo, todas las variables VITE_* se incrustan en texto plano en el bundle de producción       
generado por Vite. Esto es por diseño de Firebase Web, pero implica que las reglas de Firestore  
son la única barrera de seguridad real. Cualquier usuario puede extraer la API key del bundle .js
en producción.

ALTO — Sin aislamiento de datos por usuario/organización

Archivos: todos los hooks (useTasks.js, useClients.js, etc.)

La ruta Firestore es artifacts/{appId}/public/data/.... Todos los usuarios autenticados comparten
exactamente los mismos datos. No existe concepto de organización, empresa o rol. Cualquier       
usuario con una cuenta (creada por un administrador de Firebase) ve y modifica todos los clientes
y tareas de todos.

Las reglas de Firestore validan autenticación pero no pertenencia:
allow read: if request.auth != null;  // cualquier usuario autenticado

ALTO — Race condition en actualización de visitas

Archivo: src/App.jsx líneas 97–101

const handleVisitsUpdate = async (taskId, updatedVisits) => {
  const task = tasks.find(t => t.id === taskId);
  await addTask({ ...task, visits: updatedVisits }, user.email);
};

addTask usa setDoc (sobreescritura total). Si dos usuarios actualizan visitas de la misma tarea  
simultáneamente, la última escritura gana y se pierden los cambios del primero. Firestore tiene  
arrayUnion/arrayRemove y transacciones para evitar esto.

MEDIO — Singleton mutable global en configStore

Archivo: src/lib/configStore.js

let _config = { ... };  // estado mutable fuera de React
export function setConfigStore(config) { _config = { ...config }; }

Es un antipatrón en React: bypasea el sistema de reactividad y puede causar inconsistencias si el
módulo es importado en múltiples contextos o si en el futuro se usa SSR.

MEDIO — TaskPDF.jsx abre ventana con HTML dinámico sin sanitizar

Archivo: src/components/TaskPDF.jsx línea 16

El PDF se genera en innerHTML de una ventana nueva con datos de tarea. Si task.clientName o      
task.observations contiene <script>, se ejecutará en el contexto de la ventana popup.

---
2. Evaluación de Buenas Prácticas

2.1 SOLID

┌──────────────────┬─────────┬───────────────────────────────────────────────────────────────┐   
│    Principio     │ Estado  │                           Hallazgo                            │   
├──────────────────┼─────────┼───────────────────────────────────────────────────────────────┤   
│ S — Single       │ ⚠️      │ App.jsx (280 líneas) orquesta auth, routing, estado de        │   
│ Responsibility   │ Parcial │ tasks/clients/config/notificaciones/export. Demasiadas        │   
│                  │         │ responsabilidades.                                            │   
├──────────────────┼─────────┼───────────────────────────────────────────────────────────────┤   
│ O — Open/Closed  │ ✅ Ok   │ Los hooks son extensibles sin modificar componentes           │   
│                  │         │ consumidores                                                  │   
├──────────────────┼─────────┼───────────────────────────────────────────────────────────────┤   
│ L — Liskov       │ ✅ N/A  │ No hay herencia relevante                                     │   
├──────────────────┼─────────┼───────────────────────────────────────────────────────────────┤   
│ I — Interface    │ ⚠️      │ BillingReport recibe user pero solo usa user.email; podría    │   
│ Segregation      │ Parcial │ recibir solo el email                                         │   
├──────────────────┼─────────┼───────────────────────────────────────────────────────────────┤   
│ D — Dependency   │ ❌      │ Todos los hooks importan directamente db y appId de           │   
│ Inversion        │ Violado │ firebase.js. Ningún punto de abstracción para tests o cambio  │   
│                  │         │ de backend                                                    │   
└──────────────────┴─────────┴───────────────────────────────────────────────────────────────┘   

2.2 DRY (Don't Repeat Yourself)

Se identificaron 5 duplicaciones significativas:

localDateStr()       → duplicado en: Dashboard.jsx, Reports.jsx, BillingReport.jsx,
                       exportService.js, useNotifications.js
formatDateOnly()     → duplicado en: Dashboard.jsx, BillingReport.jsx, exportService.js
fmtMoney()           → duplicado en: BillingReport.jsx, exportService.js
Firestore path base  → `collection(db, 'artifacts', appId, 'public', 'data', ...)`
                       repetido en cada hook (~8 veces)

2.3 Manejo de Errores

┌──────────────────┬──────────────────────────────────────────────────────────────────────────┐  
│    Componente    │                                  Estado                                  │  
├──────────────────┼──────────────────────────────────────────────────────────────────────────┤  
│ Errores de       │ Solo console.error(). Sin feedback al usuario en la mayoría de casos.    │  
│ Firestore        │                                                                          │  
├──────────────────┼──────────────────────────────────────────────────────────────────────────┤  
│ Error en         │ catch silencioso — el usuario no sabe si la tarea se eliminó             │  
│ deleteTask       │                                                                          │  
├──────────────────┼──────────────────────────────────────────────────────────────────────────┤  
│ Error en         │ Propagado correctamente al llamador                                      │  
│ saveVisits       │                                                                          │  
├──────────────────┼──────────────────────────────────────────────────────────────────────────┤  
│ Login incorrecto │ Mensaje genérico "Email o contraseña incorrectos" (correcto — no expone  │  
│                  │ si el email existe)                                                      │  
├──────────────────┼──────────────────────────────────────────────────────────────────────────┤  
│                  │ Presente pero muestra el stack trace completo al usuario                 │  
│ ErrorBoundary    │ (this.state.error?.toString()) — expone información técnica innecesaria  │  
│                  │ en producción                                                            │  
├──────────────────┼──────────────────────────────────────────────────────────────────────────┤  
│ Configuración    │ Buen uso de timeout de 5s en useConfiguracion                            │  
│ timeout          │                                                                          │  
└──────────────────┴──────────────────────────────────────────────────────────────────────────┘  

2.4 Validaciones de Entrada

┌───────────────────┬─────────────────────────────────────────────────────────────────────────┐  
│    Formulario     │                                  Estado                                 │  
├───────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ TaskForm          │ Solo valida clientName. Sin validación de formato de teléfono, email, o │  
│                   │  longitud de serviceOrder                                               │  
├───────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ ClientImportModal │ Excelente — 9 reglas de validación con feedback granular                 │  
├───────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ ClientsManager    │ Validación mínima (nombre e identificación requeridos)                  │  
├───────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ Login             │ Sin rate limiting en cliente (Firebase Auth lo limita en servidor)      │  
├───────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ BillingModal      │ Sin validar que amount > 0 o que date sea válida antes de enviar        │  
└───────────────────┴─────────────────────────────────────────────────────────────────────────┘  

2.5 Pruebas Automatizadas

Cobertura: 0%. No existe ningún archivo de test (.test.js, .spec.js, __tests__/). No hay
configuración de Jest, Vitest, Cypress ni Playwright. Esto es deuda técnica alta para cualquier  
refactor futuro.

2.6 Gestión de Variables de Entorno

.env         → en .gitignore ✅ (no commiteado — verificado)
.env.example → NO EXISTE ❌ (onboarding imposible sin acceso al .env)

No hay .env.example que documente las variables necesarias. Un desarrollador nuevo no sabe qué   
variables configurar.

---
3. Evaluación de Escalabilidad

3.1 Preparación para x10 / x100 usuarios concurrentes

Base de Datos — Modelo de Datos

El mayor riesgo de escalabilidad está en cómo se almacenan visitas y pagos:

water_filter_tasks/{taskId}
    ├── clientName: string
    ├── visits: [ ... array de hasta N visitas ... ]   ← PROBLEMA
    │     └── payments: [ ... array de pagos ... ]      ← PROBLEMA ANIDADO

Problemas concretos:
1. Límite de documento Firestore: 1 MB por documento. Un cliente con 10 años de visitas mensuales
(120 visitas × datos) acercándose al límite.
2. Lectura total obligatoria: Para mostrar solo las visitas del mes, se descarga todo el
documento con todos los campos de la tarea.
3. Sin consultas sobre visitas: No es posible hacer WHERE visit.scheduledDate = TODAY — hay que  
descargar todos los tasks y filtrar en JavaScript.
4. Carga completa en memoria: onSnapshot(colRef) sin limit() carga TODOS los documentos. Con     
5,000 tareas, el navegador descargará y parseará todo antes de mostrar algo.

Arquitectura General

┌───────────────────────┬─────────────────────────────────┬─────────────────────────────────┐    
│       Escenario       │          Estado actual          │       Capacidad estimada        │    
├───────────────────────┼─────────────────────────────────┼─────────────────────────────────┤    
│ 1–50 tareas, 1–3      │ ✅ Sin problemas                │ Actual                          │    
│ usuarios              │                                 │                                 │    
├───────────────────────┼─────────────────────────────────┼─────────────────────────────────┤    
│ 500 tareas, 5–10      │ ⚠️ Dashboard lento (filtros     │ Con optimizaciones menores      │    
│ usuarios              │ in-memory)                      │                                 │    
├───────────────────────┼─────────────────────────────────┼─────────────────────────────────┤    
│ 5,000 tareas, 20+     │ ❌ UI bloqueada, alto costo     │ Requiere paginación server-side │    
│ usuarios              │ Firestore                       │                                 │    
├───────────────────────┼─────────────────────────────────┼─────────────────────────────────┤    
│ 50,000+ tareas        │ ❌ Imposible sin rediseño del   │ Requiere subcollecciones para   │    
│                       │ modelo                          │ visitas                         │    
└───────────────────────┴─────────────────────────────────┴─────────────────────────────────┘    

Sin Cloud Functions

No existe lógica server-side. Esto significa:
- Las notificaciones de recordatorios solo funcionan si la app está abierta en el navegador.     
- No hay proceso que envíe recordatorios por email/SMS al vencer fechas.
- No hay generación de reportes pesados en background.
- Los cálculos de cobros se recalculan en el cliente en cada render.

3.2 Índices de Firestore

Archivo: firestore.indexes.json — no fue revisado pero dado que solo se usa onSnapshot sin where 
compuestos en los hooks actuales, no hay índices necesarios aún. Sin embargo, sin paginación     
server-side, los índices serán críticos al agregar filtros en Firestore.

3.3 Acoplamiento de Servicios

El acoplamiento es alto entre componentes, bajo entre capas:
- Los hooks (useTasks, useClients) son reutilizables e independientes entre sí ✅
- Sin embargo, BillingReport importa directamente calcPaymentSummary de visitBilling.js y también
llama a onTasksUpdate que llega desde App.jsx que llama a addTask que llama a Firestore. La      
cadena de 4 capas hace difícil reemplazar la capa de persistencia.
- No hay abstraction layer (Repository Pattern) que permita cambiar de Firestore a otra DB sin   
tocar los hooks.

---
4. Cronograma de Mejoras (Roadmap Priorizado)

Críticas — Corto Plazo (Semanas 1–4)

┌─────┬───────────┬──────────────────────────────────────────────┬───────────────────────────┐   
│  #  │   Área    │                 Descripción                  │    Impacto / Beneficio    │   
├─────┼───────────┼──────────────────────────────────────────────┼───────────────────────────┤   
│     │           │ Escapar HTML en exportService.js función     │ Elimina XSS en            │   
│ C1  │ Seguridad │ exportExcel: reemplazar <td>${c}</td> por    │ exportación Excel.        │   
│     │           │ <td>${escapeHtml(c)}</td> con una función    │ Implementación: 15 min    │   
│     │           │ escapeHtml que reemplace <, >, &, "          │                           │   
├─────┼───────────┼──────────────────────────────────────────────┼───────────────────────────┤   
│     │           │ Eliminar import dinámico de CDN SheetJS.     │ Elimina riesgo de supply  │   
│ C2  │ Seguridad │ Instalar paquete local: npm install xlsx.    │ chain attack; la          │   
│     │           │ Importar como import * as XLSX from 'xlsx'   │ importación no falla si   │   
│     │           │                                              │ hay problemas de red      │   
├─────┼───────────┼──────────────────────────────────────────────┼───────────────────────────┤   
│     │           │ Sanitizar datos antes de generateTaskPDF()   │                           │   
│ C3  │ Seguridad │ en TaskPDF.jsx: escapar caracteres HTML en   │ Elimina XSS en generación │   
│     │           │ todos los campos interpolados en el template │  de PDF                   │   
│     │           │  literal                                     │                           │   
├─────┼───────────┼──────────────────────────────────────────────┼───────────────────────────┤   
│     │           │                                              │ Permite onboarding de     │   
│ C4  │ Config    │ Crear .env.example con las mismas keys que   │ nuevos developers; sin    │   
│     │           │ .env pero con valores vacíos o descriptivos  │ esto es imposible         │   
│     │           │                                              │ configurar el proyecto    │   
├─────┼───────────┼──────────────────────────────────────────────┼───────────────────────────┤   
│     │           │ Reemplazar errores silenciosos en            │ Usuarios no quedan en     │   
│ C5  │ Manejo    │ deleteTask, addTask, etc. con feedback al    │ estado inconsistente sin  │   
│     │ Errores   │ usuario (Toast de error ya existe en la app) │ saber que una operación   │   
│     │           │                                              │ falló                     │   
├─────┼───────────┼──────────────────────────────────────────────┼───────────────────────────┤   
│     │           │ En ErrorBoundary.jsx, no mostrar el stack    │ No expone estructura      │   
│ C6  │ Seguridad │ trace en producción. Usar                    │ interna del código a      │   
│     │           │ process.env.NODE_ENV o una variable Vite     │ usuarios finales          │   
│     │           │ para mostrar detalles solo en dev            │                           │   
└─────┴───────────┴──────────────────────────────────────────────┴───────────────────────────┘   

Importantes — Mediano Plazo (Meses 1–3)

#: M1
Área: DRY / Calidad
Descripción: Extraer localDateStr(), formatDateOnly(), fmtMoney() a un archivo src/utils/dates.js
    y src/utils/format.js. Eliminar las 5+ duplicaciones existentes
Impacto / Beneficio: Reduce errores por inconsistencia; un único punto de corrección
────────────────────────────────────────
#: M2
Área: Firestore / BD
Descripción: Extraer una constante getCollectionRef(name) en src/lib/firebase.js que construya el
    path artifacts/{appId}/public/data/{name}. Usarla en todos los hooks
Impacto / Beneficio: Elimina la repetición del path mágico en 8+ lugares; facilita cambiar la    
    estructura
────────────────────────────────────────
#: M3
Área: Arquitectura
Descripción: Dividir App.jsx en un componente de routing (AppRouter.jsx) y mover la lógica de    
    handleAddTask/handleVisitsUpdate al hook useTasks
Impacto / Beneficio: Reduce App.jsx de 280 a ~80 líneas; SRP
────────────────────────────────────────
#: M4
Área: Escalabilidad BD
Descripción: Migrar visits y payments a subcollecciones Firestore independientes:
    water_filter_tasks/{taskId}/visits/{visitId} y .../visits/{visitId}/payments/{payId}
Impacto / Beneficio: Permite queries directas sobre visitas; elimina límite de 1MB; reduce reads 
────────────────────────────────────────
#: M5
Área: Estado Global
Descripción: Introducir Zustand o Jotai para estado compartido (tasks, clients). Eliminar prop   
    drilling desde App.jsx
Impacto / Beneficio: Preparación para crecimiento; componentes desacoplados de la jerarquía      
────────────────────────────────────────
#: M6
Área: Seguridad / Roles
Descripción: Agregar campo companyId o tenantId a todos los documentos y actualizar Firestore    
    rules: allow read: if request.auth != null && resource.data.companyId ==
    request.auth.token.companyId
Impacto / Beneficio: Aislamiento real de datos entre organizaciones si se expande a multi-tenant 
────────────────────────────────────────
#: M7
Área: Validaciones
Descripción: Agregar validación de formato en TaskForm: teléfono (regex Ecuador/Colombia), email,
    longitud de serviceOrder. Usar una librería ligera como zod
Impacto / Beneficio: Previene datos corruptos en Firestore; mejor UX
────────────────────────────────────────
#: M8
Área: Testing
Descripción: Configurar Vitest + React Testing Library. Escribir tests unitarios para:
    usePagination, calcPaymentSummary, validateRow (importación), localDateStr
Impacto / Beneficio: Base para refactors seguros; sin tests cualquier cambio puede romper        
    silenciosamente

Deseables — Largo Plazo (3–6 meses)

#: L1
Área: Backend / Cloud
Descripción: Implementar Firebase Cloud Functions para: (a) envío de recordatorios por email     
    (Resend/SendGrid) en fechas de visita, (b) trigger de notificación push con FCM al crear visita
    urgente
Impacto / Beneficio: Los recordatorios funcionan aunque la app esté cerrada; valor de negocio    
    alto
────────────────────────────────────────
#: L2
Área: Escalabilidad
Descripción: Paginación server-side en Firestore con startAfter cursor para water_filter_tasks.  
La
    UI ya tiene Pagination.jsx, se necesita adaptar los hooks
Impacto / Beneficio: Soporta 10,000+ tareas sin degradación; reduce costo de Firestore reads     
────────────────────────────────────────
#: L3
Área: Observabilidad
Descripción: Integrar Sentry (free tier disponible) para captura automática de errores de JS,    
    performance monitoring y alertas
Impacto / Beneficio: Visibilidad de errores en producción sin depender de que el usuario reporte 
────────────────────────────────────────
#: L4
Área: Seguridad
Descripción: Activar Firebase App Check (reCAPTCHA Enterprise o DeviceCheck) para asegurar que    
    solo la app legítima accede a Firestore, incluso con la API key expuesta
Impacto / Beneficio: Bloquea uso de la API key directamente con herramientas tipo Postman o      
    scripts
────────────────────────────────────────
#: L5
Área: Architecture
Descripción: Reemplazar el singleton configStore.js con un Context/Provider de React o Zustand    
    slice
Impacto / Beneficio: Elimina estado mutable fuera de React; permite testing; previene bugs en    
    SSR/concurrent mode
────────────────────────────────────────
#: L6
Área: BD / Auditoría
Descripción: Agregar colección audit_log en Firestore para registrar quién creó/modificó/eliminó  
    cada tarea, con timestamp e IP
Impacto / Beneficio: Trazabilidad legal y operativa; imprescindible para sistemas de facturación 
────────────────────────────────────────
#: L7
Área: CI/CD
Descripción: Configurar GitHub Actions para: lint + build en cada PR, deploy automático a         
    Firebase Hosting en merge a main
Impacto / Beneficio: Calidad consistente; elimina deploys manuales que pueden subir código roto  
────────────────────────────────────────
#: L8
Área: Multi-tenant
Descripción: Diseñar modelo de datos con tenants/{tenantId}/tasks/... y sistema de invitación de  
    usuarios por organización
Impacto / Beneficio: Permite vender la app a múltiples empresas desde una sola instancia
────────────────────────────────────────
#: L9
Área: Monitoreo costos
Descripción: Configurar alertas de presupuesto en Firebase y usar getDocsFromCache antes de      
    llamadas de red en vistas de solo lectura
Impacto / Beneficio: Previene facturas inesperadas; Firestore cobra por reads — sin paginación   
    puede escalar rápido

---
5. Resumen de Hallazgos por Prioridad

🔴 CRÍTICOS (actuar esta semana):
     C1 — XSS en exportación Excel
     C2 — SheetJS desde CDN sin integridad
     C3 — XSS en generación de PDF
     C6 — Stack trace visible en producción

🟠 ALTOS:
     Sin aislamiento de datos multi-usuario
     Race condition en actualizaciones de visitas concurrentes
     Cero cobertura de tests

🟡 MEDIOS:
     5+ duplicaciones de funciones utilitarias
     App.jsx con múltiples responsabilidades
     Vistas bajo todas las tareas en memoria sin límite
     Sin .env.example para onboarding

🟢 MEJORAS (sin urgencia pero alto valor):
     Cloud Functions para notificaciones reales
     Paginación server-side
     Observabilidad (Sentry)
     Firebase App Check
     CI/CD automatizado

---
Nota Final

El proyecto tiene una base funcional sólida, arquitectura de hooks bien pensada y una UI cuidada.
Los problemas de seguridad críticos (C1, C2, C3) son de corrección rápida y deben priorizarse    
antes de cualquier crecimiento de usuarios. El mayor riesgo estructural a mediano plazo es el    
modelo de datos de Firestore con visitas como arrays anidados, que impondrá un límite duro de    
escalabilidad que requiere migración antes de alcanzar cientos de tareas por cliente.