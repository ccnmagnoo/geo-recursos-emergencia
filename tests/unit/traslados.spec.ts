import { describe, expect, it } from 'vitest';

import { describirFutura, derivarUbicaciones, proximoTraslado } from '../../src/lib/traslados';
import { CABECERA_RECURSO, recursoDe, traslado } from './helpers';

describe('derivarUbicaciones', () => {
  it('sin traslados solo hay ubicación actual', () => {
    const recurso = recursoDe(CABECERA_RECURSO);
    const derivado = derivarUbicaciones(recurso);
    expect(derivado.actual.lugar.nombre).toBe('Plaza');
    expect(derivado.anterior).toBeUndefined();
    expect(derivado.futura).toBeUndefined();
  });

  it('el anterior sale del último traslado completado', () => {
    const recurso = recursoDe(
      `${CABECERA_RECURSO}
${traslado('T-0001', 'completado', { real: '2026-11-05T11:00:00-03:00', destino: 'Escuela' })}
`,
    );
    const derivado = derivarUbicaciones(recurso);
    expect(derivado.anterior?.lugar.nombre).toBe('Plaza');
    expect(derivado.anterior?.fecha).toBe('2026-11-05T11:00:00-03:00');
    expect(derivado.actual.lugar.nombre).toBe('Plaza');
  });

  it('la futura sale del traslado proyectado', () => {
    const recurso = recursoDe(
      `${CABECERA_RECURSO}
${traslado('T-0002', 'proyectado', { estimada: '2026-11-06T09:00:00-03:00', destino: 'Estadio' })}
`,
    );
    const derivado = derivarUbicaciones(recurso);
    expect(derivado.futura?.lugar.nombre).toBe('Estadio');
    expect(derivado.futura?.estado).toBe('proyectado');
    expect(derivado.futura?.fecha).toBe('2026-11-06T09:00:00-03:00');
    expect(describirFutura(derivado.futura!)).toContain('proyectado');
    expect(describirFutura(derivado.futura!)).toContain('no confirmado');
  });

  it('un traslado en curso tiene prioridad sobre uno proyectado', () => {
    const recurso = recursoDe(
      `${CABECERA_RECURSO}
${traslado('T-0003', 'proyectado', { estimada: '2026-11-07T09:00:00-03:00', destino: 'Lejano' })}
${traslado('T-0004', 'en_curso', { estimada: '2026-11-05T12:00:00-03:00', destino: 'Cercano' })}
`,
    );
    const derivado = derivarUbicaciones(recurso);
    expect(derivado.futura?.estado).toBe('en_curso');
    expect(derivado.futura?.lugar.nombre).toBe('Cercano');
    expect(proximoTraslado(recurso)?.id).toBe('T-0004');
  });

  it('con dos completados, el anterior es el más reciente', () => {
    const recurso = recursoDe(
      `${CABECERA_RECURSO}
${traslado('T-0005', 'completado', { real: '2026-11-04T10:00:00-03:00', destino: 'Uno' })}
${traslado('T-0006', 'completado', { real: '2026-11-05T10:30:00-03:00', destino: 'Dos' })}
`,
    );
    const derivado = derivarUbicaciones(recurso);
    expect(derivado.anterior?.fecha).toBe('2026-11-05T10:30:00-03:00');
    expect(derivado.completados).toHaveLength(2);
    expect(derivado.completados[0]?.id).toBe('T-0006');
  });

  it('ignora traslados cancelados', () => {
    const recurso = recursoDe(
      `${CABECERA_RECURSO}
${traslado('T-0007', 'cancelado', { estimada: '2026-11-06T09:00:00-03:00' })}
`,
    );
    const derivado = derivarUbicaciones(recurso);
    expect(derivado.futura).toBeUndefined();
    expect(derivado.completados).toHaveLength(0);
  });

  it('usa la fecha estimada más próxima entre varios proyectados', () => {
    const recurso = recursoDe(
      `${CABECERA_RECURSO}
${traslado('T-0008', 'proyectado', { estimada: '2026-11-08T09:00:00-03:00', destino: 'Tarde' })}
${traslado('T-0009', 'proyectado', { estimada: '2026-11-06T09:00:00-03:00', destino: 'Pronto' })}
`,
    );
    expect(proximoTraslado(recurso)?.destino.nombre).toBe('Pronto');
  });
});
