import { describe, it, expect } from 'vitest';
import { visitAuditMeta, clientAuditMeta, paymentAuditMeta, abonoAuditMeta } from '../utils/auditMeta';

const hasUndefined = (o) => Object.values(o).some(v => v === undefined);

describe('visitAuditMeta', () => {
  it('extrae los datos que identifican la visita', () => {
    const meta = visitAuditMeta({
      id: 'v1', clientName: 'ANA LOPEZ', serviceOrder: '2196',
      scheduledDate: '2026-11-30', visitNumber: 'V-0161', status: 'Programada', otro: 'x',
    });
    expect(meta).toEqual({
      clientName: 'ANA LOPEZ', serviceOrder: '2196', scheduledDate: '2026-11-30',
      visitNumber: 'V-0161', previousStatus: 'Programada',
    });
  });

  it('nunca devuelve undefined si faltan campos', () => {
    const meta = visitAuditMeta({ clientName: 'SIN OS' });
    expect(hasUndefined(meta)).toBe(false);
    expect(meta.serviceOrder).toBe('');
  });

  it('tolera una visita inexistente (no está en el store)', () => {
    expect(hasUndefined(visitAuditMeta(undefined))).toBe(false);
    expect(hasUndefined(visitAuditMeta(null))).toBe(false);
  });
});

describe('clientAuditMeta', () => {
  it('extrae nombre e identificación', () => {
    expect(clientAuditMeta({ id: '1', name: 'HENRY CRUZ', identification: '1712345678', active: true }))
      .toEqual({ clientName: 'HENRY CRUZ', identification: '1712345678' });
  });

  it('nunca devuelve undefined y tolera cliente inexistente', () => {
    expect(hasUndefined(clientAuditMeta({ name: 'X' }))).toBe(false);
    expect(clientAuditMeta(undefined)).toEqual({ clientName: '', identification: '' });
  });
});

describe('paymentAuditMeta / abonoAuditMeta', () => {
  it('paymentAuditMeta identifica el pago y la visita, sin undefined', () => {
    const m = paymentAuditMeta(
      { id: 'v1', clientName: 'ANA LOPEZ', serviceOrder: '2196' },
      { amount: '25.5', method: 'Efectivo', receiptNo: 'REC-1', date: '2026-11-24' },
    );
    expect(m).toEqual({ clientName: 'ANA LOPEZ', serviceOrder: '2196', visitId: 'v1', amount: 25.5, method: 'Efectivo', receiptNo: 'REC-1', date: '2026-11-24' });
    expect(hasUndefined(paymentAuditMeta(undefined, undefined))).toBe(false);
  });

  it('abonoAuditMeta identifica la cuota, sin undefined', () => {
    const m = abonoAuditMeta({ clientName: 'X', serviceOrder: '1', visitId: 'v', valor: '10', fecha: '2026-12-01' });
    expect(m).toEqual({ clientName: 'X', serviceOrder: '1', visitId: 'v', valor: 10, fecha: '2026-12-01' });
    expect(abonoAuditMeta(null).valor).toBe(0);
    expect(hasUndefined(abonoAuditMeta({}))).toBe(false);
  });
});
