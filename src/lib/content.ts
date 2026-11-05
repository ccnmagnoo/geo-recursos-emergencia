import {
  buildDataset,
  type ArchivoFuente,
  type Dataset,
  type DatasetCrudo,
  type Issue,
} from './dataset';
import { encontrarLinea } from './toml-lines';
import { ultimaActualizacionGlobal } from './recurso';
import { derivarUbicaciones, type TrasladosDerivados } from './traslados';
import type { AlertaT, RecursoT, TipoRecursoT } from './schema';

/**
 * Carga del contenido en el build de Astro.
 *
 * El parseo y la validación son los mismos que usa `npm run validate`; si algo
 * está mal, el build falla con archivo y línea en vez de publicar datos falsos.
 */

function aMapa(modulos: Record<string, unknown>): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const [ruta, contenido] of Object.entries(modulos)) {
    if (typeof contenido === 'string') salida[ruta.replace(/^\/+/, '')] = contenido;
  }
  return salida;
}

function aArchivos(modulos: Record<string, string>): ArchivoFuente[] {
  return Object.entries(modulos)
    .map(([ruta, texto]) => ({ ruta, texto }))
    .sort((a, b) => a.ruta.localeCompare(b.ruta, 'es'));
}

function cargarCrudo(): DatasetCrudo {
  const site = aMapa(
    import.meta.glob('/content/site.toml', { query: '?raw', import: 'default', eager: true }),
  );
  const tipos = aMapa(
    import.meta.glob('/content/tipos.toml', { query: '?raw', import: 'default', eager: true }),
  );
  const zonas = aMapa(
    import.meta.glob('/content/zonas.toml', { query: '?raw', import: 'default', eager: true }),
  );

  const siteTexto = site['content/site.toml'];
  const tiposTexto = tipos['content/tipos.toml'];
  if (siteTexto === undefined) throw new Error('Falta content/site.toml.');
  if (tiposTexto === undefined) throw new Error('Falta content/tipos.toml.');

  const zonasTexto = zonas['content/zonas.toml'];

  return {
    site: { ruta: 'content/site.toml', texto: siteTexto },
    tipos: { ruta: 'content/tipos.toml', texto: tiposTexto },
    zonas: zonasTexto === undefined ? null : { ruta: 'content/zonas.toml', texto: zonasTexto },
    recursos: aArchivos(
      aMapa(
        import.meta.glob('/content/recursos/*.toml', {
          query: '?raw',
          import: 'default',
          eager: true,
        }),
      ),
    ),
    requerimientos: aArchivos(
      aMapa(
        import.meta.glob('/content/requerimientos/*.toml', {
          query: '?raw',
          import: 'default',
          eager: true,
        }),
      ),
    ),
    zonasGeo: aArchivos(
      aMapa(
        import.meta.glob('/content/zonas_geo/*.toml', {
          query: '?raw',
          import: 'default',
          eager: true,
        }),
      ),
    ),
  };
}

function formatearIssue(issue: Issue, crudo: DatasetCrudo): string {
  if (issue.line !== undefined) {
    return `${issue.ruta}:${issue.line} — ${issue.message}`;
  }
  const archivo =
    [
      crudo.site,
      crudo.tipos,
      crudo.zonas,
      ...crudo.recursos,
      ...crudo.requerimientos,
      ...crudo.zonasGeo,
    ].find((candidato) => candidato?.ruta === issue.ruta) ?? null;
  const linea = archivo === null ? undefined : encontrarLinea(archivo.texto, issue.path);
  return linea === undefined
    ? `${issue.ruta} — ${issue.message}`
    : `${issue.ruta}:${linea} — ${issue.message}`;
}

function cargar(): Dataset {
  const crudo = cargarCrudo();
  const { dataset, issues } = buildDataset(crudo);
  const errores = issues.filter((issue) => issue.severity === 'error');

  if (errores.length > 0 || dataset === null) {
    const detalle = errores.map((issue) => `  • ${formatearIssue(issue, crudo)}`).join('\n');
    throw new Error(
      `El contenido no es válido. Corrige estos errores (npm run validate):\n${detalle}`,
    );
  }

  return dataset;
}

export const contenido = cargar();
export const site = contenido.site;
export const tipos = contenido.tipos;
export const tiposPorId = contenido.tiposPorId;
export const zonas = contenido.zonas;

function esVisible(recurso: { publicado: boolean; ejemplo: boolean }): boolean {
  return recurso.publicado && (site.mostrar_ejemplos || !recurso.ejemplo);
}

export const recursos: RecursoT[] = contenido.recursos.filter(esVisible).sort((a, b) => {
  const ordenA = tiposPorId.get(a.tipo)?.orden ?? 999;
  const ordenB = tiposPorId.get(b.tipo)?.orden ?? 999;
  if (ordenA !== ordenB) return ordenA - ordenB;
  return a.nombre.localeCompare(b.nombre, 'es');
});

export const requerimientos = contenido.requerimientos
  .filter(esVisible)
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

export const zonasGeo = contenido.zonasGeo
  .filter(esVisible)
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

export const recursosPorId = new Map(recursos.map((recurso) => [recurso.id, recurso]));

/** Tipos que realmente aparecen en el sitio, para leyenda y filtros. */
export const tiposVisibles: TipoRecursoT[] = tipos
  .filter((tipo) => recursos.some((recurso) => recurso.tipo === tipo.id))
  .sort((a, b) => a.orden - b.orden);

export const zonasVisibles = zonas.filter((zona) =>
  [...recursos, ...requerimientos, ...zonasGeo].some((elemento) => elemento.zona === zona.id),
);

export function derivadosDe(recurso: RecursoT): TrasladosDerivados {
  return derivarUbicaciones(recurso);
}

/** Tipo de un recurso ya validado. Falla fuerte si el catálogo cambió sin migrar. */
export function tipoDe(recurso: RecursoT): TipoRecursoT {
  const tipo = tiposPorId.get(recurso.tipo);
  if (tipo === undefined) {
    throw new Error(`El recurso ${recurso.id} usa el tipo inexistente "${recurso.tipo}".`);
  }
  return tipo;
}

export interface AlertaDestacada {
  recurso: RecursoT;
  alerta: AlertaT;
}

/** Alertas críticas vigentes en recursos publicados. */
export function alertasCriticas(ahora: Date = new Date()): AlertaDestacada[] {
  const resultado: AlertaDestacada[] = [];
  for (const recurso of recursos) {
    for (const alerta of recurso.alertas) {
      if (alerta.severidad !== 'critica') continue;
      if (!alerta.vigente) continue;
      if (alerta.expira !== undefined && Date.parse(alerta.expira) < ahora.getTime()) continue;
      resultado.push({ recurso, alerta });
    }
  }
  return resultado.sort((a, b) => Date.parse(b.alerta.fecha) - Date.parse(a.alerta.fecha));
}

export interface TrasladoDestacado {
  recurso: RecursoT;
  derivado: TrasladosDerivados;
}

/** Traslados proyectados o en curso, ordenados por fecha estimada. */
export function trasladosProximos(): TrasladoDestacado[] {
  const resultado: TrasladoDestacado[] = [];
  for (const recurso of recursos) {
    const derivado = derivarUbicaciones(recurso);
    if (derivado.futura !== undefined) resultado.push({ recurso, derivado });
  }
  return resultado.sort((a, b) => {
    const fechaA = a.derivado.futura?.fecha;
    const fechaB = b.derivado.futura?.fecha;
    if (fechaA === undefined) return 1;
    if (fechaB === undefined) return -1;
    return Date.parse(fechaA) - Date.parse(fechaB);
  });
}

export const fechaPublicacion = ultimaActualizacionGlobal(recursos);

export function tipografiaDe(tipoId: string): TipoRecursoT | undefined {
  return tiposPorId.get(tipoId);
}
