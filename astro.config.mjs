// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

import { adminSoloDev } from './src/admin-dev/integration';

const env = loadEnv(process.env['NODE_ENV'] ?? 'production', process.cwd(), '');

/** Normaliza la ruta base: "" | "/" | "/mapa" | "/mapa/" -> "/" | "/mapa/".
 * @param {string | undefined} value
 * @returns {string}
 */
function normalizeBase(value) {
  const raw = (value ?? '').trim();
  if (raw === '' || raw === '/') return '/';
  return `/${raw.replace(/^\/+|\/+$/g, '')}/`;
}

const base = normalizeBase(env['ASTRO_BASE']);
const site = (env['ASTRO_SITE'] ?? 'http://localhost:4321').replace(/\/+$/, '');

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'ignore',
  compressHTML: true,
  devToolbar: { enabled: false },
  integrations: [adminSoloDev()],
  build: {
    inlineStylesheets: 'auto',
    assets: '_assets',
  },
  server: {
    host: true,
    port: 4321,
  },
  vite: {
    build: {
      // Los recursos pequeños viajan inline y ahorran una ida y vuelta en 3G.
      assetsInlineLimit: 4096,
    },
  },
});
