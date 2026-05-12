import { describe, it, expect } from 'vitest';
import { migrateState } from '../../src/logic.js';

describe('migrateState (v1 → v3)', () => {
  it('mapea screen "home" → "album"', () => {
    const out = migrateState({ screen: 'home', ui: {} });
    expect(out.screen).toBe('album');
  });

  it('mapea ui.tab "home" → "album"', () => {
    const out = migrateState({ ui: { tab: 'home' } });
    expect(out.ui.tab).toBe('album');
  });

  it('mapea ui.albumSub "have" → "todas"', () => {
    const out = migrateState({ ui: { albumSub: 'have' } });
    expect(out.ui.albumSub).toBe('todas');
  });

  it('mapea ui.albumSub "need" → "faltantes"', () => {
    const out = migrateState({ ui: { albumSub: 'need' } });
    expect(out.ui.albumSub).toBe('faltantes');
  });

  it('mapea ui.albumSub "swap" → "repetidas"', () => {
    const out = migrateState({ ui: { albumSub: 'swap' } });
    expect(out.ui.albumSub).toBe('repetidas');
  });

  it('aplica las cuatro migraciones en un mismo payload v1', () => {
    const v1 = {
      screen: 'home',
      cart: { 'SOBRE-1': 2 },
      ui: { tab: 'home', albumSub: 'have' },
    };
    const out = migrateState(v1);
    expect(out.screen).toBe('album');
    expect(out.ui.tab).toBe('album');
    expect(out.ui.albumSub).toBe('todas');
    expect(out.cart).toEqual({ 'SOBRE-1': 2 });
  });

  it('preserva valores ya migrados (idempotente)', () => {
    const v3 = {
      screen: 'album',
      ui: { tab: 'album', albumSub: 'faltantes' },
    };
    const out = migrateState(v3);
    expect(out.screen).toBe('album');
    expect(out.ui.tab).toBe('album');
    expect(out.ui.albumSub).toBe('faltantes');
  });

  it('rellena defaults en ui cuando faltan campos', () => {
    const out = migrateState({});
    expect(out.ui.tab).toBe('album');
    expect(out.ui.albumSub).toBe('todas');
    expect(out.ui.tiendaCat).toBe('all');
    expect(out.ui.payMethod).toBe('card');
  });

  it('reemplaza myPanini con shape v3 si viene del shape viejo (sin step)', () => {
    const out = migrateState({ myPanini: { foo: 'bar' } });
    expect(out.myPanini.step).toBe(1);
    expect(out.myPanini.fields).toEqual({ name: '', birthDate: '', heightCm: null, weightKg: null, team: '' });
  });

  it('acepta entrada nula sin lanzar', () => {
    expect(() => migrateState(null)).not.toThrow();
    const out = migrateState(null);
    expect(out.screen).toBe('album');
  });
});
