/** Construcción de enlaces que respetan la ruta base configurada. */

const BASE = import.meta.env.BASE_URL;

/** "/lista" -> "/lista/" (o "/mapa/lista/" si hay base). */
export function conBase(ruta: string): string {
  const limpia = ruta.replace(/^\/+|\/+$/g, '');
  const prefijo = BASE === '/' ? '' : BASE.replace(/\/+$/, '');
  return limpia === '' ? `${prefijo}/` : `${prefijo}/${limpia}/`;
}

/** Enlace a un archivo estático (sin barra final). */
export function archivoConBase(ruta: string): string {
  const limpia = ruta.replace(/^\/+/g, '');
  const prefijo = BASE === '/' ? '' : BASE.replace(/\/+$/, '');
  return `${prefijo}/${limpia}`;
}

/** Ruta actual normalizada, para marcar el enlace activo. */
export function rutaActual(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

export function esActual(pathname: string, ruta: string): boolean {
  return rutaActual(pathname) === rutaActual(conBase(ruta));
}
