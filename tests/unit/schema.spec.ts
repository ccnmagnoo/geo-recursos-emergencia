import { describe, expect, it } from 'vitest';

import { buildDataset, type DatasetCrudo } from '../../src/lib/dataset';
import { CABECERA_RECURSO, traslado } from './helpers';

const AHORA = new Date('2026-11-05T20:00:00-03:00');

const SITE = `
titulo = "Mapa de prueba"
institucion = "Municipalidad"
contacto = "Coordinación"

[mapa]
centro_lat = -33.045
centro_lng = -71.523
zoom = 13

[teselas]
url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
atribucion = "OpenStreetMap"

[[emergencias]]
nombre = "Bomberos"
telefono = "132"
`;

const TIPOS = `
[[tipos]]
id = "torre_iluminacion"
etiqueta = "Torre"
etiqueta_plural = "Torres"
categoria = "movil"
movil = true
geometrias = ["punto"]
color = "#b45309"
forma = "circulo"
icono = "torre"

[[tipos.campos]]
clave = "autonomia_horas"
etiqueta = "Autonomía"
tipo = "entero"
min = 0
requerido = true

[[tipos]]
id = "zona_riesgo"
etiqueta = "Zona de riesgo"
etiqueta_plural = "Zonas de riesgo"
categoria = "zona"
geometrias = ["poligono"]
color = "#7f1d1d"
forma = "cuadrado"
icono = "riesgo"
`;

const ZONAS = `
[[zonas]]
id = "las-palmas"
nombre = "Las Palmas"
`;

function crudo(recursos: Record<string, string>, otros: Partial<DatasetCrudo> = {}): DatasetCrudo {
  return {
    site: { ruta: 'content/site.toml', texto: SITE },
    tipos: { ruta: 'content/tipos.toml', texto: TIPOS },
    zonas: { ruta: 'content/zonas.toml', texto: ZONAS },
    recursos: Object.entries(recursos).map(([id, texto]) => ({
      ruta: `content/recursos/${id}.toml`,
      texto,
    })),
    requerimientos: [],
    zonasGeo: [],
    ...otros,
  };
}

function errores(recursos: Record<string, string>, otros: Partial<DatasetCrudo> = {}) {
  return buildDataset(crudo(recursos, otros), { now: AHORA }).issues.filter(
    (issue) => issue.severity === 'error',
  );
}

describe('buildDataset', () => {
  it('acepta el contenido mínimo válido', () => {
    const resultado = buildDataset(crudo({ 'TIL-001': CABECERA_RECURSO }), { now: AHORA });
    expect(resultado.issues).toEqual([]);
    expect(resultado.dataset?.recursos).toHaveLength(1);
    expect(resultado.dataset?.site.titulo).toBe('Mapa de prueba');
  });

  it('rechaza fechas que no existen en el calendario', () => {
    const roto = CABECERA_RECURSO.replace('2026-11-05T10:00:00-03:00', '2026-02-30T10:00:00-03:00');
    const issues = errores({ 'TIL-001': roto });
    expect(issues.some((i) => i.code === 'fecha-invalida')).toBe(true);
  });

  it('rechaza fechas en UTC', () => {
    const roto = CABECERA_RECURSO.replace('2026-11-05T10:00:00-03:00', '2026-11-05T13:00:00Z');
    const issues = errores({ 'TIL-001': roto });
    expect(issues.some((i) => i.code === 'fecha-invalida')).toBe(true);
  });

  it('rechaza campos de detalle que el tipo no declara', () => {
    const roto = CABECERA_RECURSO.replace(
      'autonomia_horas = 20',
      'autonomia_horas = 20\ncolor_falso = "rojo"',
    );
    const issues = errores({ 'TIL-001': roto });
    expect(issues.some((i) => i.code === 'detalle-desconocido')).toBe(true);
  });

  it('exige los campos de detalle marcados como requeridos', () => {
    const roto = CABECERA_RECURSO.replace('autonomia_horas = 20', '');
    const issues = errores({ 'TIL-001': roto });
    expect(issues.some((i) => i.code === 'detalle-faltante')).toBe(true);
  });

  it('detecta cuando estado_actual no coincide con el último evento', () => {
    const roto = CABECERA_RECURSO.replace(
      'estado_actual = "operativo"',
      'estado_actual = "con_falla"',
    );
    const issues = errores({ 'TIL-001': roto });
    expect(issues.some((i) => i.code === 'estado-incoherente')).toBe(true);
  });

  it('detecta correcciones que apuntan a un evento inexistente', () => {
    const roto = `${CABECERA_RECURSO}
[[correcciones]]
corrige = "historial_estado:2026-11-05T09:00:00-03:00"
fecha = 2026-11-05T11:00:00-03:00
autor = "Operador"
nota = "No existe ese evento."
`;
    const issues = errores({ 'TIL-001': roto });
    expect(issues.some((i) => i.code === 'correccion-rota')).toBe(true);
  });

  it('rechaza enlaces de Google Maps de dominios no permitidos', () => {
    const roto = CABECERA_RECURSO.replace(
      'lng = -71.523',
      'lng = -71.523\ngmaps_url = "https://ejemplo.cl/mapa"',
    );
    const issues = errores({ 'TIL-001': roto });
    expect(issues.some((i) => i.code === 'gmaps-url')).toBe(true);
  });

  it('exige que el archivo se llame igual que el id', () => {
    const issues = errores({ 'TIL-999': CABECERA_RECURSO });
    expect(issues.some((i) => i.code === 'id-archivo')).toBe(true);
  });

  it('detecta ids duplicados entre recursos', () => {
    const issues = errores({
      'TIL-001': CABECERA_RECURSO,
      'TIL-002': CABECERA_RECURSO,
    });
    expect(issues.some((i) => i.code === 'id-duplicado')).toBe(true);
  });

  it('detecta zonas inexistentes', () => {
    const roto = CABECERA_RECURSO.replace(
      'estado_actual = "operativo"',
      'estado_actual = "operativo"\nzona = "inexistente"',
    );
    const issues = errores({ 'TIL-001': roto });
    expect(issues.some((i) => i.code === 'zona-desconocida')).toBe(true);
  });

  it('detecta eventos fechados en el futuro', () => {
    const roto = CABECERA_RECURSO.replace('2026-11-05T10:00:00-03:00', '2026-11-06T10:00:00-03:00');
    const issues = errores({ 'TIL-001': roto });
    expect(issues.some((i) => i.code === 'fecha-futura')).toBe(true);
  });

  it('detecta dos traslados en curso', () => {
    const roto = `${CABECERA_RECURSO}
${traslado('T-0001', 'en_curso', { estimada: '2026-11-05T21:00:00-03:00' })}
${traslado('T-0002', 'en_curso', { estimada: '2026-11-05T22:00:00-03:00' })}
`;
    const issues = errores({ 'TIL-001': roto });
    expect(issues.some((i) => i.code === 'traslados-simultaneos')).toBe(true);
  });

  it('detecta alertas con el mismo id en dos recursos', () => {
    const alerta = `
[[alertas]]
id = "A-0001"
fecha = 2026-11-05T10:00:00-03:00
severidad = "info"
texto = "Aviso"
`;
    const segundo = CABECERA_RECURSO.replace('TIL-001', 'TIL-002');
    const issues = errores({
      'TIL-001': `${CABECERA_RECURSO}${alerta}`,
      'TIL-002': `${segundo}${alerta}`,
    });
    expect(issues.some((i) => i.code === 'alerta-id-duplicado')).toBe(true);
  });

  it('rechaza un icono de tipo desconocido', () => {
    const issues = errores(
      { 'TIL-001': CABECERA_RECURSO },
      {
        tipos: {
          ruta: 'content/tipos.toml',
          texto: TIPOS.replace('icono = "torre"', 'icono = "inventado"'),
        },
      },
    );
    expect(
      issues.some(
        (issue) => issue.code === 'esquema' && issue.message.includes('Icono desconocido'),
      ),
    ).toBe(true);
  });

  it('detecta una geometría que el tipo de zona no admite', () => {
    const zona = `
id = "ZR-001"
tipo = "zona_riesgo"
nombre = "Zona"
[geometria]
tipo = "punto"
coordenadas = [[-71.5, -33.0]]
`;
    const issues = errores(
      { 'TIL-001': CABECERA_RECURSO },
      { zonasGeo: [{ ruta: 'content/zonas_geo/ZR-001.toml', texto: zona }] },
    );
    expect(issues.some((i) => i.code === 'geometria-no-permitida')).toBe(true);
  });
});
