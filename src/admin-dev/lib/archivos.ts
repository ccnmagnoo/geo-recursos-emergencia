import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import { buildDataset, type Dataset, type Issue } from '../../lib/dataset';
import { leerDatasetCrudo } from '../../lib/fs-content';
import { encontrarLinea } from '../../lib/toml-lines';

const RAIZ = process.cwd();

export interface ResultadoValidacion {
  ok: boolean;
  dataset: Dataset | null;
  issues: IssueConLinea[];
}

export interface IssueConLinea extends Issue {
  linea?: number;
}

/** Valida todo el contenido leyendo del disco, sin caché de módulos. */
export async function validarContenido(): Promise<ResultadoValidacion> {
  const crudo = await leerDatasetCrudo(RAIZ);
  const { dataset, issues } = buildDataset(crudo);

  const textos = new Map<string, string>();
  for (const archivo of [
    crudo.site,
    crudo.tipos,
    ...(crudo.zonas === null ? [] : [crudo.zonas]),
    ...crudo.recursos,
    ...crudo.requerimientos,
    ...crudo.zonasGeo,
  ]) {
    textos.set(archivo.ruta, archivo.texto);
  }

  const conLinea: IssueConLinea[] = issues.map((issue) => {
    if (issue.line !== undefined) return issue;
    const texto = textos.get(issue.ruta);
    if (texto === undefined) return issue;
    const linea = encontrarLinea(texto, issue.path);
    return linea === undefined ? issue : { ...issue, linea };
  });

  return {
    ok: !conLinea.some((issue) => issue.severity === 'error'),
    dataset,
    issues: conLinea,
  };
}

export function rutaRecurso(id: string): string {
  if (!/^[A-Z]{2,4}-\d{3,4}$/.test(id)) {
    throw new Error(`Identificador inválido: "${id}".`);
  }
  return join(RAIZ, 'content', 'recursos', `${id}.toml`);
}

export async function leerRecurso(id: string): Promise<string | null> {
  const ruta = rutaRecurso(id);
  if (!existsSync(ruta)) return null;
  return readFile(ruta, 'utf8');
}

/** Copia el archivo a .backup/<marca>/ antes de tocarlo. */
export async function respaldar(ruta: string): Promise<string> {
  const marca = new Date().toISOString().replace(/[:.]/g, '-');
  const destino = join(RAIZ, '.backup', marca, relative(RAIZ, ruta));
  await mkdir(dirname(destino), { recursive: true });
  await copyFile(ruta, destino);
  return destino;
}

export async function escribirAtomico(ruta: string, texto: string): Promise<void> {
  const temporal = `${ruta}.${Date.now()}.tmp`;
  await writeFile(temporal, texto, 'utf8');
  await rename(temporal, ruta);
}

/** Restaura la copia más reciente de un recurso. */
export async function deshacerRecurso(
  id: string,
): Promise<{ restaurado: boolean; desde?: string }> {
  const carpeta = join(RAIZ, '.backup');
  if (!existsSync(carpeta)) return { restaurado: false };

  const marcas = (await readdir(carpeta, { withFileTypes: true }))
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort()
    .reverse();

  const relativo = join('content', 'recursos', `${id}.toml`);
  for (const marca of marcas) {
    const candidato = join(carpeta, marca, relativo);
    if (!existsSync(candidato)) continue;
    await copyFile(candidato, rutaRecurso(id));
    return { restaurado: true, desde: candidato };
  }
  return { restaurado: false };
}

export function json(datos: unknown, estado = 200): Response {
  return new Response(JSON.stringify(datos), {
    status: estado,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export function soloDev(): Response | null {
  if (import.meta.env.DEV) return null;
  return json({ ok: false, error: 'El panel solo existe en desarrollo.' }, 404);
}
