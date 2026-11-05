import type { AlertaT, CampoExtraT, EstadoRecurso, RecursoT, TipoRecursoT } from './schema';
import { estaVigente, formatearAbsoluta, parsearFecha } from './tiempo';

/** Textos y cálculos que la interfaz hace sobre un recurso. */

const ETIQUETAS_ESTADO: Record<EstadoRecurso, string> = {
  operativo: 'Funcionando',
  con_falla: 'Con falla',
  fuera_de_servicio: 'Fuera de servicio',
  en_traslado: 'En traslado',
  planificado: 'Planificado',
  retirado: 'Retirado',
};

const TONOS_ESTADO: Record<EstadoRecurso, 'ok' | 'alerta' | 'falla' | 'neutral'> = {
  operativo: 'ok',
  con_falla: 'alerta',
  fuera_de_servicio: 'falla',
  en_traslado: 'neutral',
  planificado: 'neutral',
  retirado: 'falla',
};

export function etiquetaEstado(estado: EstadoRecurso): string {
  return ETIQUETAS_ESTADO[estado];
}

export function tonoEstado(estado: EstadoRecurso): 'ok' | 'alerta' | 'falla' | 'neutral' {
  return TONOS_ESTADO[estado];
}

/**
 * Última vez que alguien tocó el dato. Excluye fechas proyectadas: una
 * proyección futura no hace que el estado actual esté fresco.
 */
export function ultimaActualizacion(recurso: RecursoT): string {
  const fechas: string[] = [
    ...recurso.historial_estado.map((evento) => evento.fecha),
    ...recurso.observaciones.map((observacion) => observacion.fecha),
    ...recurso.alertas.map((alerta) => alerta.fecha),
    ...recurso.correcciones.map((correccion) => correccion.fecha),
    ...recurso.traslados
      .map((traslado) => traslado.fecha_real)
      .filter((fecha): fecha is string => fecha !== undefined),
  ];
  if (recurso.ubicacion_actual.desde !== undefined) fechas.push(recurso.ubicacion_actual.desde);

  let ultima = fechas[0] ?? new Date(0).toISOString();
  for (const fecha of fechas) {
    if (parsearFecha(fecha).getTime() > parsearFecha(ultima).getTime()) ultima = fecha;
  }
  return ultima;
}

export function ultimaActualizacionGlobal(recursos: RecursoT[]): string {
  let ultima = new Date(0).toISOString();
  for (const recurso of recursos) {
    const fecha = ultimaActualizacion(recurso);
    if (parsearFecha(fecha).getTime() > parsearFecha(ultima).getTime()) ultima = fecha;
  }
  return ultima;
}

export function alertaEstaVigente(alerta: AlertaT, ahora: Date = new Date()): boolean {
  if (!alerta.vigente) return false;
  return estaVigente(alerta.fecha, alerta.expira, ahora);
}

export function alertasVigentesDe(recurso: RecursoT, ahora: Date = new Date()): AlertaT[] {
  return recurso.alertas
    .filter((alerta) => alertaEstaVigente(alerta, ahora))
    .sort((a, b) => {
      const orden = { critica: 0, precaucion: 1, info: 2 } as const;
      if (orden[a.severidad] !== orden[b.severidad]) return orden[a.severidad] - orden[b.severidad];
      return parsearFecha(b.fecha).getTime() - parsearFecha(a.fecha).getTime();
    });
}

export interface DetalleLegible {
  etiqueta: string;
  valor: string;
  unidad?: string;
  clave: string;
}

export function detallesLegibles(recurso: RecursoT, tipo: TipoRecursoT): DetalleLegible[] {
  const resultado: DetalleLegible[] = [];
  for (const campo of tipo.campos) {
    if (!(campo.clave in recurso.detalles)) continue;
    const valor = recurso.detalles[campo.clave];
    if (valor === undefined) continue;
    resultado.push({
      clave: campo.clave,
      etiqueta: campo.etiqueta,
      valor: formatearValorDetalle(campo, valor),
      ...(campo.unidad === undefined ? {} : { unidad: campo.unidad }),
    });
  }
  return resultado;
}

export function formatearValorDetalle(
  campo: CampoExtraT,
  valor: string | number | boolean,
): string {
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (campo.tipo === 'fecha_hora' && typeof valor === 'string') return formatearAbsoluta(valor);
  if (typeof valor === 'number') {
    return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(valor);
  }
  return valor;
}

/** "2 críticas, 1 precaución" para el resumen de portada. */
export function resumenAlertas(alertas: AlertaT[]): string {
  const criticas = alertas.filter((alerta) => alerta.severidad === 'critica').length;
  const precauciones = alertas.filter((alerta) => alerta.severidad === 'precaucion').length;
  const partes: string[] = [];
  if (criticas > 0) partes.push(`${criticas} ${criticas === 1 ? 'crítica' : 'críticas'}`);
  if (precauciones > 0) {
    partes.push(`${precauciones} ${precauciones === 1 ? 'precaución' : 'precauciones'}`);
  }
  if (partes.length === 0) return 'Sin alertas críticas';
  return partes.join(' · ');
}
