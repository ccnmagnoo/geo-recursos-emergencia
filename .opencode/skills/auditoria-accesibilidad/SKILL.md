---
name: Auditoría de accesibilidad
description: Checklist WCAG 2.2 AA específico de este proyecto para revisar mapa, ficha, filtros, lista, formularios e impresión antes de publicar.
---

# Auditoría de accesibilidad

Objetivo: **WCAG 2.2 AA**. El público incluye personas con daltonismo, baja visión, adultos mayores
y usuarios de lector de pantalla, en un celular y con estrés.

## Cómo probar (sin herramientas especiales)

1. **Solo teclado:** desconecta el mouse. Recorre toda la página con `Tab` / `Shift+Tab`. Debe
   verse dónde estás en cada paso y no quedar atrapado.
2. **Zoom 200 %** y ancho 320 px: sin scroll horizontal ni texto cortado.
3. **Lector de pantalla:** NVDA en Windows o TalkBack en Android. Escucha: ¿se entiende el estado
   de un recurso sin ver el mapa?
4. **Escala de grises:** imprime o filtra el color. ¿Sigues distinguiendo tipo y estado?
5. **Reducir movimiento** activado en el sistema: sin animaciones que molesten.
6. **Sin JavaScript:** `/lista` y las fichas siguen siendo usables.

## Mapa

- [ ] El mapa tiene un nombre accesible (`aria-label`) y una descripción de qué muestra.
- [ ] No usa `role="application"` (rompe la navegación del lector).
- [ ] Existe un enlace "Ver como lista" antes del mapa, visible al enfocar.
- [ ] Cada marcador tiene equivalente en la lista, con el mismo nombre y estado.
- [ ] Los controles de zoom de Leaflet son alcanzables y tienen nombre en español.
- [ ] Al aplicar un filtro se anuncia el número de resultados (`aria-live="polite"`).
- [ ] La leyenda no depende solo del color: incluye forma y símbolo.

## Ficha (panel / bottom sheet)

- [ ] Se abre con teclado y el foco entra al panel.
- [ ] `Esc` la cierra y el foco vuelve al elemento que la abrió.
- [ ] Es un `<dialog>` o tiene `role="dialog"` + `aria-modal="true"` + título asociado.
- [ ] El estado no se anuncia solo por color: hay texto ("Con falla").
- [ ] "Actualizado hace X" es texto real, no un tooltip.
- [ ] El aviso de información desactualizada se lee como parte del estado.
- [ ] Los botones miden al menos 44×44 px y tienen texto claro ("Cómo llegar en Google Maps").

## Formularios (panel de administración)

- [ ] Cada campo tiene `<label>` asociado (no placeholder como etiqueta).
- [ ] Los errores se muestran junto al campo, con `aria-describedby` y `aria-invalid`.
- [ ] El resumen de errores recibe el foco al enviar.
- [ ] No se pierden datos al fallar la validación.
- [ ] Las fechas se pueden escribir a mano además del selector.

## Contraste y color

- [ ] Texto normal ≥ 4.5:1; texto grande ≥ 3:1; bordes de controles ≥ 3:1.
- [ ] Foco visible ≥ 3:1 contra el fondo y el elemento.
- [ ] Los colores por tipo de recurso llevan texto blanco con contraste suficiente.
- [ ] El estado "crítico" no se comunica solo con rojo: lleva icono o palabra.

## Contenido

- [ ] Encabezados en orden (`h1` único, sin saltos).
- [ ] Enlaces con texto descriptivo (no "clic aquí").
- [ ] Fechas y horas en formato comprensible y con zona horaria clara.
- [ ] Las cifras llevan unidad y contexto ("4.000 L disponibles", no "4000").
- [ ] Los textos de emergencia evitan jerga institucional.

## Impresión

- [ ] `/imprimir` incluye fecha de publicación, institución y teléfonos.
- [ ] Legible en blanco y negro, sin fondos que se coman la tinta.
- [ ] Cada recurso muestra coordenadas y un identificador para dictarlo por teléfono.

## Cierre

Registra los hallazgos con archivo:línea y criterio WCAG. Corrige lo bloqueante antes de publicar;
lo importante puede ir a una tarea siguiente, pero no se olvida.
