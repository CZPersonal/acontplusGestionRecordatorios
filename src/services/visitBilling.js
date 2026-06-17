import { doc, updateDoc } from 'firebase/firestore';
import { getCollectionRef } from '../lib/firebase';

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

// ─── Guardar datos de cobro en la visita ──────────────────────────────────────

export async function saveVisitBilling(taskId, visits, visitId, billingData) {
  const updated = visits.map(v =>
    v.id === visitId
      ? {
          ...v,
          valorCobrar:     billingData.valorCobrar     !== undefined ? billingData.valorCobrar     : v.valorCobrar,
          commitmentDate:  billingData.commitmentDate  !== undefined ? billingData.commitmentDate  : v.commitmentDate,
          payments:        billingData.payments        !== undefined ? billingData.payments        : (v.payments || []),
        }
      : v
  );
  await updateDoc(
    doc(getCollectionRef('water_filter_tasks'), taskId),
    { visits: updated }
  );
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
    method:       paymentData.method,            // 'Efectivo' | 'Transferencia' | 'Cheque' | 'Otro'
    note:         paymentData.note  || '',
    receiptNo:    generateReceiptNo(visitId),
    registeredBy: userEmail,
    registeredAt: new Date().toISOString(),
  };

  const updatedPayments = [...(visit.payments || []), newPayment];
  const updated = visits.map(v =>
    v.id === visitId ? { ...v, payments: updatedPayments } : v
  );

  await updateDoc(
    doc(getCollectionRef('water_filter_tasks'), taskId),
    { visits: updated }
  );
  return { updatedVisits: updated, newPayment };
}

// ─── Eliminar un abono ────────────────────────────────────────────────────────

export async function deletePayment(taskId, visits, visitId, paymentId) {
  const visit = visits.find(v => v.id === visitId);
  if (!visit) return;
  const updatedPayments = (visit.payments || []).filter(p => p.id !== paymentId);
  const updated = visits.map(v =>
    v.id === visitId ? { ...v, payments: updatedPayments } : v
  );
  await updateDoc(
    doc(getCollectionRef('water_filter_tasks'), taskId),
    { visits: updated }
  );
  return updated;
}
