# AGENTS.md — Mapa de Recursos de Emergencia

Este archivo es el contrato de trabajo del proyecto. Léelo completo antes de tocar código.
Vale para cualquier agente (OpenCode, Claude Code u otro) que trabaje en este repositorio.

## 1. Qué es y por qué importa

Sitio **estático** que muestra en un mapa los recursos desplegados durante una emergencia
(incendio forestal, sismo, aluvión) con su estado, historial, alertas y traslados.

**Esta herramienta puede ayudar a salvar vidas.** Un dato desactualizado presentado como
vigente, un botón roto o un enlace equivocado tiene consecuencias reales. Ante la duda,
elige siempre la opción que **no engaña**: mostrar "sin información" es mejor que mostrar
un dato viejo como si fuera actual.

Prioridades, en orden: claridad → funciona con mala señal → accesible → honesto → simple
de operar por una sola persona bajo presión.

## 2. Stack

- TypeScript `strict` + Astro con `output: 'static'` (sin SSR en producción).
- Contenido en **TOML** dentro de `/content`. Sin base de datos. Sin API keys obligatorias.
- Leaflet + teselas OpenStreetMap configurables. Sin Google Maps JS API.
- Zod para validar, `smol-toml` para parsear, Vitest y Playwright para probar.
- CSS propio con variables. Sin frameworks de UI ni de islas: TypeScript vanilla.

## 3. Comandos

| Comando                         | Qué hace                                                 |
| ------------------------------- | -------------------------------------------------------- |
| `npm run dev`                   | Servidor de desarrollo en http://localhost:4321          |
| `npm run admin`                 | Desarrollo y abre el navegador; entra a `/admin`         |
| `npm run validate`              | Valida todo `/content` y devuelve `archivo:línea`        |
| `npm run validate -- --changed` | Igual, pero muestra solo los archivos que estás editando |
| `npm run check`                 | `astro check` (TypeScript + plantillas)                  |
| `npm run lint`                  | ESLint                                                   |
| `npm run test`                  | Pruebas unitarias (Vitest)                               |
| `npm run test:e2e`              | Playwright contra `dist/`                                |
| `npm run build`                 | Genera el sitio estático en `dist/`                      |
| `npm run bundle:budget`         | Verifica el presupuesto de 200 KB gzip                   |
| `npm run verify`                | validate + check + lint + test + build + budget          |
| `npm run new`                   | Crea un recurso desde la terminal                        |
| `npm run backup`                | Exporta `/content` a un ZIP                              |

## 4. Mapa de carpetas

```
content/            DATOS. Es lo único que cambia en operación.
  site.toml         Título, institución, contacto, umbral, mapa, teselas, emergencias.
  tipos.toml        Catálogo de tipos: color, forma, icono y campos de detalle.
  zonas.toml        Comunas y sectores para filtrar.
  recursos/         Un TOML por recurso. El nombre del archivo ES el id.
  requerimientos/   Necesidades abiertas y su asignación.
  zonas_geo/        Polígonos, líneas y puntos de riesgo o corte.
src/lib/            Esquema, validación, fechas, traslados, gmaps, URLs.
src/components/     Mapa, ficha, línea de tiempo, lista, badges.
src/pages/          Páginas estáticas y feeds /data/*.json.
src/admin-dev/      Panel local. Se inyecta SOLO con astro dev.
scripts/            validate-content, new-resource, export-backup, check-budget.
tests/unit/         Pruebas puras (sin DOM, sin red).
tests/e2e/          Humo en navegador contra dist/.
docs/               DECISIONES, OPERACION, DATOS.
```

## 5. Reglas de oro

1. **El contenido solo se modifica vía TOML validado.** Nunca hardcodees datos de recursos en
   el código, ni siquiera como ejemplo en una prueba de UI.
2. **El historial es append-only.** No se edita ni se borra un evento, observación, alerta o
   traslado. Para corregir, se agrega una `[[correcciones]]` que referencia el evento.
3. **Todo dato nuevo pasa por `npm run validate`.** El build falla si el contenido no valida;
   no lo esquives con `as any` ni desactivando el esquema.
4. **Nunca edites `dist/`.** Es un artefacto. Se regenera con `npm run build`.
5. **Nada de `innerHTML` con contenido de TOML.** Usa texto escapado y `textContent`. La única
   excepción es la atribución de teselas, que se construye con `atribucionTeselas()`.
6. **Un enlace de Google Maps solo se usa si pasa `esUrlGmapsPermitida()`.** Si no, se construye
   uno con las coordenadas.
7. **La proyección no es un hecho.** Todo traslado `proyectado` o `en_curso` se rotula como
   proyección y con su fecha estimada. Nunca "ya está en".
8. **La frescura es parte del dato.** Junto a todo estado va "actualizado hace X". Si supera
   `umbral_desactualizado_horas`, se advierte de forma visible.
9. **`/admin` no puede existir en producción.** Su código vive fuera de `src/pages` y se inyecta
   solo en dev. Hay un test que lo comprueba; no lo debilites.
10. **Sin dependencias nuevas sin justificar** en `docs/DECISIONES.md` (qué, para qué, cuánto pesa).

## 6. Convenciones

- **Idioma:** UI, contenido y documentación en español de Chile; código, tipos y nombres de
  archivos en inglés. Las claves del TOML están en español porque las escribe una persona en
  terreno, no un programador.
- **Fechas:** ISO 8601 con offset chileno (`-03:00` o `-04:00`), nunca `new Date().toISOString()`
  para escribir contenido (eso devuelve UTC). Usa `src/lib/tiempo.ts`.
- **IDs:** recursos `AAA-000` (3-4 letras mayúsculas), alertas `A-0000`, traslados `T-0000`.
- **Tipos de recurso:** `snake_case` en minúsculas (`torre_iluminacion`).
- **Commits:** Conventional Commits **en español**, imperativo y corto:
  `feat(mapa): agrega filtro por estado`, `fix(ficha): corrige hora de última actualización`.
  Tipos permitidos: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `a11y`, `perf`.
- **Accesibilidad:** todo control se usa con teclado, tiene foco visible, nombre accesible y área
  táctil ≥ 44 px. El color nunca es el único portador de significado.
- **Nombres de archivos:** `kebab-case` para scripts y docs; `PascalCase` para componentes.

## 7. Definición de "terminado"

Una tarea está terminada solo si:

1. `npm run validate` sin errores.
2. `npm run check` sin errores.
3. `npm run lint` sin errores.
4. `npm run test` en verde.
5. `npm run build` produce `dist/` y **no** contiene `/admin`.
6. Si tocaste UI: `npm run test:e2e` en verde y el flujo funciona a 360 px de ancho.
7. Si tocaste el contenido: el recurso se ve en `/lista` y en su ficha.
8. Si agregaste una dependencia: quedó anotada en `docs/DECISIONES.md`.

## 8. Prohibido

- Base de datos, servidor propio, SSR o funciones serverless en producción.
- Claves de API obligatorias, trackers, analytics, cookies de terceros.
- Datos personales de ciudadanos (nombres, RUT, teléfonos, direcciones de afectados).
- `innerHTML`, `insertAdjacentHTML` o `eval` con datos de contenido.
- Editar `dist/`, `node_modules/` o `.env*`.
- `git push --force`, `git reset --hard` o borrar contenido sin respaldo.
- Inventar datos de emergencia para "que se vea mejor".

## 9. Si algo no calza

Si el pedido choca con estas reglas (por ejemplo, "guarda esto en una base de datos" o
"muestra el estado como vigente aunque tenga 3 días"), **detente y explica el conflicto**
antes de escribir código. Es preferible una pregunta a un dato falso.
