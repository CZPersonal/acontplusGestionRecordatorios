const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore }      = require('firebase-admin/firestore');
const { getMessaging }      = require('firebase-admin/messaging');
const { defineSecret } = require('firebase-functions/params');
const { Resend }       = require('resend');

initializeApp();

const resendApiKey = defineSecret('RESEND_API_KEY');
const FROM_EMAIL   = process.env.FROM_EMAIL || 'onboarding@resend.dev';

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

// ─── 1. Recordatorios diarios de visitas por email (admin) ───────────────────
// Se ejecuta cada hora en zona horaria Ecuador.
// Solo envía en la hora configurada en Firestore (horaRecordatorioAdmin, default 8).
// Incluye CC a los correos adicionales configurados en ccCorreos.
exports.sendDailyReminders = onSchedule(
  {
    schedule:  'every 1 hours',
    timeZone:  'America/Guayaquil',
    secrets:   [resendApiKey],
    region:    'us-central1',
  },
  async () => {
    const db          = getFirestore();
    const resend      = new Resend(resendApiKey.value());
    const tomorrowStr = getTomorrowEcuador();
    const currentHour = getCurrentHourEcuador();

    const snap = await db
      .collectionGroup('visits')
      .where('scheduledDate', '==', tomorrowStr)
      .where('status', '==', 'Programada')
      .get();

    if (snap.empty) {
      console.log(`sendDailyReminders: sin visitas para ${tomorrowStr}`);
      return;
    }

    // Agrupar por tenant para leer config de cada uno una sola vez
    const byTenant = {};
    snap.docs.forEach(visitDoc => {
      const tenantId = visitDoc.ref.path.split('/')[1];
      if (!byTenant[tenantId]) byTenant[tenantId] = [];
      byTenant[tenantId].push(visitDoc);
    });

    const configCache = {};
    let totalSent = 0;

    const tenantJobs = Object.entries(byTenant).map(async ([tenantId, visitDocs]) => {
      const config    = await getTenantConfig(db, tenantId, configCache);
      const horaAdmin = config.horaRecordatorioAdmin ?? 8;
      if (currentHour !== horaAdmin) return;

      const ccCorreos = (config.ccCorreos || []).filter(e => e && e.includes('@'));

      const sends = visitDocs.map(async (visitDoc) => {
        const visit    = visitDoc.data();
        const taskRef  = visitDoc.ref.parent.parent;
        const taskSnap = await taskRef.get();
        if (!taskSnap.exists) return;
        const task = taskSnap.data();

        const to = task.createdBy;
        if (!to || !to.includes('@')) return;

        const cc = ccCorreos.filter(e => e !== to);

        await resend.emails.send({
          from:    FROM_EMAIL,
          to:      [to],
          ...(cc.length > 0 ? { cc } : {}),
          subject: `Recordatorio: visita mañana con ${task.clientName}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;">
              <h2 style="color:#D61672;">Recordatorio de visita</h2>
              <table style="border-collapse:collapse;width:100%;">
                <tr><td style="padding:6px 0;color:#555;">Cliente</td>
                    <td style="padding:6px 0;font-weight:bold;">${escHtml(task.clientName)}</td></tr>
                <tr><td style="padding:6px 0;color:#555;">Fecha</td>
                    <td style="padding:6px 0;">${escHtml(visit.scheduledDate)}</td></tr>
                ${visit.scheduledTime
                  ? `<tr><td style="padding:6px 0;color:#555;">Hora</td>
                         <td style="padding:6px 0;">${escHtml(visit.scheduledTime)}</td></tr>` : ''}
                ${visit.technician
                  ? `<tr><td style="padding:6px 0;color:#555;">Técnico</td>
                         <td style="padding:6px 0;">${escHtml(visit.technician)}</td></tr>` : ''}
                ${task.serviceOrder
                  ? `<tr><td style="padding:6px 0;color:#555;">Orden</td>
                         <td style="padding:6px 0;">${escHtml(task.serviceOrder)}</td></tr>` : ''}
                ${visit.observations
                  ? `<tr><td style="padding:6px 0;color:#555;">Observaciones</td>
                         <td style="padding:6px 0;">${escHtml(visit.observations)}</td></tr>` : ''}
              </table>
              <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
              <p style="font-size:12px;color:#aaa;">Acontplus Gestión Recordatorios</p>
            </div>
          `,
        });
        totalSent++;
      });

      await Promise.allSettled(sends);
    });

    await Promise.allSettled(tenantJobs);
    console.log(`sendDailyReminders: ${totalSent} enviados — ${tomorrowStr} — hora ${currentHour}h Ecuador`);
  }
);

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

    const taskRef  = event.data.ref.parent.parent;
    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) return;
    const task   = taskSnap.data();
    const resend = new Resend(resendApiKey.value());

    const urgencyLabel = { Alta: '🔴 Alta', Media: '🟡 Media', Baja: '🟢 Baja' }[visit.urgency] || '';

    await resend.emails.send({
      from:    FROM_EMAIL,
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

// ─── 4. Agenda diaria de visitas por técnico ─────────────────────────────────
// Se ejecuta cada hora en zona horaria Ecuador.
// Solo envía en la hora configurada en Firestore (horaRecordatorioTecnicos, default 7).
// Agrupa las visitas de mañana por técnico y envía UN solo email por técnico.
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
    const tomorrowStr = getTomorrowEcuador();
    const currentHour = getCurrentHourEcuador();

    const snap = await db
      .collectionGroup('visits')
      .where('scheduledDate', '==', tomorrowStr)
      .where('status', '==', 'Programada')
      .get();

    if (snap.empty) {
      console.log(`sendTechnicianDailyAgenda: sin visitas para ${tomorrowStr}`);
      return;
    }

    // Agrupar por tenant para leer config de cada uno una sola vez
    const byTenant = {};
    snap.docs.forEach(visitDoc => {
      const tenantId = visitDoc.ref.path.split('/')[1];
      if (!byTenant[tenantId]) byTenant[tenantId] = [];
      byTenant[tenantId].push(visitDoc);
    });

    const configCache = {};
    let totalSent = 0;

    const tenantJobs = Object.entries(byTenant).map(async ([tenantId, visitDocs]) => {
      const config   = await getTenantConfig(db, tenantId, configCache);
      const horaTech = config.horaRecordatorioTecnicos ?? 7;
      if (currentHour !== horaTech) return;

      // Construir agenda agrupada por email de técnico
      const agendaByTech = {};
      const loaders = visitDocs.map(async (visitDoc) => {
        const visit = visitDoc.data();
        const emailTecnico = visit.technicianEmail || (visit.technician?.includes('@') ? visit.technician : null);
        if (!emailTecnico) return;

        const taskRef  = visitDoc.ref.parent.parent;
        const taskSnap = await taskRef.get();
        if (!taskSnap.exists) return;
        const task = taskSnap.data();

        if (!agendaByTech[emailTecnico]) agendaByTech[emailTecnico] = [];
        agendaByTech[emailTecnico].push({ visit, task });
      });

      await Promise.allSettled(loaders);

      const techEmails = Object.keys(agendaByTech);
      if (techEmails.length === 0) return;

      const sends = techEmails.map(async (techEmail) => {
        const entries = agendaByTech[techEmail].sort((a, b) => {
          if (!a.visit.scheduledTime) return 1;
          if (!b.visit.scheduledTime) return -1;
          return a.visit.scheduledTime.localeCompare(b.visit.scheduledTime);
        });

        const count = entries.length;
        const rows  = entries.map(({ visit, task }) => {
          const urgencyColor = { Alta: '#dc2626', Media: '#d97706', Baja: '#16a34a' }[visit.urgency] || '#64748b';
          return `
            <tr style="border-top:1px solid #f1f5f9;">
              <td style="padding:10px 8px;vertical-align:top;color:#D61672;font-weight:bold;white-space:nowrap;width:64px;">
                ${escHtml(visit.scheduledTime || '—')}
              </td>
              <td style="padding:10px 8px;vertical-align:top;">
                <strong style="color:#1e293b;">${escHtml(task.clientName)}</strong><br>
                ${task.clientAddress
                  ? `<span style="color:#64748b;font-size:13px;">📍 ${escHtml(task.clientAddress)}</span><br>` : ''}
                ${visit.type
                  ? `<span style="color:#64748b;font-size:13px;">${escHtml(visit.type)}</span>` : ''}
                ${visit.urgency
                  ? `<span style="color:${urgencyColor};font-size:12px;font-weight:bold;margin-left:${visit.type ? '8' : '0'}px;">● ${escHtml(visit.urgency)}</span>` : ''}
                ${visit.observations
                  ? `<br><span style="color:#94a3b8;font-size:12px;font-style:italic;">📝 ${escHtml(visit.observations)}</span>` : ''}
              </td>
            </tr>
          `;
        }).join('');

        await resend.emails.send({
          from:    FROM_EMAIL,
          to:      [techEmail],
          subject: `Tu agenda para mañana — ${count} visita${count !== 1 ? 's' : ''} asignada${count !== 1 ? 's' : ''}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:auto;">
              <h2 style="color:#D61672;">Tu agenda para mañana</h2>
              <p style="color:#555;">${escHtml(tomorrowStr)} · ${count} visita${count !== 1 ? 's' : ''} programada${count !== 1 ? 's' : ''}</p>
              <table style="border-collapse:collapse;width:100%;">
                ${rows}
              </table>
              <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
              <p style="font-size:12px;color:#aaa;">Acontplus Gestión Recordatorios</p>
            </div>
          `,
        });
        totalSent++;
      });

      await Promise.allSettled(sends);
    });

    await Promise.allSettled(tenantJobs);
    console.log(`sendTechnicianDailyAgenda: ${totalSent} técnico(s) notificados — ${tomorrowStr} — hora ${currentHour}h Ecuador`);
  }
);

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
      from:    FROM_EMAIL,
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
              ? `<tr><td style="padding:6px 0;color:#888;">Observaciones de cierre</td>
                     <td style="padding:6px 0;font-style:italic;">${escHtml(after.observations)}</td></tr>` : ''}
          </table>
          <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
          <p style="font-size:12px;color:#aaa;">Acontplus Gestión Recordatorios</p>
        </div>
      `,
    });

    console.log(`notifyVisitCompleted: confirmación enviada a ${to} — visita ${event.params.visitId}`);
  }
);

// ─── 6. Alerta diaria de visitas atrasadas ────────────────────────────────────
// Se ejecuta cada hora en zona horaria Ecuador.
// Solo envía en la hora configurada (horaAlertaAtrasadas, default 9).
// Consulta todas las visitas Programadas con fecha anterior a hoy,
// agrupa por admin (createdBy) y envía un resumen. Incluye CC configurado.
exports.sendOverdueAlert = onSchedule(
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
    const currentHour = getCurrentHourEcuador();

    // Consulta solo por status para evitar índice compuesto adicional;
    // el filtro de fecha se aplica en JS
    const snap = await db
      .collectionGroup('visits')
      .where('status', '==', 'Programada')
      .get();

    if (snap.empty) return;

    const overdueDocs = snap.docs.filter(d => {
      const date = d.data().scheduledDate;
      return date && date < todayStr;
    });

    if (overdueDocs.length === 0) {
      console.log(`sendOverdueAlert: sin visitas atrasadas al ${todayStr}`);
      return;
    }

    // Agrupar por tenant
    const byTenant = {};
    overdueDocs.forEach(visitDoc => {
      const tenantId = visitDoc.ref.path.split('/')[1];
      if (!byTenant[tenantId]) byTenant[tenantId] = [];
      byTenant[tenantId].push(visitDoc);
    });

    const configCache = {};
    let totalSent = 0;

    const tenantJobs = Object.entries(byTenant).map(async ([tenantId, visitDocs]) => {
      const config     = await getTenantConfig(db, tenantId, configCache);
      const horaAlerta = config.horaAlertaAtrasadas ?? 9;
      if (currentHour !== horaAlerta) return;

      const ccCorreos = (config.ccCorreos || []).filter(e => e && e.includes('@'));

      // Cargar tareas padre y agrupar por admin
      const byAdmin = {};
      const loaders = visitDocs.map(async (visitDoc) => {
        const visit    = visitDoc.data();
        const taskRef  = visitDoc.ref.parent.parent;
        const taskSnap = await taskRef.get();
        if (!taskSnap.exists) return;
        const task  = taskSnap.data();
        const admin = task.createdBy;
        if (!admin || !admin.includes('@')) return;

        if (!byAdmin[admin]) byAdmin[admin] = [];
        byAdmin[admin].push({ visit, task });
      });

      await Promise.allSettled(loaders);

      const adminEmails = Object.keys(byAdmin);
      if (adminEmails.length === 0) return;

      const sends = adminEmails.map(async (adminEmail) => {
        // Ordenar por fecha ascendente (las más atrasadas primero)
        const entries = byAdmin[adminEmail].sort((a, b) =>
          (a.visit.scheduledDate || '').localeCompare(b.visit.scheduledDate || '')
        );

        const count = entries.length;
        const cc    = ccCorreos.filter(e => e !== adminEmail);

        const rows = entries.map(({ visit, task }) => `
          <tr style="border-top:1px solid #f1f5f9;">
            <td style="padding:10px 8px;vertical-align:top;color:#dc2626;font-weight:bold;white-space:nowrap;width:96px;">
              ${escHtml(visit.scheduledDate)}
            </td>
            <td style="padding:10px 8px;vertical-align:top;">
              <strong style="color:#1e293b;">${escHtml(task.clientName)}</strong><br>
              ${task.clientAddress
                ? `<span style="color:#64748b;font-size:13px;">📍 ${escHtml(task.clientAddress)}</span><br>` : ''}
              ${visit.type
                ? `<span style="color:#64748b;font-size:13px;">${escHtml(visit.type)}</span>` : ''}
              ${visit.technician
                ? `<span style="color:#64748b;font-size:13px;margin-left:${visit.type ? '8' : '0'}px;">👷 ${escHtml(visit.technician)}</span>` : ''}
              ${visit.observations
                ? `<br><span style="color:#94a3b8;font-size:12px;font-style:italic;">📝 ${escHtml(visit.observations)}</span>` : ''}
            </td>
          </tr>
        `).join('');

        await resend.emails.send({
          from:    FROM_EMAIL,
          to:      [adminEmail],
          ...(cc.length > 0 ? { cc } : {}),
          subject: `⚠️ ${count} visita${count !== 1 ? 's' : ''} atrasada${count !== 1 ? 's' : ''} sin realizar`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:auto;">
              <h2 style="color:#dc2626;">⚠️ Visitas atrasadas</h2>
              <p style="color:#555;">${count} visita${count !== 1 ? 's' : ''} con fecha vencida al ${escHtml(todayStr)}.</p>
              <table style="border-collapse:collapse;width:100%;">
                ${rows}
              </table>
              <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
              <p style="font-size:12px;color:#aaa;">Acontplus Gestión Recordatorios</p>
            </div>
          `,
        });
        totalSent++;
      });

      await Promise.allSettled(sends);
    });

    await Promise.allSettled(tenantJobs);
    console.log(`sendOverdueAlert: ${totalSent} admin(s) notificados — hora ${currentHour}h Ecuador`);
  }
);
