import { describe, it, expect } from 'vitest';
import { cartAdd } from '../../src/logic.js';

describe('cartAdd', () => {
  it('agrega un item nuevo al carrito vacío con qty=1 por defecto', () => {
    const cart = {};
    cartAdd(cart, 'SOBRE-1');
    expect(cart).toEqual({ 'SOBRE-1': 1 });
  });

  it('respeta qty explícito al agregar item nuevo', () => {
    const cart = {};
    cartAdd(cart, 'CAJA-100', 3);
    expect(cart['CAJA-100']).toBe(3);
  });

  it('incrementa qty si el item ya existe', () => {
    const cart = { 'SOBRE-1': 2 };
    cartAdd(cart, 'SOBRE-1');
    expect(cart['SOBRE-1']).toBe(3);
    cartAdd(cart, 'SOBRE-1', 5);
    expect(cart['SOBRE-1']).toBe(8);
  });

  it('no permite agregar cantidades negativas (clamp a 1)', () => {
    const cart = {};
    cartAdd(cart, 'SOBRE-1', -3);
    expect(cart['SOBRE-1']).toBe(1);
  });

  it('no permite qty=0 (clamp a 1)', () => {
    const cart = {};
    cartAdd(cart, 'SOBRE-1', 0);
    expect(cart['SOBRE-1']).toBe(1);
  });

  it('ignora qty no numérico y usa 1', () => {
    const cart = {};
    cartAdd(cart, 'SOBRE-1', NaN);
    cartAdd(cart, 'SOBRE-1', 'lol');
    expect(cart['SOBRE-1']).toBe(2);
  });

  it('mantiene independencia entre items distintos', () => {
    const cart = {};
    cartAdd(cart, 'SOBRE-1', 2);
    cartAdd(cart, 'CAJA-100', 1);
    expect(cart).toEqual({ 'SOBRE-1': 2, 'CAJA-100': 1 });
  });

  it('rechaza id no string', () => {
    const cart = {};
    expect(() => cartAdd(cart, 123)).toThrow(TypeError);
    expect(() => cartAdd(cart, '')).toThrow(TypeError);
    expect(cart).toEqual({});
  });

  it('rechaza cart no objeto', () => {
    expect(() => cartAdd(null, 'X')).toThrow(TypeError);
  });
});
