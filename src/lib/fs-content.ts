import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { ArchivoFuente, DatasetCrudo } from './dataset';

function aRutaRelativa(base: string, absoluta: string): string {
  return relative(base, absoluta).split('\\').join('/');
}

async function leerArchivo(base: string, absoluta: string): Promise<ArchivoFuente> {
  return {
    ruta: aRutaRelativa(base, absoluta),
    texto: await readFile(absoluta, 'utf8'),
  };
}

async function leerCarpeta(base: string, carpeta: string): Promise<ArchivoFuente[]> {
  const absoluta = join(base, carpeta);
  if (!existsSync(absoluta)) return [];
  const nombres = (await readdir(absoluta))
    .filter((nombre) => nombre.toLowerCase().endsWith('.toml'))
    .sort((a, b) => a.localeCompare(b, 'es'));
  return Promise.all(nombres.map((nombre) => leerArchivo(base, join(absoluta, nombre))));
}

export class ContenidoFaltante extends Error {
  constructor(ruta: string) {
    super(`Falta el archivo obligatorio ${ruta}.`);
    this.name = 'ContenidoFaltante';
  }
}

/**
 * Lee /content desde el disco. Solo lo usan los scripts y las pruebas: en el
 * build, Astro lee los mismos archivos con import.meta.glob y el mismo
 * buildDataset, para que no existan dos validadores distintos.
 */
export async function leerDatasetCrudo(base = process.cwd()): Promise<DatasetCrudo> {
  const siteAbsoluta = join(base, 'content', 'site.toml');
  const tiposAbsoluta = join(base, 'content', 'tipos.toml');
  const zonasAbsoluta = join(base, 'content', 'zonas.toml');

  if (!existsSync(siteAbsoluta)) throw new ContenidoFaltante('content/site.toml');
  if (!existsSync(tiposAbsoluta)) throw new ContenidoFaltante('content/tipos.toml');

  const [site, tipos, zonas, recursos, requerimientos, zonasGeo] = await Promise.all([
    leerArchivo(base, siteAbsoluta),
    leerArchivo(base, tiposAbsoluta),
    existsSync(zonasAbsoluta) ? leerArchivo(base, zonasAbsoluta) : Promise.resolve(null),
    leerCarpeta(base, join('content', 'recursos')),
    leerCarpeta(base, join('content', 'requerimientos')),
    leerCarpeta(base, join('content', 'zonas_geo')),
  ]);

  return { site, tipos, zonas, recursos, requerimientos, zonasGeo };
}
