import { describe, expect, it } from 'vitest';

import { esEnlaceCorto, parsearLinkGmaps } from '../../src/lib/gmaps';

function ok(entrada: string) {
  const resultado = parsearLinkGmaps(entrada);
  if (!resultado.ok) throw new Error(`Se esperaba éxito para ${entrada}: ${resultado.error}`);
  return resultado.coordenadas;
}

describe('parsearLinkGmaps', () => {
  it('prioriza la posición exacta del pin (!3d!4d)', () => {
    const c = ok(
      'https://www.google.com/maps/place/Plaza/@-33.0400,-71.5200,17z/data=!4m6!3m5!1s0x0!8m2!3d-33.04512!4d-71.5231',
    );
    expect(c.lat).toBeCloseTo(-33.04512, 5);
    expect(c.lng).toBeCloseTo(-71.5231, 5);
    expect(c.fuente).toBe('pin');
  });

  it('usa el centro del mapa cuando no hay pin', () => {
    const c = ok('https://www.google.com/maps/@-33.0455,-71.5215,14z');
    expect(c.lat).toBeCloseTo(-33.0455, 5);
    expect(c.lng).toBeCloseTo(-71.5215, 5);
    expect(c.fuente).toBe('centro-mapa');
  });

  it('lee q=', () => {
    const c = ok('https://www.google.com/maps?q=-33.0451,-71.5231');
    expect(c.fuente).toBe('parametro');
    expect(c.lat).toBeCloseTo(-33.0451, 5);
  });

  it('lee query=', () => {
    const c = ok('https://maps.google.com/?query=-33.05,-71.51');
    expect(c.lat).toBeCloseTo(-33.05, 5);
    expect(c.lng).toBeCloseTo(-71.51, 5);
  });

  it('lee ll=', () => {
    const c = ok('https://maps.google.com/maps?ll=-33.05,-71.51&z=15');
    expect(c.lat).toBeCloseTo(-33.05, 5);
  });

  it('lee destination= de un link de indicaciones', () => {
    const c = ok('https://www.google.com/maps/dir/?api=1&destination=-33.0512,-71.51');
    expect(c.lat).toBeCloseTo(-33.0512, 5);
    expect(c.lng).toBeCloseTo(-71.51, 5);
  });

  it('lee coordenadas pegadas como texto', () => {
    const c = ok('-33.0451, -71.5231');
    expect(c.fuente).toBe('texto');
    expect(c.lat).toBeCloseTo(-33.0451, 5);
  });

  it('normaliza coordenadas con coma decimal', () => {
    const c = ok('-33,0451, -71,5231');
    expect(c.lat).toBeCloseTo(-33.0451, 5);
    expect(c.lng).toBeCloseTo(-71.5231, 5);
  });

  it('lee /maps/place/lat,lng en la ruta', () => {
    const c = ok('https://www.google.com/maps/place/-33.0498,-71.5142');
    expect(c.lat).toBeCloseTo(-33.0498, 5);
  });

  it('acepta coordenadas negativas y cero', () => {
    const c = ok('https://www.google.com/maps?q=0,-0.5');
    expect(c.lat).toBe(0);
    expect(c.lng).toBeCloseTo(-0.5, 5);
  });

  it('decodifica parámetros con %2C', () => {
    const c = ok('https://www.google.com/maps?q=-33.0451%2C-71.5231');
    expect(c.lat).toBeCloseTo(-33.0451, 5);
  });

  it('detecta enlaces cortos de maps.app.goo.gl', () => {
    const resultado = parsearLinkGmaps('https://maps.app.goo.gl/AbCdEf123');
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.esCorto).toBe(true);
      expect(resultado.error).toMatch(/servidor/i);
    }
  });

  it('detecta enlaces cortos de goo.gl/maps', () => {
    expect(esEnlaceCorto('https://goo.gl/maps/abc')).toBe(true);
    const resultado = parsearLinkGmaps('https://goo.gl/maps/abc');
    expect(resultado.ok).toBe(false);
  });

  it('rechaza latitudes fuera de rango', () => {
    const resultado = parsearLinkGmaps('https://www.google.com/maps?q=123.4,-71.5');
    expect(resultado.ok).toBe(false);
  });

  it('rechaza longitudes fuera de rango', () => {
    const resultado = parsearLinkGmaps('-33.04, -200.1');
    expect(resultado.ok).toBe(false);
  });

  it('explica cuando el link no tiene coordenadas', () => {
    const resultado = parsearLinkGmaps('https://www.google.com/maps/place/Santiago');
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toMatch(/coordenadas/i);
  });

  it('rechaza texto vacío o basura', () => {
    expect(parsearLinkGmaps('').ok).toBe(false);
    const basura = parsearLinkGmaps('no soy un link');
    expect(basura.ok).toBe(false);
  });

  it('conserva el link original', () => {
    const entrada = 'https://www.google.com/maps?q=-33.0451,-71.5231&z=16';
    const resultado = parsearLinkGmaps(entrada);
    if (!resultado.ok) throw new Error('debía parsear');
    expect(resultado.urlOriginal).toBe(entrada);
  });
});
