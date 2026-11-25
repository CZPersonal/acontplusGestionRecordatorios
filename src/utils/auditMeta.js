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
