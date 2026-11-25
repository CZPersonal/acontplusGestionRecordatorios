import { describe, it, expect } from 'vitest';
import { windowStartDate, mergeVisits, prefixRange, searchVariants } from '../utils/visitWindow';

describe('windowStartDate', () => {
  it('resta días en fecha local', () => {
    expect(windowStartDate(new Date(2026, 10, 25), 90)).toBe('2026-08-27');
  });
  it('cruza de año', () => {
    expect(windowStartDate(new Date(2027, 0, 10), 30)).toBe('2026-12-11');
  });
});

describe('mergeVisits', () => {
  it('une por id y ordena por createdAt desc', () => {
    const r = mergeVisits(
      [{ id: 'a', createdAt: '2026-01-01' }, { id: 'b', createdAt: '2026-03-01' }],
      [{ id: 'a', createdAt: '2026-01-01', x: 1 }, { id: 'c', createdAt: '2026-02-01' }],
    );
    expect(r.map(v => v.id)).toEqual(['b', 'c', 'a']);
    expect(r.find(v => v.id === 'a').x).toBe(1);
  });
  it('tolera listas vacías o nulas', () => {
    expect(mergeVisits(null, undefined, [])).toEqual([]);
  });
});

describe('prefixRange / searchVariants', () => {
  it('construye el rango de prefijo', () => {
    expect(prefixRange('21')).toEqual(['21', '21']);
  });
  it('exige largo mínimo y agrega variante en mayúsculas', () => {
    expect(searchVariants('21')).toEqual([]);
    expect(searchVariants('2104')).toEqual(['2104']);
    expect(searchVariants(' jorge ')).toEqual(['jorge', 'JORGE']);
  });
});
