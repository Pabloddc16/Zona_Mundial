import { describe, it, expect } from 'vitest';
import { parseCode } from '../../src/logic.js';

describe('parseCode', () => {
  it('parsea un código de equipo válido en mayúsculas (MEX01)', () => {
    const r = parseCode('MEX01');
    expect(r).not.toBeNull();
    expect(r.gid).toBe('TEAM-MEX');
    expect(r.n).toBe(1);
    expect(r.sticker.code).toBe('MEX01');
  });

  it('parsea un código de sección especial (LEY09)', () => {
    const r = parseCode('LEY09');
    expect(r).not.toBeNull();
    expect(r.gid).toBe('LEYENDAS');
    expect(r.n).toBe(9);
  });

  it('parsea un código de la subsección Balls and Countries (BNC05)', () => {
    const r = parseCode('BNC05');
    expect(r).not.toBeNull();
    expect(r.gid).toBe('BALLS_COUNTRIES');
    expect(r.n).toBe(5);
  });

  it('parsea Specials que empiezan en n=0 (MAS00)', () => {
    const r = parseCode('MAS00');
    expect(r).not.toBeNull();
    expect(r.gid).toBe('MASCOTAS');
    expect(r.n).toBe(0);
  });

  it('parsea Coca-Cola con su propia numeración 1..14 (COC07)', () => {
    const r = parseCode('COC07');
    expect(r).not.toBeNull();
    expect(r.gid).toBe('COCA_COLA');
    expect(r.n).toBe(7);
  });

  it('rechaza Coca-Cola fuera de rango (COC15)', () => {
    expect(parseCode('COC15')).toBeNull();
    expect(parseCode('COC00')).toBeNull(); // empieza en 1
  });

  it('rechaza códigos viejos que ya no existen tras la restructura', () => {
    expect(parseCode('LEY03')).toBeNull(); // History ahora empieza en 9
    expect(parseCode('EST07')).toBeNull(); // EST se merged a BNC
    expect(parseCode('TRO04')).toBeNull(); // TRO se merged a BNC
    expect(parseCode('MAS06')).toBeNull(); // Specials ahora son 5 (n=0..4)
  });

  it('normaliza minúsculas a mayúsculas (mex07 → MEX07)', () => {
    const r = parseCode('mex07');
    expect(r).not.toBeNull();
    expect(r.gid).toBe('TEAM-MEX');
    expect(r.n).toBe(7);
    expect(r.sticker.code).toBe('MEX07');
  });

  it('descarta separadores y espacios (" mex - 09 " → MEX09)', () => {
    const r = parseCode(' mex - 09 ');
    expect(r).not.toBeNull();
    expect(r.gid).toBe('TEAM-MEX');
    expect(r.n).toBe(9);
  });

  it('devuelve null para entradas que no matchean el regex', () => {
    expect(parseCode('')).toBeNull();
    expect(parseCode('M1')).toBeNull();
    expect(parseCode('MEXICO01')).toBeNull();
    expect(parseCode('1234')).toBeNull();
    expect(parseCode(null)).toBeNull();
    expect(parseCode(undefined)).toBeNull();
  });

  it('devuelve null para prefijo desconocido (ZZZ01)', () => {
    expect(parseCode('ZZZ01')).toBeNull();
  });

  it('devuelve null para número fuera de rango del grupo (MEX99)', () => {
    expect(parseCode('MEX99')).toBeNull();
  });
});
