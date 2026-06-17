# CLAUDE.md — Instrucciones permanentes para Claude Code
## Proyecto: Acontplus Gestión Recordatorios

Este archivo es leído automáticamente por Claude Code al inicio de cada sesión.
Contiene las reglas de trabajo que DEBES seguir en este repositorio sin excepción.

---

## Protocolo de trabajo obligatorio

### Antes de tocar cualquier archivo de código:
1. Lee `AI_TRACKER.md` en la raíz del proyecto.
2. Identifica la tarea pendiente de mayor prioridad (Fase 1 → Fase 2 → Fase 3).
3. Confirma con el usuario qué tarea vas a ejecutar antes de empezar.

### Durante la ejecución:
- Resuelve **una sola tarea** por sesión. No agrupes cambios de múltiples tareas.
- Aplica los principios SOLID y DRY. No introduzcas nueva deuda técnica.
- Nunca elimines manejo de errores existente sin reemplazarlo por algo mejor.
- No expongas datos sensibles (credenciales, API keys, stack traces) en producción.

### Al completar una tarea exitosamente:
1. Abre `AI_TRACKER.md`.
2. Marca la casilla de la tarea con `[x]`.
3. Agrega una entrada en la sección `## Registro de Cambios` al final del archivo con:
   - Fecha (formato YYYY-MM-DD)
   - ID de tarea (ej: C1, M2, L3)
   - Descripción breve de qué se cambió y en qué archivos

---

## Stack del proyecto

- **Frontend:** React 19, Vite 8, TailwindCSS 4, Lucide-React
- **Backend:** Firebase 12 — Auth (email/password), Firestore, Hosting
- **Exportación:** xlsx (local), CSV propio, HTML-to-PDF (ventana nueva)
- **Sin tests:** Cobertura 0% — no rompas código sin poder verificarlo manualmente

## Estructura de directorios clave

```
src/
  components/   — Componentes React (UI pura)
  hooks/        — Custom hooks (lógica + Firestore)
  services/     — Lógica de negocio pura (sin React)
  lib/          — Configuración Firebase, stores globales
  utils/        — (pendiente crear) Funciones utilitarias compartidas
```

## Convenciones establecidas

- El path base de Firestore es: `artifacts/{appId}/public/data/{coleccion}`
  donde `appId` viene de `src/lib/firebase.js`
- Los estados de tareas válidos son: `Pendiente`, `En Proceso`, `Completado`, `Cancelado`
- Los estados de visitas válidos son: `Programada`, `Realizada`, `Cancelada`, `Anulada`
- Las urgencias válidas son: `Alta`, `Media`, `Baja`
- Fechas se manejan en formato `YYYY-MM-DD` (string local, no UTC) para evitar desfase Ecuador (UTC-5)
- El Toast para feedback al usuario ya existe — úsalo siempre para errores de Firestore

## Restricciones de seguridad

- NUNCA hacer commit del archivo `.env` (ya está en `.gitignore`)
- NUNCA insertar datos de usuario directamente en HTML sin escapar (XSS)
- NUNCA cargar librerías desde CDN externos en runtime (supply chain risk)
- NUNCA mostrar stack traces completos al usuario en producción

## Fuente de verdad para el roadmap

Todo el trabajo planificado está en **`AI_TRACKER.md`**. Ese archivo es la memoria
del proyecto. Mantenlo actualizado — es más importante que los comentarios en el código.
