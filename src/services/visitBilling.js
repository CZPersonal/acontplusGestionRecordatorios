import { doc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getVisitsRef, getVisitsFlatRef } from '../lib/tenantDb';
import { useAppStore } from '../lib/store';
import { formatDateOnly } from '../utils/dates.js';
import { fmtMoney } from '../utils/format.js';

// ─── Helpers de cálculo ────────────────────────────────────────────────────────

export function calcPaymentSummary(visit) {
  const total    = parseFloat(visit.valorCobrar) || 0;
  const abonado  = (visit.payments || []).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const saldo    = Math.max(0, total - abonado);
  const pagado   = total > 0 && saldo === 0;
  return { total, abonado, saldo, pagado };
}

export function generateReceiptNo(visitId) {
  const ts   = Date.now().toString().slice(-6);
  const part = visitId?.slice(-4).toUpperCase() || 'XXXX';
  return `REC-${part}-${ts}`;
}

// ─── Comprobante de cobro (PDF/HTML imprimible) ────────────────────────────────

export function generateReceipt({ task, visit, payment }) {
  const { total, abonado, saldo } = calcPaymentSummary({
    ...visit,
    payments: visit.payments || [],
  });

  const cfg       = useAppStore.getState().empresaConfig;
  const logoSrc   = cfg.logoUrl || `${window.location.origin}/logo.png`;
  const nombreEmp = cfg.empresaNombre || 'ACONTPLUS';
  const sloganEmp = cfg.empresaSlogan || 'Recordatorios';
  const rucEmp    = cfg.ruc || '';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Comprobante ${payment.receiptNo}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:Arial,sans-serif; font-size:12px; color:#1e293b; }
    .page { max-width:400px; margin:0 auto; padding:24px; border:2px solid #e2e8f0; }
    .header { text-align:center; border-bottom:3px solid #D61672; padding-bottom:12px; margin-bottom:14px; }
    .header img { width:44px; height:44px; object-fit:contain; margin-bottom:6px; }
    .header h1 { font-size:18px; font-weight:bold; color:#D61672; letter-spacing:.05em; }
    .header p  { font-size:10px; color:#FFA901; font-weight:bold; }
    .header .meta { font-size:9px; color:#94a3b8; margin-top:4px; }
    .receipt-no { text-align:center; margin-bottom:12px; }
    .receipt-no .rn-label { font-size:9px; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em;
      font-weight:bold; margin-bottom:3px; }
    .receipt-no span { font-family:monospace; font-size:15px; font-weight:bold; color:#D61672;
      background:#fdf2f8; px:8px; padding:4px 12px; border-radius:6px; border:1px solid #fce7f3; }
    .section { margin-bottom:10px; }
    .section-title { font-size:9px; font-weight:bold; text-transform:uppercase; letter-spacing:.08em;
      color:#D61672; border-bottom:1px solid #fce7f3; padding-bottom:3px; margin-bottom:6px; }
    .row { display:flex; justify-content:space-between; padding:3px 0; font-size:11px; }
    .row .label { color:#64748b; }
    .row .value { font-weight:bold; }
    .amount-box { background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:8px; padding:10px;
      text-align:center; margin:10px 0; }
    .amount-box .am-label { font-size:9px; color:#166534; text-transform:uppercase; font-weight:bold; }
    .amount-box .am-value { font-size:22px; font-weight:bold; color:#166534; }
    .saldo-box { background:#fff7ed; border:1.5px solid #fed7aa; border-radius:8px; padding:8px;
      display:flex; justify-content:space-between; align-items:center; }
    .saldo-box .s-label { font-size:10px; color:#9a3412; font-weight:bold; }
    .saldo-box .s-value { font-size:14px; font-weight:bold; color:#9a3412; }
    .paid-box { background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:8px; padding:8px;
      text-align:center; color:#166534; font-weight:bold; font-size:12px; }
    .footer { margin-top:16px; padding-top:10px; border-top:2px solid #D61672;
      display:flex; justify-content:space-between; align-items:center; font-size:9px; color:#94a3b8; }
    .signature { margin-top:36px; border-top:1px solid #D61672; padding-top:4px;
      text-align:center; font-size:9px; color:#64748b; }
    @media print { .page { border:none; } }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <img src="${logoSrc}" alt="${nombreEmp}"/>
    <h1>${nombreEmp}</h1>
    <p>${sloganEmp} · Comprobante de cobro</p>
    ${rucEmp ? `<div class="meta">RUC: ${rucEmp}</div>` : ''}
    ${visit.establecimientoNombre ? `<div class="meta">Establecimiento: ${visit.establecimientoNombre}</div>` : ''}
  </div>

  <div class="receipt-no">
    <div class="rn-label">N° Comprobante</div>
    <span>${payment.receiptNo}</span>
  </div>

  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="row"><span class="label">Nombre</span><span class="value">${task.clientName || '—'}</span></div>
    ${task.clientPhone ? `<div class="row"><span class="label">Teléfono</span><span class="value">${task.clientPhone}</span></div>` : ''}
    ${task.serviceOrder ? `<div class="row"><span class="label">Orden servicio</span><span class="value">${task.serviceOrder}</span></div>` : ''}
    ${task.serviceType  ? `<div class="row"><span class="label">Tipo servicio</span><span class="value">${task.serviceType}</span></div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Visita</div>
    <div class="row"><span class="label">Fecha visita</span><span class="value">${formatDateOnly(visit.scheduledDate)}</span></div>
    ${visit.type ? `<div class="row"><span class="label">Tipo</span><span class="value">${visit.type}</span></div>` : ''}
    ${visit.technician ? `<div class="row"><span class="label">Técnico</span><span class="value">${visit.technician}</span></div>` : ''}
  </div>

  <div class="section">
    <div class="section-title">Abono registrado</div>
    <div class="row"><span class="label">Fecha cobro</span><span class="value">${formatDateOnly(payment.date)}</span></div>
    <div class="row"><span class="label">Forma de pago</span><span class="value">${payment.method}</span></div>
    ${payment.note ? `<div class="row"><span class="label">Referencia</span><span class="value">${payment.note}</span></div>` : ''}
    <div class="row"><span class="label">Registrado por</span><span class="value">${payment.registeredBy}</span></div>
    <div class="row"><span class="label">Fecha registro</span><span class="value">${new Date(payment.registeredAt).toLocaleString('es-EC')}</span></div>
  </div>

  <div class="amount-box">
    <div class="am-label">Valor abonado</div>
    <div class="am-value">$ ${fmtMoney(payment.amount)}</div>
  </div>

  <div class="section">
    <div class="section-title">Resumen de cuenta</div>
    <div class="row"><span class="label">Valor total</span><span class="value">$ ${fmtMoney(total)}</span></div>
    <div class="row"><span class="label">Total abonado</span><span class="value">$ ${fmtMoney(abonado)}</span></div>
  </div>

  ${saldo === 0
    ? `<div class="paid-box">✅ CUENTA CANCELADA EN SU TOTALIDAD</div>`
    : `<div class="saldo-box"><span class="s-label">Saldo pendiente</span><span class="s-value">$ ${fmtMoney(saldo)}</span></div>`
  }

  <div class="signature">Firma del cliente / Recibí conforme</div>

  <div class="footer">
    <span>${nombreEmp} ${sloganEmp}</span>
    <span>Generado: ${new Date().toLocaleString('es-EC')}</span>
  </div>
</div>
</body></html>`;
  return html;
}

export function printReceipt(task, visit, payment) {
  const win = window.open('', '_blank', 'width=500,height=700');
  win.document.write(generateReceipt({ task, visit, payment }));
  win.document.close();
  win.focus();
}

// Convierte una visita de la colección plana en un objeto "task"-like para
// reutilizar las filas/columnas de BillingReport (clientName, serviceOrder,
// serviceType, etc.) sin necesitar un documento de tarea legado.
export function visitToDisplayTask(visit) {
  return {
    id:             visit.id,
    clientName:     visit.clientName   || '',
    clientPhone:    visit.phone        || '',
    clientAddress:  `${visit.ubicacion || ''} ${visit.address || ''}`.trim(),
    serviceType:    visit.serviceType  || '',
    serviceOrder:   visit.serviceOrder || '',
    identification: '',
  };
}

// Determina qué cuotas programadas (abonos) ya quedan cubiertas por el total
// realmente abonado, asignando en orden de fecha (más antigua primero) — no
// depende de un campo `estado` persistido, así siempre queda consistente
// aunque se agreguen/eliminen abonos reales o cuotas después.
export function computeCuotasPagadas(abonos, totalAbonado) {
  const ordenados = [...abonos].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
  let acumulado = 0;
  return ordenados.map(a => {
    acumulado += (parseFloat(a.valor) || 0);
    return { ...a, pagado: acumulado <= totalAbonado + 0.001 };
  });
}

// Escribe todos los documentos de visita en la subcollección (migra datos embebidos legacy)
async function saveVisitsToSubcollection(taskId, visits) {
  const batch = writeBatch(db);
  visits.forEach(v => {
    batch.set(doc(getVisitsRef(taskId), v.id), v);
  });
  await batch.commit();
}

// ─── Guardar datos de cobro en la visita ──────────────────────────────────────

export async function saveVisitBilling(taskId, visits, visitId, billingData) {
  const updated = visits.map(v =>
    v.id === visitId
      ? {
          ...v,
          valorCobrar:    billingData.valorCobrar    !== undefined ? billingData.valorCobrar    : v.valorCobrar,
          commitmentDate: billingData.commitmentDate !== undefined ? billingData.commitmentDate : v.commitmentDate,
        }
      : v
  );
  await saveVisitsToSubcollection(taskId, updated);
  return updated;
}

// ─── Añadir un abono ──────────────────────────────────────────────────────────

export async function addPayment(taskId, visits, visitId, paymentData, userEmail) {
  const visit = visits.find(v => v.id === visitId);
  if (!visit) throw new Error('Visita no encontrada');

  const newPayment = {
    id:           crypto.randomUUID(),
    date:         paymentData.date,
    amount:       parseFloat(paymentData.amount) || 0,
    method:       paymentData.method,
    note:         paymentData.note  || '',
    receiptNo:    generateReceiptNo(visitId),
    registeredBy: userEmail,
    registeredAt: new Date().toISOString(),
  };

  const updatedVisit  = { ...visit, payments: [...(visit.payments || []), newPayment] };
  const updatedVisits = visits.map(v => v.id === visitId ? updatedVisit : v);

  await saveVisitsToSubcollection(taskId, updatedVisits);
  return { updatedVisits, newPayment };
}

// ─── Eliminar un abono ────────────────────────────────────────────────────────

export async function deletePayment(taskId, visits, visitId, paymentId) {
  const visit = visits.find(v => v.id === visitId);
  if (!visit) return visits;

  const updatedVisit  = { ...visit, payments: (visit.payments || []).filter(p => p.id !== paymentId) };
  const updatedVisits = visits.map(v => v.id === visitId ? updatedVisit : v);

  await saveVisitsToSubcollection(taskId, updatedVisits);
  return updatedVisits;
}

// ─── Equivalentes para la colección plana tenants/{tenantId}/visits ──────────
// A diferencia del modelo legado (array de visitas embebido en una tarea), aquí
// cada visita es su propio documento — se actualiza directamente, sin batch.

export async function saveFlatVisitBilling(visitId, billingData) {
  const patch = {};
  if (billingData.valorCobrar    !== undefined) patch.valorCobrar    = billingData.valorCobrar;
  if (billingData.commitmentDate !== undefined) patch.commitmentDate = billingData.commitmentDate;
  await updateDoc(doc(getVisitsFlatRef(), visitId), patch);
  return patch;
}

export async function addFlatVisitPayment(visit, paymentData, userEmail) {
  const newPayment = {
    id:           crypto.randomUUID(),
    date:         paymentData.date,
    amount:       parseFloat(paymentData.amount) || 0,
    method:       paymentData.method,
    note:         paymentData.note  || '',
    receiptNo:    generateReceiptNo(visit.id),
    registeredBy: userEmail,
    registeredAt: new Date().toISOString(),
  };
  const payments = [...(visit.payments || []), newPayment];
  await updateDoc(doc(getVisitsFlatRef(), visit.id), { payments });
  return { updatedVisit: { ...visit, payments }, newPayment };
}

export async function deleteFlatVisitPayment(visit, paymentId) {
  const payments = (visit.payments || []).filter(p => p.id !== paymentId);
  await updateDoc(doc(getVisitsFlatRef(), visit.id), { payments });
  return { ...visit, payments };
}
