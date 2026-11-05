import { execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Respaldo de /content en un ZIP con fecha.
 * En Windows usa Compress-Archive; en macOS/Linux usa zip.
 */

function marcaDeTiempo(): string {
  const ahora = new Date();
  const dos = (valor: number): string => String(valor).padStart(2, '0');
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}-${dos(ahora.getHours())}${dos(ahora.getMinutes())}`;
}

async function main(): Promise<number> {
  const destinoDirectorio = join(process.cwd(), 'backups');
  await mkdir(destinoDirectorio, { recursive: true });
  const destino = join(destinoDirectorio, `content-${marcaDeTiempo()}.zip`);
  const content = join(process.cwd(), 'content');

  try {
    if (process.platform === 'win32') {
      execFileSync(
        'powershell',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Compress-Archive -Path "${content}" -DestinationPath "${destino}" -Force`,
        ],
        { stdio: 'inherit' },
      );
    } else {
      execFileSync('zip', ['-r', '-q', destino, 'content'], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
    }
  } catch (cause) {
    await rm(destino, { force: true });
    console.error('✗ No se pudo crear el ZIP. ¿Está disponible zip/Compress-Archive?');
    console.error(cause);
    return 1;
  }

  console.log(`✓ Respaldo creado: ${destino}`);
  console.log('  Guárdalo fuera del repositorio si vas a editar contenido en terreno.');
  return 0;
}

main()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((cause: unknown) => {
    console.error('✗ Error al exportar el respaldo:', cause);
    process.exitCode = 1;
  });
