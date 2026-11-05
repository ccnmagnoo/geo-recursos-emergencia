import { parse } from 'smol-toml';

import { Recurso, Requerimiento, ZonaGeo, type RecursoT } from '../../src/lib/schema';

/** Construye un recurso válido a partir de un TOML de prueba. */
export function recursoDe(toml: string): RecursoT {
  return Recurso.parse(parse(toml));
}

export function requerimientoDe(toml: string) {
  return Requerimiento.parse(parse(toml));
}

export function zonaGeoDe(toml: string) {
  return ZonaGeo.parse(parse(toml));
}

export const CABECERA_RECURSO = `
id = "TIL-001"
tipo = "torre_iluminacion"
nombre = "Torre de prueba"
institucion = "Municipalidad"
publicado = true
ejemplo = true
estado_actual = "operativo"

[detalles]
autonomia_horas = 20

[ubicacion_actual]
nombre = "Plaza"
lat = -33.045
lng = -71.523

[[historial_estado]]
fecha = 2026-11-05T10:00:00-03:00
estado = "operativo"
autor = "Operador"
`;

export function traslado(
  id: string,
  estado: string,
  extras: { estimada?: string; real?: string; destino?: string } = {},
): string {
  const destino = extras.destino ?? 'Estadio';
  const lineas = [
    '[[traslados]]',
    `id = "${id}"`,
    `estado = "${estado}"`,
    'motivo = "Seguridad"',
    'origen = { nombre = "Plaza", lat = -33.045, lng = -71.523 }',
    `destino = { nombre = "${destino}", lat = -33.051, lng = -71.51 }`,
  ];
  if (extras.estimada !== undefined) lineas.push(`fecha_estimada = ${extras.estimada}`);
  if (extras.real !== undefined) lineas.push(`fecha_real = ${extras.real}`);
  return lineas.join('\n');
}
