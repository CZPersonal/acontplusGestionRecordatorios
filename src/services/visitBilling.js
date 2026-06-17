import { doc, writeBatch } from 'firebase/firestore';
import { db, getVisitsRef } from '../lib/firebase';

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
