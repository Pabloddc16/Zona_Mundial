import { describe, it, expect } from 'vitest';
import { tierFor, priceForTier } from '../../src/logic.js';
import { PRICE_BY_TIER } from '../../src/data.js';

describe('tierFor', () => {
  it('escudo (logo) de un equipo es difícil', () => {
    expect(tierFor('logo', 'team', 'MEX')).toBe('dificil');
  });

  it('foto de equipo (type team) es media', () => {
    expect(tierFor('team', 'team', 'MEX')).toBe('media');
  });

  it('jugador (type player) en equipo es común', () => {
    expect(tierFor('player', 'team', 'MEX')).toBe('comun');
  });

  it('especial Leyendas siempre es difícil', () => {
    expect(tierFor('special', 'special', 'LEY')).toBe('dificil');
  });

  it('otros especiales son media', () => {
    expect(tierFor('special', 'special', 'EST')).toBe('media');
    expect(tierFor('special', 'special', 'MAS')).toBe('media');
    expect(tierFor('special', 'special', 'TRO')).toBe('media');
  });
});

describe('priceForTier', () => {
  it('comun cuesta 5', () => {
    expect(priceForTier('comun')).toBe(5);
  });

  it('media cuesta 15', () => {
    expect(priceForTier('media')).toBe(15);
  });

  it('dificil cuesta 30', () => {
    expect(priceForTier('dificil')).toBe(30);
  });

  it('coincide con la tabla PRICE_BY_TIER exportada por data.js', () => {
    expect(PRICE_BY_TIER).toEqual({ comun: 5, media: 15, dificil: 30 });
  });
});

describe('tierFor + priceForTier (precio efectivo por tier)', () => {
  it('jugador → comun → 5', () => {
    expect(priceForTier(tierFor('player', 'team', 'MEX'))).toBe(5);
  });
  it('foto equipo → media → 15', () => {
    expect(priceForTier(tierFor('team', 'team', 'MEX'))).toBe(15);
  });
  it('escudo → dificil → 30', () => {
    expect(priceForTier(tierFor('logo', 'team', 'MEX'))).toBe(30);
  });
});
