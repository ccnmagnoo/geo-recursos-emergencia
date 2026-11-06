# Mapa de Recursos de Emergencia

Sitio **estático** que muestra en un mapa los recursos desplegados durante una emergencia
(incendio forestal, sismo, aluvión): torres de iluminación, generadores, agua, baños, albergues,
puestos médicos, cortes de vía y requerimientos abiertos.

Cada ficha indica **cuándo se actualizó el dato**. Si supera el umbral configurado, el sitio lo
advierte en vez de mostrar información vieja como si estuviera vigente. Los traslados futuros se
rotulan como **proyección, no confirmada**.

> Este repositorio parte con datos ficticios marcados `[ejemplo]`. Antes de usarlo en una
> emergencia real, reemplaza `/content` por los datos de tu institución y desactiva
> `mostrar_ejemplos`.

## Principios

1. **No engañar**: la frescura es parte del dato; una proyección no es un hecho.
2. **Funcionar con mala señal**: HTML estático, PWA con el último estado conocido, < 200 KB gzip.
3. **Accesible**: WCAG 2.2 AA, navegación por teclado, lista equivalente al mapa, nada depende
   solo del color.
4. **Operable por una persona bajo presión**: todo el contenido vive en TOML, con panel local y
   validación que impide publicar datos rotos.

## Requisitos

- Node 22.12 o superior (probado con Node 24 LTS).
- npm.
- Git.

## Inicio rápido

```bash
npm install
npm run validate   # revisa todo /content
npm run dev        # http://localhost:4321
```

Panel local (solo en desarrollo):

```bash
npm run admin      # abre el navegador; entra a http://localhost:4321/admin
```

Build de producción y vista previa:

```bash
npm run build
npm run preview
```

## Comandos

| Comando                         | Qué hace                                                        |
| ------------------------------- | --------------------------------------------------------------- |
| `npm run dev`                   | Servidor de desarrollo                                          |
| `npm run admin`                 | Desarrollo + panel `/admin`                                     |
| `npm run validate`              | Valida `/content` con archivo y línea                           |
| `npm run validate -- --changed` | Igual, mostrando solo lo que editaste                           |
| `npm run check`                 | `astro check` (TypeScript y plantillas)                         |
| `npm run lint`                  | ESLint                                                          |
| `npm run format`                | Prettier                                                        |
| `npm run test`                  | Pruebas unitarias (Vitest)                                      |
| `npm run test:e2e`              | Playwright contra `dist/`                                       |
| `npm run build`                 | Genera `dist/`                                                  |
| `npm run bundle:budget`         | Verifica el presupuesto de 200 KB gzip y que no exista `/admin` |
| `npm run verify`                | validate + check + lint + test + build + budget                 |
| `npm run new`                   | Crea un recurso desde la terminal                               |
| `npm run backup`                | Exporta `/content` a `backups/*.zip`                            |

## Cómo se opera

1. Se actualiza el contenido con el panel (`npm run admin`) o editando TOML.
2. `npm run validate` confirma que todo sigue coherente.
3. `git commit` + `git push`.
4. El hosting reconstruye y publica.

Guía de una página para terreno: [`docs/OPERACION.md`](docs/OPERACION.md).
Referencia completa del modelo TOML: [`docs/DATOS.md`](docs/DATOS.md).

El panel funciona así:

- **Local (recomendado):** escribe los TOML en tu máquina, con respaldo automático en `.backup/` y
  validación antes de guardar. Se publica haciendo commit.
- **Modo GitHub (diferido):** el flag `PUBLIC_ADMIN_GITHUB` existe, pero la edición vía API de
  GitHub no está implementada en esta versión. Está documentada como próximo paso en
  [`docs/DECISIONES.md`](docs/DECISIONES.md).

El servidor escucha solo en `127.0.0.1`. Para probar en un celular de la misma red:
`npx astro dev --host` (solo en una red de confianza, porque el panel escribe archivos). Los
endpoints verifican tipo de contenido y origen, pero no hay autenticación: es una herramienta
personal, no multiusuario.

## Publicar

El sitio es 100 % estático. La ruta base y la URL canónica se configuran con variables de entorno
(ver `.env.example`):

```bash
ASTRO_BASE=/mapa/ ASTRO_SITE=https://ejemplo.cl npm run build
```

### GitHub Pages

1. Sube el repositorio a GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Ejecuta a mano el workflow **Publicar en GitHub Pages**.
4. Configura `content/site.toml` con la institución y los teléfonos reales.

El workflow calcula `ASTRO_BASE` y `ASTRO_SITE` a partir del repositorio.

### Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Variables: `ASTRO_SITE=https://tu-sitio.netlify.app` (y `ASTRO_BASE` solo si publicas en un
  subdirectorio).
- El archivo `dist/404.html` ya existe; Netlify lo usa automáticamente.

### Cloudflare Pages

- Framework preset: **Astro**
- Build command: `npm run build`
- Output directory: `dist`
- Variable: `ASTRO_SITE=https://tu-sitio.pages.dev`.

### Servidor propio (Nginx)

```nginx
server {
  listen 443 ssl;
  server_name recursos.ejemplo.cl;

  root /var/www/recursos/dist;
  index index.html;

  location / {
    try_files $uri $uri/ $uri/index.html =404;
  }

  error_page 404 /404.html;

  # El contenido cambia durante la emergencia: no cachear el HTML.
  location ~* \.html$ {
    add_header Cache-Control "no-cache, must-revalidate";
  }

  location /_assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
}
```

## Contenido

```
content/
  site.toml            Institución, contacto, teléfonos, umbral, centro del mapa, teselas.
  tipos.toml           Catálogo de tipos: color, forma, icono y campos.
  zonas.toml           Comunas y sectores.
  recursos/            Un archivo por recurso (el nombre es el id).
  requerimientos/      Necesidades abiertas y su asignación.
  zonas_geo/           Polígonos, líneas y puntos de riesgo o corte.
```

Reglas que el build hace cumplir:

- `estado_actual` coincide con el último evento del historial.
- El historial es _append-only_; para corregir se agrega `[[correcciones]]`.
- Fechas ISO con offset chileno (`-03:00` o `-04:00`), nunca UTC.
- Los campos de `[detalles]` existen en el tipo y los obligatorios están presentes.
- Los enlaces de Google Maps son `https` y de dominios permitidos.
- Los traslados completados tienen `fecha_real`; los proyectados, `fecha_estimada`.
- Los ids son únicos y el nombre del archivo coincide con el id.

## Datos abiertos

- `/data/recursos.json` — recursos con estado, frescura, traslados y alertas.
- `/data/recursos.geojson` — recursos, requerimientos y zonas geográficas.

## Accesibilidad y rendimiento

- Lista `/lista` funcional sin JavaScript.
- Ficha con URL estable `/recurso/[id]`, compartible por WhatsApp.
- Versión imprimible en `/imprimir`.
- Presupuesto medido en el build: HTML + CSS + JS inicial bajo 200 KB gzip, sin teselas.
  Con los datos de ejemplo: **~70 KB**.
- Pruebas E2E en viewport móvil y escritorio: mapa, filtros, ficha, traslados, teclado,
  ausencia de `/admin` en el build y feeds JSON.

## Privacidad

- Sin cuentas, sin cookies de terceros, sin analytics, sin trackers.
- Sin datos personales de ciudadanos.
- Sin API keys obligatorias.
- Las teselas se piden directamente al proveedor configurado; revisa su política de uso.

## Estructura del proyecto

```
src/
  pages/            Páginas estáticas y endpoints de datos.
  components/       Mapa, ficha, lista, badges.
  layouts/          Layout público.
  lib/              Esquema, validación, fechas, traslados, gmaps, TOML.
  admin-dev/        Panel local (inyectado solo en `astro dev`).
  scripts/          Islas de cliente (mapa, frescura, PWA).
tests/
  unit/             Esquema, gmaps, fechas, traslados.
  e2e/              Humo contra dist/.
scripts/            Validación, alta de recursos, respaldo, presupuesto.
docs/               Decisiones, operación y modelo de datos.
```

## Limitaciones conocidas

- El mapa depende de Leaflet y de las teselas: sin conexión se ve el último estado cacheado, no
  teselas nuevas.
- La isla del mapa transporta el JSON de los recursos: con miles de recursos conviene moverlo a
  una carga diferida.
- El panel es local. Publicar sigue siendo `git push` (a propósito: deja historial y permite
  revisar el diff).
- Lighthouse CI puede variar según el runner; los umbrales están en `lighthouserc.json`.
