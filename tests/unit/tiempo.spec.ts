import { describe, expect, it } from 'vitest';

import {
  aIsoChile,
  antiguedadMs,
  esDesactualizado,
  estaVigente,
  etiquetaFrescura,
  formatearDuracion,
  formatearRelativa,
  offsetChile,
} from '../../src/lib/tiempo';

describe('aIsoChile', () => {
  it('usa -03:00 en horario de verano', () => {
    expect(aIsoChile(new Date('2026-01-15T12:00:00Z'))).toBe('2026-01-15T09:00:00-03:00');
  });

  it('usa -04:00 en horario de invierno', () => {
    expect(aIsoChile(new Date('2026-07-15T12:00:00Z'))).toBe('2026-07-15T08:00:00-04:00');
  });

  it('cruza la medianoche correctamente', () => {
    expect(aIsoChile(new Date('2026-01-16T02:30:00Z'))).toBe('2026-01-15T23:30:00-03:00');
  });

  it('respeta el cambio de hora de septiembre', () => {
    expect(offsetChile(new Date('2026-09-05T12:00:00Z'))).toBe('-04:00');
    expect(offsetChile(new Date('2026-09-07T12:00:00Z'))).toBe('-03:00');
  });
});

describe('formatearRelativa', () => {
  const ahora = new Date('2026-11-05T18:00:00Z');

  it('describe minutos', () => {
    expect(formatearRelativa('2026-11-05T17:55:00Z', ahora)).toBe('hace 5 minutos');
  });

  it('describe horas', () => {
    expect(formatearRelativa('2026-11-05T15:00:00Z', ahora)).toBe('hace 3 horas');
  });

  it('describe días', () => {
    expect(formatearRelativa('2026-11-03T12:00:00Z', ahora)).toBe('hace 2 días');
  });

  it('describe el futuro próximo', () => {
    expect(formatearRelativa('2026-11-05T20:00:00Z', ahora)).toBe('dentro de 2 horas');
  });

  it('no dice "en 0 segundos"', () => {
    expect(formatearRelativa('2026-11-05T18:00:00Z', ahora)).toBe('ahora');
  });
});

describe('frescura', () => {
  const ahora = new Date('2026-11-05T18:00:00Z');

  it('marca desactualizado pasado el umbral', () => {
    expect(esDesactualizado('2026-11-05T05:00:00Z', 12, ahora)).toBe(true);
    expect(esDesactualizado('2026-11-05T08:00:00Z', 12, ahora)).toBe(false);
  });

  it('entrega texto relativo y absoluto', () => {
    const etiqueta = etiquetaFrescura('2026-11-05T17:30:00Z', 12, ahora);
    expect(etiqueta.texto).toBe('Actualizado hace 30 minutos');
    expect(etiqueta.desactualizado).toBe(false);
    expect(etiqueta.absoluta).toContain('2026');
  });

  it('calcula la antigüedad en milisegundos', () => {
    expect(antiguedadMs('2026-11-05T17:00:00Z', ahora)).toBe(3_600_000);
  });
});

describe('utilidades', () => {
  it('formatea duraciones', () => {
    expect(formatearDuracion('2026-11-05T10:00:00Z', '2026-11-05T11:30:00Z')).toBe('1 h 30 min');
    expect(formatearDuracion('2026-11-05T10:00:00Z', '2026-11-05T10:20:00Z')).toBe('20 min');
    expect(formatearDuracion('2026-11-05T10:00:00Z', '2026-11-05T13:00:00Z')).toBe('3 h');
  });

  it('evalúa vigencias abiertas y cerradas', () => {
    const ahora = new Date('2026-11-05T18:00:00Z');
    expect(estaVigente(undefined, undefined, ahora)).toBe(true);
    expect(estaVigente('2026-11-05T10:00:00Z', undefined, ahora)).toBe(true);
    expect(estaVigente(undefined, '2026-11-05T19:00:00Z', ahora)).toBe(true);
    expect(estaVigente(undefined, '2026-11-05T17:00:00Z', ahora)).toBe(false);
    expect(estaVigente('2026-11-05T19:00:00Z', undefined, ahora)).toBe(false);
  });
});
