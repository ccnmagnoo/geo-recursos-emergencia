import type { APIRoute } from 'astro';

import { fechaPublicacion, recursos, site, tipoDe } from '../../lib/content';
import { aVista } from '../../lib/vista';

/** Feed abierto y estable para reutilizar los datos desde otros sistemas. */
export const GET: APIRoute = () => {
  const datos = {
    generado: new Date().toISOString(),
    actualizado: fechaPublicacion,
    sitio: {
      titulo: site.titulo,
      institucion: site.institucion,
      contacto: site.contacto,
      zona_horaria: site.zona_horaria,
      umbral_desactualizado_horas: site.umbral_desactualizado_horas,
    },
    recursos: recursos.map((recurso) => aVista(recurso, tipoDe(recurso), site)),
  };

  return new Response(JSON.stringify(datos, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
