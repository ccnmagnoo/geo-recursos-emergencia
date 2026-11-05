import type { APIRoute } from 'astro';

import { site } from '../lib/content';

export const GET: APIRoute = () => {
  const base = import.meta.env.BASE_URL;
  const manifest = {
    name: site.titulo,
    short_name: 'Recursos',
    description: site.subtitulo ?? 'Recursos de emergencia georreferenciados',
    lang: 'es-CL',
    start_url: base,
    scope: base,
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f5f6f4',
    theme_color: '#0b5cad',
    icons: [
      {
        src: `${base.replace(/\/$/, '')}/icono.svg`,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
