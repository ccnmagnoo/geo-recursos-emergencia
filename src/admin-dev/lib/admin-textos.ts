import type { EstadoRecurso, EstadoTraslado, SeveridadAlerta } from '../../lib/schema';

const ESTADOS: Record<EstadoRecurso, string> = {
  operativo: 'Funcionando',
  con_falla: 'Con falla',
  fuera_de_servicio: 'Fuera de servicio',
  en_traslado: 'En traslado',
  planificado: 'Planificado',
  retirado: 'Retirado',
};

const SEVERIDADES: Record<SeveridadAlerta, string> = {
  info: 'Información',
  precaucion: 'Precaución',
  critica: 'Crítica',
};

const ESTADOS_TRASLADO: Record<EstadoTraslado, string> = {
  proyectado: 'Proyectado, no confirmado',
  en_curso: 'En curso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export function estadoLegible(estado: string): string {
  return ESTADOS[estado as EstadoRecurso] ?? estado;
}

export function severidadLegible(severidad: string): string {
  return SEVERIDADES[severidad as SeveridadAlerta] ?? severidad;
}

export function estadoTrasladoLegible(estado: string): string {
  return ESTADOS_TRASLADO[estado as EstadoTraslado] ?? estado;
}
