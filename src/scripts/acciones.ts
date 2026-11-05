/** Botones "copiar coordenadas" en cualquier página. */

for (const boton of document.querySelectorAll<HTMLButtonElement>('[data-copiar]')) {
  boton.addEventListener('click', () => {
    const texto = boton.dataset['copiar'];
    if (texto === undefined) return;
    const original = boton.textContent;
    navigator.clipboard
      .writeText(texto)
      .then(() => {
        boton.textContent = 'Coordenadas copiadas';
        window.setTimeout(() => {
          boton.textContent = original;
        }, 2500);
      })
      .catch(() => {
        boton.textContent = texto;
      });
  });
}
