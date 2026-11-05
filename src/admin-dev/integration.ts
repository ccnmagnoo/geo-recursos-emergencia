import type { AstroIntegration } from 'astro';

/**
 * El panel de administración se inyecta únicamente con `astro dev`.
 *
 * El código vive en `src/admin-dev/`, fuera de `src/pages/`, para que sea
 * imposible que termine en `dist/`. Hay un test E2E que lo verifica.
 */
export function adminSoloDev(): AstroIntegration {
  return {
    name: 'admin-solo-dev',
    hooks: {
      'astro:config:setup': ({ command, injectRoute, logger }) => {
        if (command !== 'dev') return;

        logger.info('Panel local disponible en /admin (solo en desarrollo).');

        injectRoute({
          pattern: '/admin',
          entrypoint: './src/admin-dev/pages/index.astro',
        });
        injectRoute({
          pattern: '/admin/recurso/[id]',
          entrypoint: './src/admin-dev/pages/recurso.astro',
        });

        for (const ruta of ['crear', 'accion', 'guardar', 'validar', 'gmaps', 'respaldo']) {
          injectRoute({
            pattern: `/api/admin/${ruta}`,
            entrypoint: `./src/admin-dev/api/${ruta}.ts`,
          });
        }
      },
    },
  };
}
