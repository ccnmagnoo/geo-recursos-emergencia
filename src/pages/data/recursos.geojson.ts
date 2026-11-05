import type { APIRoute } from 'astro';

import {
  fechaPublicacion,
  recursos,
  requerimientos,
  site,
  tipoDe,
  zonasGeo,
} from '../../lib/content';
import { etiquetaEstado, ultimaActualizacion } from '../../lib/recurso';

type Posicion = [number, number];

interface Feature {
  type: 'Feature';
  geometry: { type: string; coordinates: unknown };
  properties: Record<string, unknown>;
}

function cerrarAnillo(coordenadas: Posicion[]): Posicion[] {
  const primero = coordenadas[0];
  const ultimo = coordenadas[coordenadas.length - 1];
  if (primero === undefined || ultimo === undefined) return coordenadas;
  if (primero[0] === ultimo[0] && primero[1] === ultimo[1]) return coordenadas;
  return [...coordenadas, primero];
}

export const GET: APIRoute = () => {
  const features: Feature[] = [];

  for (const recurso of recursos) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [recurso.ubicacion_actual.lng, recurso.ubicacion_actual.lat],
      },
      properties: {
        id: recurso.id,
        nombre: recurso.nombre,
        tipo: recurso.tipo,
        tipo_etiqueta: tipoDe(recurso).etiqueta,
        estado: recurso.estado_actual,
        estado_texto: etiquetaEstado(recurso.estado_actual),
        institucion: recurso.institucion,
        zona: recurso.zona ?? null,
        actualizado: ultimaActualizacion(recurso),
        ubicacion: recurso.ubicacion_actual.nombre,
      },
    });
  }

  for (const requerimiento of requerimientos) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [requerimiento.ubicacion.lng, requerimiento.ubicacion.lat],
      },
      properties: {
        id: requerimiento.id,
        nombre: requerimiento.nombre,
        tipo: 'requerimiento',
        tipo_recurso: requerimiento.tipo_recurso,
        cantidad: requerimiento.cantidad,
        prioridad: requerimiento.prioridad,
        estado: requerimiento.estado,
        asignado_a: requerimiento.asignado_a ?? null,
        zona: requerimiento.zona ?? null,
        actualizado: requerimiento.fecha,
      },
    });
  }

  for (const zona of zonasGeo) {
    const anillo = zona.geometria.coordenadas as Posicion[];
    let geometry: Feature['geometry'];
    if (zona.geometria.tipo === 'poligono') {
      geometry = { type: 'Polygon', coordinates: [cerrarAnillo(anillo)] };
    } else if (zona.geometria.tipo === 'linea') {
      geometry = { type: 'LineString', coordinates: anillo };
    } else {
      const punto = anillo[0];
      if (punto === undefined) continue;
      geometry = { type: 'Point', coordinates: punto };
    }

    features.push({
      type: 'Feature',
      geometry,
      properties: {
        id: zona.id,
        nombre: zona.nombre,
        tipo: zona.tipo,
        categoria: 'zona',
        zona: zona.zona ?? null,
        descripcion: zona.descripcion,
        vigencia_desde: zona.geometria.vigencia_desde ?? null,
        vigencia_hasta: zona.geometria.vigencia_hasta ?? null,
      },
    });
  }

  const geojson = {
    type: 'FeatureCollection',
    generated: new Date().toISOString(),
    updated: fechaPublicacion,
    attribution: `${site.institucion} — ${site.titulo}`,
    features,
  };

  return new Response(JSON.stringify(geojson, null, 2), {
    headers: {
      'Content-Type': 'application/geo+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
