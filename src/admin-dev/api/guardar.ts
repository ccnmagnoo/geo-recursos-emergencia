import type { APIRoute } from 'astro';

import {
  escribirAtomico,
  json,
  leerRecurso,
  respaldar,
  rutaRecurso,
  soloDev,
  validarContenido,
  verificarSolicitud,
} from '../lib/archivos';

export const prerender = false;

interface Entrada {
  id?: unknown;
  contenido?: unknown;
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

  const id = typeof cuerpo.id === 'string' ? cuerpo.id.trim().toUpperCase() : '';
  const contenido = typeof cuerpo.contenido === 'string' ? cuerpo.contenido : null;
  if (!/^[A-Z]{2,4}-\\d{3,4}$/.test(id) || contenido === null) {
    return json({ ok: false, error: 'Faltan el id o el contenido TOML.' }, 400);
  }

  const original = await leerRecurso(id);
  if (original === null) {
    return json({ ok: false, error: `No existe el recurso ${id}.` }, 404);
  }

  if (!contenido.startsWith(`id = "${id}"`)) {
    return json(
      { ok: false, error: 'El contenido debe empezar con el mismo id del recurso.' },
      400,
    );
  }

  const ruta = rutaRecurso(id);
  await respaldar(ruta);
  await escribirAtomico(ruta, contenido);

  const validacion = await validarContenido();
  if (!validacion.ok) {
    await escribirAtomico(ruta, original);
    return json(
      {
        ok: false,
        error: 'El TOML no valida; se revirtió al contenido anterior.',
        issues: validacion.issues.filter((issue) => issue.severity === 'error'),
      },
      400,
    );
  }

  return json({ ok: true, issues: validacion.issues });
};
