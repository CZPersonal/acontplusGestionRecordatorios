import { describe, it, expect } from 'vitest';
import {
  localDateStr, formatDateOnly,
  addMonthsClamped, generateMonthlySeries, dedupeSortDates, MAX_RECURRENCE_VISITS,
} from '../utils/dates.js';

describe('localDateStr', () => {
  it('formatea mes y día de un dígito con ceros', () => {
    expect(localDateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formatea fecha de fin de año correctamente', () => {
    expect(localDateStr(new Date(2025, 11, 31))).toBe('2025-12-31');
  });

  it('usa la fecha local actual cuando no recibe argumento', () => {
    const now      = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(localDateStr()).toBe(expected);
  });
});

describe('formatDateOnly', () => {
  it('convierte YYYY-MM-DD a DD/MM/YYYY', () => {
    expect(formatDateOnly('2026-01-05')).toBe('05/01/2026');
  });

  it('devuelve — para string vacío', () => {
    expect(formatDateOnly('')).toBe('—');
  });

  it('devuelve — para null', () => {
    expect(formatDateOnly(null)).toBe('—');
  });

  it('devuelve — para undefined', () => {
    expect(formatDateOnly(undefined)).toBe('—');
  });
});

describe('addMonthsClamped', () => {
  it('suma un mes en un caso simple', () => {
    expect(addMonthsClamped('2026-03-15', 1)).toBe('2026-04-15');
  });

  it('recorta el día al último válido del mes destino (31 ene -> feb no bisiesto)', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('recorta el día al último válido del mes destino (31 ene -> feb bisiesto)', () => {
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29');
  });

  it('cruza el fin de año correctamente', () => {
    expect(addMonthsClamped('2026-11-30', 2)).toBe('2027-01-30');
  });
});

describe('generateMonthlySeries', () => {
  it('genera 12 fechas mensuales incluyendo la fecha base', () => {
    const result = generateMonthlySeries('2026-01-15', '2026-12-31');
    expect(result).toHaveLength(12);
    expect(result[0]).toBe('2026-01-15');
    expect(result[11]).toBe('2026-12-15');
  });

  it('devuelve array vacío si la fecha fin es anterior a la fecha base', () => {
    expect(generateMonthlySeries('2026-06-01', '2026-01-01')).toEqual([]);
  });

  it('respeta el tope máximo aunque la fecha fin permita más', () => {
    const result = generateMonthlySeries('2026-01-01', '2099-12-31', 5);
    expect(result).toHaveLength(5);
  });

  it('usa MAX_RECURRENCE_VISITS (36) como tope por defecto', () => {
    const result = generateMonthlySeries('2026-01-01', '2099-12-31');
    expect(result).toHaveLength(MAX_RECURRENCE_VISITS);
  });
});

describe('dedupeSortDates', () => {
  it('quita duplicados y ordena cronológicamente', () => {
    expect(dedupeSortDates(['2026-03-01', '2026-01-01', '2026-03-01', '2026-02-01']))
      .toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
  });

  it('devuelve array vacío para entrada vacía', () => {
    expect(dedupeSortDates([])).toEqual([]);
  });
});
