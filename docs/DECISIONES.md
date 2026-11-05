# Decisiones técnicas

Registro de por qué el proyecto es como es. Si vas a cambiar algo estructural, agrega una entrada
nueva; no reescribas las anteriores.

## D1 — Arnés en formato OpenCode, con compatibilidad Claude Code

**Decisión:** `AGENTS.md` es el contrato canónico; `opencode.jsonc` define permisos;
`.opencode/agents`, `.opencode/skills` y `.opencode/commands` contienen el arnés. `CLAUDE.md`
importa `AGENTS.md` con `@AGENTS.md`.

**Motivo:** el proyecto se opera desde OpenCode. Mantener dos arneses completos garantiza que se
desincronicen. El shim de una línea cubre a quien use Claude Code.

## D2 — Islas en TypeScript vanilla

**Decisión:** mapa, filtros, ficha y acciones son TypeScript sin framework. Leaflet y
`leaflet.markercluster` son las únicas dependencias de cliente.

**Motivo:** 0 KB de runtime adicional, control total de teclado/ARIA y del presupuesto de 200 KB.
El bottom sheet usa `<dialog>` nativo; los filtros, `<fieldset>` y `<select>`.

## D3 — Panel de administración solo en desarrollo

**Decisión:** el código del panel vive en `src/admin-dev/` y una integración de Astro inyecta las
rutas **solo si `command === 'dev'`**.

**Motivo:** en un sitio estático no se puede escribir en producción, y un panel publicado es
superficie de ataque. Con la inyección condicional, `/admin` no existe en `dist/`; hay una prueba
E2E y un chequeo en CI. Además, el servidor escucha solo en `127.0.0.1` y cada endpoint valida
`Content-Type` y `Origin` para bloquear CSRF; no hay autenticación, así que el panel es de uso
personal en una máquina de confianza.

## D4 — Edición local vía `git push`, no edición en el navegador

**Decisión:** el flujo principal es panel local → validar → commit → push → reconstrucción.

**Motivo:** deja historial de cada cambio, permite revisar el diff y no requiere tokens ni
servicios. La edición vía API de GitHub queda diferida (ver D12).

## D5 — Contenido leído con `import.meta.glob` + `smol-toml` + Zod

**Decisión:** no se usan Content Collections. `src/lib/content.ts` lee los TOML como texto y llama
al mismo `buildDataset()` que usa `npm run validate`.

**Motivo:** un único validador para build, CLI y panel; sin APIs experimentales; los errores
apuntan a archivo y línea.

## D6 — Fechas con offset chileno, serializador propio

**Decisión:** se aceptan `-03:00` y `-04:00`. El panel escribe TOML con `src/lib/toml-write.ts`,
no con `stringify` de smol-toml.

**Motivo:** `Date.prototype.toISOString()` devuelve UTC y `smol-toml.stringify` serializa fechas en
UTC, lo que rompería la hora local del operador. Además, smol-toml "arregla" fechas imposibles
(30 de febrero → 2 de marzo); el validador revisa el texto antes de parsear para impedirlo.

## D7 — Traslados derivados, no almacenados

**Decisión:** el TOML guarda `[ubicacion_actual]` y `[[traslados]]`. La ubicación anterior y la
futura se calculan (`src/lib/traslados.ts`).

**Motivo:** una sola fuente de verdad. No se puede desincronizar "anterior" de "último traslado
completado".

## D8 — Honestidad del dato como requisito funcional

**Decisión:**

- Toda ficha muestra "Actualizado hace X" y la fecha absoluta.
- Superado el umbral (`umbral_desactualizado_horas`), se muestra un aviso visible.
- Un traslado `proyectado` se rotula "Proyección, no confirmada" y se dibuja punteado.
- El historial no se borra: se corrige con `[[correcciones]]`.

**Motivo:** el riesgo principal de una herramienta así no es que falle, sino que **mienta con
seguridad**.

## D9 — Node 22+ (probado en Node 24 LTS), npm, Windows como entorno de desarrollo

**Decisión:** `engines.node >= 22.12`, `.nvmrc` con 24. Scripts multiplataforma; el respaldo usa
`Compress-Archive` en Windows y `zip` en macOS/Linux.

**Motivo:** es el entorno real de operación. La CI usa la misma versión que `.nvmrc`.

## D10 — PWA con service worker propio

**Decisión:** `public/sw.js` hecho a mano (~1 KB): navegación network-first, datos
stale-while-revalidate y teselas con caché acotada a 300.

**Motivo:** evitar Workbox y su peso; el comportamiento es simple y auditable. En desarrollo el SW
no se registra (`import.meta.env.PROD`).

## D11 — Seguridad sin backend

**Decisión:**

- CSP en `<meta>` calculada en build; `img-src` incluye solo el origen de teselas configurado.
- Nada de `innerHTML` con contenido: el mapa construye marcadores con `textContent`.
- URLs externas solo `https`, con `rel="noopener noreferrer"`.
- Enlaces de Google Maps validados por allowlist (`src/lib/url.ts`).
- Resolución de enlaces cortos solo en el servidor de desarrollo, con timeout de 6 s y validación
  del destino.

**Motivo:** el contenido lo escribe una persona con acceso al repositorio, pero un error de tipeo
no debe convertirse en XSS ni en un enlace malicioso.

## D12 — Modo GitHub diferido

**Decisión:** existe el flag `PUBLIC_ADMIN_GITHUB`, pero no se implementa la edición vía API.

**Motivo:** el flujo local es suficiente y más seguro. Implementarlo requiere manejar SHA de
archivos, conflictos, expiración de token y permisos finos; se hará cuando exista una necesidad
operativa real. El diseño previsto: token _fine-grained_ en `sessionStorage`, commits por archivo
con mensaje generado, y confirmación explícita antes de cada escritura.

## Dependencias

| Dependencia                                                      | Dónde      | Para qué                                     | Costo          |
| ---------------------------------------------------------------- | ---------- | -------------------------------------------- | -------------- |
| `astro`                                                          | build      | Sitio estático, rutas, islas                 | Solo build     |
| `zod`                                                            | build      | Validación estricta del contenido            | Solo build     |
| `smol-toml`                                                      | build      | Parser TOML compatible con la especificación | Solo build     |
| `leaflet`                                                        | cliente    | Mapa                                         | ~42 KB gzip    |
| `leaflet.markercluster`                                          | cliente    | Agrupar marcadores                           | ~4 KB gzip     |
| `typescript`, `vitest`, `@playwright/test`, `eslint`, `prettier` | desarrollo | Calidad                                      | No se publican |

Medición real con los datos de ejemplo: **69,8 KB gzip** de HTML + CSS + JS inicial en la portada
(límite 200 KB). El detalle está en `npm run bundle:budget`.

## Ideas evaluadas y no implementadas

| Idea                                                  | Veredicto | Motivo                                                                                           |
| ----------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| Línea de tiempo global del incidente                  | Diferida  | Útil, pero requiere otra vista y más datos; el historial por recurso ya cubre la operación.      |
| Recurso más cercano con geolocalización               | Diferida  | Se puede hacer 100 % en el cliente; conviene después de validar el uso real.                     |
| RSS/Atom de alertas críticas                          | Diferida  | Bajo costo, pero hay que definir caducidad y evitar republicar alertas resueltas.                |
| Multi-idioma (inglés, creole, mapudungun)             | Diferida  | Requiere externalizar todos los textos; el contenido TOML ya está separado, la UI no.            |
| Radio de cobertura por recurso                        | No        | Añade precisión falsa: no conocemos el alcance real.                                             |
| Leyenda de "estado de la información" por institución | Parcial   | Ya existe institución + frescura por recurso; falta un teléfono de verificación por institución. |
| Modo "baja conectividad" explícito                    | Parcial   | `/lista` funciona sin JS y el SW guarda el último estado; no hay un botón dedicado.              |

## Riesgos conocidos

- **Lighthouse móvil** puede variar según el runner. Los umbrales están en `lighthouserc.json`;
  si falla, se corrige el sitio, no se baja el umbral.
- **Teselas OSM**: el tráfico alto no es aceptable según su política. Para uso intenso, configura
  otro proveedor en `site.toml` y ajusta la CSP implícita (se calcula desde la URL).
- **Escala del JSON embebido**: con miles de recursos, la isla crece. La salida es cargar
  `/data/recursos.json` bajo demanda y mantener el HTML con la lista.
- **`git restore` como "deshacer"**: no se usa. Se prefiere `.backup/` para no revertir cambios
  ajenos del árbol de trabajo.
