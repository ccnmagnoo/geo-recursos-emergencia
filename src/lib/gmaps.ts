/**
 * Extracción de coordenadas desde links de Google Maps.
 *
 * Es una función pura: no hace red. Los enlaces cortos se detectan aquí y se
 * resuelven en el servidor de desarrollo (ver skill `parsear-link-gmaps`).
 */

export type FuenteCoordenadas = 'pin' | 'centro-mapa' | 'parametro' | 'texto' | 'ruta';

export interface Coordenadas {
  lat: number;
  lng: number;
  fuente: FuenteCoordenadas;
}

export type ResultadoGmaps =
  | { ok: true; coordenadas: Coordenadas; urlOriginal: string }
  | { ok: false; error: string; esCorto: boolean };

const PATRON_PIN = /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/;
const PATRON_CENTRO = /@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/;
const PATRON_DECIMALES = /^(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/;
const PATRON_DECIMALES_COMA = /^(-?\d{1,2}),(\d+)\s*[,;]\s*(-?\d{1,3}),(\d+)$/;
const PATRON_LUGAR = /\/maps\/place\/(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/;

function coordenadasValidas(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function construir(
  lat: number,
  lng: number,
  fuente: FuenteCoordenadas,
  urlOriginal: string,
): ResultadoGmaps {
  if (!coordenadasValidas(lat, lng)) {
    return {
      ok: false,
      esCorto: false,
      error: `Coordenadas fuera de rango: ${lat}, ${lng}. Revisa el link o ingrésalas a mano.`,
    };
  }
  return { ok: true, urlOriginal, coordenadas: { lat, lng, fuente } };
}

/** Hosts de enlaces cortos que no se pueden resolver en el navegador (CORS). */
export function esEnlaceCorto(valor: string): boolean {
  try {
    const url = new URL(valor.trim());
    const host = url.hostname.toLowerCase();
    if (host === 'maps.app.goo.gl') return true;
    return host === 'goo.gl' && url.pathname.startsWith('/maps');
  } catch {
    return false;
  }
}

/** Busca en un parámetro de la URL un par "lat,lng". */
function desdeParametro(url: URL, nombre: string): Coordenadas | null {
  const valor = url.searchParams.get(nombre);
  if (valor === null) return null;
  const limpio = decodeURIComponent(valor).trim();
  const patron = /^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/;
  const match = patron.exec(limpio);
  if (match?.[1] === undefined || match[2] === undefined) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!coordenadasValidas(lat, lng)) return null;
  return { lat, lng, fuente: 'parametro' };
}

export function parsearLinkGmaps(entrada: string): ResultadoGmaps {
  const texto = entrada.trim();
  if (texto === '') {
    return { ok: false, esCorto: false, error: 'El link está vacío.' };
  }

  // 4. Coordenadas pegadas directamente.
  const decimalesComa = PATRON_DECIMALES_COMA.exec(texto);
  if (decimalesComa !== null) {
    const [, gradosLat, restoLat, gradosLng, restoLng] = decimalesComa;
    if (
      gradosLat !== undefined &&
      restoLat !== undefined &&
      gradosLng !== undefined &&
      restoLng !== undefined
    ) {
      const lat = Number(`${gradosLat}.${restoLat}`);
      const lng = Number(`${gradosLng}.${restoLng}`);
      return construir(lat, lng, 'texto', texto);
    }
  }
  const decimales = PATRON_DECIMALES.exec(texto);
  if (decimales?.[1] !== undefined && decimales[2] !== undefined) {
    return construir(Number(decimales[1]), Number(decimales[2]), 'texto', texto);
  }

  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return {
      ok: false,
      esCorto: false,
      error: 'No parece un link válido ni un par de coordenadas ("-33.0451, -71.5231").',
    };
  }

  if (esEnlaceCorto(texto)) {
    return {
      ok: false,
      esCorto: true,
      error:
        'Es un enlace corto: no se puede resolver en el navegador. Resuélvelo en el servidor de desarrollo o ingresa las coordenadas a mano.',
    };
  }

  // 1. Posición exacta del pin.
  const pin = PATRON_PIN.exec(url.href);
  if (pin?.[1] !== undefined && pin[2] !== undefined) {
    return construir(Number(pin[1]), Number(pin[2]), 'pin', texto);
  }

  // 2. Centro del mapa.
  const centro = PATRON_CENTRO.exec(url.href);
  if (centro?.[1] !== undefined && centro[2] !== undefined) {
    return construir(Number(centro[1]), Number(centro[2]), 'centro-mapa', texto);
  }

  // 3. Parámetros explícitos.
  for (const nombre of ['q', 'query', 'll', 'destination', 'center']) {
    const coordenadas = desdeParametro(url, nombre);
    if (coordenadas !== null) {
      return { ok: true, urlOriginal: texto, coordenadas };
    }
  }

  // Ruta /place/lat,lng
  const lugar = PATRON_LUGAR.exec(url.pathname);
  if (lugar?.[1] !== undefined && lugar[2] !== undefined) {
    return construir(Number(lugar[1]), Number(lugar[2]), 'ruta', texto);
  }

  return {
    ok: false,
    esCorto: false,
    error:
      'No se encontraron coordenadas en el link. Pega el link completo con el pin (@lat,lng) o ingresa latitud y longitud a mano.',
  };
}
