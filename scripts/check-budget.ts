import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

/**
 * Presupuesto del sitio: HTML + CSS + JS inicial bajo 200 KB gzip, sin teselas.
 * Se mide la página más pesada, que es la que sufre alguien en 3G.
 */

const LIMITE_BYTES = 200 * 1024;
const DIST = join(process.cwd(), 'dist');

interface Recurso {
  url: string;
  bytes: number;
  gzip: number;
}

async function listarHtml(dir: string, acumulado: string[] = []): Promise<string[]> {
  const entradas = await readdir(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    const absoluta = join(dir, entrada.name);
    if (entrada.isDirectory()) {
      await listarHtml(absoluta, acumulado);
    } else if (entrada.name.endsWith('.html')) {
      acumulado.push(absoluta);
    }
  }
  return acumulado;
}

function resolverRutaLocal(url: string): string | null {
  if (/^https?:\/\//.test(url) || url.startsWith('data:') || url.startsWith('//')) return null;
  const limpio = url.split('?')[0]?.split('#')[0] ?? '';
  if (limpio === '') return null;
  const relativo = limpio.replace(/^\/+/, '');
  return join(DIST, relativo);
}

function medir(contenido: Buffer): { bytes: number; gzip: number } {
  return { bytes: contenido.byteLength, gzip: gzipSync(contenido, { level: 9 }).byteLength };
}

async function medirUrl(url: string, cache: Map<string, Recurso | null>): Promise<Recurso | null> {
  if (cache.has(url)) return cache.get(url) ?? null;
  const ruta = resolverRutaLocal(url);
  if (ruta === null || !existsSync(ruta)) {
    cache.set(url, null);
    return null;
  }
  const contenido = await readFile(ruta);
  const tamano = medir(contenido);
  const recurso: Recurso = { url, ...tamano };
  cache.set(url, recurso);
  return recurso;
}

function urlsLocales(html: string): string[] {
  const urls = new Set<string>();
  const patrones = [
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi,
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["']/gi,
    /<script[^>]+src=["']([^"']+)["']/gi,
    /<link[^>]+rel=["'](?:modulepreload|preload)["'][^>]*href=["']([^"']+)["']/gi,
  ];
  for (const patron of patrones) {
    for (const coincidencia of html.matchAll(patron)) {
      const url = coincidencia[1];
      if (url !== undefined) urls.add(url);
    }
  }
  return [...urls];
}

async function main(): Promise<number> {
  if (!existsSync(DIST)) {
    console.error('✗ No existe dist/. Ejecuta `npm run build` antes de medir el presupuesto.');
    return 1;
  }

  if (existsSync(join(DIST, 'admin'))) {
    console.error(
      '✗ dist/admin existe: el panel no debe publicarse. Revisa la integración dev-only.',
    );
    return 1;
  }

  const paginas = await listarHtml(DIST);
  if (paginas.length === 0) {
    console.error('✗ dist/ no contiene HTML.');
    return 1;
  }

  const cache = new Map<string, Recurso | null>();
  const resultados: Array<{ pagina: string; total: number; recursos: Recurso[] }> = [];

  for (const pagina of paginas) {
    const html = await readFile(pagina, 'utf8');
    const propio = medir(Buffer.from(html, 'utf8'));
    const recursos: Recurso[] = [];
    let total = propio.gzip;

    for (const url of urlsLocales(html)) {
      const recurso = await medirUrl(url, cache);
      if (recurso === null) continue;
      recursos.push(recurso);
      total += recurso.gzip;
    }

    resultados.push({
      pagina: relative(DIST, pagina).split('\\').join('/'),
      total,
      recursos,
    });
  }

  resultados.sort((a, b) => b.total - a.total);
  const peor = resultados[0];

  console.log('Presupuesto de la primera carga (gzip, sin teselas)');
  console.log('');
  for (const resultado of resultados.slice(0, 5)) {
    const kb = (resultado.total / 1024).toFixed(1);
    console.log(`  ${kb.padStart(6)} KB  /${resultado.pagina}`);
  }
  console.log('');

  if (peor === undefined) return 1;

  for (const recurso of peor.recursos) {
    console.log(`    ${(recurso.gzip / 1024).toFixed(1).padStart(6)} KB  ${recurso.url}`);
  }

  const totalKb = (peor.total / 1024).toFixed(1);
  const limiteKb = (LIMITE_BYTES / 1024).toFixed(0);

  if (peor.total > LIMITE_BYTES) {
    console.error(`\n✗ ${totalKb} KB supera el límite de ${limiteKb} KB (/${peor.pagina}).`);
    return 1;
  }

  console.error(`\n✓ ${totalKb} KB de ${limiteKb} KB (/${peor.pagina}).`);
  return 0;
}

main()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((cause: unknown) => {
    console.error('✗ Error al medir el presupuesto:', cause);
    process.exitCode = 1;
  });
