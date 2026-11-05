import type { APIRoute } from 'astro';

import {
  deshacerRecurso,
  escribirAtomico,
  json,
  leerRecurso,
  respaldar,
  rutaRecurso,
  soloDev,
  validarContenido,
} from '../lib/archivos';
import {
  agregarBloque,
  bloquePorId,
  cita,
  fijarClaves,
  moverUbicacion,
  reemplazarEstadoActual,
} from '../../lib/toml-write';
import { aIsoChile, ahoraIsoChile } from '../../lib/tiempo';
import { ESTADOS_RECURSO, SEVERIDADES_ALERTA } from '../../lib/schema';

export const prerender = false;

interface Entrada {
  id?: unknown;
  accion?: unknown;
  autor?: unknown;
  estado?: unknown;
  nota?: unknown;
  texto?: unknown;
  severidad?: unknown;
  alertaId?: unknown;
  motivo?: unknown;
  destino_nombre?: unknown;
  destino_lat?: unknown;
  destino_lng?: unknown;
  fecha?: unknown;
  trasladoId?: unknown;
  estado_final?: unknown;
  corrige?: unknown;
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

/** Acepta "2026-11-06T09:00" (hora local del operador) o ISO con offset. */
function normalizarFecha(valor: unknown): string | null {
  const bruto = texto(valor);
  if (bruto === null) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(bruto)) {
    const instante = new Date(bruto);
    if (Number.isNaN(instante.getTime())) return null;
    return aIsoChile(instante);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(-03:00|-04:00)$/.test(bruto)) return bruto;
  return null;
}

function siguienteId(prefijo: 'A' | 'T', existentes: string[]): string {
  let maximo = 0;
  const patron = new RegExp(`^${prefijo}-(\\d{4})$`);
  for (const id of existentes) {
    const coincidencia = patron.exec(id);
    if (coincidencia?.[1] !== undefined) maximo = Math.max(maximo, Number(coincidencia[1]));
  }
  return `${prefijo}-${String(maximo + 1).padStart(4, '0')}`;
}

export const POST: APIRoute = async ({ request }) => {
  const bloqueo = soloDev();
  if (bloqueo !== null) return bloqueo;

  let cuerpo: Entrada;
  try {
    cuerpo = (await request.json()) as Entrada;
  } catch {
    return json({ ok: false, error: 'Cuerpo JSON inválido.' }, 400);
  }

  const id = texto(cuerpo.id)?.toUpperCase() ?? '';
  const accion = texto(cuerpo.accion);
  if (id === '' || accion === null) {
    return json({ ok: false, error: 'Falta el recurso o la acción.' }, 400);
  }

  const original = await leerRecurso(id);
  if (original === null) {
    return json({ ok: false, error: `No existe el recurso ${id}.` }, 404);
  }

  const { dataset } = await validarContenido();
  const recurso = dataset?.recursos.find((candidato) => candidato.id === id);
  if (dataset === null || recurso === undefined) {
    return json({ ok: false, error: 'El contenido actual no valida o el recurso no existe.' }, 409);
  }

  const autor = texto(cuerpo.autor) ?? 'Panel';
  const fecha = normalizarFecha(cuerpo.fecha) ?? ahoraIsoChile();
  let nuevo = original;
  let respuesta: Record<string, unknown> = {};

  switch (accion) {
    case 'estado': {
      const estado = texto(cuerpo.estado);
      if (estado === null || !ESTADOS_RECURSO.includes(estado as never)) {
        return json({ ok: false, error: `Estado inválido: ${String(cuerpo.estado)}.` }, 400);
      }
      nuevo = reemplazarEstadoActual(nuevo, estado);
      const nota = texto(cuerpo.nota);
      nuevo = agregarBloque(
        nuevo,
        [
          '[[historial_estado]]',
          `fecha = ${fecha}`,
          `estado = ${cita(estado)}`,
          `autor = ${cita(autor)}`,
          ...(nota === null ? [] : [`nota = ${cita(nota)}`]),
        ].join('\n'),
      );
      break;
    }

    case 'observacion': {
      const contenido = texto(cuerpo.texto);
      if (contenido === null) return json({ ok: false, error: 'La observación está vacía.' }, 400);
      nuevo = agregarBloque(
        nuevo,
        [
          '[[observaciones]]',
          `fecha = ${fecha}`,
          `autor = ${cita(autor)}`,
          `texto = ${cita(contenido)}`,
        ].join('\n'),
      );
      break;
    }

    case 'alerta': {
      const severidad = texto(cuerpo.severidad);
      const contenido = texto(cuerpo.texto);
      if (severidad === null || !SEVERIDADES_ALERTA.includes(severidad as never)) {
        return json({ ok: false, error: 'Severidad inválida.' }, 400);
      }
      if (contenido === null)
        return json({ ok: false, error: 'El texto de la alerta está vacío.' }, 400);

      const ids = dataset.recursos.flatMap((candidato) =>
        candidato.alertas.map((alerta) => alerta.id),
      );
      const alertaId = siguienteId('A', ids);
      nuevo = agregarBloque(
        nuevo,
        [
          '[[alertas]]',
          `id = ${cita(alertaId)}`,
          `fecha = ${fecha}`,
          `severidad = ${cita(severidad)}`,
          `texto = ${cita(contenido)}`,
          'vigente = true',
        ].join('\n'),
      );
      respuesta = { alertaId };
      break;
    }

    case 'resolver_alerta': {
      const alertaId = texto(cuerpo.alertaId);
      if (alertaId === null) return json({ ok: false, error: 'Falta la alerta.' }, 400);
      const bloque = bloquePorId(nuevo, 'alertas', alertaId);
      if (bloque === null)
        return json({ ok: false, error: `No existe la alerta ${alertaId}.` }, 404);
      nuevo = fijarClaves(nuevo, bloque, { vigente: 'false' });
      break;
    }

    case 'proyectar_traslado': {
      const motivo = texto(cuerpo.motivo);
      const destinoNombre = texto(cuerpo.destino_nombre);
      const destinoLat = numero(cuerpo.destino_lat);
      const destinoLng = numero(cuerpo.destino_lng);
      const estimada = normalizarFecha(cuerpo.fecha);
      if (motivo === null || destinoNombre === null || destinoLat === null || destinoLng === null) {
        return json({ ok: false, error: 'Faltan el motivo o el destino del traslado.' }, 400);
      }
      if (estimada === null) {
        return json({ ok: false, error: 'Un traslado proyectado necesita fecha estimada.' }, 400);
      }

      const trasladoId = siguienteId(
        'T',
        recurso.traslados.map((traslado) => traslado.id),
      );
      nuevo = agregarBloque(
        nuevo,
        [
          '[[traslados]]',
          `id = ${cita(trasladoId)}`,
          'estado = "proyectado"',
          `motivo = ${cita(motivo)}`,
          `autor = ${cita(autor)}`,
          `fecha_estimada = ${estimada}`,
          `origen = { nombre = ${cita(recurso.ubicacion_actual.nombre)}, lat = ${recurso.ubicacion_actual.lat}, lng = ${recurso.ubicacion_actual.lng} }`,
          `destino = { nombre = ${cita(destinoNombre)}, lat = ${destinoLat}, lng = ${destinoLng} }`,
        ].join('\n'),
      );
      respuesta = { trasladoId };
      break;
    }

    case 'completar_traslado': {
      const trasladoId = texto(cuerpo.trasladoId);
      const destinoNombre = texto(cuerpo.destino_nombre);
      const destinoLat = numero(cuerpo.destino_lat);
      const destinoLng = numero(cuerpo.destino_lng);
      const estadoFinal = texto(cuerpo.estado_final) ?? 'operativo';
      if (
        trasladoId === null ||
        destinoNombre === null ||
        destinoLat === null ||
        destinoLng === null
      ) {
        return json({ ok: false, error: 'Faltan datos del traslado o del destino.' }, 400);
      }
      if (!ESTADOS_RECURSO.includes(estadoFinal as never)) {
        return json({ ok: false, error: 'Estado final inválido.' }, 400);
      }

      const bloque = bloquePorId(nuevo, 'traslados', trasladoId);
      if (bloque === null)
        return json({ ok: false, error: `No existe el traslado ${trasladoId}.` }, 404);

      nuevo = fijarClaves(nuevo, bloque, {
        estado: '"completado"',
        fecha_real: fecha,
      });
      nuevo = moverUbicacion(
        nuevo,
        { nombre: destinoNombre, lat: destinoLat, lng: destinoLng },
        fecha,
      );
      nuevo = reemplazarEstadoActual(nuevo, estadoFinal);
      nuevo = agregarBloque(
        nuevo,
        [
          '[[historial_estado]]',
          `fecha = ${fecha}`,
          `estado = ${cita(estadoFinal)}`,
          `autor = ${cita(autor)}`,
          `nota = ${cita(`Llegada confirmada del traslado ${trasladoId}.`)}`,
        ].join('\n'),
      );
      break;
    }

    case 'cancelar_traslado': {
      const trasladoId = texto(cuerpo.trasladoId);
      if (trasladoId === null) return json({ ok: false, error: 'Falta el traslado.' }, 400);
      const bloque = bloquePorId(nuevo, 'traslados', trasladoId);
      if (bloque === null)
        return json({ ok: false, error: `No existe el traslado ${trasladoId}.` }, 404);
      nuevo = fijarClaves(nuevo, bloque, { estado: '"cancelado"' });
      break;
    }

    case 'correccion': {
      const corrige = texto(cuerpo.corrige);
      const contenido = texto(cuerpo.nota);
      if (corrige === null || contenido === null) {
        return json({ ok: false, error: 'La corrección necesita el evento y la nota.' }, 400);
      }
      nuevo = agregarBloque(
        nuevo,
        [
          '[[correcciones]]',
          `corrige = ${cita(corrige)}`,
          `fecha = ${fecha}`,
          `autor = ${cita(autor)}`,
          `nota = ${cita(contenido)}`,
        ].join('\n'),
      );
      break;
    }

    case 'deshacer': {
      const resultado = await deshacerRecurso(id);
      if (!resultado.restaurado) {
        return json({ ok: false, error: 'No hay respaldos de este recurso.' }, 404);
      }
      const validacion = await validarContenido();
      return json({
        ok: validacion.ok,
        restaurado: true,
        desde: resultado.desde,
        issues: validacion.issues,
      });
    }

    default:
      return json({ ok: false, error: `Acción desconocida: ${accion}.` }, 400);
  }

  if (nuevo === original) {
    return json({ ok: false, error: 'La acción no produjo cambios.' }, 400);
  }

  const ruta = rutaRecurso(id);
  await respaldar(ruta);
  await escribirAtomico(ruta, nuevo);

  const validacion = await validarContenido();
  if (!validacion.ok) {
    await escribirAtomico(ruta, original);
    return json(
      {
        ok: false,
        error: 'El cambio dejaría el contenido inválido; se revirtió.',
        issues: validacion.issues.filter((issue) => issue.severity === 'error'),
      },
      400,
    );
  }

  return json({ ok: true, ...respuesta, issues: validacion.issues });
};

export const GET: APIRoute = () => json({ ok: false, error: 'Usa POST.' }, 405);
