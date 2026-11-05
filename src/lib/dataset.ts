import { parse, TomlError } from 'smol-toml';
import { z } from 'zod';

import {
  Recurso,
  Requerimiento,
  Site,
  TipoRecurso,
  Zona,
  ZonaGeo,
  isFechaIsoChile,
  type AlertaT,
  type CampoExtraT,
  type RecursoT,
  type RequerimientoT,
  type SiteT,
  type TipoRecursoT,
  type ZonaGeoT,
  type ZonaT,
} from './schema';
import { esUrlGmapsPermitida } from './url';

/** Cinco minutos de tolerancia para relojes desincronizados al validar. */
const TOLERANCIA_RELOJ_MS = 5 * 60 * 1000;

export type SeveridadIssue = 'error' | 'warning';

export interface Issue {
  severity: SeveridadIssue;
  code: string;
  message: string;
  /** Ruta relativa del archivo, por ejemplo content/recursos/TIL-001.toml */
  ruta: string;
  /** Ruta dentro del documento, por ejemplo ['traslados', 0, 'fecha_real'] */
  path: Array<string | number>;
  /** Línea estimada; se completa al leer el archivo desde disco. */
  line?: number;
  suggestion?: string;
}

export interface ArchivoFuente {
  ruta: string;
  texto: string;
}

export interface DatasetCrudo {
  site: ArchivoFuente;
  tipos: ArchivoFuente;
  zonas: ArchivoFuente | null;
  recursos: ArchivoFuente[];
  requerimientos: ArchivoFuente[];
  zonasGeo: ArchivoFuente[];
}

export interface Dataset {
  site: SiteT;
  tipos: TipoRecursoT[];
  tiposPorId: Map<string, TipoRecursoT>;
  zonas: ZonaT[];
  zonasPorId: Map<string, ZonaT>;
  recursos: RecursoT[];
  requerimientos: RequerimientoT[];
  zonasGeo: ZonaGeoT[];
}

export interface ResultadoDataset {
  dataset: Dataset | null;
  issues: Issue[];
}

/** Lo mínimo que necesitan las validaciones cruzadas entre archivos. */
interface Contexto {
  tiposPorId: Map<string, TipoRecursoT>;
  zonasPorId: Map<string, ZonaT>;
  recursos: RecursoT[];
}

export interface OpcionesBuild {
  /** Fecha de referencia para las comprobaciones temporales. */
  now?: Date;
}

function error(
  ruta: string,
  code: string,
  message: string,
  path: Array<string | number> = [],
  suggestion?: string,
): Issue {
  const issue: Issue = { severity: 'error', code, message, ruta, path };
  if (suggestion !== undefined) issue.suggestion = suggestion;
  return issue;
}

function advertencia(
  ruta: string,
  code: string,
  message: string,
  path: Array<string | number> = [],
): Issue {
  return { severity: 'warning', code, message, ruta, path };
}

function nombreSinExtension(ruta: string): string {
  const base = ruta.split(/[\\/]/).pop() ?? ruta;
  return base.replace(/\.toml$/i, '');
}

function fechasInvalidasEnTexto(texto: string): Array<{ valor: string; linea: number }> {
  const patron =
    /(?:[=,]|\[|\{)\s*(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))/g;
  const invalidas: Array<{ valor: string; linea: number }> = [];
  for (const coincidencia of texto.matchAll(patron)) {
    const valor = coincidencia[1];
    if (valor === undefined) continue;
    if (isFechaIsoChile(valor)) continue;
    const indice = coincidencia.index ?? 0;
    invalidas.push({ valor, linea: texto.slice(0, indice).split('\n').length });
  }
  return invalidas;
}

function parsear(archivo: ArchivoFuente, issues: Issue[]): unknown {
  // smol-toml "arregla" silenciosamente fechas como 2026-02-30 (las convierte
  // al 2 de marzo). Eso es exactamente el tipo de dato falso que no queremos,
  // así que revisamos el texto antes de parsear.
  const invalidas = fechasInvalidasEnTexto(archivo.texto);
  if (invalidas.length > 0) {
    for (const fecha of invalidas) {
      const issue = error(
        archivo.ruta,
        'fecha-invalida',
        `La fecha "${fecha.valor}" no existe en el calendario o no usa el offset de Chile.`,
        [],
        'Usa una fecha real con offset -03:00 o -04:00. Ej: 2026-11-05T14:00:00-03:00.',
      );
      issue.line = fecha.linea;
      issues.push(issue);
    }
    return null;
  }

  try {
    return parse(archivo.texto);
  } catch (cause) {
    if (cause instanceof TomlError) {
      const issue = error(archivo.ruta, 'toml-sintaxis', cause.message);
      issue.line = cause.line;
      issues.push(issue);
    } else {
      issues.push(
        error(
          archivo.ruta,
          'toml-desconocido',
          cause instanceof Error ? cause.message : 'No se pudo leer el archivo TOML.',
        ),
      );
    }
    return null;
  }
}

function agregarErroresZod(
  archivo: ArchivoFuente,
  prefijo: Array<string | number>,
  zodError: z.ZodError,
  issues: Issue[],
): void {
  for (const problema of zodError.issues) {
    issues.push(
      error(archivo.ruta, 'esquema', problema.message, [
        ...prefijo,
        ...problema.path.map((segmento) =>
          typeof segmento === 'number' ? segmento : String(segmento),
        ),
      ]),
    );
  }
}

function parsearConEsquema<T>(
  archivo: ArchivoFuente,
  esquema: z.ZodType<T>,
  valor: unknown,
  issues: Issue[],
): T | null {
  const resultado = esquema.safeParse(valor);
  if (!resultado.success) {
    agregarErroresZod(archivo, [], resultado.error, issues);
    return null;
  }
  return resultado.data;
}

function rutaFuente(recursos: RecursoT[], id: string): RecursoT | undefined {
  return recursos.find((recurso) => recurso.id === id);
}

function fechaMs(valor: string): number {
  return Date.parse(valor);
}

function validarCampo(campo: CampoExtraT, valor: unknown): string | null {
  switch (campo.tipo) {
    case 'texto':
      if (typeof valor !== 'string') return `"${campo.clave}" debe ser texto.`;
      return null;
    case 'entero':
      if (typeof valor !== 'number' || !Number.isInteger(valor)) {
        return `"${campo.clave}" debe ser un número entero.`;
      }
      break;
    case 'decimal':
      if (typeof valor !== 'number' || !Number.isFinite(valor)) {
        return `"${campo.clave}" debe ser un número.`;
      }
      break;
    case 'booleano':
      if (typeof valor !== 'boolean') return `"${campo.clave}" debe ser verdadero o falso.`;
      return null;
    case 'opcion':
      if (typeof valor !== 'string') return `"${campo.clave}" debe ser una de las opciones.`;
      if (campo.opciones !== undefined && !campo.opciones.includes(valor)) {
        return `"${campo.clave}" debe ser una de: ${campo.opciones.join(', ')}.`;
      }
      return null;
    case 'fecha_hora':
      if (typeof valor !== 'string' || !isFechaIsoChile(valor)) {
        return `"${campo.clave}" debe ser una fecha-hora ISO con offset chileno.`;
      }
      return null;
  }
  if (typeof valor === 'number') {
    if (campo.min !== undefined && valor < campo.min) {
      return `"${campo.clave}" no puede ser menor que ${campo.min}.`;
    }
    if (campo.max !== undefined && valor > campo.max) {
      return `"${campo.clave}" no puede ser mayor que ${campo.max}.`;
    }
  }
  return null;
}

function validarDetalles(
  id: string,
  detalles: Record<string, string | number | boolean>,
  tipo: TipoRecursoT,
  ruta: string,
  issues: Issue[],
): void {
  const permitidos = new Map(tipo.campos.map((campo) => [campo.clave, campo]));

  for (const [clave, valor] of Object.entries(detalles)) {
    const campo = permitidos.get(clave);
    if (campo === undefined) {
      issues.push(
        error(
          ruta,
          'detalle-desconocido',
          `El tipo "${tipo.id}" no define el campo de detalle "${clave}" (${id}).`,
          ['detalles', clave],
          `Campos permitidos: ${[...permitidos.keys()].join(', ') || '(ninguno)'}.`,
        ),
      );
      continue;
    }
    const problema = validarCampo(campo, valor);
    if (problema !== null) {
      issues.push(error(ruta, 'detalle-invalido', problema, ['detalles', clave]));
    }
  }

  for (const campo of tipo.campos) {
    if (campo.requerido && !(campo.clave in detalles)) {
      issues.push(
        error(
          ruta,
          'detalle-faltante',
          `Falta el campo obligatorio "${campo.clave}" (${campo.etiqueta}) en ${id}.`,
          ['detalles', campo.clave],
        ),
      );
    }
  }
}

function validarGmaps(
  ruta: string,
  url: string | undefined,
  path: Array<string | number>,
  issues: Issue[],
): void {
  if (url === undefined) return;
  if (!esUrlGmapsPermitida(url)) {
    issues.push(
      error(
        ruta,
        'gmaps-url',
        `El enlace "${url}" no es un enlace de Google Maps permitido.`,
        path,
        'Se aceptan https://…google.com/maps/…, https://maps.app.goo.gl/… y https://goo.gl/maps/….',
      ),
    );
  }
}

function validarRecurso(
  recurso: RecursoT,
  archivo: ArchivoFuente,
  contexto: Contexto,
  ahora: number,
  idsAlerta: Map<string, string>,
  idsGlobales: Map<string, string>,
  issues: Issue[],
): void {
  const idArchivo = nombreSinExtension(archivo.ruta);
  if (idArchivo !== recurso.id) {
    issues.push(
      error(
        archivo.ruta,
        'id-archivo',
        `El archivo se llama "${idArchivo}" pero el recurso declara id "${recurso.id}".`,
        ['id'],
        'El nombre del archivo debe coincidir con el id para que la URL sea estable.',
      ),
    );
  }

  const previo = idsGlobales.get(recurso.id);
  if (previo !== undefined) {
    issues.push(
      error(archivo.ruta, 'id-duplicado', `El id "${recurso.id}" ya está usado en ${previo}.`, [
        'id',
      ]),
    );
  } else {
    idsGlobales.set(recurso.id, archivo.ruta);
  }

  const tipo = contexto.tiposPorId.get(recurso.tipo);
  if (tipo === undefined) {
    issues.push(
      error(
        archivo.ruta,
        'tipo-desconocido',
        `El tipo "${recurso.tipo}" no existe en content/tipos.toml.`,
        ['tipo'],
      ),
    );
  } else {
    if (tipo.categoria !== 'movil' && tipo.categoria !== 'fijo') {
      issues.push(
        error(
          archivo.ruta,
          'tipo-categoria',
          `El tipo "${tipo.id}" es de categoría "${tipo.categoria}" y no puede usarse en un recurso.`,
          ['tipo'],
        ),
      );
    }
    validarDetalles(recurso.id, recurso.detalles, tipo, archivo.ruta, issues);
  }

  if (
    recurso.zona !== undefined &&
    contexto.zonasPorId.size > 0 &&
    !contexto.zonasPorId.has(recurso.zona)
  ) {
    issues.push(
      error(
        archivo.ruta,
        'zona-desconocida',
        `La zona "${recurso.zona}" no existe en content/zonas.toml.`,
        ['zona'],
      ),
    );
  }

  // El estado publicado debe ser el último del historial: si no, el sitio miente.
  let ultimo = recurso.historial_estado[0];
  if (ultimo !== undefined) {
    for (const evento of recurso.historial_estado) {
      if (fechaMs(evento.fecha) >= fechaMs(ultimo.fecha)) ultimo = evento;
    }
  }
  if (ultimo !== undefined && ultimo.estado !== recurso.estado_actual) {
    issues.push(
      error(
        archivo.ruta,
        'estado-incoherente',
        `estado_actual es "${recurso.estado_actual}" pero el último evento del historial dice "${ultimo.estado}" (${ultimo.fecha}).`,
        ['estado_actual'],
        'Registra el cambio de estado como un evento nuevo en vez de editar el historial.',
      ),
    );
  }

  for (const [indice, evento] of recurso.historial_estado.entries()) {
    if (fechaMs(evento.fecha) > ahora + TOLERANCIA_RELOJ_MS) {
      issues.push(
        error(
          archivo.ruta,
          'fecha-futura',
          `El evento de estado del ${evento.fecha} está en el futuro.`,
          ['historial_estado', indice, 'fecha'],
        ),
      );
    }
  }

  for (const [indice, observacion] of recurso.observaciones.entries()) {
    if (fechaMs(observacion.fecha) > ahora + TOLERANCIA_RELOJ_MS) {
      issues.push(
        error(
          archivo.ruta,
          'fecha-futura',
          `La observación del ${observacion.fecha} está en el futuro.`,
          ['observaciones', indice, 'fecha'],
        ),
      );
    }
  }

  for (const [indice, alerta] of recurso.alertas.entries()) {
    validarAlerta(recurso, archivo, alerta, indice, ahora, idsAlerta, issues);
  }

  let enCurso = 0;
  for (const [indice, traslado] of recurso.traslados.entries()) {
    if (traslado.estado === 'en_curso') enCurso += 1;
    if (traslado.estado === 'completado' && traslado.fecha_real !== undefined) {
      if (fechaMs(traslado.fecha_real) > ahora + TOLERANCIA_RELOJ_MS) {
        issues.push(
          error(
            archivo.ruta,
            'traslado-futuro',
            `El traslado ${traslado.id} figura completado con fecha_real futura (${traslado.fecha_real}).`,
            ['traslados', indice, 'fecha_real'],
          ),
        );
      }
    }
    if (
      traslado.estado === 'proyectado' &&
      traslado.fecha_estimada !== undefined &&
      fechaMs(traslado.fecha_estimada) < ahora - TOLERANCIA_RELOJ_MS
    ) {
      issues.push(
        advertencia(
          archivo.ruta,
          'proyeccion-vencida',
          `El traslado ${traslado.id} sigue proyectado con una fecha estimada que ya pasó (${traslado.fecha_estimada}).`,
          ['traslados', indice, 'fecha_estimada'],
        ),
      );
    }
  }
  if (enCurso > 1) {
    issues.push(
      error(
        archivo.ruta,
        'traslados-simultaneos',
        `Hay ${enCurso} traslados en curso; como máximo uno puede estar en_curso.`,
        ['traslados'],
      ),
    );
  }

  validarCorrecciones(recurso, archivo, issues);

  validarGmaps(
    archivo.ruta,
    recurso.ubicacion_actual.gmaps_url,
    ['ubicacion_actual', 'gmaps_url'],
    issues,
  );
  for (const [indice, traslado] of recurso.traslados.entries()) {
    validarGmaps(
      archivo.ruta,
      traslado.origen.gmaps_url,
      ['traslados', indice, 'origen', 'gmaps_url'],
      issues,
    );
    validarGmaps(
      archivo.ruta,
      traslado.destino.gmaps_url,
      ['traslados', indice, 'destino', 'gmaps_url'],
      issues,
    );
  }

  if (recurso.ubicacion_actual.desde !== undefined) {
    if (fechaMs(recurso.ubicacion_actual.desde) > ahora + TOLERANCIA_RELOJ_MS) {
      issues.push(
        error(
          archivo.ruta,
          'ubicacion-futura',
          `La ubicación actual dice estar vigente desde el futuro (${recurso.ubicacion_actual.desde}).`,
          ['ubicacion_actual', 'desde'],
        ),
      );
    }
  }
}

function validarAlerta(
  recurso: RecursoT,
  archivo: ArchivoFuente,
  alerta: AlertaT,
  indice: number,
  ahora: number,
  idsAlerta: Map<string, string>,
  issues: Issue[],
): void {
  const previo = idsAlerta.get(alerta.id);
  if (previo !== undefined) {
    issues.push(
      error(archivo.ruta, 'alerta-id-duplicado', `La alerta ${alerta.id} ya existe en ${previo}.`, [
        'alertas',
        indice,
        'id',
      ]),
    );
  } else {
    idsAlerta.set(alerta.id, archivo.ruta);
  }

  if (fechaMs(alerta.fecha) > ahora + TOLERANCIA_RELOJ_MS) {
    issues.push(
      error(archivo.ruta, 'fecha-futura', `La alerta ${alerta.id} está fechada en el futuro.`, [
        'alertas',
        indice,
        'fecha',
      ]),
    );
  }

  if (alerta.expira !== undefined && fechaMs(alerta.expira) <= fechaMs(alerta.fecha)) {
    issues.push(
      error(archivo.ruta, 'alerta-expiracion', `La alerta ${alerta.id} expira antes de emitirse.`, [
        'alertas',
        indice,
        'expira',
      ]),
    );
  }

  if (!recurso.publicado && alerta.severidad === 'critica' && alerta.vigente) {
    issues.push(
      advertencia(
        archivo.ruta,
        'alerta-en-borrador',
        `La alerta crítica ${alerta.id} está en un recurso no publicado y no será visible.`,
        ['alertas', indice],
      ),
    );
  }
}

function validarCorrecciones(recurso: RecursoT, archivo: ArchivoFuente, issues: Issue[]): void {
  for (const [indice, correccion] of recurso.correcciones.entries()) {
    const separador = correccion.corrige.indexOf(':');
    if (separador <= 0) continue;
    const tabla = correccion.corrige.slice(0, separador);
    const referencia = correccion.corrige.slice(separador + 1);
    let existe = false;
    if (tabla === 'historial_estado') {
      existe = recurso.historial_estado.some(
        (evento) => fechaMs(evento.fecha) === fechaMs(referencia),
      );
    } else if (tabla === 'observaciones') {
      existe = recurso.observaciones.some(
        (observacion) => fechaMs(observacion.fecha) === fechaMs(referencia),
      );
    } else if (tabla === 'alertas') {
      existe = recurso.alertas.some((alerta) => alerta.id === referencia);
    } else if (tabla === 'traslados') {
      existe = recurso.traslados.some((traslado) => traslado.id === referencia);
    }
    if (!existe) {
      issues.push(
        error(
          archivo.ruta,
          'correccion-rota',
          `La corrección apunta a "${correccion.corrige}", que no existe en este recurso.`,
          ['correcciones', indice, 'corrige'],
        ),
      );
    }
  }
}

function validarRequerimiento(
  requerimiento: RequerimientoT,
  archivo: ArchivoFuente,
  contexto: Contexto,
  idsGlobales: Map<string, string>,
  issues: Issue[],
): void {
  const idArchivo = nombreSinExtension(archivo.ruta);
  if (idArchivo !== requerimiento.id) {
    issues.push(
      error(
        archivo.ruta,
        'id-archivo',
        `El archivo se llama "${idArchivo}" pero el requerimiento declara id "${requerimiento.id}".`,
        ['id'],
      ),
    );
  }

  const previo = idsGlobales.get(requerimiento.id);
  if (previo !== undefined) {
    issues.push(
      error(
        archivo.ruta,
        'id-duplicado',
        `El id "${requerimiento.id}" ya está usado en ${previo}.`,
        ['id'],
      ),
    );
  } else {
    idsGlobales.set(requerimiento.id, archivo.ruta);
  }

  const tipo = contexto.tiposPorId.get(requerimiento.tipo_recurso);
  if (tipo === undefined) {
    issues.push(
      error(
        archivo.ruta,
        'tipo-desconocido',
        `El tipo "${requerimiento.tipo_recurso}" no existe en content/tipos.toml.`,
        ['tipo_recurso'],
      ),
    );
  }

  if (requerimiento.asignado_a !== undefined) {
    const asignado = rutaFuente(contexto.recursos, requerimiento.asignado_a);
    if (asignado === undefined) {
      issues.push(
        error(
          archivo.ruta,
          'asignacion-rota',
          `asignado_a apunta a "${requerimiento.asignado_a}", que no existe.`,
          ['asignado_a'],
        ),
      );
    } else {
      const tipoAsignado = contexto.tiposPorId.get(asignado.tipo);
      if (tipoAsignado !== undefined && !tipoAsignado.movil) {
        issues.push(
          advertencia(
            archivo.ruta,
            'asignacion-fija',
            `"${asignado.id}" es un recurso fijo; verifica que tenga sentido asignarlo.`,
            ['asignado_a'],
          ),
        );
      }
    }
  }

  if (
    requerimiento.zona !== undefined &&
    contexto.zonasPorId.size > 0 &&
    !contexto.zonasPorId.has(requerimiento.zona)
  ) {
    issues.push(
      error(
        archivo.ruta,
        'zona-desconocida',
        `La zona "${requerimiento.zona}" no existe en content/zonas.toml.`,
        ['zona'],
      ),
    );
  }

  validarGmaps(archivo.ruta, requerimiento.ubicacion.gmaps_url, ['ubicacion', 'gmaps_url'], issues);
}

function validarZonaGeo(
  zonaGeo: ZonaGeoT,
  archivo: ArchivoFuente,
  contexto: Contexto,
  idsGlobales: Map<string, string>,
  issues: Issue[],
): void {
  const idArchivo = nombreSinExtension(archivo.ruta);
  if (idArchivo !== zonaGeo.id) {
    issues.push(
      error(
        archivo.ruta,
        'id-archivo',
        `El archivo se llama "${idArchivo}" pero la zona declara id "${zonaGeo.id}".`,
        ['id'],
      ),
    );
  }

  const previo = idsGlobales.get(zonaGeo.id);
  if (previo !== undefined) {
    issues.push(
      error(archivo.ruta, 'id-duplicado', `El id "${zonaGeo.id}" ya está usado en ${previo}.`, [
        'id',
      ]),
    );
  } else {
    idsGlobales.set(zonaGeo.id, archivo.ruta);
  }

  const tipo = contexto.tiposPorId.get(zonaGeo.tipo);
  if (tipo === undefined) {
    issues.push(
      error(
        archivo.ruta,
        'tipo-desconocido',
        `El tipo "${zonaGeo.tipo}" no existe en content/tipos.toml.`,
        ['tipo'],
      ),
    );
    return;
  }
  if (tipo.categoria !== 'zona') {
    issues.push(
      error(
        archivo.ruta,
        'tipo-categoria',
        `El tipo "${tipo.id}" tiene categoría "${tipo.categoria}"; en zonas_geo solo se usan tipos de categoría "zona".`,
        ['tipo'],
      ),
    );
  }
  if (!tipo.geometrias.includes(zonaGeo.geometria.tipo)) {
    issues.push(
      error(
        archivo.ruta,
        'geometria-no-permitida',
        `El tipo "${tipo.id}" no admite geometría "${zonaGeo.geometria.tipo}".`,
        ['geometria', 'tipo'],
        `Geometrías permitidas: ${tipo.geometrias.join(', ')}.`,
      ),
    );
  }

  validarDetalles(zonaGeo.id, zonaGeo.detalles, tipo, archivo.ruta, issues);

  if (
    zonaGeo.zona !== undefined &&
    contexto.zonasPorId.size > 0 &&
    !contexto.zonasPorId.has(zonaGeo.zona)
  ) {
    issues.push(
      error(
        archivo.ruta,
        'zona-desconocida',
        `La zona "${zonaGeo.zona}" no existe en content/zonas.toml.`,
        ['zona'],
      ),
    );
  }
}

export function buildDataset(crudo: DatasetCrudo, opciones: OpcionesBuild = {}): ResultadoDataset {
  const issues: Issue[] = [];
  const ahora = (opciones.now ?? new Date()).getTime();

  // --- site.toml -----------------------------------------------------------
  const siteValor = parsear(crudo.site, issues);
  const site = siteValor === null ? null : parsearConEsquema(crudo.site, Site, siteValor, issues);

  // --- tipos.toml ----------------------------------------------------------
  const tiposValor = parsear(crudo.tipos, issues);
  let tipos: TipoRecursoT[] = [];
  if (tiposValor !== null) {
    const contenedor = z.strictObject({ tipos: z.array(TipoRecurso).min(1) }).safeParse(tiposValor);
    if (!contenedor.success) {
      agregarErroresZod(crudo.tipos, [], contenedor.error, issues);
    } else {
      tipos = contenedor.data.tipos;
    }
  }

  const tiposPorId = new Map<string, TipoRecursoT>();
  for (const tipo of tipos) {
    const previo = tiposPorId.get(tipo.id);
    if (previo !== undefined) {
      issues.push(
        error(
          crudo.tipos.ruta,
          'tipo-duplicado',
          `El tipo "${tipo.id}" está definido más de una vez.`,
          ['tipos'],
        ),
      );
    } else {
      tiposPorId.set(tipo.id, tipo);
    }
  }

  // --- zonas.toml ----------------------------------------------------------
  let zonas: ZonaT[] = [];
  if (crudo.zonas !== null) {
    const zonasValor = parsear(crudo.zonas, issues);
    if (zonasValor !== null) {
      const contenedor = z.strictObject({ zonas: z.array(Zona).min(1) }).safeParse(zonasValor);
      if (!contenedor.success) {
        agregarErroresZod(crudo.zonas, [], contenedor.error, issues);
      } else {
        zonas = contenedor.data.zonas;
      }
    }
  }

  const zonasPorId = new Map<string, ZonaT>();
  for (const zona of zonas) {
    if (zonasPorId.has(zona.id)) {
      issues.push(
        error(
          crudo.zonas?.ruta ?? 'content/zonas.toml',
          'zona-duplicada',
          `La zona "${zona.id}" está definida más de una vez.`,
          ['zonas'],
        ),
      );
    } else {
      zonasPorId.set(zona.id, zona);
    }
  }

  // --- recursos ------------------------------------------------------------
  const recursos: RecursoT[] = [];
  const idsGlobales = new Map<string, string>();
  const idsAlerta = new Map<string, string>();
  const contexto: Contexto = { tiposPorId, zonasPorId, recursos };

  for (const archivo of crudo.recursos) {
    const valor = parsear(archivo, issues);
    if (valor === null) continue;
    const recurso = parsearConEsquema(archivo, Recurso, valor, issues);
    if (recurso === null) continue;
    recursos.push(recurso);
    validarRecurso(recurso, archivo, contexto, ahora, idsAlerta, idsGlobales, issues);
  }

  // --- requerimientos ------------------------------------------------------
  const requerimientos: RequerimientoT[] = [];
  for (const archivo of crudo.requerimientos) {
    const valor = parsear(archivo, issues);
    if (valor === null) continue;
    const requerimiento = parsearConEsquema(archivo, Requerimiento, valor, issues);
    if (requerimiento === null) continue;
    requerimientos.push(requerimiento);
    validarRequerimiento(requerimiento, archivo, contexto, idsGlobales, issues);
  }

  // --- zonas_geo -----------------------------------------------------------
  const zonasGeo: ZonaGeoT[] = [];
  for (const archivo of crudo.zonasGeo) {
    const valor = parsear(archivo, issues);
    if (valor === null) continue;
    const zonaGeo = parsearConEsquema(archivo, ZonaGeo, valor, issues);
    if (zonaGeo === null) continue;
    zonasGeo.push(zonaGeo);
    validarZonaGeo(zonaGeo, archivo, contexto, idsGlobales, issues);
  }

  if (site === null) {
    return { dataset: null, issues };
  }

  return {
    dataset: { site, tipos, tiposPorId, zonas, zonasPorId, recursos, requerimientos, zonasGeo },
    issues,
  };
}
