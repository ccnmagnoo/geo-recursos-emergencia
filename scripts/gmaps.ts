import { parsearLinkGmaps } from '../src/lib/gmaps';

/**
 * Uso:
 *   npx tsx scripts/gmaps.ts "https://maps.app.goo.gl/..."
 *   npx tsx scripts/gmaps.ts "-33.0451, -71.5231"
 *
 * No resuelve enlaces cortos: eso requiere red y solo lo hace el servidor de
 * desarrollo. Aquí se explica qué hacer en ese caso.
 */

const entrada = process.argv.slice(2).join(' ').trim();

if (entrada === '') {
  console.error('Uso: npx tsx scripts/gmaps.ts "<link o lat,lng>"');
  process.exitCode = 1;
} else {
  const resultado = parsearLinkGmaps(entrada);
  if (resultado.ok) {
    console.log(`lat = ${resultado.coordenadas.lat}`);
    console.log(`lng = ${resultado.coordenadas.lng}`);
    console.log(`fuente = ${resultado.coordenadas.fuente}`);
    if (resultado.coordenadas.fuente === 'centro-mapa') {
      console.warn(
        'Aviso: son las coordenadas del centro del mapa, no necesariamente el pin. Verifica antes de guardar.',
      );
    }
    console.log(`gmaps_url = "${resultado.urlOriginal}"`);
  } else {
    console.error(`✗ ${resultado.error}`);
    if (resultado.esCorto) {
      console.error(
        '  Alternativa: abre el link en el navegador y copia lat/lng, o usa el panel de administración.',
      );
    }
    process.exitCode = 1;
  }
}
