/**
 * Fechas y horas del proyecto.
 *
 * Regla: el contenido se escribe en ISO 8601 con el offset de Chile
 * (`-03:00` en horario de verano, `-04:00` en invierno). Nunca `toISOString()`
 * para escribir TOML: eso devuelve UTC y rompe la hora local del operador.
 */

export const ZONA_HORARIA = 'America/Santiago';

const FORMATO_PARTES = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const FORMATO_OFFSET = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  timeZoneName: 'longOffset',
});

export function parsearFecha(iso: string): Date {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) {
    throw new RangeError(`Fecha inválida: "${iso}". Se espera ISO 8601 con offset.`);
  }
  return fecha;
}

/** Offset vigente en Chile para un instante dado. */
export function offsetChile(instante: Date = new Date()): '-03:00' | '-04:00' {
  const parte = FORMATO_OFFSET.formatToParts(instante).find((p) => p.type === 'timeZoneName');
  return parte?.value === 'GMT-04:00' ? '-04:00' : '-03:00';
}

/** Convierte un instante a ISO con offset chileno, sin milisegundos. */
export function aIsoChile(instante: Date = new Date()): string {
  const partes = new Map(FORMATO_PARTES.formatToParts(instante).map((p) => [p.type, p.value]));
  const anio = partes.get('year') ?? '0000';
  const mes = partes.get('month') ?? '01';
  const dia = partes.get('day') ?? '01';
  const hora = partes.get('hour') ?? '00';
  const minuto = partes.get('minute') ?? '00';
  const segundo = partes.get('second') ?? '00';
  return `${anio}-${mes}-${dia}T${hora}:${minuto}:${segundo}${offsetChile(instante)}`;
}

/** Hora actual en Chile, lista para escribir en un TOML. */
export function ahoraIsoChile(): string {
  return aIsoChile(new Date());
}

const ABSOLUTA = new Intl.DateTimeFormat('es-CL', {
  timeZone: ZONA_HORARIA,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const HORA = new Intl.DateTimeFormat('es-CL', {
  timeZone: ZONA_HORARIA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const FECHA_CORTA = new Intl.DateTimeFormat('es-CL', {
  timeZone: ZONA_HORARIA,
  day: 'numeric',
  month: 'short',
});

const RELATIVA = new Intl.RelativeTimeFormat('es-CL', { numeric: 'always' });

/** "5 nov 2026, 14:05" en hora de Chile. */
export function formatearAbsoluta(iso: string): string {
  return ABSOLUTA.format(parsearFecha(iso)).replace(/\s+/g, ' ');
}

/** "14:05" en hora de Chile. */
export function formatearHora(iso: string): string {
  return HORA.format(parsearFecha(iso));
}

/** "5 nov" en hora de Chile. */
export function formatearFechaCorta(iso: string): string {
  return FECHA_CORTA.format(parsearFecha(iso));
}

/** "hace 12 minutos", "ayer", "en 2 horas". */
export function formatearRelativa(iso: string, ahora: Date = new Date()): string {
  const objetivo = parsearFecha(iso);
  const deltaSegundos = Math.round((objetivo.getTime() - ahora.getTime()) / 1000);
  const absoluto = Math.abs(deltaSegundos);

  if (absoluto < 45) return 'ahora';
  if (absoluto < 90) return RELATIVA.format(Math.sign(deltaSegundos), 'minute');
  if (absoluto < 45 * 60) {
    return RELATIVA.format(Math.round(deltaSegundos / 60), 'minute');
  }
  if (absoluto < 90 * 60) return RELATIVA.format(Math.sign(deltaSegundos), 'hour');
  if (absoluto < 22 * 3600) {
    return RELATIVA.format(Math.round(deltaSegundos / 3600), 'hour');
  }
  if (absoluto < 36 * 3600) return RELATIVA.format(Math.sign(deltaSegundos), 'day');
  if (absoluto < 26 * 24 * 3600) {
    return RELATIVA.format(Math.round(deltaSegundos / 86_400), 'day');
  }
  if (absoluto < 320 * 24 * 3600) {
    return RELATIVA.format(Math.round(deltaSegundos / (30 * 86_400)), 'month');
  }
  return RELATIVA.format(Math.round(deltaSegundos / (365 * 86_400)), 'year');
}

export function antiguedadMs(iso: string, ahora: Date = new Date()): number {
  return ahora.getTime() - parsearFecha(iso).getTime();
}

/** ¿El dato supera el umbral configurado? */
export function esDesactualizado(
  iso: string,
  umbralHoras: number,
  ahora: Date = new Date(),
): boolean {
  return antiguedadMs(iso, ahora) > umbralHoras * 3_600_000;
}

/** "Actualizado hace 12 minutos" o "Actualizado hace 2 días". */
export function etiquetaFrescura(
  iso: string,
  umbralHoras: number,
  ahora: Date = new Date(),
): { texto: string; desactualizado: boolean; absoluta: string } {
  return {
    texto: `Actualizado ${formatearRelativa(iso, ahora)}`,
    desactualizado: esDesactualizado(iso, umbralHoras, ahora),
    absoluta: formatearAbsoluta(iso),
  };
}

/** Duración legible entre dos instantes: "3 h 20 min". */
export function formatearDuracion(desdeIso: string, hastaIso: string): string {
  const ms = Math.abs(parsearFecha(hastaIso).getTime() - parsearFecha(desdeIso).getTime());
  const minutos = Math.round(ms / 60_000);
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${minutos} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}

/** ¿La fecha cae dentro de la vigencia [desde, hasta]? */
export function estaVigente(
  desdeIso: string | undefined,
  hastaIso: string | undefined,
  ahora: Date = new Date(),
): boolean {
  const t = ahora.getTime();
  if (desdeIso !== undefined && parsearFecha(desdeIso).getTime() > t) return false;
  if (hastaIso !== undefined && parsearFecha(hastaIso).getTime() < t) return false;
  return true;
}
