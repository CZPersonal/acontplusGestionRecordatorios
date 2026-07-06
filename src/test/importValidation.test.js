import { describe, it, expect } from 'vitest';
import { normalizeRow, groupRowsByClient, validateGroup } from '../utils/importValidation.js';

describe('normalizeRow', () => {
  it('mapea columnas en español a la estructura canónica', () => {
    const row = normalizeRow({
      RUC: '1712345678', NOMBRE: 'Juan Pérez', UBICACION: 'Casa', CIUDAD: 'Quito',
      EMAIL: 'juan@email.com', DIRECCION: 'Av. Principal 123', TELEFONO: '0991234567',
      EQUIPO: '', OBSERVACION: 'OZONO',
    });
    expect(row).toMatchObject({
      identification: '1712345678', name: 'Juan Pérez', ubicacion: 'Casa', ciudad: 'Quito',
      email: 'juan@email.com', address: 'Av. Principal 123', phone: '0991234567',
    });
  });

  it('usa Observación como respaldo de tipo de servicio cuando Equipo está vacío', () => {
    const row = normalizeRow({ RUC: '1', NOMBRE: 'X', EQUIPO: '', OBSERVACION: 'OZONO' });
    expect(row.serviceType).toBe('OZONO');
  });

  it('prioriza Equipo sobre Observación cuando ambos vienen llenos', () => {
    const row = normalizeRow({ RUC: '1', NOMBRE: 'X', EQUIPO: 'Ozonizador', OBSERVACION: 'Nota libre' });
    expect(row.serviceType).toBe('Ozonizador');
  });

  it('acepta un RUC placeholder (cliente sin cédula real)', () => {
    const row = normalizeRow({ RUC: 'RUC00015', NOMBRE: 'Tatiana Malla' });
    expect(row.identification).toBe('RUC00015');
  });

  it('detecta cliente extranjero cuando la columna Extranjero está presente', () => {
    const row = normalizeRow({ Extranjero: 'SI', RUC: 'A1234567', NOMBRE: 'John Smith' });
    expect(row.foreign).toBe(true);
  });

  it('sin columna Extranjero, foreign queda en false', () => {
    const row = normalizeRow({ RUC: '1712345678', NOMBRE: 'Juan Pérez' });
    expect(row.foreign).toBe(false);
    expect(row.foreignRaw).toBe('');
  });
});

describe('groupRowsByClient', () => {
  it('agrupa varias filas con el mismo RUC en un solo cliente', () => {
    const rows = [
      normalizeRow({ RUC: '2100329800001', NOMBRE: 'Robin Espinoza', UBICACION: 'Casa' }),
      normalizeRow({ RUC: '2100329800001', NOMBRE: 'Robin Espinoza', UBICACION: 'Casa Papá' }),
      normalizeRow({ RUC: 'RUC00047', NOMBRE: 'Nestor Andy', UBICACION: 'Casa 1' }),
    ];
    const groups = groupRowsByClient(rows);
    expect(groups).toHaveLength(2);
    const robin = groups.find(g => g.identification === '2100329800001');
    expect(robin.rows).toHaveLength(2);
    expect(robin.rows.map(r => r.ubicacion)).toEqual(['Casa', 'Casa Papá']);
  });

  it('una sola fila produce un grupo con una ubicación', () => {
    const rows = [normalizeRow({ RUC: '111', NOMBRE: 'Alguien' })];
    const groups = groupRowsByClient(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].rows).toHaveLength(1);
  });

  it('limpia espacios del RUC al agrupar', () => {
    const rows = [
      normalizeRow({ RUC: ' 111 ', NOMBRE: 'A' }),
      normalizeRow({ RUC: '111', NOMBRE: 'A' }),
    ];
    expect(groupRowsByClient(rows)).toHaveLength(1);
  });
});

describe('validateGroup', () => {
  const existingIds = new Set();

  it('grupo válido con RUC y nombre no produce errores', () => {
    const group = { identification: '1712345678', name: 'Juan Pérez', rows: [] };
    const result = validateGroup(group, existingIds);
    expect(result).toEqual({ errors: [], existing: false, valid: true });
  });

  it('RUC placeholder (sin formato estándar) es válido', () => {
    const group = { identification: 'RUC00015', name: 'Tatiana Malla', rows: [] };
    expect(validateGroup(group, existingIds).valid).toBe(true);
  });

  it('RUC vacío genera error bloqueante', () => {
    const group = { identification: '', name: 'Juan Pérez', rows: [] };
    const result = validateGroup(group, existingIds);
    expect(result.errors).toContain('Cédula/RUC vacía');
    expect(result.valid).toBe(false);
  });

  it('nombre vacío genera error bloqueante', () => {
    const group = { identification: '123', name: '', rows: [] };
    const result = validateGroup(group, existingIds);
    expect(result.errors).toContain('Nombre vacío');
    expect(result.valid).toBe(false);
  });

  it('cliente ya existente en el sistema no es válido pero no tiene errores', () => {
    existingIds.add('1712345678');
    const group = { identification: '1712345678', name: 'Juan Pérez', rows: [] };
    const result = validateGroup(group, existingIds);
    expect(result).toEqual({ errors: [], existing: true, valid: false });
  });
});
