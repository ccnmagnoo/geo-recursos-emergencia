import { z } from 'zod';

import { ICONO_IDS, type IconoId } from './iconos';

/**
 * Esquema del contenido operativo.
 *
 * Todo lo que llega de un archivo TOML pasa por aquí antes de tocar el sitio.
 * Las fechas se escriben como fecha-hora ISO con offset chileno y se validan
 * contra el calendario real (2026-02-30 no es válido).
 */

export const ZONA_HORARIA = 'America/Santiago';

export const ESTADOS_RECURSO = [
  'operativo',
  'con_falla',
  'fuera_de_servicio',
  'en_traslado',
  'planificado',
  'retirado',
] as const;
export type EstadoRecurso = (typeof ESTADOS_RECURSO)[number];

export const SEVERIDADES_ALERTA = ['info', 'precaucion', 'critica'] as const;
export type SeveridadAlerta = (typeof SEVERIDADES_ALERTA)[number];

export const ESTADOS_TRASLADO = ['proyectado', 'en_curso', 'completado', 'cancelado'] as const;
export type EstadoTraslado = (typeof ESTADOS_TRASLADO)[number];

export const FORMAS = [
  'circulo',
  'cuadrado',
  'rombo',
  'triangulo',
  'hexagono',
  'estrella',
] as const;
export type Forma = (typeof FORMAS)[number];

export const CATEGORIAS = ['movil', 'fijo', 'zona', 'requerimiento'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const GEOMETRIAS = ['punto', 'linea', 'poligono'] as const;
export type Geometria = (typeof GEOMETRIAS)[number];

export const TIPOS_CAMPO = [
  'texto',
  'entero',
  'decimal',
  'booleano',
  'opcion',
  'fecha_hora',
] as const;
export type TipoCampo = (typeof TIPOS_CAMPO)[number];

export const PRIORIDADES = ['baja', 'media', 'alta', 'critica'] as const;
export type Prioridad = (typeof PRIORIDADES)[number];

export const ESTADOS_REQUERIMIENTO = ['abierto', 'asignado', 'cubierto'] as const;
export type EstadoRequerimiento = (typeof ESTADOS_REQUERIMIENTO)[number];

// --- Primitivos -------------------------------------------------------------

const ISO_CHILE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(-03:00|-04:00)$/;

/** Verifica formato, offset chileno y que la fecha exista en el calendario. */
export function isFechaIsoChile(value: string): boolean {
  const match = ISO_CHILE.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, , offset] = match;
  if (year === undefined || month === undefined || day === undefined) return false;
  if (hour === undefined || minute === undefined || second === undefined) return false;
  if (offset === undefined) return false;

  const instant = Date.parse(value);
  if (Number.isNaN(instant)) return false;

  // Date.parse desborda días inválidos (30 de febrero -> 2 de marzo). Comparamos
  // el calendario "de pared" en el offset declarado para detectarlo.
  const offsetMinutes = (offset === '-03:00' ? -3 : -4) * 60;
  const wall = new Date(instant + offsetMinutes * 60_000);
  return (
    wall.getUTCFullYear() === Number(year) &&
    wall.getUTCMonth() + 1 === Number(month) &&
    wall.getUTCDate() === Number(day) &&
    wall.getUTCHours() === Number(hour) &&
    wall.getUTCMinutes() === Number(minute) &&
    wall.getUTCSeconds() === Number(second)
  );
}

const fechaIso = z.string().refine(isFechaIsoChile, {
  message:
    'Fecha-hora ISO 8601 con offset de Chile, por ejemplo 2026-11-05T14:00:00-03:00 (se aceptan -03:00 y -04:00).',
});

/** Quita los milisegundos: el contenido se guarda con precisión de segundos. */
function normalizarIso(valor: unknown): unknown {
  if (typeof valor === 'string') return valor.replace(/\.\d{1,3}(?=(-03:00|-04:00)$)/, '');
  if (valor instanceof Date)
    return valor.toISOString().replace(/\.\d{1,3}(?=(-03:00|-04:00)$)/, '');
  return valor;
}

/**
 * Acepta fechas que vienen del parser TOML (objetos Date/TomlDate) y las
 * normaliza al ISO con offset que usa el resto del sistema.
 */
export const FechaHora = z.preprocess(normalizarIso, fechaIso);

/** Igual que FechaHora pero admite "" como ausencia de valor. */
export const FechaHoraOpcional = z.preprocess(
  (value) => (value === '' ? undefined : normalizarIso(value)),
  fechaIso.optional(),
);

export const IdRecurso = z
  .string()
  .regex(
    /^[A-Z]{2,4}-\d{3,4}$/,
    'Identificador esperado: 2 a 4 letras mayúsculas, guion y 3-4 dígitos. Ej: TIL-001.',
  );

export const IdTipo = z
  .string()
  .regex(
    /^[a-z][a-z0-9_]{2,39}$/,
    'Identificador de tipo en minúsculas: letras, números y guion bajo.',
  );

export const IdAlerta = z.string().regex(/^A-\d{4}$/, 'Identificador de alerta esperado: A-0001.');

export const IdTraslado = z
  .string()
  .regex(/^T-\d{4}$/, 'Identificador de traslado esperado: T-0001.');

export const ColorHex = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color esperado en formato hexadecimal, por ejemplo #1d4ed8.');

export const UrlHttps = z
  .url()
  .refine((value) => value.startsWith('https://'), 'Solo se permiten enlaces https://');

// --- Piezas del recurso -----------------------------------------------------

export const Lugar = z.strictObject({
  nombre: z.string().min(1).max(160),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  gmaps_url: UrlHttps.optional(),
  desde: FechaHora.optional(),
  notas: z.string().max(500).optional(),
});

export const EventoEstado = z.strictObject({
  fecha: FechaHora,
  estado: z.enum(ESTADOS_RECURSO),
  autor: z.string().min(1).max(80),
  nota: z.string().max(500).optional(),
});

export const Observacion = z.strictObject({
  fecha: FechaHora,
  autor: z.string().min(1).max(80),
  texto: z.string().min(1).max(1000),
});

export const Alerta = z.strictObject({
  id: IdAlerta,
  fecha: FechaHora,
  severidad: z.enum(SEVERIDADES_ALERTA),
  texto: z.string().min(1).max(1000),
  vigente: z.boolean().default(true),
  expira: FechaHora.optional(),
});

export const Traslado = z
  .strictObject({
    id: IdTraslado,
    estado: z.enum(ESTADOS_TRASLADO),
    motivo: z.string().min(1).max(300),
    origen: Lugar,
    destino: Lugar,
    fecha_estimada: FechaHoraOpcional,
    fecha_real: FechaHoraOpcional,
    autor: z.string().min(1).max(80).optional(),
    notas: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.estado === 'proyectado' && value.fecha_estimada === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_estimada'],
        message: 'Un traslado proyectado necesita fecha_estimada.',
      });
    }
    if (value.estado === 'completado' && value.fecha_real === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_real'],
        message: 'Un traslado completado necesita fecha_real.',
      });
    }
    if (value.estado === 'cancelado' && value.fecha_real !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['fecha_real'],
        message: 'Un traslado cancelado no debería tener fecha_real.',
      });
    }
  });

export const Correccion = z.strictObject({
  corrige: z
    .string()
    .regex(
      /^(historial_estado|observaciones|alertas|traslados):[^\s]+$/,
      'Referencia esperada: historial_estado:<fecha>, observaciones:<fecha>, alertas:<id> o traslados:<id>.',
    ),
  fecha: FechaHora,
  autor: z.string().min(1).max(80),
  nota: z.string().min(1).max(1000),
});

export const DetalleValor = z.union([z.string(), z.number(), z.boolean()]);

export const Recurso = z.strictObject({
  id: IdRecurso,
  tipo: IdTipo,
  nombre: z.string().min(1).max(160),
  institucion: z.string().min(1).max(160),
  descripcion: z.string().max(1000).default(''),
  publicado: z.boolean().default(true),
  ejemplo: z.boolean().default(false),
  estado_actual: z.enum(ESTADOS_RECURSO),
  zona: z.string().max(40).optional(),
  detalles: z.record(z.string(), DetalleValor).default({}),
  ubicacion_actual: Lugar,
  historial_estado: z
    .array(EventoEstado)
    .min(1, 'Todo recurso necesita al menos un evento de estado.'),
  observaciones: z.array(Observacion).default([]),
  alertas: z.array(Alerta).default([]),
  traslados: z.array(Traslado).default([]),
  correcciones: z.array(Correccion).default([]),
});

// --- Catálogo de tipos ------------------------------------------------------

export const CampoExtra = z
  .strictObject({
    clave: z
      .string()
      .regex(/^[a-z][a-z0-9_]{1,39}$/, 'Clave en minúsculas, por ejemplo combustible_pct.'),
    etiqueta: z.string().min(1).max(80),
    tipo: z.enum(TIPOS_CAMPO),
    requerido: z.boolean().default(false),
    unidad: z.string().max(20).optional(),
    ayuda: z.string().max(200).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    opciones: z.array(z.string().min(1)).min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.tipo === 'opcion' && value.opciones === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['opciones'],
        message: 'Un campo de opción necesita opciones.',
      });
    }
    if (value.tipo !== 'opcion' && value.opciones !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['opciones'],
        message: 'Solo los campos de tipo opcion declaran opciones.',
      });
    }
    if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
      ctx.addIssue({ code: 'custom', path: ['min'], message: 'min no puede ser mayor que max.' });
    }
  });

export const TipoRecurso = z.strictObject({
  id: IdTipo,
  etiqueta: z.string().min(1).max(80),
  etiqueta_plural: z.string().min(1).max(80),
  categoria: z.enum(CATEGORIAS),
  movil: z.boolean().default(false),
  geometrias: z.array(z.enum(GEOMETRIAS)).min(1),
  color: ColorHex,
  forma: z.enum(FORMAS),
  icono: z.custom<IconoId>(
    (valor) => typeof valor === 'string' && (ICONO_IDS as string[]).includes(valor),
    { message: `Icono desconocido. Disponibles: ${ICONO_IDS.join(', ')}.` },
  ),
  orden: z.number().int().min(0).max(999).default(100),
  descripcion: z.string().max(300).optional(),
  campos: z.array(CampoExtra).default([]),
});

// --- Otros archivos ---------------------------------------------------------

export const Site = z.strictObject({
  titulo: z.string().min(1).max(120),
  subtitulo: z.string().max(200).optional(),
  institucion: z.string().min(1).max(160),
  contacto: z.string().min(1).max(200),
  umbral_desactualizado_horas: z.number().int().min(1).max(168).default(12),
  zona_horaria: z.literal(ZONA_HORARIA).default(ZONA_HORARIA),
  mostrar_ejemplos: z.boolean().default(true),
  aviso: z.string().max(300).optional(),
  mapa: z.strictObject({
    centro_lat: z.number().min(-90).max(90),
    centro_lng: z.number().min(-180).max(180),
    zoom: z.number().int().min(3).max(19),
  }),
  teselas: z.strictObject({
    url: z
      .url()
      .refine((value) => value.startsWith('https://'), 'Las teselas deben servirse por https://'),
    atribucion: z.string().min(1).max(500),
    atribucion_url: UrlHttps.optional(),
    max_zoom: z.number().int().min(1).max(22).default(19),
  }),
  emergencias: z
    .array(
      z.strictObject({
        nombre: z.string().min(1).max(60),
        telefono: z.string().min(3).max(20),
        descripcion: z.string().max(120).optional(),
      }),
    )
    .min(1),
});

export const Zona = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/, 'Identificador de zona en minúsculas.'),
  nombre: z.string().min(1).max(80),
  comuna: z.string().max(80).optional(),
});

export const ZonasFile = z.strictObject({
  zonas: z.array(Zona).min(1),
});

export const Requerimiento = z
  .strictObject({
    id: IdRecurso,
    tipo_recurso: IdTipo,
    nombre: z.string().min(1).max(160),
    cantidad: z.number().int().min(1).max(10_000),
    prioridad: z.enum(PRIORIDADES),
    estado: z.enum(ESTADOS_REQUERIMIENTO),
    asignado_a: IdRecurso.optional(),
    zona: z.string().max(40).optional(),
    ubicacion: Lugar,
    fecha: FechaHora,
    solicitado_por: z.string().min(1).max(160),
    notas: z.string().max(1000).optional(),
    publicado: z.boolean().default(true),
    ejemplo: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    const requiereAsignacion = value.estado === 'asignado' || value.estado === 'cubierto';
    if (requiereAsignacion && value.asignado_a === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['asignado_a'],
        message: 'Un requerimiento asignado o cubierto debe indicar asignado_a.',
      });
    }
    if (value.estado === 'abierto' && value.asignado_a !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['asignado_a'],
        message: 'Un requerimiento abierto todavía no tiene recurso asignado.',
      });
    }
  });

const Coordenada = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

export const Geom = z
  .strictObject({
    tipo: z.enum(GEOMETRIAS),
    coordenadas: z.array(Coordenada).min(1, 'La geometría necesita coordenadas.'),
    vigencia_desde: FechaHora.optional(),
    vigencia_hasta: FechaHora.optional(),
    fuente: z.string().max(200).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.tipo !== 'punto' && value.coordenadas.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['coordenadas'],
        message: 'Una línea o polígono necesita al menos 2 coordenadas.',
      });
    }
    if (value.tipo === 'poligono' && value.coordenadas.length < 3) {
      ctx.addIssue({
        code: 'custom',
        path: ['coordenadas'],
        message: 'Un polígono necesita al menos 3 coordenadas.',
      });
    }
    if (
      value.vigencia_desde !== undefined &&
      value.vigencia_hasta !== undefined &&
      Date.parse(value.vigencia_hasta) <= Date.parse(value.vigencia_desde)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['vigencia_hasta'],
        message: 'La vigencia debe terminar después de empezar.',
      });
    }
  });

export const ZonaGeo = z.strictObject({
  id: IdRecurso,
  tipo: IdTipo,
  nombre: z.string().min(1).max(160),
  descripcion: z.string().max(1000).default(''),
  publicado: z.boolean().default(true),
  ejemplo: z.boolean().default(false),
  zona: z.string().max(40).optional(),
  detalles: z.record(z.string(), DetalleValor).default({}),
  geometria: Geom,
});

// --- Tipos inferidos --------------------------------------------------------

export type LugarT = z.infer<typeof Lugar>;
export type EventoEstadoT = z.infer<typeof EventoEstado>;
export type ObservacionT = z.infer<typeof Observacion>;
export type AlertaT = z.infer<typeof Alerta>;
export type TrasladoT = z.infer<typeof Traslado>;
export type CorreccionT = z.infer<typeof Correccion>;
export type RecursoT = z.infer<typeof Recurso>;
export type TipoRecursoT = z.infer<typeof TipoRecurso>;
export type CampoExtraT = z.infer<typeof CampoExtra>;
export type SiteT = z.infer<typeof Site>;
export type ZonaT = z.infer<typeof Zona>;
export type RequerimientoT = z.infer<typeof Requerimiento>;
export type ZonaGeoT = z.infer<typeof ZonaGeo>;
