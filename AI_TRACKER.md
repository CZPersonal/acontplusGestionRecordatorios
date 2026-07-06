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
- [ ] **[P2 - Notificaciones]:** Agregar notificación audible en el portal del técnico cuando se le asigna una nueva visita. Implementar en dos capas: (1) **Sonido en-app** — detectar vía `onSnapshot` (ya activo en el store) cuando aparece una visita nueva asignada al técnico y reproducir un `.mp3` con Web Audio API; respetar la política de autoplay del navegador (requiere al menos una interacción previa del usuario en la sesión). (2) **FCM push** — extender la Cloud Function `notifyUrgentVisit` (ya existe en `functions/index.js`) para notificar al técnico asignado en toda visita nueva, no solo urgentes; el token FCM ya se registra en `useNotifications.js`. Limitación conocida: iOS requiere PWA instalada + iOS 16.4+ para recibir push.
- [ ] **[P3 - Notificaciones]:** Rediseñar el envío de "visita creada" cuando se genera una **serie de visitas periódicas** (`addVisitSeries`, ver VISITAS-RECURRENTES). Hoy `notifyVisitCreatedNew` se dispara una vez por cada documento creado — una serie de 12 visitas mensuales dispara 12 correos de golpe. Requerimiento: enviar **un solo correo de "visita creada"**, con los datos de la visita más cercana a la fecha actual (en la práctica, `recurrenceIndex === 1`, ya que la fecha base del formulario siempre es la más próxima); las demás visitas de la serie (`recurrenceIndex > 1`) deben notificarse individualmente **días antes de su llegada**, mediante un mecanismo nuevo (no existe hoy — `checkVisitNotifications` solo cubre avisos de minutos-antes el mismo día, no de días-antes). Al implementarlo: (a) decidir si la cantidad de días de anticipación es fija o configurable en `config_empresa` (como `notifPrevisita`/`notifRetraso`); (b) cuando el job programado encuentre varias visitas pendientes de aviso el mismo día, **los correos deben salir en orden de creación de la serie — de la primera (`recurrenceIndex` menor) a la última**, no en orden arbitrario; (c) marcar cada visita avisada (patrón similar a `visit_meta`/`notifiedBefore`) para no reenviar el mismo aviso dos veces.

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
| 2026-07-01 | BORRADOR-UBICACIONES | **Formulario de borrador con selector de ubicaciones, creación de cliente y auto-refresh.** `BorradorSheet.jsx`: (1) Al seleccionar un cliente con múltiples ubicaciones se muestra un selector de radio cards (una por ubicación), con el teléfono de cada una y sus instalaciones como chips ámbar `Wrench`. Al elegir ubicación se rellenan automáticamente teléfono, email y dirección del formulario. Si el cliente tiene una sola ubicación se auto-selecciona. (2) Botón "Nuevo" (`UserPlus`) junto al buscador abre `ClientCreateModal` — bottom sheet con z-70 que monta `ClientForm noBorder`. Al crear, el cliente queda seleccionado y se cargan sus ubicaciones. (3) `useEffect([clients, selectedClientId, selectedContactId])` — cuando el admin edita el cliente en la store, los campos del formulario se actualizan en tiempo real. (4) Buscador ahora también busca por teléfono de cualquier ubicación del cliente. (5) `handleSubmit` persiste `clientId` y `contactId` en Firestore junto con los demás campos. `ClientsManager.jsx`: prop `noBorder` en `ClientForm` elimina el borde/fondo rosa del contenedor para uso embebido; inputs `py-2.5` y botón Cancelar `py-3` para usabilidad táctil. | `src/components/BorradorSheet.jsx`, `src/components/ClientsManager.jsx` |
| 2026-07-01 | BORRADORESADMIN-MEJORAS | **Mejoras en panel de borradores del administrador.** `BorradoresAdmin.jsx`: (1) `BorradorDetailModal` ahora muestra todos los campos del cliente: agregadas filas Ubicación (`MapPin`), Ciudad (`Building2`), Referencia (`FileText`) y Google Maps (`Navigation`) con link "Abrir mapa" clicable. (2) Reemplazado flujo de conversión 2-pasos legacy (`TaskForm` → `VisitFormModal` con subcollección) por integración directa con la arquitectura nueva: `startConvert(b)` llama `openNewVisitModal(defaults)` del store Zustand pre-cargando todos los campos del borrador (clientId, contactId, clientName, phone, clientEmail, address, ubicacion, ciudad, referencia, mapsLink, scheduledDate, scheduledTime, observations, technician, technicianEmail). `useEffect` detecta cuando `openNewVisit` pasa de true→false y `highlightedVisitId` cambia → llama `convertBorrador(id, {visitId, adminEmail})` automáticamente. Eliminados imports `TaskForm`, `VisitFormModal`, `getVisitsRef`, `addTask`. | `src/components/BorradoresAdmin.jsx` |
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
| 2026-07-01 | BORRADOR-OFFLINE-ROBUSTO | **Robustez del flujo offline y sincronización de borradores.** Revisión y corrección de 5 bugs/gaps en `useBorradores.js`: (1) **`addBorrador` write-ahead log** — ahora siempre guarda en localStorage antes de intentar `setDoc`; si la app se cierra antes de que Firestore confirme el borrador no se pierde. (2) **`updateBorrador` offline para items pendientes** — si el técnico edita un borrador con `id = pending_*` (aún no en Firestore), actualiza el dato en localStorage y el state local; si hay red, sube el documento inmediatamente. (3) **`updateBorrador` offline para docs en Firestore** — encola la actualización como `{op: 'update'}` en localStorage; el `sync()` la aplica con `updateDoc` al volver la red. (4) **`anuladoBorrador` y `deleteBorrador` para items pendientes** — ya no llaman `updateDoc`/`deleteDoc` sobre un documento que aún no existe; borran directamente de localStorage y del state local. (5) **Listener `visibilitychange`** — además del evento `'online'`, el sync se dispara cuando el técnico vuelve a la app desde otra pantalla (escenario frecuente en móvil). Se agrega feedback via toast al completar sync exitoso. | `src/hooks/useBorradores.js` |
| 2026-06-20 | E5-TECHPORTAL | Portal de técnico con roles de usuario. Sistema de roles `admin`/`tecnico` en subcol. `tenants/{id}/members/{uid}`. Al crear empresa → `role: admin`; al unirse → `role: tecnico`. Login lée el rol y redirige al `TechPortal` (portal simplificado con visitas propias, botón "Confirmar asistencia", alertas atrasadas). Admin ve app completa; puede confirmar cualquier visita. Confirmación graba `confirmed: true`, `confirmedAt`, `confirmedBy: email`. Visitas confirmadas ya no aparecen en sección "atrasadas" (UI y Cloud Functions). Gestión de roles en Configuración → Catálogos → Usuarios. | `src/lib/store.js`, `src/App.jsx`, `src/components/TenantSetup.jsx`, `src/components/TechPortal.jsx` *(nuevo)*, `src/components/UsersManager.jsx` *(nuevo)*, `src/components/Configuracion.jsx`, `src/components/AllVisitsManager.jsx`, `functions/index.js`, `firestore.rules` |
| 2026-07-02 | CLIENTS-TOASTS | **Toasts de feedback en flujos de guardado del panel de administrador de clientes.** `ClientsManager.jsx` no mostraba ningún toast tras crear/editar/activar/desactivar clientes (los commits recientes quitaron el `await` bloqueante de `createClient`/`updateClient` pero no se agregó feedback visual, dejando al usuario sin confirmación de éxito o error). `handleSave`: toast de éxito diferenciado online/offline (mensaje "se sincronizará al reconectar" si `!navigator.onLine`) y toast de error — incluye caso específico de cambio de cédula/RUC bloqueado sin conexión. `handleToggleActive` y `onActivateExisting` (reactivar cliente inactivo desde el formulario de duplicado): ahora usan el valor de retorno de `setClientActive` para mostrar toast de éxito o error en lugar de ignorarlo silenciosamente. | `src/components/ClientsManager.jsx` |
| 2026-07-02 | TOAST-AUTODISMISS | **Auto-cierre de toasts simples de confirmación (éxito/error).** `Toast.jsx`: `ToastItem` distingue entre toasts simples (sin `task`/`visit` — confirmaciones de guardado tipo éxito/error) y toasts de alerta de visita (retrasada/hoy/urgente, con botones PDF/WhatsApp). Los simples ahora se cierran automáticamente a los 4.5s (`AUTO_DISMISS_MS`) via `setTimeout` en `useEffect`, limpiando el timer al desmontar o cerrar manualmente. Las alertas de visita siguen requiriendo cierre manual — son accionables y no deben desaparecer solas. | `src/components/Toast.jsx` |
| 2026-07-02 | CLIENTS-DELETE | **Botón Eliminar cliente, solo visible para el panel de administrador.** `useClients.js`: nueva función `deleteClient(id)` (`deleteDoc` + try/catch, mismo patrón que `setClientActive`), agregada al sync con el store y al return del hook. `ClientsManager.jsx`: lee `userRole` del store (`isAdmin = userRole === 'admin'`); nuevo `handleDeleteClient`. `ActionsMenu`/`ClientRow`: nuevo botón "Eliminar" (ícono `Trash2`, rojo) renderizado solo si `isAdmin`, debajo del separador de Inactivar/Activar. `firestore.rules`: `allow delete` de `tenants/{tenantId}/clients/{clientId}` cambiado de `isMember(tenantId)` a `isAdmin(tenantId)` para enforcement en servidor (antes cualquier miembro, incluyendo técnicos, podía borrar un cliente vía API directa aunque el botón estuviera oculto en la UI). | `src/hooks/useClients.js`, `src/components/ClientsManager.jsx`, `firestore.rules` |
| 2026-07-02 | CLIENTS-DELETE-FIX | **Fix: botón Eliminar cliente sin efecto (probable causa: `window.confirm` en PWA instalada).** La versión inicial de CLIENTS-DELETE usaba `window.confirm()` para confirmar el borrado. En PWAs instaladas en modo standalone (frecuente en Android/iOS), el diálogo nativo `confirm()` puede resolverse silenciosamente como `false` sin llegar a mostrarse, dejando el botón sin efecto aparente para el usuario. Fix: reemplazado por el mismo patrón de confirmación inline de dos pasos que ya usa Activar/Desactivar en `ActionsMenu` (estado `confirmingDelete`, panel "¿Eliminar definitivamente a {nombre}?" con botones Eliminar/Cancelar, muestra advertencia si el cliente tiene visitas asociadas). `handleDeleteClient` ya no depende de `window.confirm` — solo ejecuta el borrado y el toast de resultado. | `src/components/ClientsManager.jsx` |
| 2026-07-02 | CLIENTS-DELETE-FIX2 | **Fix real: `deleteClient` nunca llegaba a `ClientsManager` — faltaba en el objeto `useClientsHook` armado por `AppRouter.jsx`.** El botón seguía sin funcionar tras CLIENTS-DELETE-FIX porque `AppRouter.jsx:171` construye manualmente `useClientsHook={{ createClient, updateClient, setClientActive, importClients }}` — un objeto literal, no el hook completo — y nunca se agregó `deleteClient` a esa lista ni a la lectura `useAppStore(s => s....)` de más arriba. Resultado: `deleteClient` llegaba `undefined` a `ClientsManager`, y al invocarlo lanzaba `TypeError` sin ningún `catch` alrededor (ni en `handleDeleteClient` ni en el `onClick` de `ActionsMenu`), por lo que el error quedaba silencioso en consola y el botón no producía ningún efecto visible. Fix: agregado `deleteClient` a la lectura del store y al objeto pasado a `ClientsManager` en `AppRouter.jsx`; agregado `catch` defensivo en `handleDeleteClient` para que un fallo similar en el futuro muestre un toast de error en vez de fallar en silencio. | `src/components/AppRouter.jsx`, `src/components/ClientsManager.jsx` |
| 2026-07-02 | VISITAS-COBROS-LINK | **Vincular el valor registrado al confirmar/completar una visita con el módulo de Cobros.** Había dos sistemas de visitas desconectados: el legado (`tasks` + subcolección `visits`, con Cobros completo — `valorCobrar`, abonos, fecha de compromiso) y el nuevo (colección plana `tenants/{id}/visits`, usado en portal técnico y "Gestión de visitas"), que no tenía ningún vínculo con Cobros. Además había un bug de pérdida de datos: `completeVisit()` en `useVisits.js` ignoraba el `visitValue` que el técnico ingresaba al cerrar una visita desde el portal técnico. Fix: (1) `completeVisit(visitId, closingData)` ahora persiste `visitValue` y, si es mayor a 0, lo copia automáticamente a `valorCobrar` — el valor de campo queda listo para cobrar sin que el admin lo vuelva a digitar. (2) `visitBilling.js`: nuevas funciones `saveFlatVisitBilling`, `addFlatVisitPayment`, `deleteFlatVisitPayment` — equivalentes a las legadas pero para la colección plana (un solo `updateDoc` por visita, sin batch de subcolección). (3) `BillingModal.jsx`: nueva prop `flatMode` que hace que los 3 handlers (`handleSaveBilling`, `handleAddPayment`, `handleDeletePayment`) usen las funciones planas en vez de las legadas; `allVisits`/`onUpdate` pasan a ser opcionales en ese modo. (4) `AllVisitsManager.jsx`: nuevo botón "Cobrar" en visitas `Realizada` que abre `BillingModal` en `flatMode` (usando `makeTaskForPDF(visit)` como `task` sintético); la tarjeta de visita ahora muestra abonado/saldo junto al valor via `calcPaymentSummary`. `CompleteVisitModal` simplificado — ya no necesita el workaround de dos pasos (`completeVisit` + `editVisit`) para guardar el valor. Reglas de Firestore no requirieron cambios (`allow update` en `visits` ya es abierto a cualquier campo). | `src/hooks/useVisits.js`, `src/services/visitBilling.js`, `src/components/BillingModal.jsx`, `src/components/AllVisitsManager.jsx` |
| 2026-07-03 | VISITAS-REALIZADA-GATE | **Botón "Realizada" bloqueado hasta confirmar la visita (panel admin) + re-verificación del vínculo valor→Cobros.** `AllVisitsManager.jsx`: el botón "Realizada" en "Gestión de visitas" se podía usar sin haber confirmado la visita primero. Ahora `disabled={isBusy || !visit.confirmed}`, con `title` tooltip y una nota visible "Confirma primero" (los tooltips no son útiles en touch/PWA). `TechPortal.jsx` ya gateaba esto correctamente en `VisitCard`/`DayVisitCard` (muestran "Confirmar asistencia" en vez de "Marcar como realizada" hasta que `isConfirmed`) — no requirió cambios. Se re-verificó línea por línea el flujo VISITAS-COBROS-LINK (técnico ingresa valor → `completeVisit` persiste `visitValue`/`valorCobrar` → listener en tiempo real refresca el store → `BillingModal` se inicializa con el monto ya cargado) sin encontrar rutas rotas. | `src/components/AllVisitsManager.jsx` |
| 2026-07-03 | VISITA-EMAIL-VALOR | **Correo de "visita completada" ahora incluye el valor a cobrar.** El email que se envía al marcar una visita como Realizada (`notifyVisitCompletedNew` en `functions/index.js`, la función que realmente se dispara para el flujo actual — vigila la colección plana `tenants/{tenantId}/visits`, a diferencia de `notifyVisitCompleted` que vigila el modelo legado `water_filter_tasks/*/visits` y ya no recibe escrituras) no incluía ningún monto. Agregada una fila "Valor a cobrar" en la plantilla compartida `buildVisitEmailHtml` (usada por ambas funciones), leyendo `visit.valorCobrar` con `visit.visitValue` como respaldo, visible solo si el monto es mayor a 0, formateado como moneda y resaltado en verde junto a "Obs. cierre". | `functions/index.js` |
| 2026-07-03 | CLIENTE-EMAIL-REDISEÑO | **Plantilla de correo dedicada para el CLIENTE (creada, modificada, confirmada, realizada, cancelada), con logo/marca de la empresa y QR de WhatsApp del técnico.** Antes, el cliente recibía la misma plantilla técnica que admin/técnico (`buildVisitEmailHtml`) con sus propios datos reflejados (cédula, orden de servicio) — información irrelevante para el cliente y potencialmente confusa. Cambios: (1) Instalada dependencia `qrcode` en `functions/`. (2) Nueva función `buildClientVisitEmailHtml({ eventType, config, task, visit, before })` en `functions/index.js` — plantilla enfocada en fecha/hora, lugar de la visita, técnico asignado + botón de llamada, y un QR generado en el servidor (`QRCode.toDataURL`) que abre un chat de WhatsApp con el técnico (`wa.me/{prefijo}{numero}`); usa logo/nombre/eslogan/RUC/WhatsApp de la empresa ya guardados en `tenants/{tenantId}/configuracion/config_empresa` (antes solo se leía `empresaNombre`). Para "realizada" agrega observación de cierre y valor cobrado; para "cancelada" omite datos del técnico/QR (ya no aplica) e invita a reagendar por WhatsApp de la empresa; para "modificada" muestra fecha/hora nueva con "Antes: ..." cuando cambiaron. (3) Nuevo helper `splitClientRecipient(toList, notifCfg, task)` — separa el email del cliente (si `notifCfg.cliente` está activo) del resto de destinatarios resueltos por `resolveRecipients`, sin tocar la lógica de configuración existente. (4) `notifyVisitCreatedNew`, `notifyVisitCompletedNew`, `notifyVisitUpdatedNew`: cada una ahora envía dos correos independientes cuando aplica — el interno (sin cambios, con la fila "Valor a cobrar" agregada en VISITA-EMAIL-VALOR) a técnico/admin/creador/otros, y el nuevo cliente-friendly al cliente. (5) Detección de cancelación: `notifyVisitUpdatedNew` ahora distingue `esCancelacion` (`status` cambia a `Cancelada`) del resto de modificaciones — antes una visita cancelada disparaba el mismo correo genérico "✏️ Visita modificada" para todos; ahora usa asunto/título "🚫 Visita cancelada" tanto interno como para el cliente. Probado de forma aislada (sin desplegar) generando las 5 plantillas con datos de ejemplo — QR se genera correctamente para los 4 eventos con técnico, y "cancelada" omite correctamente técnico/tipo de servicio. | `functions/index.js`, `functions/package.json` |
| 2026-07-03 | UPDATEPROMPT-FIX | **Fix: aviso de "nueva versión disponible" no le llegaba a algunos usuarios.** El sistema compara el hash de build de la app contra `/version.json` cada 60s (`UpdatePrompt.jsx` + `vite.config.js`) — confirmado que el servidor sirve la versión correcta con `Cache-Control: no-store`, el problema no estaba ahí. Encontrados dos huecos: (1) un Service Worker antiguo de `vite-plugin-pwa` (antes de migrar a este sistema por polling) puede seguir cacheando agresivamente en el dispositivo del usuario — existe un `public/sw.js` "kill-switch" pensado para reemplazarlo y borrar sus cachés, pero nada en el código lo forzaba a re-chequear; dependía del heurístico pasivo del navegador (~24h). (2) sin listener de `visibilitychange`/`focus`: en móvil los `setInterval` de apps en segundo plano suelen congelarse, y no había nada que reactivara el chequeo al volver a la app (patrón ya usado antes en este proyecto para sincronización de borradores offline). Fix: `UpdatePrompt.jsx` ahora llama `registration.update()` sobre cualquier SW ya registrado al montar, y agrega listeners de `visibilitychange`/`focus` que disparan un chequeo inmediato. Nota: usuarios totalmente atrapados en HTML/JS cacheado por el SW viejo pueden necesitar cerrar completamente la app o reinstalar la PWA una vez para romper el ciclo. | `src/components/UpdatePrompt.jsx` |
| 2026-07-03 | CLIENTE-EMAIL-IMAGENES-FIX | **Fix: logo y QR no se mostraban en el correo del cliente (Gmail bloquea imágenes `data:` URI).** Reportado con captura real: ambos aparecían como ícono roto en Gmail. Causa: el QR se embebía como `data:image/png;base64,...` (`QRCode.toDataURL`) y el logo del tenant (subido como archivo en Configuración → Entidad, que lo guarda en `config.logoUrl` como base64 vía `FileReader.readAsDataURL`) también es un `data:` URI — Gmail descarta por completo cualquier imagen `data:` en correos HTML, a diferencia de imágenes servidas desde una URL http real. Fix: (1) Nueva Cloud Function `generateQrCode` — endpoint HTTP público que genera el QR bajo demanda (`QRCode.toBuffer`) y lo devuelve como PNG real con `Content-Type: image/png` y cache de una semana; expuesto en `https://gestorrecordatorios.web.app/api/qrcode?phone=...` vía rewrite de Firebase Hosting (agregado en `firebase.json`). **Corrección post-deploy**: el rewrite de Hosting NO evita el problema de permisos IAM — ver CONFIRMVISITATTENDANCE-CLEANUP más abajo. `buildClientVisitEmailHtml` ahora arma un `<img src>` apuntando a ese endpoint en vez de generar el QR inline. (2) `logoUrl` del tenant ahora se usa solo si NO empieza con `data:` — si el admin subió su logo como archivo (no como URL externa), el correo cae automáticamente al logo genérico alojado (`/logo.png`) en vez de mostrar un ícono roto. Nota para el usuario: si se quiere que el logo propio de cada tenant sí aparezca en los correos, hay dos opciones — pedirle al admin que ingrese una URL externa en el campo logo (Configuración → Entidad ya soporta esto) en vez de subir un archivo, o implementar en otra sesión que la subida de archivo también suba a Firebase Storage (URL http real) en vez de solo convertir a base64. | `functions/index.js`, `firebase.json` |
| 2026-07-03 | IAM-INVOKER-GAP | **Descubierto: la cuenta que despliega (`firebase deploy`) no tiene permiso IAM para publicar funciones HTTP nuevas — bloquea `generateQrCode` igual que ya bloqueaba `confirmVisitAttendance`.** Al desplegar `generateQrCode`, Firebase intentó volverla pública automáticamente (comportamiento por defecto en creación) y falló con el mismo error que `confirmVisitAttendance`: *"Failed to set the IAM Policy... roles/functions.admin"*. Se comprobó con `curl` a la URL directa de Cloud Run (`https://us-central1-gestorrecordatorios.cloudfunctions.net/generateQrCode`) → `403 Forbidden`. **Se descartó la hipótesis de que enrutar vía rewrite de Firebase Hosting evita este problema**: `https://gestorrecordatorios.web.app/api/qrcode` devolvía `200` pero el contenido real era el `index.html` de la SPA (fallback al catch-all `**`, no la función) — el rewrite no logra enlazar una función que no se pudo volver pública. Es una limitación de permisos IAM en Google Cloud, no un bug de código; requiere que el proyecto le otorgue el rol `Cloud Functions Admin` (o equivalente) a la cuenta que corre los deploys — acción que el usuario debe hacer directamente en GCP Console, no delegable a Claude Code (modificar IAM es una acción de "control de acceso" fuera de alcance). | — (solo diagnóstico, sin cambios de código) |
| 2026-07-03 | CONFIRMVISITATTENDANCE-CLEANUP | **Eliminada la función huérfana `confirmVisitAttendance`** (a pedido explícito, mientras se resolvía IAM-INVOKER-GAP). Investigación previa ya había confirmado que `generateConfirmToken` (que construye el link que esta función necesitaba) nunca se llama en ningún otro lugar del código — el flujo de confirmación por link de correo fue reemplazado hace tiempo por el botón "Confirmar asistencia" del portal técnico (`confirmVisit()` en `useVisits.js`), dejando este endpoint sin ningún llamador real. Eliminados junto con la función: los helpers `generateConfirmToken`, `decodeConfirmToken`, `confirmHtml` (usados solo por ella), el secret `CONFIRM_SECRET`/`confirmSecret` (incluida su referencia huérfana en `checkVisitNotifications`, que lo declaraba como dependencia sin usarlo nunca), y el `require('crypto')` (sin más usos tras quitar los helpers de token HMAC). | `functions/index.js` |
| 2026-07-03 | IAM-INVOKER-GAP-RESUELTO | **Resuelto: `generateQrCode` ya es pública y el rewrite de Hosting la sirve correctamente.** Se descartó la hipótesis de política de organización (Domain Restricted Sharing) — el usuario confirmó en la consola de Cloud Run que "Permitir acceso público" se guardó sin ningún error de política. Se agregaron los roles `Cloud Functions Admin` y `Cloud Run Admin` a la cuenta de deploy, pero el `firebase deploy` por CLI seguía fallando igual (`Failed to set the IAM Policy`) incluso después de ambos roles — la advertencia de `firebase-functions` desactualizado en el log se descartó como causa (aparece también en deploys exitosos de las otras 10 funciones). La solución efectiva fue activar el invoker público **directamente desde la consola web de Cloud Run** (Permisos → Agregar principal `allUsers` → rol `Cloud Run Invoker`) — usando la sesión de consola del usuario en vez del flujo IAM del CLI de `firebase deploy`, que por alguna razón no lograba aplicar el cambio pese a los roles otorgados. Tras eso, un `firebase deploy --only hosting` (sin cambios de código) fue suficiente para que el rewrite `/api/qrcode` reconociera la función y dejara de caer al `index.html` de la SPA. Verificado con `curl`: tanto la URL directa de Cloud Run como `https://gestorrecordatorios.web.app/api/qrcode?phone=...` devuelven un PNG 300×300 válido. | — (solo infraestructura, sin cambios de código) |
| 2026-07-03 | LOGO-FIREBASE-STORAGE | **Subida real del logo a Firebase Storage (URL http pública) en vez de base64 embebido.** El logo de la empresa se guardaba como `data:` URI (`FileReader.readAsDataURL()`), que funciona en la app y en PDFs pero Gmail lo bloquea por completo en correos HTML — el fallback al logo genérico ya cubría ese caso (ver CLIENTE-EMAIL-IMAGENES-FIX), pero el usuario quería que SU logo propio se viera. Cambios: (1) `src/lib/firebase.js` — agregado `getStorage(app)`, exportado como `storage` (el bucket ya estaba configurado vía `VITE_FIREBASE_STORAGE_BUCKET`, pero nunca se usaba). (2) Nuevo `storage.rules` — path `tenants/{tenantId}/logo/{fileName}` con lectura pública (`allow read: if true`, necesario porque los correos a clientes no están autenticados) y escritura solo para miembros del tenant (`isMember`, mismo criterio que `firestore.rules`, usando `firestore.get()` desde reglas de Storage), con validación de tamaño (<2MB) y `contentType` de imagen. Agregado `"storage": {"rules": "storage.rules"}` a `firebase.json`. (3) `Configuracion.jsx` (`TabEntidad`): `handleLogoChange` ahora sube el archivo a Storage (`uploadBytes` + `getDownloadURL`) en vez de convertirlo a base64; `logoUrl` guardado en Firestore pasa a ser una URL `https://firebasestorage.googleapis.com/...` real. Límite subido de 500KB a 2MB (ya no aplica la restricción de tamaño de documento de Firestore, solo se guarda la URL). Agregado estado `uploadingLogo` con spinner mientras sube. `handleRemoveLogo` no borra el archivo de Storage, solo limpia la referencia (por simplicidad — el archivo huérfano no genera costo relevante). | `src/lib/firebase.js`, `storage.rules` *(nuevo)*, `firebase.json`, `src/components/Configuracion.jsx` |
| 2026-07-03 | LOGO-STORAGE-RULES-FIX | **Fix: la subida del logo fallaba silenciosamente (permiso denegado) y el error no se veía en pantalla.** Reproducido en vivo con Claude-in-Chrome (sesión real del usuario): la consola mostraba `FirebaseError: ... storage/unauthorized` en cada intento. Causa raíz: `isMember(tid)` en `storage.rules` (LOGO-FIREBASE-STORAGE) usaba `firestore.get()` para verificar membresía del tenant desde reglas de Storage — esa lectura cross-servicio no se evaluaba como se esperaba y la regla denegaba siempre, para cualquier usuario. Fix: simplificada la condición de escritura a solo `request.auth != null` (+ validación de tamaño/tipo), sin verificar tenant específico — riesgo aceptado bajo, ya que solo protege un archivo de imagen de logo (no datos sensibles) y requeriría conocer el tenantId exacto de otra empresa. Además se encontró un bug de UX separado: el mensaje de error SÍ se generaba (`setError(...)`) pero se renderizaba muy abajo en la página (junto al botón "Guardar configuración"), lejos de la sección del logo — el usuario nunca lo veía sin desplazarse hasta el final. Se agregó un bloque de error duplicado directamente en la sección del logo. Verificado en vivo tras el fix: subida exitosa, vista previa muestra URL real de `firebasestorage.googleapis.com`. | `storage.rules`, `src/components/Configuracion.jsx` |
| 2026-07-03 | ADDVISIT-TRANSACTION-TIMEOUT | **Fix: botón "Guardando..." podía quedarse congelado al registrar una visita nueva (caso aislado, con buena conexión).** `addVisit()` en `useVisits.js` usa `runTransaction()` para generar el número de visita (`V-0001`) atómicamente junto con el documento — a diferencia de los `setDoc`/`updateDoc` simples (ver CLIENTS-DELETE-FIX2 y similares), las transacciones de Firestore no tienen camino rápido por caché local: siempre requieren ida y vuelta real al servidor, así que si la conexión se degrada a mitad de la transacción el `await` puede quedar esperando indefinidamente sin que `setIsSaving(false)` (en `VisitFormUnified.jsx`) llegue a ejecutarse. Como el usuario confirmó buena conexión y que fue un caso aislado/poco frecuente (no reproducible sistemáticamente), se optó por un timeout defensivo en vez de rediseñar la transacción: `Promise.race([transactionPromise, timeoutPromise(15s)])` — si la transacción no completa en 15s, la función retorna `false` y el toast de error existente (`handleAddVisit` en `store.js`) se dispara normalmente, liberando el botón. Si la transacción de fondo llega a completarse después del timeout, no rompe nada (el documento ya se habría creado correctamente) — el único riesgo aceptado es que el usuario podría reintentar y crear una visita duplicada en ese escenario raro, tradeoff ya aceptado en otras partes del proyecto (ver BORRADOR-DEDUP) frente a un botón congelado indefinidamente. **Nota**: inicialmente se investigó por error el flujo de tareas legacy (`addTask`/`saveClient`) tras una descripción imprecisa del bug; esos cambios se revirtieron sin llegar a commit una vez que el usuario aclaró que el problema era al registrar una visita, no una tarea. | `src/hooks/useVisits.js` |
| 2026-07-03 | EMAIL-FECHA-REALIZADA | **Correo de "visita realizada" ahora muestra fecha y hora reales del cierre (no la fecha programada) en el correo del cliente y en el interno (admin/técnico).** Nuevo helper `formatDateTimeEcuador(isoString)` en `functions/index.js` (mismo patrón UTC-5 sin DST que `getCurrentHourEcuador`/`getTodayEcuador`) — convierte un timestamp ISO como `visit.completedAt` a `DD/MM/YYYY · HH:MM` en hora Ecuador. (1) `buildClientVisitEmailHtml`: el campo "Fecha realizada" (evento `realizada`) pasó de mostrar solo `visit.scheduledDate` a mostrar `formatDateTimeEcuador(visit.completedAt)` (con `scheduledDate` como respaldo si `completedAt` faltara). (2) `buildVisitEmailHtml` (plantilla interna, compartida por los 5 tipos de evento): agregada nueva fila "Fecha realizada" — solo aparece cuando `visit.completedAt` existe (naturalmente solo en emails de visita completada), sin afectar creada/modificada/confirmada/cancelada; se agregó junto a "Observaciones", antes de "Obs. cierre". Las filas "Fecha"/"Hora" existentes (fecha programada) se mantienen sin cambios en ambas plantillas. Probado de forma aislada: `completedAt: '2026-07-03T21:34:53.123Z'` → `03/07/2026 · 16:34` en ambas plantillas; confirmado que el campo no aparece cuando la visita no está completada. | `functions/index.js` |
| 2026-07-05 | INITIALIZEAPP-PROJECTID-FIX | **Fix: `firebase deploy --only functions` fallaba con "Cannot determine backend specification. Timeout after 10000" de forma consistente.** Diagnosticado midiendo el tiempo de carga del módulo (`node index.js`): tardaba **~25 segundos** en cargar localmente (vs. instantáneo antes), muy por encima del límite de 10s que usa el CLI de Firebase para su paso de introspección de código (el CLI ejecuta el módulo localmente para enumerar las funciones exportadas antes de subir). Causa: `initializeApp()` sin argumentos intenta auto-detectar el `projectId`/credenciales por red (metadata server de GCP u otros mecanismos), lo cual es rápido dentro de infraestructura GCP real pero puede tardar mucho fuera de ella. Confirmado con `GOOGLE_CLOUD_PROJECT=gestorrecordatorios node index.js` → carga en <2s. Fix permanente: `initializeApp({ projectId: 'gestorrecordatorios' })` — evita la auto-detección por completo, sin efecto en el comportamiento real dentro de Cloud Functions (que ya conoce su propio proyecto). Con el fix, `node index.js` carga en ~1.8s incluso sin la variable de entorno, y el deploy completó exitosamente para todas las funciones salvo el problema aislado y ya conocido de IAM en `generateQrCode` (ver IAM-INVOKER-GAP-RESUELTO), no relacionado con este fix. | `functions/index.js` |
| 2026-07-05 | COBROS-UNIFICADO-CUOTAS | **"Cobros" (BillingReport) ahora lista también las visitas de "Gestión de visitas" (colección plana), no solo el modelo legado — y la función de "cuotas con fecha de vencimiento" (ya existía como "Programar abonos", solo conectada al modelo legado) queda disponible para ambos.** Encontrado durante la investigación: el feature de cuotas (`AbonosModal`/`useAbonos`) ya soportaba fecha de vencimiento + monto + nota por cuota, pero nunca marcaba una cuota como `estado: 'pagado'` automáticamente — quedaba en `'pendiente'` para siempre salvo edición manual en Firestore. Cambios: (1) `visitBilling.js`: nuevo `visitToDisplayTask(visit)` (convierte una visita plana en un objeto "task"-like para reutilizar las columnas existentes de la tabla) y `computeCuotasPagadas(abonos, totalAbonado)` (determina qué cuotas quedan cubiertas por el total realmente abonado, en orden de fecha — cálculo derivado en cada render, no un campo persistido, así nunca queda desincronizado si se agregan/eliminan abonos reales o cuotas). (2) `AbonosModal.jsx`: usa `computeCuotasPagadas` en vez del campo `estado` sin uso (eliminado del payload de `addAbono`). (3) `BillingReport.jsx`: `allRows` ahora combina `flattenVisits(tasks)` (legado) con `flattenNewVisits(visits)` (nuevo, leído del store) marcando cada fila con `isNew`; filtros/KPIs se mantienen sin cambios (ya eran genéricos); `handleBillingUpdate` distingue el modo (flatMode recibe la visita fresca directamente, legado recibe el array completo); `BillingModal` recibe `flatMode={isNew}`; el resumen de cuotas en la tabla pasó de mostrar solo cantidad+total a mostrar "X/Y cuotas · $total" con el conteo de pagadas; botón "Abonos" renombrado a "Cuotas" para mayor claridad. Agregados 4 tests para `computeCuotasPagadas` en `visitBilling.test.js` (orden de fecha, sin abonado, cobertura exacta, no-mutación). | `src/services/visitBilling.js`, `src/components/AbonosModal.jsx`, `src/components/BillingReport.jsx`, `src/test/visitBilling.test.js` |
| 2026-07-05 | COBROS-CUOTAS-DETALLE | **Nueva columna "Cuotas" en la tabla de Cobros muestra el detalle completo de cada cuota (fecha de vencimiento + valor + estado), no solo un resumen de cantidad/total.** El resumen previo ("X/Y cuotas · $total" dentro de "Estado cobro") se quitó y se movió a una columna dedicada — cada cuota se lista en su propia línea con ícono (✅ pagada / 🕓 pendiente), fecha (`formatDateOnly`) y monto, usando `computeCuotasPagadas` (ya ordena por fecha ascendente). | `src/components/BillingReport.jsx` |
| 2026-07-05 | REPORTES-VISITAS-UNIFICADO | **"Reportes" pasó de mostrar tareas legadas a mostrar visitas (ambos modelos unificados), con observación de cierre y valor a pagar cuando la visita ya está Realizada.** La pestaña "Reportes" alcanzable desde el menú renderizaba `Reports.jsx` (una tarea por fila, estado de tarea Pendiente/En Proceso/Completado/Cancelado) — irrelevante ya que no se usan tareas. Existía un componente `VisitsReport.jsx` con casi todo lo pedido (estado, observaciones, obs. de cierre) pero **no estaba conectado a ningún ítem del menú** (tab `visits-report` sin `NavItem`) y solo leía del modelo legado, sin valor a pagar. Cambios: (1) `AppRouter.jsx`: el tab `'reports'` ahora renderiza `VisitsReport` (con `exportConfig={getActiveColumns('visits')}`) en vez de `Reports`; eliminado el tab `visits-report` (absorbido) y el import de `Reports.jsx` (el archivo queda sin usar en el repo, no se borró). (2) `VisitsReport.jsx`: `flattenNewVisits(visits)` une las visitas de "Gestión de visitas" (leídas del store) con `flattenVisits(tasks)` (legado); reemplazado el badge de estado local (solo 3 estados) por el componente compartido `VisitStatusBadge` (soporta Confirmada/Anulada); filtro "Estado visita" y KPIs ampliados a los 5 estados reales, distinguiendo Programada de Confirmada igual que en `AllVisitsManager` (`status==='Programada' && confirmed`); nueva columna "Valor a pagar" (derecha de la tabla), visible solo cuando `visitStatus === 'Realizada'`; "Obs. cierre" bajo Observaciones también solo se muestra si está Realizada. (3) `useExportConfig.js`/`exportService.js`: nueva columna exportable `valorCobrar` ("Valor a pagar") para el reporte de visitas, con el mismo criterio de solo-si-Realizada. | `src/components/AppRouter.jsx`, `src/components/VisitsReport.jsx`, `src/hooks/useExportConfig.js`, `src/services/exportService.js` |
| 2026-07-05 | REPORTE-VISITAS-FECHA-CIERRE | **Reporte de visitas: nuevas columnas "Fecha realizada" (fecha y hora reales del cierre, no la programada) y "Obs. de cierre" (la observación registrada al presionar "Realizada"), ambas visibles solo si el estado es Realizada — y activadas por defecto en la exportación.** Antes esta información solo aparecía como notas secundarias pequeñas ("✅ Real: ...") dentro de las columnas Estado/Observaciones, fácil de pasar por alto; ahora tienen columna propia igual que "Valor a pagar". Eliminadas las notas inline duplicadas. `useExportConfig.js`: `completedAt` (renombrado a "Fecha realizada"), `closingObservations` y `valorCobrar` pasan de `enabled: false` a `enabled: true` por defecto, ya que el usuario pidió explícitamente exportar esta información. | `src/components/VisitsReport.jsx`, `src/hooks/useExportConfig.js` |
| 2026-07-06 | VISITAS-RECURRENTES | **Nueva funcionalidad: crear una serie completa de visitas periódicas en un solo envío del formulario, para clientes que necesitan visitas durante todo el año.** Dos modos: "Mensual" (mismo día del mes hasta una fecha fin) y "Fechas manuales" (agregar fechas sueltas adicionales). Diseño clave: en vez de un loop de N transacciones (una por `addVisit`), se agregó `addVisitSeries(baseData, dates)` en `useVisits.js` que abre **una sola transacción** de Firestore — lee el contador de `visitNumber` una vez, asigna todos los números secuenciales en memoria y escribe todos los documentos + el contador juntos (o se crea toda la serie, o ninguna; sin series a medias si algo falla a mitad de camino). Cada visita generada comparte `recurrenceGroupId` (UUID) y lleva `recurrenceIndex`/`recurrenceTotal`. Tope de 36 visitas por serie (3 años de mensualidades), validado en el helper de generación de fechas, en la UI (bloquea el submit con aviso) y en un re-chequeo defensivo antes de enviar. La UI de recurrencia solo aparece al crear (no al editar) y el flujo de una sola visita sin activar el toggle queda exactamente igual que antes — cero cambios de comportamiento en el path existente. Cambios: (1) `dates.js`: nuevos helpers puros `addMonthsClamped`, `generateMonthlySeries`, `dedupeSortDates`, `MAX_RECURRENCE_VISITS` (36), con 13 tests nuevos en `dates.test.js`. (2) `useVisits.js`: `addVisitSeries`, registrada junto a `addVisit` en el store y en el return del hook. (3) `store.js`: `handleAddVisitSeries` con toasts de éxito ("Se crearon N visitas correctamente") y error. (4) `VisitFormUnified.jsx`: sección "Repetir esta visita" (toggle + pestañas Mensual/Fechas manuales) con vista previa en vivo del número de visitas a crear; `handleSubmit` rama a `handleAddVisitSeries` solo cuando la recurrencia está activa y resuelve a más de 1 fecha. (5) `AllVisitsManager.jsx`: badge "🔁 Serie X/Y" junto al de "Soporte" existente, cuando `recurrenceTotal > 1`. Sin cambios en `firestore.rules` (la regla de creación de visitas ya acepta campos extra sin schema estricto, igual que `parentVisitId` hoy). | `src/utils/dates.js`, `src/hooks/useVisits.js`, `src/lib/store.js`, `src/components/VisitFormUnified.jsx`, `src/components/AllVisitsManager.jsx`, `src/test/dates.test.js` |
| 2026-07-06 | COBROS-EXPORT-CUOTAS-Y-LOGIN-OJO | **Dos mejoras: (1) el reporte exportado de Cobros por visitas ahora incluye el detalle de cuotas; (2) el login tiene su propio botón de mostrar/ocultar contraseña, visible en cualquier navegador/dispositivo.** (1) La tabla en pantalla ya mostraba el detalle de cuotas (`computeCuotasPagadas`), pero nunca se adjuntaba a las filas que recibe `exportExcel`/`exportCSV` — por eso no salía en el archivo. `BillingReport.jsx`: `allRows` ahora calcula `cuotas` por fila (dependiendo también de `abonosByVisit`) y la tabla en pantalla reutiliza ese mismo valor en vez de recalcularlo aparte (elimina duplicación). `exportService.js`: nuevo caso `cuotas` en `billingValue()`, formateado como "DD/MM/AAAA: $XX.XX (Pagada/Pendiente)" por cuota, separadas por " \| ". `useExportConfig.js`: nueva columna `cuotas` en `BILLING_COLUMNS`, activada por defecto. (2) `Login.jsx`: el campo de contraseña era un `<input type="password">` simple sin ningún control propio — el "ojito" que se ve en desktop es el nativo del navegador, ausente en Safari iOS e inconsistente en Chrome Android. Se agregó un botón propio (íconos `Eye`/`EyeOff` de lucide-react) que alterna el `type` del input entre `password`/`text`, funcionando igual en todos los navegadores. | `src/components/BillingReport.jsx`, `src/services/exportService.js`, `src/hooks/useExportConfig.js`, `src/components/Login.jsx` |
| 2026-07-06 | VISITAS-RECURRENTES-CANTIDAD-SEMESTRAL | **Ajustes al formulario de visitas periódicas: cantidad de visitas en vez de fecha fin, período semestral, días laborables, y orden cronológico en "Gestión de visitas".** (1) Se quitó la opción "fecha fin" del modo periódico — ahora se define solo por **cantidad de visitas** (ej. 12), más práctico según el usuario. (2) Se agregó el período **Semestral** (cada 6 meses) junto a Mensual. (3) Nuevo selector **"Días de visita: Lunes a viernes \| Lunes a domingo"** — con "Lunes a viernes", cualquier fecha generada que caiga en fin de semana se corre al día hábil más cercano (sábado → viernes, domingo → lunes). `dates.js`: `generateMonthlySeries` (fecha-fin) reemplazada por `generatePeriodicSeries(startDate, {stepMonths, count, businessDaysOnly, max})` (soporta cualquier paso en meses y el ajuste de fin de semana) + nuevo helper `nearestBusinessDay(dateStr)`; tests actualizados. `VisitFormUnified.jsx`: estado `recurrence` ahora tiene `period` ('mensual'\|'semestral'), `count` y `businessDaysOnly` en vez de `endDate`; UI con selector de período y de días laborables dentro del modo "Periódica". (4) "Gestión de visitas" (`AllVisitsManager.jsx`) no tenía ningún orden por fecha programada — venía en el orden de la consulta a Firestore (`orderBy('createdAt','desc')`, fecha de creación del registro, no de la visita), lo que hacía que una serie recién creada apareciera en orden no cronológico. Se agregó `.sort()` a `filtered` por `scheduledDate`+`scheduledTime` descendente (más reciente primero), mismo criterio que ya usan los reportes. **Pendiente, agregado al backlog (P3):** rediseño del envío de notificaciones de "visita creada" para series (hoy dispara 1 correo por cada visita de la serie) — ver sección de mejoras post-lanzamiento. | `src/utils/dates.js`, `src/components/VisitFormUnified.jsx`, `src/components/AllVisitsManager.jsx`, `src/test/dates.test.js`, `AI_TRACKER.md` |
| 2026-07-06 | BORRADORES-VISITA-PERIODICA-INFO | **Los borradores creados desde el panel del técnico ahora pueden marcarse como "visita periódica" (informativo), para que el administrador sepa cómo configurar la serie al convertirlos.** Nuevo checkbox "Es una visita periódica" en `BorradorSheet.jsx` (formulario del técnico) que revela un selector de periodicidad (Quincenal/Mensual/Trimestral/Semestral — incluye opciones que la recurrencia real de `VisitFormUnified.jsx` aún no soporta, ya que aquí es solo texto descriptivo) y un campo "Cantidad de visitas"; no genera ninguna visita ni serie por sí solo, solo se guarda como metadata (`isPeriodica`, `periodicidad`, `periodicidadCantidad`) en el documento del borrador (sin cambios en `firestore.rules`, la regla de creación no restringe campos extra). Esta info se muestra en 3 lugares: la tarjeta del técnico (`BorradorCard`), la tarjeta compacta y el detalle del admin (`BorradoresAdmin.jsx`), y — el más importante — un banner destacado justo antes del botón "Convertir en visita" recordando la periodicidad y cantidad, para que no se le pase por alto al admin en el momento exacto en que debe usar la función "Repetir esta visita". `PERIODICIDAD_OPTIONS` se exporta desde `BorradorSheet.jsx` y se reutiliza en `BorradoresAdmin.jsx` para mantener las mismas etiquetas en ambos lados. | `src/components/BorradorSheet.jsx`, `src/components/BorradoresAdmin.jsx` |
| 2026-07-06 | IMPORT-CLIENTES-MULTIUBICACION | **La importación masiva de clientes ahora soporta el formato real de la empresa: 2 hojas de Excel y clientes con varias ubicaciones (mismo RUC repetido en varias filas).** Se analizó `FORMATO_IMPORTACION_CLIENTES.xlsx` (archivo real, ~394 filas): 68% de las filas usan un RUC placeholder tipo `RUC00015` (clientes sin cédula/RUC real), teléfono vacío en 39%, email vacío en 75%, columna `EQUIPO` vacía en el 100% (el tipo de equipo real vive en `OBSERVACION`) — la validación anterior (formato estricto de RUC 10/13 dígitos, teléfono obligatorio, RUC repetido = error bloqueante, Extranjero obligatorio) habría rechazado la gran mayoría del archivo. Cambios: (1) `importValidation.js`: `normalizeRow` agrega `serviceType` (usa `EQUIPO`, con `OBSERVACION` como respaldo); `groupRowsByClient` (nueva) agrupa filas normalizadas por RUC — cada grupo es un cliente con `rows` = sus ubicaciones; `validateGroup` (nueva, reemplaza `validateRow`) solo bloquea RUC o nombre vacíos, ya no exige formato de cédula ni campos opcionales, ni trata el RUC repetido como error — un cliente que ya existe en el sistema se marca `existing` (se omite, no se toca). (2) `useClients.js`: `importClients(groups, onProgress)` ahora recibe grupos en vez de filas planas, construye `contacts[]` completo por cliente (una entrada por ubicación, con `installations: [{serviceType}]` cuando aplica) y **omite por completo** los clientes ya existentes (decisión explícita del usuario: no tocar sus datos); devuelve `{ok, skipped, errors}`. (3) `ClientImportModal.jsx`: `parseFile` lee **todas las hojas** del libro (`wb.SheetNames.flatMap`, compatible con archivos de una sola hoja); plantilla descargable actualizada a `RUC, NOMBRE, UBICACION, CIUDAD, EMAIL, DIRECCION, TELEFONO, EQUIPO, OBSERVACION` con ejemplo de RUC repetido; vista previa agrupada con insignia "N/M" por ubicación y estado "Nuevo cliente"/"Ubicación adicional"/"Ya existe — se omite"; KPIs pasan a Filas/Clientes/Nuevos/Ya existen/Con errores; resultado final muestra el conteo de `skipped`. Validado simulando el pipeline completo (`normalizeRow`→`groupRowsByClient`→`validateGroup`) contra el archivo real: 394 filas → 376 clientes agrupados, **0 errores**, 13 clientes con múltiples ubicaciones, 394 ubicaciones totales sin pérdida de datos. Tests de `importValidation.test.js` reescritos para el nuevo modelo agrupado. | `src/utils/importValidation.js`, `src/hooks/useClients.js`, `src/components/ClientImportModal.jsx`, `src/test/importValidation.test.js` |
| 2026-07-06 | TECHPORTAL-FECHA-LISTA | **La lista de visitas del calendario en el panel del técnico ahora muestra la fecha programada de cada visita, no solo la hora.** `VisitCard` (usada en las secciones "Atrasadas/Hoy/Próximas/Realizadas" de la vista de lista) mostraba `scheduledTime` pero nunca `scheduledDate` — un problema real en "Próximas" y "Realizadas", que agrupan visitas de varios días distintos sin indicar cuál es cuál. Se agregó `formatDateOnly(visit.scheduledDate)` junto al ícono `Calendar`, antes de la hora, reutilizando imports ya existentes en el archivo. | `src/components/TechPortal.jsx` |
| 2026-07-06 | RECURRENCIA-PERIODOS-CUATRIMESTRAL-ANUAL | **Los períodos de recurrencia se simplifican a Cuatrimestral, Semestral y Anual — se elimina Mensual (visitas) y Quincenal/Mensual/Trimestral (borradores).** `VisitFormUnified.jsx`: "Repetir esta visita → Periódica" pasa de Mensual/Semestral a Cuatrimestral(4 meses)/Semestral(6)/Anual(12), con nueva constante `PERIOD_STEP_MONTHS` centralizando el paso en meses de cada período (reemplaza el ternario inline `period === 'semestral' ? 6 : 1`). `BorradorSheet.jsx`: `PERIODICIDAD_OPTIONS` (informativo, usado también por `BorradoresAdmin.jsx`) pasa de Quincenal/Mensual/Trimestral/Semestral a Cuatrimestral/Semestral/Anual; default de ambos formularios cambia a `cuatrimestral`. Borradores ya guardados con un valor de periodicidad viejo (ej. "mensual") siguen mostrándose sin romper — el `.find()` sobre `PERIODICIDAD_OPTIONS` cae al valor crudo si no encuentra coincidencia. | `src/components/VisitFormUnified.jsx`, `src/components/BorradorSheet.jsx` |
| 2026-07-06 | TECHPORTAL-REPROGRAMAR-DESHACER-MAPA | **Se quita el menú "Reportes"; en el panel del técnico se agregan "Reprogramar visita", "Deshacer confirmación" y "Agregar mapa".** Encontrado durante la exploración: el modelo legado (`tasks[].visits[]`) no tiene ninguna función para editar una visita embebida — confirma que ya está congelado; las 3 acciones nuevas se implementan solo para el modelo plano (`isNewVisit === true`), igual que el resto de funcionalidad nueva reciente. También se confirmó que `status` nunca vale literalmente `'Confirmada'` en escrituras reales — la confirmación es el booleano `confirmed`, con `status` quedando en `'Programada'`. Cambios: (1) `AppRouter.jsx`: se quita el `NavItem` y el bloque de render de "Reportes" (se deja `VisitsReport.jsx` sin usar en el repo, sin borrarlo). (2) `useVisits.js`: `unconfirmVisit(visitId)` (quita `confirmed`/`confirmedAt`/`confirmedBy`, agrega una entrada a `history` vía `arrayUnion`) y `rescheduleVisit(visitId, {previousDate, previousTime, newDate, newTime})` (cambia fecha/hora, quita la confirmación anterior ya que era para el horario viejo, agrega su propia entrada a `history`); ambas también llaman `logAudit`. (3) `store.js`: defaults de las 2 funciones nuevas. (4) `TechPortal.jsx`: dos modales nuevos (`RescheduleModal`, `AddMapsLinkModal`) con estado elevado al componente principal (un solo modal a la vez, mismo patrón que `historialClient`); `VisitCard` y `DayVisitCard` ganan botones "Reprogramar" y "Deshacer confirmación" (con confirmación inline de 2 pasos) cuando la visita es del modelo nuevo y está `Programada`, más "Agregar mapa" cuando el cliente no tiene `mapsLink` guardado — al guardarlo, se parchea el `contacts[]` del cliente vía `updateClient` (el link queda disponible para todas las visitas futuras de esa ubicación, no solo la actual). Se muestra inline la última reprogramación (fecha anterior) cuando existe. Sin cambios en `firestore.rules` (la regla de `visits` ya permite cualquier campo nuevo). | `src/components/AppRouter.jsx`, `src/hooks/useVisits.js`, `src/lib/store.js`, `src/components/TechPortal.jsx` |
| 2026-07-06 | TECHPORTAL-EDITAR-MAPA | **En el panel del técnico, cuando la visita ya tiene un mapa guardado, se agrega la opción "Editar" junto a "Abrir mapa"; y el modal de agregar/editar mapa gana botones "Abrir Maps" (geolocalización) y "Pegar" (portapapeles), igual que en Editar cliente.** `AddMapsLinkModal` gana un prop `currentUrl` — si viene con valor, el modal arranca en modo edición (título "Editar mapa", campo prellenado) en vez de "Agregar mapa"; se agregan los mismos 3 botones que ya existían en `ClientsManager.jsx` para este campo (Abrir Maps con `navigator.geolocation`, Pegar con `navigator.clipboard.readText()`, y Ver el link si hay uno cargado) — mismo patrón, sin inventar uno nuevo. `VisitCard`/`DayVisitCard`: cuando `mapsLink` existe, se muestran "Abrir mapa" + "Editar" lado a lado (antes solo se mostraba "Agregar mapa" cuando faltaba, sin forma de corregirlo si ya existía uno). | `src/components/TechPortal.jsx` |

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