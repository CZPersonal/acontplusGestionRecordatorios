# 🧪 Pruebas del sistema — Acontplus Gestión Recordatorios

Documento de seguimiento de pruebas manuales, formulario por formulario. El usuario
ejecuta cada paso en el navegador (con su sesión ya iniciada) y reporta el resultado;
Claude Code actualiza el estado de cada prueba en este archivo.

**Cómo leer el estado de cada prueba:**
- `⬜ Pendiente` — todavía no se ha probado.
- `✅ OK` — funcionó como se espera.
- `❌ Falla` — no funcionó; se agrega una nota con el detalle debajo del paso.
- `⏭️ Omitida` — se decidió no probar (se indica por qué).

**Progreso general:** 0 / (total de pasos) probados.

---

## 1. Autenticación (`Login.jsx`)

1. ✅ Iniciar sesión con email/contraseña correctos → entra al sistema.
2. ✅ Iniciar sesión con contraseña incorrecta → muestra "Email o contraseña incorrectos."
3. ✅ Click en el ícono de ojo del campo contraseña → alterna mostrar/ocultar el texto.
4. ✅ Click en "¿Olvidaste tu contraseña?" → cambia a la pantalla de recuperación.
5. ❌ Recuperar contraseña con un email válido → muestra "Email enviado" y llega el correo.
   - **Falla:** el correo de recuperación no llega a la bandeja del email con el que se inicia sesión.
6. ❌ Recuperar contraseña con un email que no existe → muestra error.
   - **Falla:** no valida — envía "Email enviado" igual aunque el correo no esté registrado en la plataforma.
7. ✅ Desconectar internet y tratar de iniciar sesión → muestra aviso "Sin conexión".
8. ⏭️ Primera vez con una cuenta nueva (sin tenant) → aparece "Configura tu empresa" (Crear empresa / Unirme).
   - **Omitida:** no se puede probar porque ya existen tenants con datos reales; requeriría una cuenta nueva.

---

## 2. Panel (Dashboard)

⏸️ **En standby** — el panel muestra "tareas activas" (modelo legado `water_filter_tasks`),
que ya no se usa; el negocio trabaja con "visitas" (`Gestión de visitas`). Se deja pendiente
de rediseño antes de seguir probando esta pantalla — mismo patrón encontrado antes en
`Reports.jsx` (ver REPORTES-VISITAS-UNIFICADO en `AI_TRACKER.md`).

1. ⏸️ Verificar que las tarjetas/resúmenes del panel cargan datos reales (no vacíos ni errores en consola).
2. ⏸️ Los accesos rápidos (si los hay) navegan a la sección correcta.

---

## 3. Clientes (`ClientsManager.jsx`)

1. ⬜ Crear un cliente nuevo con una sola ubicación (nombre, cédula/RUC, ubicación, ciudad, dirección, teléfono, email).
2. ⬜ Agregar una segunda ubicación (contacto) al mismo cliente desde "Agregar" → aparece como tarjeta colapsable.
3. ⬜ Dentro de una ubicación, agregar una instalación (equipo/servicio) → aparece en la lista de instalaciones de esa ubicación.
4. ⬜ Eliminar una ubicación cuando el cliente tiene más de una → se permite.
5. ⬜ Intentar eliminar la única ubicación restante → el botón está deshabilitado con explicación.
6. ⬜ Editar un cliente existente y guardar cambios → se reflejan en la lista.
7. ⬜ Buscar un cliente por nombre/cédula en el buscador → filtra correctamente.
8. ⬜ Desactivar un cliente → deja de aparecer en las listas activas (o se marca como inactivo).
9. ⬜ Eliminar un cliente (rol admin) → pide confirmación y lo elimina.
10. ⬜ Intentar eliminar un cliente con un usuario NO admin → el botón no está disponible.
11. ⬜ Importar clientes desde Excel: descargar la plantilla nueva (`RUC, NOMBRE, UBICACION, CIUDAD, EMAIL, DIRECCION, TELEFONO, EQUIPO, OBSERVACION`).
12. ⬜ Subir un Excel de prueba con **un mismo RUC en 2 filas** → se agrupan como un solo cliente con 2 ubicaciones en la vista previa (insignia "1/2", "2/2").
13. ⬜ Subir un Excel con un RUC que ya existe en el sistema → se marca "Ya existe — se omite" y no se modifica el cliente real.
14. ⬜ Confirmar la importación de unos pocos clientes de prueba → se crean correctamente con sus ubicaciones e instalaciones.

---

## 4. Calendario (`CalendarView.jsx`)

1. ⬜ El calendario muestra las visitas programadas en el día correspondiente.
2. ⬜ Cambiar de mes (adelante/atrás) → carga las visitas del mes correcto.
3. ⬜ Click en un día con visitas → muestra el detalle de esas visitas.
4. ⬜ Click en un día vacío → permite crear una visita nueva con esa fecha precargada (si aplica).

---

## 5. Gestión de visitas (`AllVisitsManager.jsx` + `VisitFormUnified.jsx`)

### 5.1 Crear visita simple
1. ⬜ Abrir "Nueva visita", seleccionar cliente, ubicación, técnico, fecha, hora, tipo, urgencia → guardar.
2. ⬜ La visita nueva aparece en "Gestión de visitas" con estado "Programada".
3. ⬜ El botón "Realizada" está deshabilitado hasta que la visita esté "Confirmada".

### 5.2 Confirmar / completar
4. ⬜ Confirmar la visita (desde admin o portal técnico) → cambia a estado "Confirmada" y se habilita "Realizada".
5. ⬜ Marcar como "Realizada", colocando observación de cierre y valor a cobrar → el valor se refleja luego en Cobros.
6. ⬜ Cancelar una visita programada → cambia a estado "Cancelada".
7. ⬜ Anular una visita → cambia a estado "Anulada".
8. ⬜ Revertir una visita realizada/cancelada → vuelve a "Programada".

### 5.3 Visitas periódicas (recurrencia)
9. ⬜ Activar "Repetir esta visita" → modo "Periódica", elegir **Cuatrimestral**, cantidad 3 → vista previa dice "Se crearán 3 visitas, una cada 4 meses".
10. ⬜ Guardar → se crean las 3 visitas con números de visita consecutivos y la insignia "🔁 Serie 1/3", "2/3", "3/3" en Gestión de visitas.
11. ⬜ Repetir con período **Semestral** y luego **Anual** → los intervalos entre fechas son de 6 y 12 meses respectivamente.
12. ⬜ Activar "Días de visita: Lunes a viernes" con una fecha base que caiga cerca de un fin de semana → las fechas generadas que caían en sábado/domingo se corrieron al día hábil más cercano.
13. ⬜ Modo "Fechas manuales": agregar 2 fechas sueltas → se crean 3 visitas en total (la base + las 2 agregadas).
14. ⬜ Intentar poner una cantidad mayor a 36 → bloquea el envío con el mensaje de tope.
15. ⬜ Editar una visita ya creada (`isEdit`) → la sección de recurrencia NO aparece (correcto, solo debe verse al crear).

### 5.4 Filtros y orden
16. ⬜ Filtrar por estado "Confirmada" (no solo "Programada") → distingue correctamente de "Programada" sin confirmar.
17. ⬜ Filtrar por técnico, urgencia, establecimiento y rango de fechas → cada filtro reduce la lista correctamente.
18. ⬜ La lista de visitas está ordenada por fecha y hora de la visita, **descendente** (más reciente primero) — no por fecha de creación del registro.

### 5.5 Visita de soporte
19. ⬜ Generar una "visita de soporte" desde una visita existente → se crea una nueva visita con el badge "🔧 Soporte" y los datos del cliente precargados.

---

## 6. Reportes — ❌ ELIMINADO

El menú "Reportes" fue quitado del sidebar (`AppRouter.jsx`) a pedido del usuario. El
componente `VisitsReport.jsx` queda sin usar en el repo, sin borrar. Este módulo ya no
aplica para las pruebas.

---

## 7. Cobros (`BillingReport.jsx`, `AbonosModal.jsx`, `BillingModal.jsx`)

1. ⬜ La lista de cobros combina visitas del modelo nuevo y el legado (si aplica) sin duplicados.
2. ⬜ Registrar el valor a cobrar de una visita (botón "Cobrar") → se refleja el total en la tabla.
3. ⬜ Registrar un abono/pago parcial → el saldo pendiente se recalcula correctamente.
4. ⬜ Programar cuotas con fecha de vencimiento (botón "Cuotas") → aparecen listadas con fecha y valor.
5. ⬜ Marcar cuotas como pagadas automáticamente cuando el total abonado las cubre (sin marcarlas a mano).
6. ⬜ La columna "Cuotas" en la tabla muestra el detalle completo (fecha + valor + ✅/🕓) de cada cuota.
7. ⬜ Exportar el reporte de Cobros → el archivo incluye la columna "Cuotas" con el formato "DD/MM/AAAA: $X (Pagada/Pendiente)".
8. ⬜ Eliminar un abono/pago registrado → el saldo se recalcula.
9. ⬜ Filtrar por estado de cobro (Pendiente, Abono parcial, Pagado, Sin valor) → cada filtro funciona.

---

## 8. Borradores (`BorradorSheet.jsx` panel técnico, `BorradoresAdmin.jsx` panel admin)

### 8.1 Panel del técnico
1. ⬜ Crear un borrador nuevo con datos de cliente y visita (motivo, fecha, hora).
2. ⬜ Marcar "Es una visita periódica", elegir período (Cuatrimestral/Semestral/Anual) y cantidad → se guarda y se ve en la tarjeta del técnico con la insignia "🔁 Periódica: X × N".
3. ⬜ Editar un borrador pendiente → los cambios se guardan.
4. ⬜ Anular un borrador → cambia a estado "Anulado".
5. ⬜ Crear un borrador sin conexión a internet → se guarda localmente ("Por sincronizar") y se sube solo al reconectar.

### 8.2 Panel del administrador
6. ⬜ Ver el detalle de un borrador con periodicidad marcada → aparece el dato de periodicidad y el banner recordatorio antes de "Convertir en visita".
7. ⬜ Convertir un borrador en visita real → se crea la visita y el borrador pasa a "Convertido".
8. ⬜ Al convertir uno marcado como periódico, configurar manualmente "Repetir esta visita" con los mismos datos (período/cantidad) del borrador → funciona como una creación normal de serie.
9. ⬜ Eliminar un borrador permanentemente → pide confirmación y lo borra.
10. ⬜ Buscar/filtrar borradores por estado (Pendiente/Convertido/Anulado) y por texto.

---

## 9. Configuración (`Configuracion.jsx`)

### 9.1 Entidad
1. ⬜ Editar el nombre, slogan, WhatsApp de la empresa → se guarda y se refleja en los correos enviados.
2. ⬜ Subir un logo nuevo → se sube a Firebase Storage y se ve la vista previa.

### 9.2 Catálogos
3. ⬜ Técnicos: agregar, editar, eliminar un técnico.
4. ⬜ Tipos de servicio: agregar, editar, eliminar un tipo.
5. ⬜ Tipos de visita: agregar, editar, eliminar un tipo.
6. ⬜ Establecimientos: agregar, editar, eliminar un establecimiento; asignarlo a un usuario.
7. ⬜ Usuarios y roles: cambiar el rol de un usuario entre admin/técnico → el acceso a funciones de admin (eliminar cliente, etc.) cambia en consecuencia.

### 9.3 Notificaciones
8. ⬜ Activar/desactivar "Agenda de hoy" y "Agenda de mañana", con hora y destinatarios → llega el correo a la hora configurada.
9. ⬜ Activar "Incluir visitas atrasadas" → el correo de agenda incluye la sección de atrasadas.
10. ⬜ Activar el aviso "pre-visita" (X minutos antes) → llega el correo/recordatorio al técnico/cliente en el momento esperado.
11. ⬜ Activar el aviso de "retraso" → llega cuando la visita pasa la hora programada sin registrarse.
12. ⬜ Crear una visita nueva → llega el correo de "visita creada" al admin/técnico/cliente según configuración.
13. ⬜ Crear una **serie de visitas periódicas** → verificar cuántos correos de "visita creada" llegan hoy (se sabe que llegan varios; está documentado como mejora pendiente P3 en `AI_TRACKER.md`, no bloqueante).

---

## 10. Panel del técnico (`TechPortal.jsx`)

1. ⬜ Iniciar sesión como técnico → ve solo sus propias visitas.
2. ⬜ Vista "Lista": secciones "Atrasadas/Hoy/Próximas/Realizadas" muestran la fecha programada junto a la hora en cada tarjeta.
3. ⬜ Vista "Día": seleccionar un día del mini-calendario → muestra las visitas de ese día.
4. ⬜ Vista "Semana": navegar semanas adelante/atrás.
5. ⬜ Confirmar asistencia a una visita → botón cambia de "Confirmar asistencia" a "Marcar como realizada".
6. ⬜ Marcar una visita como realizada, con observación y valor → pasa a la sección "Realizadas".
7. ⬜ Ver historial del cliente desde una tarjeta de visita → muestra visitas anteriores del mismo cliente.
8. ⬜ Crear un borrador desde el panel del técnico (ver sección 8.1).
9. ⬜ Confirmar que el botón "Realizada" sigue bloqueado si la visita no está confirmada.
10. ⬜ En una visita **Programada y confirmada** (modelo nuevo): botón "Deshacer confirmación" → aparece confirmación inline con botones **Sí/No grandes y fáciles de tocar**, al aceptar la visita vuelve a sin confirmar.
11. ⬜ Botón "Reprogramar" solo aparece cuando la visita **NO** está confirmada — en una visita ya confirmada, en su lugar se ve solo "Deshacer confirmación" (hay que deshacerla primero para poder reprogramar).
11b. ⬜ Con "Reprogramar" (visita sin confirmar): abre modal con fecha/hora actuales precargadas; guardar una fecha nueva → la visita se actualiza.
12. ⬜ Después de reprogramar, la tarjeta muestra la nota "🔄 Reprogramada — antes: DD/MM HH:MM".
13. ⬜ En una visita sin mapa guardado: botón "Agregar mapa" → dentro del modal, botón "Abrir Maps" abre Google Maps (con tu ubicación si el navegador lo permite), botón "Pegar" toma el link del portapapeles → guardar → aparece "Abrir mapa" en esa visita.
14. ⬜ Verificar que ese mismo link de mapa aparece también en OTRA visita futura del mismo cliente/ubicación (se guardó en el cliente, no solo en esa visita).
15. ⬜ En una visita que YA tiene mapa: aparece "Abrir mapa" + botón "Editar" lado a lado → "Editar" abre el modal precargado con el link actual (título "Editar mapa"), se puede cambiar y guardar.
16. ⬜ Confirmar que estos botones (Reprogramar/Deshacer confirmación/Agregar mapa/Editar mapa) NO aparecen en visitas del modelo legado ni en visitas Realizada/Cancelada/Anulada.
17. ⬜ Probar los mismos puntos anteriores (10-16) también en la vista "Día" (`DayVisitCard`), no solo en "Lista".

---

## 11. PWA / actualización de la app

1. ⬜ Publicar un cambio y verificar que el aviso de "actualización disponible" aparece en dispositivos con la app abierta.
2. ⬜ Aceptar la actualización → la app recarga con la versión nueva.
3. ⬜ Verificar en un celular con la pestaña en segundo plano que la actualización se detecta al volver a primer plano (no solo al reabrir).

---

## Registro de resultados

*(Cada vez que se reporte un resultado, se marca el paso correspondiente arriba y se agrega
una línea aquí con la fecha, el módulo probado y cualquier hallazgo relevante.)*

| Fecha | Módulo | Resultado | Notas |
|---|---|---|---|
| 2026-07-06 | 1. Autenticación | 5/8 OK, 2 fallas, 1 omitida | Login, ojo de contraseña, pantalla de recuperación y aviso sin conexión OK. **Falla 1:** el correo de recuperación de contraseña no llega. **Falla 2:** el sistema no valida si el email existe antes de "enviar" la recuperación — muestra "Email enviado" igual. Paso 8 (cuenta nueva sin tenant) omitido por no tener forma de probarlo sin crear una cuenta nueva. |
| 2026-07-06 | 2. Panel (Dashboard) | En standby | El panel muestra "tareas activas" (modelo legado, ya no se usa). Se deja pendiente de rediseño para trabajar con visitas antes de probarlo — mismo hallazgo que ya se corrigió antes en Reportes. |
