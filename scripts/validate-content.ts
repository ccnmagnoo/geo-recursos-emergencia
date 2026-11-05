import { execFileSync } from 'node:child_process';

import { buildDataset, type DatasetCrudo, type Issue } from '../src/lib/dataset';
import { ContenidoFaltante, leerDatasetCrudo } from '../src/lib/fs-content';
import { encontrarLinea } from '../src/lib/toml-lines';

interface Opciones {
  soloCambiados: boolean;
  json: boolean;
}

function leerOpciones(argv: string[]): Opciones {
  const args = new Set(argv);
  return {
    soloCambiados: args.has('--changed'),
    json: args.has('--json'),
  };
}

/** Archivos con cambios (incluye no rastreados) según git. */
function archivosCambiados(): Set<string> {
  const salida = new Set<string>();
  try {
    const estado = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    for (const linea of estado.split(/\r?\n/)) {
      if (linea.trim() === '') continue;
      const ruta = linea.slice(3).trim().split(' -> ').pop();
      if (ruta !== undefined) salida.add(ruta.split('\\').join('/'));
    }
  } catch {
    // Sin git disponible: se valida todo y se informa igual.
  }
  return salida;
}

function conLinea(issue: Issue, textos: Map<string, string>): Issue {
  if (issue.line !== undefined) return issue;
  const texto = textos.get(issue.ruta);
  if (texto === undefined) return issue;
  const linea = encontrarLinea(texto, issue.path);
  return linea === undefined ? issue : { ...issue, line: linea };
}

function ordenar(a: Issue, b: Issue): number {
  if (a.ruta !== b.ruta) return a.ruta.localeCompare(b.ruta, 'es');
  const lineaA = a.line ?? 0;
  const lineaB = b.line ?? 0;
  if (lineaA !== lineaB) return lineaA - lineaB;
  return a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1;
}

function imprimir(issues: Issue[]): void {
  for (const issue of issues) {
    const ubicacion = issue.line === undefined ? issue.ruta : `${issue.ruta}:${issue.line}`;
    const etiqueta = issue.severity === 'error' ? 'error  ' : 'aviso  ';
    console.error(`${ubicacion}  ${etiqueta} ${issue.code}`);
    console.error(`  ${issue.message}`);
    if (issue.suggestion !== undefined) console.error(`  → ${issue.suggestion}`);
  }
}

async function main(): Promise<number> {
  const opciones = leerOpciones(process.argv.slice(2));

  let crudo: DatasetCrudo;
  try {
    crudo = await leerDatasetCrudo();
  } catch (cause) {
    if (cause instanceof ContenidoFaltante) {
      console.error(`✗ ${cause.message}`);
      return 1;
    }
    throw cause;
  }

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

  const conUbicacion = issues.map((issue) => conLinea(issue, textos)).sort(ordenar);
  const errores = conUbicacion.filter((issue) => issue.severity === 'error');
  const avisos = conUbicacion.filter((issue) => issue.severity === 'warning');

  if (opciones.json) {
    console.log(
      JSON.stringify(
        {
          ok: errores.length === 0,
          resumen: {
            recursos: dataset?.recursos.length ?? 0,
            tipos: dataset?.tipos.length ?? 0,
            requerimientos: dataset?.requerimientos.length ?? 0,
            zonas_geo: dataset?.zonasGeo.length ?? 0,
            errores: errores.length,
            avisos: avisos.length,
          },
          issues: conUbicacion,
        },
        null,
        2,
      ),
    );
    return errores.length === 0 ? 0 : 1;
  }

  if (opciones.soloCambiados) {
    const cambiados = archivosCambiados();
    const propios = conUbicacion.filter((issue) =>
      [...cambiados].some((ruta) => issue.ruta === ruta),
    );
    imprimir(propios);
    const ajenos = conUbicacion.length - propios.length;
    if (ajenos > 0) {
      console.error(
        `\n(${ajenos} ${ajenos === 1 ? 'problema' : 'problemas'} en archivos que no estás editando; se validaron igual.)`,
      );
    }
  } else {
    imprimir(conUbicacion);
  }

  const resumen = [
    `${dataset?.recursos.length ?? 0} recursos`,
    `${dataset?.tipos.length ?? 0} tipos`,
    `${dataset?.requerimientos.length ?? 0} requerimientos`,
    `${dataset?.zonasGeo.length ?? 0} zonas geográficas`,
  ].join(' · ');

  console.error('');
  console.error(resumen);
  if (errores.length === 0) {
    console.error(
      `✓ Contenido válido (${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'}).`,
    );
    return 0;
  }
  console.error(
    `✗ ${errores.length} ${errores.length === 1 ? 'error' : 'errores'} y ${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'}. El build fallará hasta corregirlos.`,
  );
  return 1;
}

main()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((cause: unknown) => {
    console.error('✗ Error inesperado al validar el contenido:');
    console.error(cause);
    process.exitCode = 1;
  });
