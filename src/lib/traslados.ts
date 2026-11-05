import type { EstadoTraslado, LugarT, RecursoT, TrasladoT } from './schema';

/**
 * Derivación de ubicaciones a partir de los traslados.
 *
 * El TOML guarda la ubicación actual y la lista de traslados; el "anterior" y
 * el "futuro" se calculan. Así no hay dos fuentes de verdad que se puedan
 * desincronizar.
 */

export interface UbicacionDerivada {
  lugar: LugarT;
  /** Fecha en que la ubicación rige (o regirá, si es futura). */
  fecha?: string;
  trasladoId?: string;
  motivo?: string;
}

export interface UbicacionFutura extends UbicacionDerivada {
  estado: Extract<EstadoTraslado, 'proyectado' | 'en_curso'>;
}

export interface TrasladosDerivados {
  anterior?: UbicacionDerivada;
  actual: UbicacionDerivada;
  futura?: UbicacionFutura;
  /** Traslados completados, del más reciente al más antiguo. */
  completados: TrasladoT[];
  /** Proyección vigente: en curso primero, luego proyectado más próximo. */
  proximo?: TrasladoT;
}

function ms(fecha: string | undefined): number {
  return fecha === undefined ? 0 : Date.parse(fecha);
}

export function ultimoCompletado(recurso: RecursoT): TrasladoT | undefined {
  const completados = recurso.traslados
    .filter((traslado) => traslado.estado === 'completado')
    .sort((a, b) => ms(b.fecha_real) - ms(a.fecha_real));
  return completados[0];
}

export function proximoTraslado(recurso: RecursoT): TrasladoT | undefined {
  const candidatos = recurso.traslados.filter(
    (traslado) => traslado.estado === 'proyectado' || traslado.estado === 'en_curso',
  );
  if (candidatos.length === 0) return undefined;

  const enCurso = candidatos.find((traslado) => traslado.estado === 'en_curso');
  if (enCurso !== undefined) return enCurso;

  return [...candidatos].sort((a, b) => ms(a.fecha_estimada) - ms(b.fecha_estimada))[0];
}

export function derivarUbicaciones(recurso: RecursoT): TrasladosDerivados {
  const completados = recurso.traslados
    .filter((traslado) => traslado.estado === 'completado')
    .sort((a, b) => ms(b.fecha_real) - ms(a.fecha_real));

  const ultimo = completados[0];
  const proximo = proximoTraslado(recurso);

  const actual: UbicacionDerivada = { lugar: recurso.ubicacion_actual };
  if (recurso.ubicacion_actual.desde !== undefined) {
    actual.fecha = recurso.ubicacion_actual.desde;
  }

  const resultado: TrasladosDerivados = { actual, completados };
  if (ultimo !== undefined) {
    const anterior: UbicacionDerivada = {
      lugar: ultimo.origen,
      trasladoId: ultimo.id,
      motivo: ultimo.motivo,
    };
    if (ultimo.fecha_real !== undefined) anterior.fecha = ultimo.fecha_real;
    resultado.anterior = anterior;
  }

  if (proximo !== undefined && (proximo.estado === 'proyectado' || proximo.estado === 'en_curso')) {
    const futura: UbicacionFutura = {
      lugar: proximo.destino,
      estado: proximo.estado,
      trasladoId: proximo.id,
      motivo: proximo.motivo,
    };
    if (proximo.fecha_estimada !== undefined) futura.fecha = proximo.fecha_estimada;
    resultado.futura = futura;
  }

  if (proximo !== undefined) resultado.proximo = proximo;

  return resultado;
}

/** ¿Vale la pena dibujar el interruptor "Mostrar traslados"? */
export function tieneTraslados(recurso: RecursoT): boolean {
  return recurso.traslados.length > 0;
}

export const ETIQUETA_ESTADO_TRASLADO: Record<EstadoTraslado, string> = {
  proyectado: 'Proyectado, no confirmado',
  en_curso: 'En curso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

/** Texto honesto para la ficha: nunca afirmar como hecho algo proyectado. */
export function describirFutura(futura: UbicacionFutura): string {
  if (futura.estado === 'en_curso') {
    return `En traslado hacia ${futura.lugar.nombre}`;
  }
  return `Traslado proyectado a ${futura.lugar.nombre} (no confirmado)`;
}
