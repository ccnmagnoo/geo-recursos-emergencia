/**
 * Saneamiento de URLs y textos que terminan en el DOM.
 *
 * Regla del proyecto: nunca se inyecta contenido de TOML como HTML. Todo lo
 * que viene del contenido se escapa; los únicos enlaces que se construyen son
 * los que arma el código a partir de URLs validadas.
 */

const HOSTS_GMAPS = new Set(['google.com', 'www.google.com', 'maps.google.com', 'maps.app.goo.gl']);

/** Dominios permitidos para el botón "Cómo llegar". */
export function esUrlGmapsPermitida(valor: string): boolean {
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  if (url.username !== '' || url.password !== '') return false;

  const host = url.hostname.toLowerCase();
  if (HOSTS_GMAPS.has(host)) {
    if (host === 'maps.app.goo.gl') return true;
    return url.pathname.startsWith('/maps');
  }
  if (host === 'goo.gl') {
    return url.pathname.startsWith('/maps');
  }
  return false;
}

/** Construye un enlace de indicaciones a partir de coordenadas. */
export function urlIndicaciones(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Devuelve el enlace a usar: se prefiere el original del administrador y, si
 * falta o no es válido, se construye uno con las coordenadas.
 */
export function urlComoLlegar(
  gmaps: string | undefined,
  lat: number,
  lng: number,
): { href: string; esOriginal: boolean } {
  if (gmaps !== undefined && esUrlGmapsPermitida(gmaps)) {
    return { href: gmaps, esOriginal: true };
  }
  return { href: urlIndicaciones(lat, lng), esOriginal: false };
}

export function escaparHtml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Atribución de teselas: texto escapado + enlace construido por el código. */
export function atribucionTeselas(texto: string, url: string | undefined): string {
  const seguro = escaparHtml(texto);
  if (url === undefined || !url.startsWith('https://')) return seguro;
  return `${seguro} · <a href="${escaparHtml(url)}" target="_blank" rel="noopener noreferrer">Más información</a>`;
}
