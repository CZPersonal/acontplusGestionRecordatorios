const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
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

// ─── 1. Recordatorios diarios de visitas por email ───────────────────────────
// Se ejecuta cada día a las 8:00 AM hora Ecuador.
// Consulta todas las visitas programadas para mañana y envía un email
// al correo del creador de cada tarea.
exports.sendDailyReminders = onSchedule(
  {
    schedule:  'every day 08:00',
    timeZone:  'America/Guayaquil',
    secrets:   [resendApiKey],
    region:    'us-central1',
  },
  async () => {
    const db     = getFirestore();
    const resend = new Resend(resendApiKey.value());
    const tomorrowStr = getTomorrowEcuador();

    const snap = await db
      .collectionGroup('visits')
      .where('scheduledDate', '==', tomorrowStr)
      .where('status', '==', 'Programada')
      .get();

    if (snap.empty) {
      console.log(`sendDailyReminders: sin visitas para ${tomorrowStr}`);
      return;
    }

    const sends = snap.docs.map(async (visitDoc) => {
      const visit   = visitDoc.data();
      const taskRef = visitDoc.ref.parent.parent;
      const taskSnap = await taskRef.get();
      if (!taskSnap.exists) return;
      const task = taskSnap.data();

      // Solo enviar si hay email válido como destinatario
      const to = task.createdBy;
      if (!to || !to.includes('@')) return;

      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      [to],
        subject: `Recordatorio: visita mañana con ${task.clientName}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;">
            <h2 style="color:#D61672;">Recordatorio de visita</h2>
            <table style="border-collapse:collapse;width:100%;">
              <tr><td style="padding:6px 0;color:#555;">Cliente</td>
                  <td style="padding:6px 0;font-weight:bold;">${task.clientName}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Fecha</td>
                  <td style="padding:6px 0;">${visit.scheduledDate}</td></tr>
              ${visit.scheduledTime
                ? `<tr><td style="padding:6px 0;color:#555;">Hora</td>
                       <td style="padding:6px 0;">${visit.scheduledTime}</td></tr>` : ''}
              ${visit.technician
                ? `<tr><td style="padding:6px 0;color:#555;">Técnico</td>
                       <td style="padding:6px 0;">${visit.technician}</td></tr>` : ''}
              ${task.serviceOrder
                ? `<tr><td style="padding:6px 0;color:#555;">Orden</td>
                       <td style="padding:6px 0;">${task.serviceOrder}</td></tr>` : ''}
              ${visit.observations
                ? `<tr><td style="padding:6px 0;color:#555;">Observaciones</td>
                       <td style="padding:6px 0;">${visit.observations}</td></tr>` : ''}
            </table>
            <hr style="margin:20px 0;border:none;border-top:1px solid #eee;">
            <p style="font-size:12px;color:#aaa;">Acontplus Gestión Recordatorios</p>
          </div>
        `,
      });
    });

    const results = await Promise.allSettled(sends);
    const failed  = results.filter(r => r.status === 'rejected').length;
    console.log(`sendDailyReminders: ${snap.docs.length} procesadas, ${failed} fallidas para ${tomorrowStr}`);
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
