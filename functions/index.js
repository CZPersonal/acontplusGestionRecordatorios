const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onRequest }         = require('firebase-functions/v2/https');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore }      = require('firebase-admin/firestore');
const { getMessaging }      = require('firebase-admin/messaging');
const { defineSecret } = require('firebase-functions/params');
const { Resend }       = require('resend');
const crypto           = require('crypto');

initializeApp();

const resendApiKey   = defineSecret('RESEND_API_KEY');
const confirmSecret  = defineSecret('CONFIRM_SECRET');
const FROM_ADDRESS   = process.env.FROM_ADDRESS || 'noreply@notificaciones.resuelveyaa.com';

function getFromEmail(empresaNombre) {
  const nombre = (empresaNombre || 'Acontplus').trim();
  return `${nombre} Recordatorios <${FROM_ADDRESS}>`;
}

// Fecha de mañana en zona horaria Ecuador (UTC-5)
function getTomorrowEcuador() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return tomorrow.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
}

// Fecha de hoy en zona horaria Ecuador (UTC-5)
function getTodayEcuador() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
}

// Hora actual en Ecuador (UTC-5, sin DST)
function getCurrentHourEcuador() {
  const ecuadorMs = Date.now() - 5 * 60 * 60 * 1000;
  return new Date(ecuadorMs).getUTCHours();
}

// Minutos totales desde medianoche en Ecuador
function getNowMinutesEcuador() {
  const d = new Date(Date.now() - 5 * 60 * 60 * 1000);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// Convierte "HH:MM" a minutos desde medianoche
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Genera token firmado para confirmar asistencia
function generateConfirmToken(tenantId, taskId, visitId, secret) {
  const payload = `${tenantId}|${taskId}|${visitId}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16);
  return Buffer.from(`${payload}|${sig}`).toString('base64url');
}

// Valida y decodifica token de confirmación
function decodeConfirmToken(token, secret) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts   = decoded.split('|');
    if (parts.length !== 4) return null;
    const [tenantId, taskId, visitId, sig] = parts;
    const payload  = `${tenantId}|${taskId}|${visitId}`;
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 16);
    if (sig !== expected) return null;
    return { tenantId, taskId, visitId };
  } catch { return null; }
}

// HTML de respuesta para la página de confirmación
function confirmHtml(type, message) {
  const styles = {
    success: { bg: '#f0fdf4', border: '#86efac', icon: '✅', title: 'Asistencia confirmada',  text: '#15803d' },
    already: { bg: '#fefce8', border: '#fde68a', icon: 'ℹ️', title: 'Ya confirmada',          text: '#854d0e' },
    info:    { bg: '#eff6ff', border: '#93c5fd', icon: 'ℹ️', title: 'Visita actualizada',     text: '#1d4ed8' },
    error:   { bg: '#fef2f2', border: '#fca5a5', icon: '❌', title: 'Enlace inválido',         text: '#991b1b' },
  };
  const s = styles[type] || styles.error;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Acontplus — Confirmación de visita</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:sans-serif;min-height:100vh;display:flex;align-items:center;
         justify-content:center;background:#f8fafc;padding:20px}
    .card{max-width:420px;width:100%;background:${s.bg};border:2px solid ${s.border};
          border-radius:20px;padding:40px 32px;text-align:center}
    .icon{font-size:52px;margin-bottom:16px}
    .title{font-size:22px;font-weight:800;color:${s.text};margin-bottom:12px}
    .msg{font-size:15px;color:#475569;line-height:1.6}
    .brand{margin-top:32px;font-size:12px;color:#94a3b8}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${s.icon}</div>
    <div class="title">${s.title}</div>
    <p class="msg">${message}</p>
    <div class="brand">Acontplus Gestión Recordatorios</div>
  </div>
</body>
</html>`;
}

// Escapa caracteres HTML en valores de Firestore antes de insertar en emails
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Lee la config del tenant y la cachea para no hacer lecturas repetidas por ejecución
async function getTenantConfig(db, tenantId, configCache) {
  if (configCache[tenantId] !== undefined) return configCache[tenantId];
  const snap = await db.doc(`tenants/${tenantId}/configuracion/config_empresa`).get();
  configCache[tenantId] = snap.exists ? snap.data() : {};
  return configCache[tenantId];
}

// sendDailyReminders eliminado: fusionado en sendTechnicianDailyAgenda
// (destinatariosAgenda reciben ahora el resumen completo de visitas del día siguiente)

// ─── 2. Notificación push al crear una visita urgente ─────────────────────────
// Dispara cuando se crea cualquier documento en una subcollección 'visits'.
// Si la visita tiene urgency === 'Alta', envía FCM push a todos los usuarios
// de la misma empresa que tengan fcmToken registrado.
exports.notifyUrgentVisit = onDocumentCreated(
  {
    document: 'tenants/{tenantId}/water_filter_tasks/{taskId}/visits/{visitId}',
    region:   'us-central1',
  },
  async (event) => {
    const visit = event.data.data();
    if (visit.urgency !== 'Alta') return;

    const db        = getFirestore();
    const taskRef   = event.data.ref.parent.parent;
    const taskSnap  = await taskRef.get();
    if (!taskSnap.exists) return;
    const task     = taskSnap.data();
    const tenantId = event.params.tenantId;

    // Buscar usuarios del mismo tenant con FCM token
    const usersSnap = await db.collection('users')
      .where('tenantId', '==', tenantId)
      .get();

    const usersWithToken = usersSnap.docs.filter(d => d.data().fcmToken);
    if (usersWithToken.length === 0) return;

    const messaging = getMessaging();
    const sends = usersWithToken.map(async (userDoc) => {
      const { fcmToken } = userDoc.data();
      try {
        await messaging.send({
          token: fcmToken,
          notification: {
            title: '🔴 Visita urgente programada',
            body:  `${task.clientName}${visit.scheduledDate ? ' — ' + visit.scheduledDate : ''}`,
          },
          webpush: {
            notification: {
              title: '🔴 Visita urgente programada',
              body:  `${task.clientName}${visit.scheduledDate ? ' — ' + visit.scheduledDate : ''}`,
              icon:  '/logo.png',
            },
          },
          data: { taskId: task.id || event.params.taskId },
        });
      } catch (err) {
        // Token expirado o inválido — limpiar para no intentar de nuevo
        if (err.code === 'messaging/registration-token-not-registered') {
          await userDoc.ref.update({ fcmToken: null });
        } else {
          console.error('FCM send error:', err);
        }
      }
    });

    await Promise.allSettled(sends);
    console.log(`notifyUrgentVisit: push enviado a ${usersWithToken.length} usuario(s) para tarea ${event.params.taskId}`);
  }
);

// ─── 3. Notificación al técnico al crear una visita ──────────────────────────
// Dispara al crear un documento en la subcollección 'visits'.
// Si la visita es Programada y tiene técnico con email válido, le notifica
// con los detalles de la visita asignada.
exports.notifyTechnicianOnVisit = onDocumentCreated(
  {
    document: 'tenants/{tenantId}/water_filter_tasks/{taskId}/visits/{visitId}',
    region:   'us-central1',
    secrets:  [resendApiKey],
  },
  async (event) => {
    const visit = event.data.data();

    if (visit.status !== 'Programada') return;
    const emailDestino = visit.technicianEmail || (visit.technician?.includes('@') ? visit.technician : null);
    if (!emailDestino) {
      console.log(`notifyTechnicianOnVisit: sin email de técnico en ${event.params.visitId}`);
      return;
    }

    const db       = getFirestore();
    const taskRef  = event.data.ref.parent.parent;
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) return;
    const task      = taskSnap.data();
    const configSnap = await db.doc(`tenants/${event.params.tenantId}/configuracion/config_empresa`).get();
    const config     = configSnap.exists ? configSnap.data() : {};
    const resend     = new Resend(resendApiKey.value());

    const urgencyLabel = { Alta: '🔴 Alta', Media: '🟡 Media', Baja: '🟢 Baja' }[visit.urgency] || '';

    await resend.emails.send({
      from:    getFromEmail(config.empresaNombre),
      to:      [emailDestino],
      subject: `Nueva visita asignada: ${task.clientName} — ${visit.scheduledDate || 'fecha por confirmar'}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;">
          <h2 style="color:#D61672;">Nueva visita asignada</h2>
          <p style="color:#555;margin-bottom:16px;">Se te ha asignado la siguiente visita:</p>
          <table style="border-collapse:collapse;width:100%;">
            <tr><td style="padding:6px 0;color:#888;width:120px;">Cliente</td>
                <td style="padding:6px 0;font-weight:bold;">${escHtml(task.clientName)}</td></tr>
            ${task.clientAddress
              ? `<tr><td style="padding:6px 0;color:#888;">Dirección</td>
                     <td style="padding:6px 0;">${escHtml(task.clientAddress)}</td></tr>` : ''}
            ${task.identification
              ? `<tr><td style="padding:6px 0;color:#888;">Cédula/RUC</td>
                     <td style="padding:6px 0;font-family:monospace;">${escHtml(task.identification)}</td></tr>` : ''}
            ${task.clientPhone
              ? `<tr><td style="padding:6px 0;color:#888;">Teléfono</td>
                     <td style="padding:6px 0;">${escHtml(task.clientPhone)}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#888;">Fecha</td>
                <td style="padding:6px 0;">${escHtml(visit.scheduledDate || '—')}</td></tr>
            ${visit.scheduledTime
              ? `<tr><td style="padding:6px 0;color:#888;">Hora</td>
                     <td style="padding:6px 0;">${escHtml(visit.scheduledTime)}</td></tr>` : ''}
            ${visit.type
              ? `<tr><td style="padding:6px 0;color:#888;">Tipo</td>
                     <td style="padding:6px 0;">${escHtml(visit.type)}</td></tr>` : ''}
            ${urgencyLabel
              ? `<tr><td style="padding:6px 0;color:#888;">Urgencia</td>
                     <td style="padding:6px 0;">${urgencyLabel}</td></tr>` : ''}
            ${task.serviceOrder
              ? `<tr><td style="padding:6px 0;color:#888;">Orden</td>
                     <td style="padding:6px 0;font-family:monospace;">${escHtml(task.serviceOrder)}</td></tr>` : ''}
            ${task.serviceType
              ? `<tr><td style="padding:6px 0;color:#888;">Servicio</td>
                     <td style="padding:6px 0;">${escHtml(task.serviceType)}</td></tr>` : ''}
            ${visit.observations
              ? `<tr><td style="padding:6px 0;color:#888;">Observaciones</td>
                     <td style="padding:6px 0;font-style:italic;">${escHtml(visit.observations)}</td></tr>` : ''}
          </table>
          <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
          <p style="font-size:12px;color:#aaa;">Acontplus Gestión Recordatorios</p>
        </div>
      `,
    });

    console.log(`notifyTechnicianOnVisit: email enviado a ${emailDestino} — tarea ${event.params.taskId}`);
  }
);

// ─── 4. Agenda diaria de visitas ─────────────────────────────────────────────
// Se ejecuta cada hora en zona horaria Ecuador.
// Soporta dos tipos de agenda (configurable por tenant):
//   - agendaHoy:    visitas del día actual  (hora + destinatarios propios)
//   - agendaMañana: visitas del día siguiente (hora + destinatarios propios)
// Si incluirAtrasadas=true, cada email agrega al final las visitas vencidas.
// Por técnico: recibe su agenda personal + sus atrasadas propias.
// Destinatarios: reciben la agenda completa de todos los técnicos.
exports.sendTechnicianDailyAgenda = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'America/Guayaquil',
    secrets:  [resendApiKey],
    region:   'us-central1',
  },
  async () => {
    const db          = getFirestore();
    const resend      = new Resend(resendApiKey.value());
    const todayStr    = getTodayEcuador();
    const tomorrowStr = getTomorrowEcuador();
    const currentHour = getCurrentHourEcuador();

    // Consulta visitas de hoy, de mañana y todas las atrasadas en paralelo
    const [snapHoy, snapMañana, snapTodas] = await Promise.all([
      db.collectionGroup('visits').where('scheduledDate', '==', todayStr).where('status', '==', 'Programada').get(),
      db.collectionGroup('visits').where('scheduledDate', '==', tomorrowStr).where('status', '==', 'Programada').get(),
      db.collectionGroup('visits').where('status', '==', 'Programada').get(),
    ]);

    const groupByTenant = (docs) => {
      const map = {};
      docs.forEach(d => {
        const tid = d.ref.path.split('/')[1];
        if (!map[tid]) map[tid] = [];
        map[tid].push(d);
      });
      return map;
    };

    const byTenantHoy     = groupByTenant(snapHoy.docs);
    const byTenantMañana  = groupByTenant(snapMañana.docs);
    const byTenantOverdue = groupByTenant(
      snapTodas.docs.filter(d => { const dt = d.data().scheduledDate; return dt && dt < todayStr; })
    );

    const allTenantIds = new Set([
      ...Object.keys(byTenantHoy),
      ...Object.keys(byTenantMañana),
    ]);

    if (allTenantIds.size === 0) {
      console.log(`sendTechnicianDailyAgenda: sin visitas para ${todayStr} / ${tomorrowStr}`);
      return;
    }

    const configCache = {};
    let totalSent = 0;

    const buildAgendaRow = (visit, task) => {
      const urgencyColor = { Alta: '#dc2626', Media: '#d97706', Baja: '#16a34a' }[visit.urgency] || '#64748b';
      return `
        <tr style="border-top:1px solid #f1f5f9;">
          <td style="padding:10px 8px;vertical-align:top;color:#D61672;font-weight:bold;white-space:nowrap;width:64px;">
            ${escHtml(visit.scheduledTime || '—')}
          </td>
          <td style="padding:10px 8px;vertical-align:top;">
            <strong style="color:#1e293b;">${escHtml(task.clientName)}</strong><br>
            ${task.clientAddress  ? `<span style="color:#64748b;font-size:13px;">📍 ${escHtml(task.clientAddress)}</span><br>` : ''}
            ${task.identification ? `<span style="color:#64748b;font-size:13px;">🪪 ${escHtml(task.identification)}</span><br>` : ''}
            ${task.clientPhone    ? `<span style="color:#64748b;font-size:13px;">📞 ${escHtml(task.clientPhone)}</span><br>` : ''}
            ${visit.technician    ? `<span style="color:#64748b;font-size:13px;">👷 ${escHtml(visit.technician)}</span>` : ''}
            ${visit.type          ? `<span style="color:#64748b;font-size:13px;margin-left:${visit.technician ? '8' : '0'}px;">${escHtml(visit.type)}</span>` : ''}
            ${visit.urgency       ? `<span style="color:${urgencyColor};font-size:12px;font-weight:bold;margin-left:8px;">● ${escHtml(visit.urgency)}</span>` : ''}
            ${visit.observations  ? `<br><span style="color:#94a3b8;font-size:12px;font-style:italic;">📝 ${escHtml(visit.observations)}</span>` : ''}
          </td>
        </tr>`;
    };

    const buildOverdueRow = (visit, task) => `
      <tr style="border-top:1px solid #fef2f2;">
        <td style="padding:10px 8px;vertical-align:top;color:#dc2626;font-weight:bold;white-space:nowrap;width:80px;">
          ${escHtml(visit.scheduledDate)}
        </td>
        <td style="padding:10px 8px;vertical-align:top;">
          <strong style="color:#1e293b;">${escHtml(task.clientName)}</strong><br>
          ${task.clientAddress  ? `<span style="color:#64748b;font-size:13px;">📍 ${escHtml(task.clientAddress)}</span><br>` : ''}
          ${task.clientPhone    ? `<span style="color:#64748b;font-size:13px;">📞 ${escHtml(task.clientPhone)}</span><br>` : ''}
          ${visit.technician    ? `<span style="color:#64748b;font-size:13px;">👷 ${escHtml(visit.technician)}</span>` : ''}
          ${visit.type          ? `<span style="color:#64748b;font-size:13px;margin-left:${visit.technician ? '8' : '0'}px;">${escHtml(visit.type)}</span>` : ''}
        </td>
      </tr>`;

    const sortByTime = (a, b) => {
      if (!a.visit.scheduledTime) return 1;
      if (!b.visit.scheduledTime) return -1;
      return a.visit.scheduledTime.localeCompare(b.visit.scheduledTime);
    };
    const sortByDate = (a, b) =>
      (a.visit.scheduledDate || '').localeCompare(b.visit.scheduledDate || '');

    const buildEmailHtml = (titulo, subtitulo, mainEntries, overdueEntries) => {
      const mainRows    = mainEntries.map(({ visit, task }) => buildAgendaRow(visit, task)).join('');
      const overdueRows = overdueEntries.map(({ visit, task }) => buildOverdueRow(visit, task)).join('');
      return `
        <div style="font-family:sans-serif;max-width:520px;margin:auto;">
          <h2 style="color:#D61672;">${titulo}</h2>
          <p style="color:#555;">${subtitulo}</p>
          <table style="border-collapse:collapse;width:100%;">${mainRows}</table>
          ${overdueRows ? `
            <h3 style="color:#dc2626;margin-top:28px;margin-bottom:8px;">⚠️ Visitas atrasadas</h3>
            <table style="border-collapse:collapse;width:100%;background:#fef2f2;border-radius:8px;">${overdueRows}</table>
          ` : ''}
          <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
          <p style="font-size:12px;color:#aaa;">Acontplus Gestión Recordatorios</p>
        </div>`;
    };

    const tenantJobs = [...allTenantIds].map(async (tenantId) => {
      const config = await getTenantConfig(db, tenantId, configCache);

      const cfgHoy    = config.agendaHoy    || {};
      const cfgMañana = config.agendaMañana || {};
      const incluirAtrasadas = !!config.incluirAtrasadas;

      // Cargar visitas atrasadas del tenant (solo si se necesita)
      let overdueEntries = [];
      if (incluirAtrasadas && byTenantOverdue[tenantId]) {
        const loaders = byTenantOverdue[tenantId].map(async (visitDoc) => {
          const visit    = visitDoc.data();
          const taskSnap = await visitDoc.ref.parent.parent.get();
          if (!taskSnap.exists) return null;
          return { visit, task: taskSnap.data() };
        });
        overdueEntries = (await Promise.all(loaders)).filter(Boolean).sort(sortByDate);
      }

      // Procesa un tipo de agenda (hoy o mañana)
      const processAgenda = async (tipo, visitDocs, cfgAgenda, dateStr) => {
        if (!cfgAgenda.activo || currentHour !== (cfgAgenda.hora ?? 7)) return;
        if (!visitDocs || visitDocs.length === 0) return;

        const allEntries   = [];
        const agendaByTech = {};

        const loaders = visitDocs.map(async (visitDoc) => {
          const visit    = visitDoc.data();
          const taskSnap = await visitDoc.ref.parent.parent.get();
          if (!taskSnap.exists) return;
          const task = taskSnap.data();
          allEntries.push({ visit, task });
          const emailTecnico = visit.technicianEmail || (visit.technician?.includes('@') ? visit.technician : null);
          if (emailTecnico) {
            if (!agendaByTech[emailTecnico]) agendaByTech[emailTecnico] = [];
            agendaByTech[emailTecnico].push({ visit, task });
          }
        });
        await Promise.allSettled(loaders);

        const tituloTipo = tipo === 'hoy' ? 'Tu agenda de hoy' : 'Tu agenda para mañana';

        // Email personal por técnico
        const techSends = Object.entries(agendaByTech).map(async ([techEmail, entries]) => {
          const sorted = entries.sort(sortByTime);
          const techOverdue = overdueEntries.filter(e => {
            const em = e.visit.technicianEmail || (e.visit.technician?.includes('@') ? e.visit.technician : null);
            return em === techEmail;
          });
          await resend.emails.send({
            from:    getFromEmail(config.empresaNombre),
            to:      [techEmail],
            subject: `${tituloTipo} — ${sorted.length} visita${sorted.length !== 1 ? 's' : ''}`,
            html:    buildEmailHtml(tituloTipo, `${escHtml(dateStr)} · ${sorted.length} visita${sorted.length !== 1 ? 's' : ''} asignada${sorted.length !== 1 ? 's' : ''}`, sorted, techOverdue),
          });
          totalSent++;
        });
        await Promise.allSettled(techSends);

        // Email de agenda completa a destinatarios configurados
        const destList = (cfgAgenda.destinatarios || []).filter(e => e && e.includes('@'));
        if (destList.length > 0) {
          const sorted = allEntries.sort(sortByTime);
          const titulo = tipo === 'hoy' ? 'Agenda completa de hoy' : 'Agenda completa para mañana';
          await resend.emails.send({
            from:    getFromEmail(config.empresaNombre),
            to:      destList,
            subject: `${titulo} — ${sorted.length} visita${sorted.length !== 1 ? 's' : ''}`,
            html:    buildEmailHtml(titulo, `${escHtml(dateStr)} · ${sorted.length} visita${sorted.length !== 1 ? 's' : ''} programada${sorted.length !== 1 ? 's' : ''}`, sorted, overdueEntries),
          });
          totalSent++;
        }
      };

      await processAgenda('hoy',    byTenantHoy[tenantId],    cfgHoy,    todayStr);
      await processAgenda('mañana', byTenantMañana[tenantId], cfgMañana, tomorrowStr);
    });

    await Promise.allSettled(tenantJobs);
    console.log(`sendTechnicianDailyAgenda: ${totalSent} email(s) enviados — hora ${currentHour}h Ecuador`);
  }
);

// sendOverdueAlert eliminado: las visitas atrasadas se incluyen en sendTechnicianDailyAgenda
// cuando incluirAtrasadas=true en la configuración del tenant.

// ─── 5. Confirmación de cierre de visita ─────────────────────────────────────
// Dispara cuando se actualiza un documento en 'visits'.
// Si el status cambia de cualquier valor a 'Realizada', envía email de confirmación
// al creador de la tarea con el resumen del cierre. Incluye CC configurado.
exports.notifyVisitCompleted = onDocumentUpdated(
  {
    document: 'tenants/{tenantId}/water_filter_tasks/{taskId}/visits/{visitId}',
    region:   'us-central1',
    secrets:  [resendApiKey],
  },
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();

    // Solo actuar cuando el status cambia A 'Realizada' (no en reediciones posteriores)
    if (before.status === 'Realizada' || after.status !== 'Realizada') return;

    const db       = getFirestore();
    const taskRef  = event.data.after.ref.parent.parent;
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) return;
    const task = taskSnap.data();

    const to = task.createdBy;
    if (!to || !to.includes('@')) return;

    const tenantId   = event.params.tenantId;
    const configSnap = await db.doc(`tenants/${tenantId}/configuracion/config_empresa`).get();
    const config     = configSnap.exists ? configSnap.data() : {};
    const cc         = (config.ccCorreos || []).filter(e => e && e.includes('@') && e !== to);

    const resend = new Resend(resendApiKey.value());

    await resend.emails.send({
      from:    getFromEmail(config.empresaNombre),
      to:      [to],
      ...(cc.length > 0 ? { cc } : {}),
      subject: `✅ Visita completada: ${task.clientName} — ${after.scheduledDate || ''}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;">
          <h2 style="color:#16a34a;">✅ Visita completada</h2>
          <p style="color:#555;margin-bottom:16px;">La siguiente visita fue marcada como <strong>Realizada</strong>.</p>
          <table style="border-collapse:collapse;width:100%;">
            <tr><td style="padding:6px 0;color:#888;width:120px;">Cliente</td>
                <td style="padding:6px 0;font-weight:bold;">${escHtml(task.clientName)}</td></tr>
            ${task.clientAddress
              ? `<tr><td style="padding:6px 0;color:#888;">Dirección</td>
                     <td style="padding:6px 0;">${escHtml(task.clientAddress)}</td></tr>` : ''}
            ${task.identification
              ? `<tr><td style="padding:6px 0;color:#888;">Cédula/RUC</td>
                     <td style="padding:6px 0;font-family:monospace;">${escHtml(task.identification)}</td></tr>` : ''}
            ${task.clientPhone
              ? `<tr><td style="padding:6px 0;color:#888;">Teléfono</td>
                     <td style="padding:6px 0;">${escHtml(task.clientPhone)}</td></tr>` : ''}
            <tr><td style="padding:6px 0;color:#888;">Fecha</td>
                <td style="padding:6px 0;">${escHtml(after.scheduledDate || '—')}</td></tr>
            ${after.scheduledTime
              ? `<tr><td style="padding:6px 0;color:#888;">Hora</td>
                     <td style="padding:6px 0;">${escHtml(after.scheduledTime)}</td></tr>` : ''}
            ${after.technician
              ? `<tr><td style="padding:6px 0;color:#888;">Técnico</td>
                     <td style="padding:6px 0;">${escHtml(after.technician)}</td></tr>` : ''}
            ${after.type
              ? `<tr><td style="padding:6px 0;color:#888;">Tipo</td>
                     <td style="padding:6px 0;">${escHtml(after.type)}</td></tr>` : ''}
            ${task.serviceOrder
              ? `<tr><td style="padding:6px 0;color:#888;">Orden</td>
                     <td style="padding:6px 0;font-family:monospace;">${escHtml(task.serviceOrder)}</td></tr>` : ''}
            ${after.observations
              ? `<tr><td style="padding:6px 0;color:#888;">Observaciones</td>
                     <td style="padding:6px 0;font-style:italic;">${escHtml(after.observations)}</td></tr>` : ''}
            ${after.closingObservations
              ? `<tr><td style="padding:6px 0;color:#888;">Observaciones de cierre</td>
                     <td style="padding:6px 0;font-style:italic;">${escHtml(after.closingObservations)}</td></tr>` : ''}
          </table>
          <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
          <p style="font-size:12px;color:#aaa;">Acontplus Gestión Recordatorios</p>
        </div>
      `,
    });

    console.log(`notifyVisitCompleted: confirmación enviada a ${to} — visita ${event.params.visitId}`);
  }
);

// ─── 6. Notificación de visita modificada ────────────────────────────────────
// Dispara cuando se actualiza una visita y algún campo relevante cambia.
// No actúa si el cambio es el cierre (status → Realizada), eso lo maneja notifyVisitCompleted.
// Destinatarios: técnico actual, técnico anterior (si fue reasignada), creador de la tarea.
exports.notifyVisitUpdated = onDocumentUpdated(
  {
    document: 'tenants/{tenantId}/water_filter_tasks/{taskId}/visits/{visitId}',
    region:   'us-central1',
    secrets:  [resendApiKey],
  },
  async (event) => {
    const before = event.data.before.data();
    const after  = event.data.after.data();

    // Si el status cambia A 'Realizada', notifyVisitCompleted lo maneja
    if (before.status !== 'Realizada' && after.status === 'Realizada') return;

    const WATCHED = ['scheduledDate', 'scheduledTime', 'technician', 'technicianEmail', 'urgency', 'type', 'observations', 'status'];
    const LABELS  = { scheduledDate: 'Fecha', scheduledTime: 'Hora', technician: 'Técnico', technicianEmail: 'Email técnico', urgency: 'Urgencia', type: 'Tipo de servicio', observations: 'Observaciones', status: 'Estado' };

    const changes = WATCHED.filter(f => (before[f] ?? '') !== (after[f] ?? ''));
    if (changes.length === 0) return;

    const db       = getFirestore();
    const tenantId = event.params.tenantId;
    const taskSnap = await event.data.after.ref.parent.parent.get();
    if (!taskSnap.exists) return;
    const task = taskSnap.data();

    const configSnap = await db.doc(`tenants/${tenantId}/configuracion/config_empresa`).get();
    const config     = configSnap.exists ? configSnap.data() : {};
    const resend     = new Resend(resendApiKey.value());

    const changeRows = changes.map(f => `
      <tr style="border-top:1px solid #f1f5f9;">
        <td style="padding:7px 10px;color:#64748b;font-size:13px;width:140px;">${escHtml(LABELS[f] || f)}</td>
        <td style="padding:7px 10px;color:#dc2626;font-size:13px;text-decoration:line-through;">${escHtml(String(before[f] ?? '—'))}</td>
        <td style="padding:7px 10px;color:#16a34a;font-size:13px;font-weight:600;">${escHtml(String(after[f] ?? '—'))}</td>
      </tr>`).join('');

    const buildHtml = (intro) => `
      <div style="font-family:sans-serif;max-width:520px;margin:auto;">
        <h2 style="color:#D61672;">✏️ Visita modificada</h2>
        <p style="color:#555;margin-bottom:16px;">${intro}</p>
        <table style="border-collapse:collapse;width:100%;margin-bottom:20px;">
          <tr><td style="padding:6px 0;color:#888;width:120px;">Cliente</td>
              <td style="padding:6px 0;font-weight:bold;">${escHtml(task.clientName)}</td></tr>
          ${task.clientAddress ? `<tr><td style="padding:6px 0;color:#888;">Dirección</td><td style="padding:6px 0;">${escHtml(task.clientAddress)}</td></tr>` : ''}
          ${after.scheduledDate ? `<tr><td style="padding:6px 0;color:#888;">Fecha</td><td style="padding:6px 0;">${escHtml(after.scheduledDate)}</td></tr>` : ''}
          ${after.scheduledTime ? `<tr><td style="padding:6px 0;color:#888;">Hora</td><td style="padding:6px 0;">${escHtml(after.scheduledTime)}</td></tr>` : ''}
          ${task.serviceOrder ? `<tr><td style="padding:6px 0;color:#888;">Orden</td><td style="padding:6px 0;font-family:monospace;">${escHtml(task.serviceOrder)}</td></tr>` : ''}
        </table>
        <p style="font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Cambios realizados</p>
        <table style="border-collapse:collapse;width:100%;background:#f8fafc;border-radius:8px;overflow:hidden;">
          <tr style="background:#f1f5f9;">
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:600;">Campo</th>
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:600;">Anterior</th>
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#64748b;font-weight:600;">Nuevo</th>
          </tr>
          ${changeRows}
        </table>
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#aaa;">Acontplus Gestión Recordatorios</p>
      </div>`;

    const subject = `✏️ Visita modificada: ${task.clientName} — ${after.scheduledDate || ''}`;

    const newTechEmail = after.technicianEmail  || (after.technician?.includes('@')  ? after.technician  : null);
    const oldTechEmail = before.technicianEmail || (before.technician?.includes('@') ? before.technician : null);
    const techCambiado = oldTechEmail && oldTechEmail !== newTechEmail;

    const sends = [];

    // Técnico anterior: correo de reasignación
    if (techCambiado) {
      sends.push(resend.emails.send({
        from:    getFromEmail(config.empresaNombre),
        to:      [oldTechEmail],
        subject: `ℹ️ Visita reasignada: ${task.clientName} — ${after.scheduledDate || ''}`,
        html:    buildHtml(`Fuiste removido de esta visita. Ha sido reasignada a <strong>${escHtml(after.technician || 'otro técnico')}</strong>.`),
      }));
    }

    // Técnico actual + creador (sin duplicados)
    const dest = new Set();
    if (newTechEmail) dest.add(newTechEmail);
    if (task.createdBy?.includes('@')) dest.add(task.createdBy);
    if (dest.size > 0) {
      sends.push(resend.emails.send({
        from:    getFromEmail(config.empresaNombre),
        to:      [...dest],
        subject,
        html:    buildHtml('Se realizaron cambios en la siguiente visita.'),
      }));
    }

    await Promise.allSettled(sends);
    console.log(`notifyVisitUpdated: ${sends.length} email(s) — visita ${event.params.visitId} — cambios: ${changes.join(', ')}`);
  }
);

// ─── 7. Notificaciones de pre-visita y retraso (cada 5 min) ──────────────────
// Corre cada 5 minutos. Para cada visita 'Programada' de hoy con hora configurada:
//   - Pre-visita: envía N minutos antes con link de confirmación de asistencia.
//   - Retraso: envía cuando llevan M minutos sin registrarse.
// Usa colección visit_meta/{visitId} para no volver a notificar en la siguiente ejecución.
exports.checkVisitNotifications = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'America/Guayaquil',
    secrets:  [resendApiKey, confirmSecret],
    region:   'us-central1',
  },
  async () => {
    const db       = getFirestore();
    const resend   = new Resend(resendApiKey.value());
    const todayStr = getTodayEcuador();
    const nowMin   = getNowMinutesEcuador();

    const snap = await db
      .collectionGroup('visits')
      .where('scheduledDate', '==', todayStr)
      .where('status', '==', 'Programada')
      .get();

    if (snap.empty) return;

    const byTenant = {};
    snap.docs.forEach(visitDoc => {
      const tenantId = visitDoc.ref.path.split('/')[1];
      if (!byTenant[tenantId]) byTenant[tenantId] = [];
      byTenant[tenantId].push(visitDoc);
    });

    const configCache = {};
    let totalPre = 0, totalOverdue = 0;

    const tenantJobs = Object.entries(byTenant).map(async ([tenantId, visitDocs]) => {
      const config        = await getTenantConfig(db, tenantId, configCache);
      const preConfig     = config.notifPrevisita || {};
      const overdueConfig = config.notifRetraso   || {};
      if (!preConfig.activo && !overdueConfig.activo) return;

      const minutosAntes   = preConfig.minutosAntes     ?? 30;
      const minutosRetraso = overdueConfig.minutosRetraso ?? 30;
      const baseUrl        = 'https://us-central1-gestorrecordatorios.cloudfunctions.net';

      const jobs = visitDocs.map(async (visitDoc) => {
        const visit    = visitDoc.data();
        const visitId  = visitDoc.id;
        const taskRef  = visitDoc.ref.parent.parent;
        const taskId   = taskRef.id;
        const visitMin = timeToMinutes(visit.scheduledTime);
        if (visitMin === null) return;

        const taskSnap = await taskRef.get();
        if (!taskSnap.exists) return;
        const task = taskSnap.data();

        const metaRef  = db.doc(`tenants/${tenantId}/visit_meta/${visitId}`);
        const metaSnap = await metaRef.get();
        const meta     = metaSnap.exists ? metaSnap.data() : {};

        const emailTech  = visit.technicianEmail || (visit.technician?.includes('@') ? visit.technician : null);
        const emailAdmin = task.createdBy?.includes('@') ? task.createdBy : null;

        // ── Pre-visita ──
        if (preConfig.activo && !meta.notifiedBefore) {
          const diff = visitMin - nowMin;
          if (diff >= (minutosAntes - 2) && diff <= (minutosAntes + 3)) {
            const token      = generateConfirmToken(tenantId, taskId, visitId, confirmSecret.value());
            const confirmUrl = `${baseUrl}/confirmVisitAttendance?t=${encodeURIComponent(token)}`;

            const htmlBody = `
              <div style="font-family:sans-serif;max-width:480px;margin:auto;">
                <h2 style="color:#D61672;">⏰ Visita en ${minutosAntes} minutos</h2>
                <p style="color:#555;margin-bottom:16px;">Recordatorio de visita programada para hoy.</p>
                <table style="border-collapse:collapse;width:100%;">
                  <tr><td style="padding:6px 0;color:#888;width:120px;">Cliente</td>
                      <td style="padding:6px 0;font-weight:bold;">${escHtml(task.clientName)}</td></tr>
                  ${task.clientAddress ? `<tr><td style="padding:6px 0;color:#888;">Dirección</td><td style="padding:6px 0;">${escHtml(task.clientAddress)}</td></tr>` : ''}
                  ${task.identification ? `<tr><td style="padding:6px 0;color:#888;">Cédula/RUC</td><td style="padding:6px 0;font-family:monospace;">${escHtml(task.identification)}</td></tr>` : ''}
                  ${task.clientPhone ? `<tr><td style="padding:6px 0;color:#888;">Teléfono</td><td style="padding:6px 0;">${escHtml(task.clientPhone)}</td></tr>` : ''}
                  <tr><td style="padding:6px 0;color:#888;">Hora</td>
                      <td style="padding:6px 0;font-weight:bold;color:#D61672;">${escHtml(visit.scheduledTime)}</td></tr>
                  ${visit.technician ? `<tr><td style="padding:6px 0;color:#888;">Técnico</td><td style="padding:6px 0;">${escHtml(visit.technician)}</td></tr>` : ''}
                  ${task.serviceOrder ? `<tr><td style="padding:6px 0;color:#888;">Orden</td><td style="padding:6px 0;font-family:monospace;">${escHtml(task.serviceOrder)}</td></tr>` : ''}
                  ${visit.observations ? `<tr><td style="padding:6px 0;color:#888;">Observaciones</td><td style="padding:6px 0;font-style:italic;">${escHtml(visit.observations)}</td></tr>` : ''}
                </table>
                <div style="margin:28px 0;text-align:center;">
                  <a href="${confirmUrl}"
                     style="display:inline-block;padding:14px 32px;background:#D61672;color:#fff;
                            border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;">
                    ✅ Confirmar mi asistencia
                  </a>
                </div>
                <p style="font-size:11px;color:#aaa;text-align:center;">
                  Este enlace confirma tu asistencia a esta visita en la hora programada.
                </p>
                <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
                <p style="font-size:12px;color:#aaa;">Acontplus Gestión Recordatorios</p>
              </div>
            `;

            const destPre = preConfig.destinatarios || ['tecnico'];
            const tos = [];
            if (destPre.includes('tecnico') && emailTech)  tos.push(emailTech);
            if (destPre.includes('admin')   && emailAdmin) tos.push(emailAdmin);
            const toUniq = [...new Set(tos)];
            if (toUniq.length > 0) {
              await resend.emails.send({
                from:    getFromEmail(config.empresaNombre),
                to:      toUniq,
                subject: `⏰ Visita en ${minutosAntes} min: ${task.clientName} a las ${visit.scheduledTime}`,
                html:    htmlBody,
              });
              await metaRef.set({ notifiedBefore: true }, { merge: true });
              totalPre++;
            }
          }
        }

        // ── Retraso ──
        if (overdueConfig.activo && !meta.notifiedOverdue) {
          const diff = nowMin - visitMin;
          if (diff >= minutosRetraso && diff <= minutosRetraso + 5) {
            const htmlBody = `
              <div style="font-family:sans-serif;max-width:480px;margin:auto;">
                <h2 style="color:#dc2626;">🚨 Visita retrasada</h2>
                <p style="color:#555;margin-bottom:16px;">
                  Han pasado <strong>${minutosRetraso} minutos</strong> desde la hora programada
                  y la visita todavía no fue registrada.
                </p>
                <table style="border-collapse:collapse;width:100%;">
                  <tr><td style="padding:6px 0;color:#888;width:120px;">Cliente</td>
                      <td style="padding:6px 0;font-weight:bold;">${escHtml(task.clientName)}</td></tr>
                  ${task.clientAddress ? `<tr><td style="padding:6px 0;color:#888;">Dirección</td><td style="padding:6px 0;">${escHtml(task.clientAddress)}</td></tr>` : ''}
                  ${task.identification ? `<tr><td style="padding:6px 0;color:#888;">Cédula/RUC</td><td style="padding:6px 0;font-family:monospace;">${escHtml(task.identification)}</td></tr>` : ''}
                  ${task.clientPhone ? `<tr><td style="padding:6px 0;color:#888;">Teléfono</td><td style="padding:6px 0;">${escHtml(task.clientPhone)}</td></tr>` : ''}
                  <tr><td style="padding:6px 0;color:#888;">Hora programada</td>
                      <td style="padding:6px 0;font-weight:bold;color:#dc2626;">${escHtml(visit.scheduledTime)}</td></tr>
                  ${visit.technician ? `<tr><td style="padding:6px 0;color:#888;">Técnico</td><td style="padding:6px 0;">${escHtml(visit.technician)}</td></tr>` : ''}
                  ${task.serviceOrder ? `<tr><td style="padding:6px 0;color:#888;">Orden</td><td style="padding:6px 0;font-family:monospace;">${escHtml(task.serviceOrder)}</td></tr>` : ''}
                </table>
                <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
                <p style="font-size:12px;color:#aaa;">Acontplus Gestión Recordatorios</p>
              </div>
            `;

            const destOver = overdueConfig.destinatarios || ['admin'];
            const tos = [];
            if (destOver.includes('tecnico') && emailTech)  tos.push(emailTech);
            if (destOver.includes('admin')   && emailAdmin) tos.push(emailAdmin);
            const toUniq = [...new Set(tos)];
            if (toUniq.length > 0) {
              await resend.emails.send({
                from:    getFromEmail(config.empresaNombre),
                to:      toUniq,
                subject: `🚨 Visita retrasada ${minutosRetraso} min: ${task.clientName}`,
                html:    htmlBody,
              });
              await metaRef.set({ notifiedOverdue: true }, { merge: true });
              totalOverdue++;
            }
          }
        }
      });

      await Promise.allSettled(jobs);
    });

    await Promise.allSettled(tenantJobs);
    console.log(`checkVisitNotifications: ${totalPre} pre-visita, ${totalOverdue} retraso — ${todayStr} ${nowMin}min Ecuador`);
  }
);

// ─── 8. Confirmación de asistencia del técnico ───────────────────────────────
// HTTP endpoint expuesto en /confirmar via Firebase Hosting rewrite.
// El técnico hace clic en el link del email; se valida el token HMAC y se
// escribe technicianConfirmed:true en el documento de visita.
exports.confirmVisitAttendance = onRequest(
  {
    region:  'us-central1',
    secrets: [confirmSecret],
    invoker: 'public',
  },
  async (req, res) => {
    const token = req.query.t;
    if (!token) {
      res.status(400).send(confirmHtml('error', 'Enlace sin token. Verifica que copiaste el enlace completo.'));
      return;
    }

    const parsed = decodeConfirmToken(token, confirmSecret.value());
    if (!parsed) {
      res.status(400).send(confirmHtml('error', 'El enlace no es válido o fue modificado.'));
      return;
    }

    const { tenantId, taskId, visitId } = parsed;
    const db = getFirestore();

    try {
      const visitRef  = db.doc(`tenants/${tenantId}/water_filter_tasks/${taskId}/visits/${visitId}`);
      const visitSnap = await visitRef.get();

      if (!visitSnap.exists) {
        res.status(404).send(confirmHtml('error', 'La visita no fue encontrada en el sistema.'));
        return;
      }

      const visit = visitSnap.data();

      if (visit.technicianConfirmed) {
        res.send(confirmHtml('already', 'Tu asistencia a esta visita ya estaba confirmada. ¡Gracias!'));
        return;
      }

      if (visit.status !== 'Programada') {
        res.send(confirmHtml('info', `Esta visita ya fue marcada como <strong>${escHtml(visit.status)}</strong>.`));
        return;
      }

      await visitRef.update({
        technicianConfirmed: true,
        confirmedAt: new Date().toISOString(),
      });

      const taskRef  = db.doc(`tenants/${tenantId}/water_filter_tasks/${taskId}`);
      const taskSnap = await taskRef.get();
      const clientName = taskSnap.exists ? (taskSnap.data().clientName || '') : '';

      const when = [
        visit.scheduledDate,
        visit.scheduledTime ? `a las ${visit.scheduledTime}` : '',
        clientName ? `con ${escHtml(clientName)}` : '',
      ].filter(Boolean).join(' ');

      res.send(confirmHtml('success', `Tu asistencia para la visita${when ? ' ' + when : ''} ha sido confirmada. El administrador ha sido notificado.`));
    } catch (err) {
      console.error('confirmVisitAttendance error:', err);
      res.status(500).send(confirmHtml('error', 'Error interno al procesar la confirmación. Intenta de nuevo.'));
    }
  }
);
