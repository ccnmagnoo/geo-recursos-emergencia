import type { APIRoute } from 'astro';

import { json, soloDev } from '../lib/archivos';
import { esEnlaceCorto, parsearLinkGmaps } from '../../lib/gmaps';

export const prerender = false;

const HOSTS_REDIRECCION = new Set(['maps.app.goo.gl', 'goo.gl']);

interface Entrada {
  url?: unknown;
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

  const url = typeof cuerpo.url === 'string' ? cuerpo.url.trim() : '';
  if (url === '' || url.length > 2000) {
    return json({ ok: false, error: 'Falta el link o es demasiado largo.' }, 400);
  }

  if (!esEnlaceCorto(url)) {
    const directo = parsearLinkGmaps(url);
    return json(directo);
  }

  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return json({ ok: false, error: 'El link no es válido.' }, 400);
  }
  if (!HOSTS_REDIRECCION.has(host)) {
    return json({ ok: false, error: 'Solo se resuelven enlaces cortos de Google Maps.' }, 400);
  }

  try {
    const respuesta = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent': 'MapaRecursosEmergencia/1.0 (panel local)',
        'Accept-Language': 'es-CL,es;q=0.9',
      },
    });
    const final = respuesta.url;

    // Solo aceptamos que el destino siga siendo de Google Maps.
    const destino = new URL(final);
    if (!/(^|\.)google\.[a-z.]+$/i.test(destino.hostname) && destino.hostname !== 'goo.gl') {
      return json({ ok: false, error: 'El enlace corto no llevó a Google Maps.' }, 400);
    }

    const parseado = parsearLinkGmaps(final);
    if (!parseado.ok) {
      return json({
        ok: false,
        error:
          'Se resolvió el enlace corto pero no se encontraron coordenadas. Copia lat/lng a mano.',
        urlFinal: final,
      });
    }
    return json({ ...parseado, urlFinal: final });
  } catch {
    return json(
      {
        ok: false,
        error: 'No se pudo resolver el enlace corto. Revisa tu conexión o escribe lat/lng a mano.',
      },
      502,
    );
  }
};
