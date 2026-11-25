// Metadatos para audit_log. Funciones puras (sin Firebase) para poder probarlas.
// Firestore rechaza valores `undefined`, por eso todo se normaliza a ''.

/**
 * Datos que identifican una visita aunque luego cambie o se pierda.
 * @param {object|undefined} visit - Visita tal como está en el store (puede faltar).
 */
export function visitAuditMeta(visit) {
  const v = visit || {};
  return {
    clientName:     v.clientName    || '',
    serviceOrder:   v.serviceOrder  || '',
    scheduledDate:  v.scheduledDate || '',
    visitNumber:    v.visitNumber   || '',
    previousStatus: v.status        || '',
  };
}

/**
 * Datos de un pago realizado (visit.payments[]) que se anula.
 * @param {object|undefined} visit   - Visita que contiene el pago.
 * @param {object|undefined} payment - El pago anulado.
 */
export function paymentAuditMeta(visit, payment) {
  const v = visit || {};
  const p = payment || {};
  return {
    clientName:   v.clientName   || '',
    serviceOrder: v.serviceOrder || '',
    visitId:      v.id           || '',
    amount:       parseFloat(p.amount) || 0,
    method:       p.method       || '',
    receiptNo:    p.receiptNo    || '',
    date:         p.date         || '',
  };
}

/**
 * Datos de un abono programado (colección `abonos`) que se anula.
 * @param {object|undefined} abono
 */
export function abonoAuditMeta(abono) {
  const a = abono || {};
  return {
    clientName:   a.clientName   || '',
    serviceOrder: a.serviceOrder || '',
    visitId:      a.visitId      || '',
    valor:        parseFloat(a.valor) || 0,
    fecha:        a.fecha        || '',
  };
}

/**
 * Datos que identifican un cliente en el log.
 * @param {object|undefined} client - Cliente tal como está en el store (puede faltar).
 */
export function clientAuditMeta(client) {
  const c = client || {};
  return {
    clientName:     c.name           || '',
    identification: c.identification || '',
  };
}
