import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;

/**
 * Las pruebas corren contra el sitio ya construido (`dist/`), no contra el
 * servidor de desarrollo: es la única forma de comprobar que /admin no existe
 * en el artefacto que se publica.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  ...(process.env['CI'] ? { workers: 2 } : {}),
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
  },
  projects: [
    {
      name: 'chromium-movil',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'chromium-escritorio',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
