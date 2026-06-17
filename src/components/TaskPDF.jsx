function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateTaskPDF(task) {
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const today      = new Date().toISOString().split('T')[0];
  const isOverdue  = task.dueDate < today && task.status !== 'Completado' && task.status !== 'Cancelado';

  const statusColor = {
    'Pendiente':  '#d97706',
    'En Proceso': '#2563eb',
    'Completado': '#16a34a',
    'Cancelado':  '#6b7280',
  }[task.status] || '#6b7280';

  const urgencyColor = {
    'Alta':  '#dc2626',
    'Media': '#d97706',
    'Baja':  '#16a34a',
  }[task.urgency] || '#6b7280';

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Ficha de Mantenimiento - ${escapeHtml(task.clientName)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
        .page { max-width: 800px; margin: 0 auto; padding: 32px; }

        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 4px solid #D61672; }
        .header-brand { display: flex; align-items: center; gap: 12px; }
        .header-brand img { width: 52px; height: 52px; object-fit: contain; }
        .header-brand-text h1 { font-size: 20px; font-weight: bold; color: #D61672; letter-spacing: 0.05em; }
        .header-brand-text p { font-size: 11px; color: #FFA901; font-weight: bold; }
        .header-brand-text small { font-size: 10px; color: #64748b; }
        .header-right { text-align: right; }
        .header-right .doc-title { font-size: 14px; font-weight: bold; color: #1e293b; }
        .header-right .doc-number { font-size: 16px; font-weight: bold; font-family: monospace; color: #D61672; margin: 2px 0; }
        .header-right .doc-date { font-size: 10px; color: #64748b; }

        .status-row { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .status-card { flex: 1; min-width: 120px; padding: 10px 12px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; }
        .status-card .sc-label { font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px; }
        .status-card .sc-value { font-size: 12px; font-weight: bold; }

        .section { margin-bottom: 18px; }
        .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #D61672; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1.5px solid #fce7f3; display: flex; align-items: center; gap: 6px; }

        table { width: 100%; border-collapse: collapse; }
        td { padding: 7px 10px; vertical-align: top; }
        td.label { font-weight: bold; color: #475569; width: 28%; background: #fdf2f8; border: 1px solid #fce7f3; font-size: 11px; }
        td.value { color: #1e293b; border: 1px solid #f1f5f9; }
        td.value.mono { font-family: monospace; font-weight: bold; color: #7c3aed; font-size: 13px; }
        td.value.highlight { font-weight: bold; color: #c2410c; background: #fff7ed; border-color: #fed7aa; }

        .obs-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; min-height: 44px; color: #475569; line-height: 1.5; font-size: 11px; }
        .obs-box.completion { background: #f0fdf4; border-color: #bbf7d0; color: #166534; }
        .obs-box.empty { color: #94a3b8; font-style: italic; }

        .closure { background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 8px; padding: 14px; margin-bottom: 18px; }
        .closure-title { font-size: 10px; font-weight: bold; color: #166534; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }

        .signature-area { display: flex; gap: 20px; margin-top: 8px; }
        .signature-box { flex: 1; border-top: 1.5px solid #D61672; padding-top: 6px; text-align: center; font-size: 10px; color: #64748b; margin-top: 52px; }

        .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #D61672; display: flex; justify-content: space-between; align-items: center; }
        .footer-left { display: flex; align-items: center; gap: 8px; }
        .footer-left img { width: 24px; height: 24px; object-fit: contain; }
        .footer-brand { font-size: 11px; font-weight: bold; color: #D61672; }
        .footer-right { font-size: 10px; color: #94a3b8; text-align: right; }

        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .page { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="page">

        <!-- Header -->
        <div class="header">
          <div class="header-brand">
            <img src="${window.location.origin}/logo.png" alt="Acontplus" />
            <div class="header-brand-text">
              <h1>ACONTPLUS</h1>
              <p>Recordatorios</p>
              <small>Facturar nunca fue tan fácil</small>
            </div>
          </div>
          <div class="header-right">
            <div class="doc-title">Ficha de Mantenimiento</div>
            ${task.serviceOrder
              ? `<div class="doc-number">OS: ${escapeHtml(task.serviceOrder)}</div>`
              : `<div class="doc-number" style="color:#94a3b8">Sin orden asignada</div>`
            }
            <div class="doc-date">Generado: ${formatDate(new Date().toISOString())}</div>
          </div>
        </div>

        <!-- Estado, urgencia y tipo de instalación -->
        <div class="status-row">
          <div class="status-card">
            <div class="sc-label">Estado</div>
            <div class="sc-value" style="color:${statusColor}">${escapeHtml(task.status)}</div>
          </div>
          <div class="status-card">
            <div class="sc-label">Urgencia</div>
            <div class="sc-value" style="color:${urgencyColor}">${escapeHtml(task.urgency || '—')}</div>
          </div>
          ${task.serviceType ? `
          <div class="status-card" style="border-color:#fed7aa;background:#fff7ed;">
            <div class="sc-label" style="color:#c2410c;">📦 Tipo inst./equipo</div>
            <div class="sc-value" style="color:#c2410c;">${escapeHtml(task.serviceType)}</div>
          </div>` : ''}
          <div class="status-card">
            <div class="sc-label">Fecha vencimiento</div>
            <div class="sc-value" style="color:${isOverdue ? '#dc2626' : '#1e293b'}">
              ${formatDateOnly(task.dueDate)} ${isOverdue ? '⚠️' : ''}
            </div>
          </div>
        </div>

        <!-- Datos del cliente -->
        <div class="section">
          <div class="section-title">👤 Datos del cliente</div>
          <table>
            <tr>
              <td class="label">Nombre completo</td>
              <td class="value">${escapeHtml(task.clientName || '—')}</td>
              <td class="label">Cédula / RUC</td>
              <td class="value" style="font-family:monospace">${escapeHtml(task.identification || '—')}</td>
            </tr>
            <tr>
              <td class="label">Teléfono</td>
              <td class="value">${escapeHtml(task.clientPhone || '—')}</td>
              <td class="label">Dirección</td>
              <td class="value">${escapeHtml(task.clientAddress || '—')}</td>
            </tr>
          </table>
        </div>

        <!-- Datos del servicio -->
        <div class="section">
          <div class="section-title">🔧 Datos del servicio</div>
          <table>
            <tr>
              <td class="label">Orden de servicio</td>
              <td class="value mono">${escapeHtml(task.serviceOrder || '—')}</td>
              <td class="label">Tipo visita</td>
              <td class="value">${escapeHtml(task.type || '—')}</td>
            </tr>
            <tr>
              <td class="label">📦 Tipo inst./equipo/serv.</td>
              <td class="value highlight" colspan="3">${escapeHtml(task.serviceType || '—')}</td>
            </tr>
            <tr>
              <td class="label">Fecha de registro</td>
              <td class="value">${formatDate(task.createdAt)}</td>
              <td class="label">Registrado por</td>
              <td class="value">${escapeHtml(task.createdBy || '—')}</td>
            </tr>
          </table>
        </div>

        <!-- Observaciones -->
        <div class="section">
          <div class="section-title">📝 Observaciones</div>
          <div class="obs-box ${!task.observations ? 'empty' : ''}">
            ${escapeHtml(task.observations || 'Sin observaciones registradas')}
          </div>
        </div>

        <!-- Datos de cierre -->
        ${task.status === 'Completado' && task.completedAt ? `
        <div class="closure">
          <div class="closure-title">✅ Datos de cierre</div>
          <table>
            <tr>
              <td class="label" style="background:#dcfce7;border-color:#bbf7d0">Completado por</td>
              <td class="value" style="background:#dcfce7;border-color:#bbf7d0">${escapeHtml(task.completedBy || '—')}</td>
              <td class="label" style="background:#dcfce7;border-color:#bbf7d0">Fecha de cierre</td>
              <td class="value" style="background:#dcfce7;border-color:#bbf7d0">${formatDate(task.completedAt)}</td>
            </tr>
          </table>
          ${task.completionObservations ? `
          <div style="margin-top:10px">
            <div style="font-size:10px;font-weight:bold;color:#166534;margin-bottom:4px">Observación de cierre:</div>
            <div class="obs-box completion">${escapeHtml(task.completionObservations)}</div>
          </div>` : ''}
        </div>` : ''}

        <!-- Firmas -->
        <div class="section">
          <div class="section-title">✍️ Firmas</div>
          <div class="signature-area">
            <div class="signature-box">Firma del técnico</div>
            <div class="signature-box">Firma del cliente / Recibí conforme</div>
            <div class="signature-box">Nombre y cédula del cliente</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-left">
            <img src="${window.location.origin}/logo.png" alt="Acontplus" />
            <div>
              <div class="footer-brand">ACONTPLUS</div>
              <div style="font-size:9px;color:#FFA901;font-weight:bold">Recordatorios</div>
            </div>
          </div>
          <div class="footer-right">
            Documento generado el ${formatDate(new Date().toISOString())}<br/>
            Acontplus Recordatorios
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

export function printTaskPDF(task) {
  const html = generateTaskPDF(task);
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}

export function shareViaWhatsApp(task) {
  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const message = [
    `🔧 *ACONTPLUS RECORDATORIOS*`,
    `📋 *Ficha de Mantenimiento*`,
    `━━━━━━━━━━━━━━━━━━━━`,
    task.serviceOrder ? `🔖 *OS:* ${task.serviceOrder}` : '',
    ``,
    `👤 *CLIENTE*`,
    `• Nombre: ${task.clientName}`,
    task.identification ? `• Cédula/RUC: ${task.identification}` : '',
    task.clientPhone    ? `• Teléfono: ${task.clientPhone}`      : '',
    task.clientAddress  ? `• Dirección: ${task.clientAddress}`   : '',
    ``,
    `🔧 *SERVICIO*`,
    task.serviceType ? `📦 *Tipo instalación/equipo:* ${task.serviceType}` : '',
    `• Tipo visita: ${task.type || '—'}`,
    task.equipment  ? `• Equipo: ${task.equipment}` : '',
    `• Urgencia: ${task.urgency || '—'}`,
    `• Estado: ${task.status}`,
    `• Vence: ${formatDateOnly(task.dueDate)}`,
    task.observations ? `\n📝 *Observaciones:*\n${task.observations}` : '',
    task.status === 'Completado' && task.completedAt ? [
      ``,
      `✅ *CIERRE*`,
      `• Completado por: ${task.completedBy}`,
      `• Fecha: ${new Date(task.completedAt).toLocaleDateString('es-EC')}`,
      task.completionObservations ? `• Obs: ${task.completionObservations}` : '',
    ].filter(Boolean).join('\n') : '',
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `_Enviado desde Acontplus Recordatorios_`,
  ].filter(line => line !== '').join('\n');

  const encoded = encodeURIComponent(message);
  const phone   = task.clientPhone ? task.clientPhone.replace(/\D/g, '') : '';
  const url     = phone
    ? `https://wa.me/593${phone.startsWith('0') ? phone.slice(1) : phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank');
}
