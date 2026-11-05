import type { APIRoute } from 'astro';

import { json, soloDev, validarContenido } from '../lib/archivos';

export const prerender = false;

export const GET: APIRoute = async () => {
  const bloqueo = soloDev();
  if (bloqueo !== null) return bloqueo;

  const resultado = await validarContenido();
  return json({
    ok: resultado.ok,
    resumen: {
      recursos: resultado.dataset?.recursos.length ?? 0,
      tipos: resultado.dataset?.tipos.length ?? 0,
      requerimientos: resultado.dataset?.requerimientos.length ?? 0,
      zonas_geo: resultado.dataset?.zonasGeo.length ?? 0,
      errores: resultado.issues.filter((issue) => issue.severity === 'error').length,
      avisos: resultado.issues.filter((issue) => issue.severity === 'warning').length,
    },
    issues: resultado.issues,
  });
};
