import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type { APIRoute } from 'astro';

import { json, soloDev } from '../lib/archivos';

export const prerender = false;

const ejecutar = promisify(execFile);

export const POST: APIRoute = async () => {
  const bloqueo = soloDev();
  if (bloqueo !== null) return bloqueo;

  try {
    const comando = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const { stdout, stderr } = await ejecutar(comando, ['run', 'backup'], {
      cwd: process.cwd(),
      timeout: 60_000,
    });
    return json({ ok: true, salida: `${stdout}${stderr}`.trim() });
  } catch (cause) {
    return json(
      {
        ok: false,
        error: 'No se pudo crear el respaldo. Revisa que zip/Compress-Archive esté disponible.',
        detalle: cause instanceof Error ? cause.message : String(cause),
      },
      500,
    );
  }
};
