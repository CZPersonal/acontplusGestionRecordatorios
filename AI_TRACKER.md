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
- [ ] **[M4 - Escalabilidad BD]:** Migrar visits y payments a subcollecciones Firestore independientes: water_filter_tasks/{taskId}/visits/{visitId} y .../visits/{visitId}/payments/{payId}.
- [ ] **[M5 - Estado Global]:** Introducir Zustand o Jotai para estado compartido (tasks, clients). Eliminar prop drilling desde App.jsx.
- [ ] **[M6 - Seguridad / Roles]:** Agregar campo companyId o tenantId a todos los documentos y actualizar Firestore rules: allow read: if request.auth != null && resource.data.companyId == request.auth.token.companyId.
- [ ] **[M7 - Validaciones]:** Agregar validación de formato en TaskForm: teléfono (regex Ecuador/Colombia), email, longitud de serviceOrder. Usar una librería ligera como zod.
- [ ] **[M8 - Testing]:** Configurar Vitest + React Testing Library. Escribir tests unitarios para: usePagination, calcPaymentSummary, validateRow (importación), localDateStr.

### 🔵 Fase 3: Mejoras Deseables (Baja Prioridad - Largo Plazo / 3–6 meses)
- [ ] **[L1 - Backend / Cloud]:** Implementar Firebase Cloud Functions para: (a) envío de recordatorios por email (Resend/SendGrid) en fechas de visita, (b) trigger de notificación push con FCM al crear visita urgente.
- [ ] **[L2 - Escalabilidad]:** Paginación server-side en Firestore con startAfter cursor para water_filter_tasks. La UI ya tiene Pagination.jsx, se necesita adaptar los hooks.
- [ ] **[L3 - Observabilidad]:** Integrar Sentry (free tier disponible) para captura automática de errores de JS, performance monitoring y alertas.
- [ ] **[L4 - Seguridad]:** Activar Firebase App Check (reCAPTCHA Enterprise o DeviceCheck) para asegurar que solo la app legítima accede a Firestore, incluso con la API key expuesta.
- [ ] **[L5 - Architecture]:** Reemplazar el singleton configStore.js con un Context/Provider de React o Zustand slice.
- [ ] **[L6 - BD / Auditoría]:** Agregar colección audit_log en Firestore para registrar quién creó/modificó/eliminó cada tarea, con timestamp e IP.
- [ ] **[L7 - CI/CD]:** Configurar GitHub Actions para: lint + build en cada PR, deploy automático a Firebase Hosting en merge a main.
- [ ] **[L8 - Multi-tenant]:** Diseñar modelo de datos con tenants/{tenantId}/tasks/... y sistema de invitación de usuarios por organización.
- [ ] **[L9 - Monitoreo costos]:** Configurar alertas de presupuesto en Firebase y usar getDocsFromCache antes de llamadas de red en vistas de solo lectura.

---

## 📝 Registro de Cambios

| Fecha | Tarea | Descripción | Archivos modificados |
|---|---|---|---|
| 2026-06-16 | C1 | Agregada función `escapeHtml()` en `exportService.js`. Aplicada en `<th>` y `<td>` de `exportExcel` para prevenir XSS cuando los datos del usuario contienen caracteres HTML especiales (`<`, `>`, `&`, `"`, `'`). | `src/services/exportService.js` |
| 2026-06-16 | C2 | Eliminado import dinámico de CDN `cdn.sheetjs.com`. Instalado `xlsx@0.18.5` como dependencia local. Import estático en cabecera del archivo. `parseFile` simplificado (ya no necesita `async`). | `src/components/ClientImportModal.jsx`, `package.json` |
| 2026-06-16 | M3 | Creado `src/components/AppRouter.jsx` con todo el JSX de navegación, routing de vistas, toasts y modal de exportación. `App.jsx` reducido de 315 → 109 líneas (65%): solo contiene hooks, estado UI, handlers y renderiza `<AppRouter>`. Añadido `updateTaskVisits(taskId, updatedVisits, userEmail)` a `useTasks` consolidando la lógica de actualización de visitas. | `src/App.jsx`, `src/components/AppRouter.jsx` *(nuevo)*, `src/hooks/useTasks.js` |
| 2026-06-16 | M2 | Añadida `getCollectionRef(name)` a `src/lib/firebase.js` como único punto de construcción del path `artifacts/{appId}/public/data/{name}`. Reemplazadas 27 ocurrencias del path literal en 9 archivos: `useTasks`, `useClients`, `useVisits`, `useConfiguracion`, `useExportConfig`, `useServiceTypes`, `useTecnicos`, `useTiposVisita`, `visitBilling`. Eliminados `appId` e importaciones de `collection` de todos los hooks consumidores. `useClients` conserva `db` porque usa `writeBatch(db)`. | `src/lib/firebase.js` + 9 hooks/servicios |
| 2026-06-16 | M1 | Creados `src/utils/dates.js` (`localDateStr`, `formatDateOnly`) y `src/utils/format.js` (`fmtMoney` con locale ES-EC, `fmtMoneyRaw` con `.toFixed(2)` para exports). Eliminadas 18 definiciones locales duplicadas en 12 archivos: `Dashboard`, `Reports`, `BillingReport`, `BillingModal`, `CalendarView`, `VisitsReport`, `TaskCard`, `TaskPDF` (2 instancias), `VisitsModal`, `Toast`, `exportService`, `useNotifications` (renombrado `getLocalDate` → `localDateStr`). | `src/utils/dates.js` *(nuevo)*, `src/utils/format.js` *(nuevo)*, 12 archivos consumidores |
| 2026-06-16 | C6 | `ErrorBoundary.jsx`: reemplazado título "Error detectado" por mensaje amigable genérico. Stack trace (`error.toString()`) ahora solo visible cuando `import.meta.env.DEV` es verdadero (desarrollo); en producción el build de Vite elimina ese bloque completamente. | `src/components/ErrorBoundary.jsx` |
| 2026-06-16 | C5 | Añadido `addToast` a `useNotifications`. Estilo `error` (rojo) añadido a `Toast.jsx`. `deleteTask` y `markAsCompleted` ahora retornan `true`/`false`. En `App.jsx`: reemplazado `alert()` por toast, creados `handleDelete` y `handleComplete` con feedback de error, y `handleVisitsUpdate` también muestra error. En `ClientImportModal`: reemplazado `alert()` por error inline con `parseError` state. Eliminados todos los `alert()` del proyecto. | `useNotifications.js`, `Toast.jsx`, `useTasks.js`, `App.jsx`, `ClientImportModal.jsx` |
| 2026-06-16 | C4 | Creado `.env.example` con las 7 variables requeridas y valores descriptivos. Corregido `.gitignore`: el patrón `.env.*` excluía también el ejemplo; añadida excepción `!.env.example` para que sea commiteado. | `.env.example`, `.gitignore` |
| 2026-06-16 | C3 | Añadida `escapeHtml()` al inicio de `TaskPDF.jsx`. Aplicada en las 16 interpolaciones de datos de usuario dentro del template HTML de `generateTaskPDF`: `clientName`, `serviceOrder`, `status`, `urgency`, `serviceType`, `identification`, `clientPhone`, `clientAddress`, `type`, `createdBy`, `observations`, `completedBy`, `completionObservations`. `shareViaWhatsApp` no requería cambios (genera texto plano con `encodeURIComponent`). | `src/components/TaskPDF.jsx` |

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