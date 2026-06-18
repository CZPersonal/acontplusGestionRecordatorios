import { describe, it, expect } from 'vitest';
import { localDateStr, formatDateOnly } from '../utils/dates.js';

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
