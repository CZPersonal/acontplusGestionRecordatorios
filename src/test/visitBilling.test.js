import { describe, it, expect } from 'vitest';
import { calcPaymentSummary, computeCuotasPagadas } from '../services/visitBilling.js';

describe('calcPaymentSummary', () => {
  it('sin pagos: saldo igual al total y no pagado', () => {
    expect(calcPaymentSummary({ valorCobrar: '100', payments: [] }))
      .toEqual({ total: 100, abonado: 0, saldo: 100, pagado: false });
  });

  it('pago exacto: saldo 0 y marcado como pagado', () => {
    expect(calcPaymentSummary({ valorCobrar: '100', payments: [{ amount: '100' }] }))
      .toEqual({ total: 100, abonado: 100, saldo: 0, pagado: true });
  });

  it('pagos parciales: saldo y abonado correctos', () => {
    expect(calcPaymentSummary({
      valorCobrar: '100',
      payments: [{ amount: '50' }, { amount: '30' }],
    })).toEqual({ total: 100, abonado: 80, saldo: 20, pagado: false });
  });

  it('sobrepago: saldo no puede ser negativo', () => {
    const result = calcPaymentSummary({ valorCobrar: '100', payments: [{ amount: '150' }] });
    expect(result.saldo).toBe(0);
    expect(result.pagado).toBe(true);
  });

  it('valorCobrar undefined se trata como 0 y pagado es false', () => {
    expect(calcPaymentSummary({ payments: [] }))
      .toEqual({ total: 0, abonado: 0, saldo: 0, pagado: false });
  });

  it('payments undefined se trata como array vacío', () => {
    expect(calcPaymentSummary({ valorCobrar: '50' }))
      .toEqual({ total: 50, abonado: 0, saldo: 50, pagado: false });
  });
});

describe('computeCuotasPagadas', () => {
  const cuota = (fecha, valor) => ({ id: fecha, fecha, valor });

  it('marca pagadas en orden de fecha hasta agotar el abonado', () => {
    const abonos = [cuota('2026-08-01', 50), cuota('2026-07-01', 50), cuota('2026-09-01', 50)];
    const result = computeCuotasPagadas(abonos, 100);
    const byFecha = Object.fromEntries(result.map(a => [a.fecha, a.pagado]));
    expect(byFecha).toEqual({ '2026-07-01': true, '2026-08-01': true, '2026-09-01': false });
  });

  it('sin abonado: ninguna cuota queda pagada', () => {
    const abonos = [cuota('2026-07-01', 50)];
    expect(computeCuotasPagadas(abonos, 0)[0].pagado).toBe(false);
  });

  it('abonado cubre exactamente el total de cuotas', () => {
    const abonos = [cuota('2026-07-01', 50), cuota('2026-08-01', 50)];
    const result = computeCuotasPagadas(abonos, 100);
    expect(result.every(a => a.pagado)).toBe(true);
  });

  it('no muta el array original', () => {
    const abonos = [cuota('2026-08-01', 50), cuota('2026-07-01', 50)];
    const copy = [...abonos];
    computeCuotasPagadas(abonos, 50);
    expect(abonos).toEqual(copy);
  });
});
