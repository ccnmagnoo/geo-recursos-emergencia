import type { RecursoT, SiteT, TipoRecursoT } from './schema';
import {
  alertasVigentesDe,
  detallesLegibles,
  etiquetaEstado,
  tonoEstado,
  ultimaActualizacion,
} from './recurso';
import { derivarUbicaciones } from './traslados';
import { etiquetaFrescura, formatearAbsoluta } from './tiempo';
import { urlComoLlegar } from './url';

/** Estructura que consume la isla del mapa (JSON, sin clases ni funciones). */

export interface LugarVista {
  nombre: string;
  lat: number;
  lng: number;
}

export interface DetalleVista {
  etiqueta: string;
  valor: string;
  unidad?: string;
}

export interface EventoVista {
  fecha: string;
  absoluta: string;
  estado: string;
  estadoTexto: string;
  autor: string;
  nota?: string;
  corregido: boolean;
}

export interface RecursoVista {
  id: string;
  nombre: string;
  descripcion: string;
  institucion: string;
  tipo: {
    id: string;
    etiqueta: string;
    color: string;
    forma: string;
    simbolo: string;
    movil: boolean;
  };
  estado: string;
  estadoTexto: string;
  tono: 'ok' | 'alerta' | 'falla' | 'neutral';
  zona?: string;
  ubicacion: LugarVista;
  gmaps: string;
  frescura: {
    fecha: string;
    texto: string;
    absoluta: string;
    desactualizado: boolean;
  };
  anterior?: LugarVista;
  futura?: LugarVista & {
    estado: 'proyectado' | 'en_curso';
    fecha?: string;
    motivo: string;
    etiqueta: string;
  };
  lineas: {
    historica?: [LugarVista, LugarVista];
    proyectada?: [LugarVista, LugarVista];
  };
  detalles: DetalleVista[];
  historial: EventoVista[];
  observaciones: Array<{ fecha: string; absoluta: string; autor: string; texto: string }>;
  alertas: Array<{
    id: string;
    severidad: 'info' | 'precaucion' | 'critica';
    texto: string;
    fecha: string;
    absoluta: string;
  }>;
  correcciones: Array<{ fecha: string; absoluta: string; autor: string; nota: string }>;
}

function lugar(nombre: string, lat: number, lng: number): LugarVista {
  return { nombre, lat, lng };
}

export function aVista(recurso: RecursoT, tipo: TipoRecursoT, site: SiteT): RecursoVista {
  const derivado = derivarUbicaciones(recurso);
  const fechaDato = ultimaActualizacion(recurso);
  const frescura = {
    fecha: fechaDato,
    ...etiquetaFrescura(fechaDato, site.umbral_desactualizado_horas),
  };
  const llegada = urlComoLlegar(
    recurso.ubicacion_actual.gmaps_url,
    recurso.ubicacion_actual.lat,
    recurso.ubicacion_actual.lng,
  );

  const correcciones = recurso.correcciones.map((correccion) => ({
    fecha: correccion.fecha,
    absoluta: formatearAbsoluta(correccion.fecha),
    autor: correccion.autor,
    nota: correccion.nota,
  }));

  const referenciasCorregidas = new Set(recurso.correcciones.map((c) => c.corrige));

  const vista: RecursoVista = {
    id: recurso.id,
    nombre: recurso.nombre,
    descripcion: recurso.descripcion,
    institucion: recurso.institucion,
    tipo: {
      id: tipo.id,
      etiqueta: tipo.etiqueta,
      color: tipo.color,
      forma: tipo.forma,
      simbolo: tipo.simbolo,
      movil: tipo.movil,
    },
    estado: recurso.estado_actual,
    estadoTexto: etiquetaEstado(recurso.estado_actual),
    tono: tonoEstado(recurso.estado_actual),
    ubicacion: lugar(
      recurso.ubicacion_actual.nombre,
      recurso.ubicacion_actual.lat,
      recurso.ubicacion_actual.lng,
    ),
    gmaps: llegada.href,
    frescura,
    detalles: detallesLegibles(recurso, tipo).map((detalle) =>
      detalle.unidad === undefined
        ? { etiqueta: detalle.etiqueta, valor: detalle.valor }
        : { etiqueta: detalle.etiqueta, valor: detalle.valor, unidad: detalle.unidad },
    ),
    lineas: {},
    historial: [...recurso.historial_estado]
      .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
      .map((evento) => ({
        fecha: evento.fecha,
        absoluta: formatearAbsoluta(evento.fecha),
        estado: evento.estado,
        estadoTexto: etiquetaEstado(evento.estado),
        autor: evento.autor,
        corregido: referenciasCorregidas.has(`historial_estado:${evento.fecha}`),
        ...(evento.nota === undefined ? {} : { nota: evento.nota }),
      })),
    observaciones: [...recurso.observaciones]
      .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
      .map((observacion) => ({
        fecha: observacion.fecha,
        absoluta: formatearAbsoluta(observacion.fecha),
        autor: observacion.autor,
        texto: observacion.texto,
      })),
    alertas: alertasVigentesDe(recurso).map((alerta) => ({
      id: alerta.id,
      severidad: alerta.severidad,
      texto: alerta.texto,
      fecha: alerta.fecha,
      absoluta: formatearAbsoluta(alerta.fecha),
    })),
    correcciones,
  };

  if (recurso.zona !== undefined) vista.zona = recurso.zona;

  if (derivado.anterior !== undefined) {
    vista.anterior = lugar(
      derivado.anterior.lugar.nombre,
      derivado.anterior.lugar.lat,
      derivado.anterior.lugar.lng,
    );
    vista.lineas.historica = [
      vista.anterior,
      lugar(
        recurso.ubicacion_actual.nombre,
        recurso.ubicacion_actual.lat,
        recurso.ubicacion_actual.lng,
      ),
    ];
  }

  if (derivado.futura !== undefined) {
    vista.futura = {
      nombre: derivado.futura.lugar.nombre,
      lat: derivado.futura.lugar.lat,
      lng: derivado.futura.lugar.lng,
      estado: derivado.futura.estado,
      motivo: derivado.futura.motivo ?? '',
      etiqueta:
        derivado.futura.estado === 'en_curso'
          ? 'En traslado hacia este punto'
          : 'Proyección, no confirmada',
      ...(derivado.futura.fecha === undefined ? {} : { fecha: derivado.futura.fecha }),
    };
    vista.lineas.proyectada = [
      lugar(
        recurso.ubicacion_actual.nombre,
        recurso.ubicacion_actual.lat,
        recurso.ubicacion_actual.lng,
      ),
      { nombre: vista.futura.nombre, lat: vista.futura.lat, lng: vista.futura.lng },
    ];
  }

  return vista;
}
