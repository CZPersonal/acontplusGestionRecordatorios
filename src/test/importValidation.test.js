import { describe, it, expect, beforeEach } from 'vitest';
import { validateRow } from '../utils/importValidation.js';

const VALID_ROW = {
  foreignRaw:     'NO',
  foreign:        false,
  identification: '1712345678',
  name:           'Juan Pérez',
  address:        'Calle Principal 123',
  phone:          '0991234567',
  email:          '',
};

describe('validateRow', () => {
  let existingIds;
  let seenInFile;

  beforeEach(() => {
    existingIds = new Set();
    seenInFile  = new Map();
  });

  it('fila válida nacional no produce errores', () => {
    expect(validateRow(VALID_ROW, existingIds, seenInFile, 1)).toEqual([]);
  });

  it('RUC de 13 dígitos es válido', () => {
    const row = { ...VALID_ROW, identification: '1790123456001' };
    expect(validateRow(row, existingIds, seenInFile, 1)).toEqual([]);
  });

  it('cliente extranjero con letras en ID es válido', () => {
    const row = { ...VALID_ROW, foreignRaw: 'SI', foreign: true, identification: 'A1234567' };
    expect(validateRow(row, existingIds, seenInFile, 1)).toEqual([]);
  });

  it('foreignRaw vacío genera error', () => {
    const errors = validateRow({ ...VALID_ROW, foreignRaw: '' }, existingIds, seenInFile, 1);
    expect(errors).toContain('Campo Extranjero vacío (debe ser SI o NO)');
  });

  it('identificación vacía genera error', () => {
    const errors = validateRow({ ...VALID_ROW, identification: '' }, existingIds, seenInFile, 1);
    expect(errors).toContain('Cédula/RUC vacía');
  });

  it('identificación con letras para nacional genera error', () => {
    const errors = validateRow({ ...VALID_ROW, identification: 'ABC1234567' }, existingIds, seenInFile, 1);
    expect(errors).toContain('Contiene letras — solo números para clientes nacionales');
  });

  it('identificación de longitud inválida genera error', () => {
    const errors = validateRow({ ...VALID_ROW, identification: '12345' }, existingIds, seenInFile, 1);
    expect(errors.some(e => e.includes('Longitud inválida'))).toBe(true);
  });

  it('cédula duplicada dentro del mismo archivo genera error', () => {
    seenInFile.set('1712345678', 1);
    const errors = validateRow(VALID_ROW, existingIds, seenInFile, 2);
    expect(errors.some(e => e.includes('repetida en el archivo'))).toBe(true);
  });

  it('identificación ya existente en BD genera error', () => {
    existingIds.add('1712345678');
    const errors = validateRow(VALID_ROW, existingIds, seenInFile, 1);
    expect(errors).toContain('Ya existe en el sistema — no se importará');
  });

  it('nombre vacío genera error', () => {
    expect(validateRow({ ...VALID_ROW, name: '' }, existingIds, seenInFile, 1))
      .toContain('Nombre vacío');
  });

  it('dirección vacía genera error', () => {
    expect(validateRow({ ...VALID_ROW, address: '' }, existingIds, seenInFile, 1))
      .toContain('Dirección vacía');
  });

  it('teléfono vacío genera error', () => {
    expect(validateRow({ ...VALID_ROW, phone: '' }, existingIds, seenInFile, 1))
      .toContain('Teléfono vacío');
  });

  it('múltiples campos vacíos acumulan todos los errores', () => {
    const errors = validateRow({ ...VALID_ROW, name: '', address: '', phone: '' }, existingIds, seenInFile, 1);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
