import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../hooks/usePagination.js';

const makeItems = (n) => Array.from({ length: n }, (_, i) => i + 1);

describe('usePagination', () => {
  it('primera página contiene los primeros 10 items', () => {
    const { result } = renderHook(() => usePagination(makeItems(15)));
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('goToPage(2) navega a la segunda página', () => {
    const { result } = renderHook(() => usePagination(makeItems(15)));
    act(() => result.current.goToPage(2));
    expect(result.current.currentPage).toBe(2);
    expect(result.current.paginatedItems).toEqual([11, 12, 13, 14, 15]);
  });

  it('goToPage con número mayor al total queda en la última página', () => {
    const { result } = renderHook(() => usePagination(makeItems(15)));
    act(() => result.current.goToPage(99));
    expect(result.current.currentPage).toBe(2);
  });

  it('goToPage(0) queda en página 1', () => {
    const { result } = renderHook(() => usePagination(makeItems(15)));
    act(() => result.current.goToPage(0));
    expect(result.current.currentPage).toBe(1);
  });

  it('lista vacía devuelve totalPages 1 y array vacío', () => {
    const { result } = renderHook(() => usePagination([]));
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedItems).toEqual([]);
    expect(result.current.totalItems).toBe(0);
  });

  it('resetPage regresa a página 1 desde cualquier página', () => {
    const { result } = renderHook(() => usePagination(makeItems(25)));
    act(() => result.current.goToPage(3));
    act(() => result.current.resetPage());
    expect(result.current.currentPage).toBe(1);
  });

  it('startIndex y endIndex correctos en primera página', () => {
    const { result } = renderHook(() => usePagination(makeItems(15)));
    expect(result.current.startIndex).toBe(1);
    expect(result.current.endIndex).toBe(10);
  });

  it('endIndex en última página no supera el total de items', () => {
    const { result } = renderHook(() => usePagination(makeItems(15)));
    act(() => result.current.goToPage(2));
    expect(result.current.endIndex).toBe(15);
  });

  it('respeta itemsPerPage personalizado', () => {
    const { result } = renderHook(() => usePagination(makeItems(10), 5));
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedItems).toHaveLength(5);
  });

  it('página se ajusta automáticamente cuando los items disminuyen', () => {
    const { result, rerender } = renderHook(
      ({ items }) => usePagination(items),
      { initialProps: { items: makeItems(25) } }
    );
    act(() => result.current.goToPage(3));
    rerender({ items: makeItems(5) });
    expect(result.current.currentPage).toBe(1);
  });
});
