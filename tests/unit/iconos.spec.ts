import { describe, expect, it } from 'vitest';

import { ICONO_IDS, ICONOS } from '../../src/lib/iconos';

describe('set de iconos', () => {
  it('tiene un icono para cada tipo y un fallback', () => {
    expect(ICONO_IDS.length).toBeGreaterThanOrEqual(28);
    expect(ICONO_IDS).toContain('punto');

    for (const id of ICONO_IDS) {
      const elementos = ICONOS[id];
      expect(elementos.length, `El icono ${id} no tiene trazos`).toBeGreaterThan(0);
      for (const elemento of elementos) {
        expect(Object.keys(elemento.attrs).length).toBeGreaterThan(0);
      }
    }
  });

  it('no mezcla iconos duplicados por accidente', () => {
    const unicos = new Set(ICONO_IDS.map((id) => JSON.stringify(ICONOS[id])));
    expect(unicos.size).toBe(ICONO_IDS.length);
  });
});
