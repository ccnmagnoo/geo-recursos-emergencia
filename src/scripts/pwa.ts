/**
 * Registro del service worker.
 *
 * Solo en producción: en desarrollo un SW con caché estorba y esconde cambios.
 */

const base = import.meta.env.BASE_URL;
const esProduccion = import.meta.env.PROD;

if (esProduccion && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const url = `${base.replace(/\/$/, '')}/sw.js`;
    navigator.serviceWorker.register(url, { scope: base }).catch(() => {
      // Sin service worker el sitio sigue funcionando en línea.
    });
  });
}
