import type { APIRoute } from 'astro';

import {
  escribirAtomico,
  json,
  rutaRecurso,
  soloDev,
  validarContenido,
  verificarSolicitud,
} from '../lib/archivos';
import { parsearLinkGmaps } from '../../lib/gmaps';
import { ahoraIsoChile } from '../../lib/tiempo';
import { cita, valorToml } from '../../lib/toml-write';
import type { CampoExtraT } from '../../lib/schema';

export const prerender = false;

interface Entrada {
  id?: unknown;
  tipo?: unknown;
  nombre?: unknown;
  institucion?: unknown;
  descripcion?: unknown;
  zona?: unknown;
  ubicacion_nombre?: unknown;
  lat?: unknown;
  lng?: unknown;
  gmaps_url?: unknown;
  autor?: unknown;
  detalles?: unknown;
}

function texto(valor: unknown): string | null {
  return typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null;
}

function numero(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  if (typeof valor === 'string' && valor.trim() !== '') {
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function coercionar(campo: CampoExtraT, bruto: unknown): string | number | boolean | null {
  if (bruto === undefined || bruto === null || bruto === '') return null;
  switch (campo.tipo) {
    case 'entero': {
      const n = numero(bruto);
      return n === null ? null : Math.trunc(n);
    }
    case 'decimal': {
      return numero(bruto);
    }
    case 'booleano':
      return bruto === true || bruto === 'true' || bruto === 'on' || bruto === 'si';
    case 'fecha_hora':
      return texto(bruto);
    default:
      return texto(bruto);
  }
}

export const POST: APIRoute = async ({ request }) => {
  const bloqueo = soloDev();
  if (bloqueo !== null) return bloqueo;
  const invalido = verificarSolicitud(request);
  if (invalido !== null) return invalido;

  let cuerpo: Entrada;
  try {
    cuerpo = (await request.json()) as Entrada;
  } catch {
    return json({ ok: false, error: 'Cuerpo JSON inválido.' }, 400);
  }

  const id = texto(cuerpo.id)?.toUpperCase() ?? '';
  if (!/^[A-Z]{2,4}-\d{3,4}$/.test(id)) {
    return json({ ok: false, error: 'El identificador debe tener el formato AAA-000.' }, 400);
  }

  const tipoId = texto(cuerpo.tipo);
  const nombre = texto(cuerpo.nombre);
  const institucion = texto(cuerpo.institucion);
  if (tipoId === null || nombre === null || institucion === null) {
    return json({ ok: false, error: 'Faltan el tipo, el nombre o la institución.' }, 400);
  }

  const { dataset } = await validarContenido();
  if (dataset === null) {
    return json({ ok: false, error: 'El contenido actual no valida. Corrige eso primero.' }, 409);
  }

  const tipo = dataset.tiposPorId.get(tipoId);
  if (tipo === undefined || (tipo.categoria !== 'movil' && tipo.categoria !== 'fijo')) {
    return json({ ok: false, error: `El tipo "${tipoId}" no admite recursos.` }, 400);
  }

  const ruta = rutaRecurso(id);
  if (dataset.recursos.some((recurso) => recurso.id === id)) {
    return json({ ok: false, error: `Ya existe un recurso con el id ${id}.` }, 409);
  }

  let lat = numero(cuerpo.lat);
  let lng = numero(cuerpo.lng);
  const gmaps = texto(cuerpo.gmaps_url);

  if ((lat === null || lng === null) && gmaps !== null) {
    const parseado = parsearLinkGmaps(gmaps);
    if (!parseado.ok) {
      return json(
        {
          ok: false,
          error: parseado.error,
          esCorto: parseado.esCorto,
        },
        400,
      );
    }
    lat = parseado.coordenadas.lat;
    lng = parseado.coordenadas.lng;
  }

  if (lat === null || lng === null) {
    return json({ ok: false, error: 'Falta la ubicación: pega un link o escribe lat y lng.' }, 400);
  }

  const lugar = texto(cuerpo.ubicacion_nombre) ?? nombre;
  const descripcion = texto(cuerpo.descripcion) ?? '';
  const zona = texto(cuerpo.zona);
  const autor = texto(cuerpo.autor) ?? 'Panel';
  const fecha = ahoraIsoChile();

  const detallesBrutos =
    typeof cuerpo.detalles === 'object' && cuerpo.detalles !== null
      ? (cuerpo.detalles as Record<string, unknown>)
      : {};

  const lineas: string[] = [
    `id = ${cita(id)}`,
    `tipo = ${cita(tipo.id)}`,
    `nombre = ${cita(nombre)}`,
    `institucion = ${cita(institucion)}`,
    `descripcion = ${cita(descripcion)}`,
    'publicado = true',
    'ejemplo = false',
    'estado_actual = "planificado"',
  ];
  if (zona !== null) lineas.push(`zona = ${cita(zona)}`);

  lineas.push('', '[detalles]');
  for (const campo of tipo.campos) {
    const valor = coercionar(campo, detallesBrutos[campo.clave]);
    if (valor === null) continue;
    lineas.push(`${campo.clave} = ${valorToml(valor)}`);
  }

  lineas.push('', '[ubicacion_actual]', `nombre = ${cita(lugar)}`, `lat = ${lat}`, `lng = ${lng}`);
  if (gmaps !== null) lineas.push(`gmaps_url = ${cita(gmaps)}`);
  lineas.push(
    `desde = ${fecha}`,
    '',
    '[[historial_estado]]',
    `fecha = ${fecha}`,
    'estado = "planificado"',
    `autor = ${cita(autor)}`,
    'nota = "Creado desde el panel de administración."',
    '',
  );

  await escribirAtomico(ruta, lineas.join('\n'));

  const validacion = await validarContenido();
  if (!validacion.ok) {
    const { rm } = await import('node:fs/promises');
    await rm(ruta, { force: true });
    return json(
      {
        ok: false,
        error: 'El recurso no cumple el esquema; no se guardó.',
        issues: validacion.issues.filter((issue) => issue.severity === 'error'),
      },
      400,
    );
  }

  return json({ ok: true, id, ruta: `content/recursos/${id}.toml` });
};
