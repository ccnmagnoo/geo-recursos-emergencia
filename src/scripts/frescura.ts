import { esDesactualizado, formatearRelativa } from '../lib/tiempo';

/** Actualiza los textos "hace X" sin depender de la hora del build. */

function actualizar(): void {
  const nodos = document.querySelectorAll<HTMLElement>('[data-frescura]');
  for (const nodo of nodos) {
    const fecha = nodo.dataset['fecha'];
    if (fecha === undefined) continue;
    const umbral = Number(nodo.dataset['umbral'] ?? '12');
    const prefijo = nodo.dataset['prefijo'] ?? 'Actualizado';
    const texto = nodo.querySelector<HTMLElement>('[data-frescura-texto]');
    if (texto !== null) {
      const relativa = formatearRelativa(fecha);
      texto.textContent = prefijo === '' ? relativa : `${prefijo} ${relativa}`;
    }
    nodo.classList.toggle(
      'frescura--vencida',
      Number.isFinite(umbral) && esDesactualizado(fecha, umbral),
    );
  }
}

actualizar();
setInterval(actualizar, 60_000);
