import { describe, it, expect } from 'vitest';
import {
  localDateStr, formatDateOnly,
  addMonthsClamped, nearestBusinessDay, generatePeriodicSeries, dedupeSortDates, MAX_RECURRENCE_VISITS,
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

describe('nearestBusinessDay', () => {
  it('corre el sábado al viernes anterior', () => {
    expect(nearestBusinessDay('2026-01-03')).toBe('2026-01-02'); // sábado -> viernes
  });

  it('corre el domingo al lunes siguiente', () => {
    expect(nearestBusinessDay('2026-01-04')).toBe('2026-01-05'); // domingo -> lunes
  });

  it('deja igual un día entre semana', () => {
    expect(nearestBusinessDay('2026-01-05')).toBe('2026-01-05'); // lunes
  });
});

describe('generatePeriodicSeries', () => {
  it('genera N fechas mensuales incluyendo la fecha base', () => {
    const result = generatePeriodicSeries('2026-01-15', { stepMonths: 1, count: 12 });
    expect(result).toHaveLength(12);
    expect(result[0]).toBe('2026-01-15');
    expect(result[11]).toBe('2026-12-15');
  });

  it('genera fechas semestrales (cada 6 meses)', () => {
    const result = generatePeriodicSeries('2026-01-15', { stepMonths: 6, count: 4 });
    expect(result).toEqual(['2026-01-15', '2026-07-15', '2027-01-15', '2027-07-15']);
  });

  it('respeta el tope máximo aunque la cantidad pedida sea mayor', () => {
    const result = generatePeriodicSeries('2026-01-01', { stepMonths: 1, count: 100, max: 5 });
    expect(result).toHaveLength(5);
  });

  it('usa MAX_RECURRENCE_VISITS (36) como tope por defecto', () => {
    const result = generatePeriodicSeries('2026-01-01', { stepMonths: 1, count: 100 });
    expect(result).toHaveLength(MAX_RECURRENCE_VISITS);
  });

  it('sin count devuelve array vacío', () => {
    expect(generatePeriodicSeries('2026-01-01', { stepMonths: 1 })).toEqual([]);
  });

  it('con businessDaysOnly corre las fechas de fin de semana al día hábil más cercano', () => {
    // 2026-01-03 es sábado; +1 mes cae en 2026-02-03 (martes, no se ajusta)
    const result = generatePeriodicSeries('2026-01-03', { stepMonths: 1, count: 2, businessDaysOnly: true });
    expect(result).toEqual(['2026-01-02', '2026-02-03']);
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
