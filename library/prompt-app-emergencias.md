# PROMPT — App web estática de georreferenciación de recursos de emergencia

> Pega este prompt completo en Claude Code, dentro de una carpeta vacía y ya inicializada con `git init`. Está pensado para que Claude construya primero el **arnés** (CLAUDE.md, skills, subagentes, hooks, scripts de validación) y luego la app, apoyándose en ese arnés.

---

## 0. Rol y objetivo

Eres un ingeniero senior full-stack especializado en sitios estáticos, mapas y software crítico para servicio público. Vas a construir **"Mapa de Recursos de Emergencia"**: una web estática que muestra en un mapa los recursos desplegados para asistir a la población afectada por una emergencia (por ejemplo, un incendio forestal), con su estado, historial, observaciones, alertas y traslados (pasados, actuales y proyectados).

Esta herramienta puede ayudar a salvar vidas. Prioriza: **claridad, velocidad, funcionamiento con mala conectividad, accesibilidad, datos que no engañen** y **simplicidad operativa** (una sola persona la mantiene, a veces bajo presión).

Idioma de la interfaz, contenido y documentación: **español (Chile)**. Código e identificadores: inglés.

## 1. Restricciones no negociables

1. **Stack:** TypeScript (modo `strict`) + Astro (salida `static`). Sin SSR en producción.
2. **Sin base de datos.** Todo el contenido vive en archivos **TOML** dentro del repo (`/content`). El historial es *append-only* dentro de esos TOML.
3. **Despliegue como sitio estático** en cualquier hosting (GitHub Pages, Netlify, Cloudflare Pages, S3, servidor Nginx). La ruta base debe ser configurable (`ASTRO_BASE`, `ASTRO_SITE`).
4. **Sin API keys obligatorias.** Mapa con **Leaflet + teselas OpenStreetMap** (configurable para otro proveedor de teselas). Nada de depender de Google Maps JS API.
5. **Sin cuentas ni datos personales** de ciudadanos. Solo datos de recursos y puntos de servicio.
6. **Mobile-first y de bajo ancho de banda:** el público estará en celulares con señal débil. Presupuesto: HTML+CSS+JS inicial < 200 KB comprimido (excluyendo teselas). Funcionar como **PWA** con caché offline del último estado conocido.
7. Dependencias mínimas y justificadas. Anota cada dependencia en `docs/DECISIONES.md`.

## 2. Funcionalidades — vista pública

- **Mapa principal** a pantalla completa con marcadores por tipo (icono + color + forma distinta; **no depender solo del color**, por daltonismo), agrupación (cluster) cuando haya muchos puntos, y control de capas por categoría.
- **Filtros:** por tipo de recurso, por estado (operativo / con falla / fuera de servicio / en traslado / planificado), por zona/comuna, y búsqueda por texto.
- **Ficha del recurso** (panel lateral en escritorio, *bottom sheet* en móvil):
  - Nombre, tipo, código/identificador, descripción breve, institución responsable.
  - **Estado actual** con sello de "última actualización" (fecha/hora relativa y absoluta, zona horaria America/Santiago). Si el dato supera un umbral configurable (p. ej. 12 h) mostrar aviso visible: *"Información desactualizada"*.
  - **Ubicación actual** + botón grande **"Cómo llegar en Google Maps"** (abre el link original o uno construido con las coordenadas) y botón secundario "Copiar coordenadas".
  - **Historial de estado** (línea de tiempo, más reciente primero).
  - **Observaciones y alertas** (con severidad: info / precaución / crítica; las críticas vigentes se destacan arriba).
  - **Traslados:** ubicación **anterior**, **actual** y **futura proyectada** (con motivo — p. ej. "seguridad por avance del fuego" —, fecha/hora estimada y estado: proyectado / en curso / completado / cancelado). En el mapa: marcador actual sólido, anterior atenuado, futuro punteado, unidos por líneas (histórica sólida gris, proyectada punteada de color). Un interruptor "Mostrar traslados".
- **Lista alternativa al mapa** (vista de tabla/tarjetas ordenable) para accesibilidad y para conexiones lentas.
- **Panel "Alertas vigentes"** en la portada: resumen de alertas críticas y traslados proyectados próximos.
- **Página de cada recurso con URL propia y estable** (`/recurso/[id]`), compartible por WhatsApp, con metadatos Open Graph.
- **Feed de datos abierto** generado en build: `/data/recursos.json` y `/data/recursos.geojson`.
- **Impresión**: una vista imprimible/PDF con la lista de recursos y coordenadas (útil si se cae la red).
- Pie de página con: fecha de última publicación, responsable/institución, contacto, y números de emergencia configurables (`content/site.toml`).

## 3. Funcionalidades — panel de administración personal

Como un sitio estático no puede escribir archivos en producción, el panel funciona así:

- **Modo principal (local):** ruta `/admin`, disponible **solo con `astro dev`** (o `npm run admin`). Endpoints de desarrollo leen/escriben los TOML en `/content`. Esas rutas **deben quedar excluidas del build de producción** (verificarlo con un test y en CI). Luego se hace `git commit` + `push` y el hosting republica.
- **Modo secundario (opcional, activable por flag `PUBLIC_ADMIN_GITHUB=true`):** edición desde el navegador que confirma cambios al repo mediante la API de GitHub con un *fine-grained token* pegado por el usuario y guardado solo en `sessionStorage`. Nunca incluir tokens en el repo ni en el build.
- Funciones del panel:
  - CRUD de recursos y de cada tipo de elemento, con **formularios generados desde el esquema** (Zod) y validación en vivo.
  - **Pegar un link de Google Maps** y que el panel extraiga las coordenadas (ver §6). Si no se puede extraer, permitir ingreso manual de lat/lng y mostrar un mini-mapa para ajustar el pin arrastrándolo.
  - **Acciones rápidas de historial** (lo que se usará en terreno): "Cambiar estado", "Agregar observación", "Emitir alerta", "Resolver alerta", "Registrar traslado", "Proyectar traslado", "Confirmar traslado realizado". Cada acción agrega un evento con fecha/hora (por defecto *ahora*, editable) y autor (texto libre).
  - **Vista previa** del sitio público y diff de lo que va a cambiar antes de guardar.
  - **Corrección vs. historial:** el historial es inmutable por defecto; para corregir errores, se agrega un evento de `correccion` que referencia al evento corregido (se muestra tachado/anotado en público). Permitir edición real solo con confirmación explícita.
  - Botón **"Validar todo"** que ejecuta el validador y lista errores con archivo y línea.
  - Botón "Exportar respaldo" (ZIP de `/content`).
  - Protección anti-errores: confirmaciones para borrar, "deshacer" del último cambio (usando git cuando exista) y escritura atómica de archivos.

## 4. Taxonomía de elementos (tipos de recurso)

Define los tipos en `content/tipos.toml` (ícono, color, forma, etiqueta, campos extra). Debe ser fácil agregar tipos nuevos sin tocar código. Tipos iniciales:

**Móviles (con historial de estado y traslados):**
- `torre_iluminacion` — Torre de iluminación móvil (campos: combustible/autonomía, horas de uso, potencia)
- `generador` — Generador eléctrico
- `bano_quimico`, `ducha_movil` — Baños y duchas móviles
- `estanque_agua` / `camion_aljibe` — Agua (campos: capacidad L, nivel actual %)
- `cocina_campana` — Cocina de campaña / alimentación
- `puesto_medico_movil` / `ambulancia` — Asistencia médica móvil
- `modulo_comunicaciones` — Radio / internet satelital / WiFi (Starlink, etc.)
- `carga_dispositivos` — Punto de carga de celulares

**Puntos fijos de servicio (georreferenciados, con estado y horarios):**
- `agua_potable` — Punto de agua potable / distribución de agua
- `banos_duchas` — Baños y duchas fijos
- `alimentacion` — Comedor / entrega de alimentos (horarios de comida)
- `asistencia_medica` — Posta, CESFAM, hospital de campaña, apoyo psicológico
- `albergue` — Albergue / centro de evacuados (capacidad, ocupación, admite mascotas sí/no, accesibilidad)
- `centro_acopio` — Acopio de donaciones (qué se necesita / qué no)
- `zona_segura` — Zona segura / punto de encuentro
- `punto_informacion` — Información oficial, reunificación familiar
- `veterinaria_animales` — Atención y resguardo de animales / forraje
- `combustible` — Abastecimiento de combustible
- `puesto_mando` — Puesto de mando / coordinación
- `helipuerto` — Helipuerto / zona de aterrizaje
- `ropa_abrigo` — Entrega de ropa, frazadas, kits de higiene

**Zonas y rutas (geometrías):**
- `ruta_evacuacion` (línea), `corte_vial` (punto o línea con causa y desvío), `zona_riesgo`/`perimetro` (polígono, con vigencia).

**Requerimientos:**
- `requerimiento` — Punto donde se **necesita** un recurso (qué falta, cantidad, prioridad, estado: abierto / asignado / cubierto). Puede vincularse (`asignado_a`) a un recurso móvil.

Cada tipo declara si es `movil = true/false` y si admite geometría de `punto | linea | poligono`.

## 5. Modelo de datos TOML

Estructura de carpetas:

```
content/
  site.toml               # título, institución, contacto, umbral de desactualizado, zona horaria, centro/zoom del mapa, teselas
  tipos.toml              # catálogo de tipos
  zonas.toml              # comunas/sectores (opcional)
  recursos/
    TIL-001.toml          # un archivo por recurso (id estable = nombre de archivo)
    AGU-014.toml
  zonas_geo/              # polígonos y rutas (TOML con arreglos de coordenadas)
  requerimientos/
```

Ejemplo de `content/recursos/TIL-001.toml` (el agente debe respetarlo y derivar de él el esquema Zod):

```toml
id = "TIL-001"
tipo = "torre_iluminacion"
nombre = "Torre de iluminación N°1 — Sector Las Palmas"
institucion = "Municipalidad / Bomberos / SENAPRED"
descripcion = "Torre móvil de 4 focos LED, autonomía ~20 h."
publicado = true
estado_actual = "operativo"        # operativo | con_falla | fuera_de_servicio | en_traslado | planificado | retirado

[detalles]                          # campos específicos del tipo
autonomia_horas = 20
combustible_pct = 70

[ubicacion_actual]
nombre = "Plaza Las Palmas"
lat = -33.04512
lng = -71.52310
gmaps_url = "https://maps.app.goo.gl/XXXXXXXX"   # link original pegado por el administrador
desde = 2026-11-05T14:00:00-03:00

[[historial_estado]]
fecha = 2026-11-05T14:05:00-03:00
estado = "operativo"
autor = "Operador A"
nota = "Instalada y encendida."

[[observaciones]]
fecha = 2026-11-05T17:30:00-03:00
autor = "Operador A"
texto = "Combustible al 70%. Próximo relleno a las 22:00."

[[alertas]]
id = "A-0001"
fecha = 2026-11-05T18:10:00-03:00
severidad = "precaucion"            # info | precaucion | critica
texto = "Humo denso se acerca al sector; evaluar traslado."
vigente = true

[[traslados]]
id = "T-0001"
estado = "proyectado"               # proyectado | en_curso | completado | cancelado
motivo = "Seguridad: avance del frente de fuego"
origen = { nombre = "Plaza Las Palmas", lat = -33.04512, lng = -71.52310 }
destino = { nombre = "Estadio Municipal", lat = -33.05120, lng = -71.51000, gmaps_url = "https://www.google.com/maps/place/..." }
fecha_estimada = 2026-11-05T21:00:00-03:00
fecha_real = ""                     # se completa al confirmarse

[[correcciones]]
corrige = "historial_estado:2026-11-05T14:05:00-03:00"
fecha = 2026-11-05T14:20:00-03:00
autor = "Operador A"
nota = "La hora real de encendido fue 14:15."
```

Reglas del modelo:
- Un recurso tiene **ubicación actual** y su historial de ubicaciones se deriva de los traslados `completado`. "Punto anterior" = origen del último traslado completado; "futuro" = destino del próximo traslado `proyectado`/`en_curso`.
- Todas las fechas en ISO 8601 con offset. Mostrar en America/Santiago.
- Validar con **Zod**: rangos de lat/lng, tipos válidos, IDs únicos, referencias cruzadas (`asignado_a`, `corrige`), coherencia temporal (no historial en el futuro salvo `proyectado`), campos obligatorios por tipo.
- Parser TOML: `smol-toml` (o el que justifiques). Cargar con *content collections* de Astro mediante un `loader` propio o con `import.meta.glob` + parseo en build.
- Opción `publicado = false` para recursos en borrador que no salen en el sitio público.

## 6. Extracción de coordenadas desde links de Google Maps

Implementa `src/lib/gmaps.ts` (puro, testeable) que acepte un link y devuelva `{lat, lng, fuente}` o un error claro. Soportar, en este orden de prioridad:
1. `!3d<lat>!4d<lng>` (ubicación exacta del pin; prioridad máxima).
2. `@<lat>,<lng>,<zoom>z` (centro de la vista; menos preciso).
3. `?q=<lat>,<lng>`, `?query=<lat>,<lng>`, `ll=<lat>,<lng>`, `destination=<lat>,<lng>`.
4. Coordenadas decimales pegadas directamente ("-33.0451, -71.5231").
5. Enlaces cortos (`maps.app.goo.gl/...`, `goo.gl/maps/...`): **no se pueden resolver desde el navegador** (CORS). Resolverlos en el endpoint de desarrollo del admin siguiendo redirecciones (`fetch` con `redirect: 'follow'` en el servidor de dev), guardar el link original en `gmaps_url` y las coordenadas resueltas en `lat/lng`. Si falla, pedir ingreso manual.

Siempre conservar el `gmaps_url` original. En la vista pública, el botón "Abrir en Google Maps" usa `gmaps_url` si existe; si no, construye `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`. Incluir tests unitarios con al menos 15 URLs de ejemplo (largas, cortas, con parámetros extra, con coordenadas negativas).

## 7. Arquitectura y stack sugerido

- Astro + TypeScript estricto (`astro/tsconfigs/strictest`), páginas estáticas, *islands* solo donde haga falta (mapa y filtros con Preact o Svelte ligero, o JS vanilla; justificar).
- `leaflet` + `leaflet.markercluster`; teselas OSM configurables, con atribución visible. Cachear teselas del área de interés con Service Worker (estrategia *stale-while-revalidate*, con tope de tamaño).
- Estilos: CSS propio con variables (tema claro/oscuro, alto contraste), sin frameworks pesados.
- Pruebas: **Vitest** (esquemas, `gmaps.ts`, derivación de ubicación anterior/actual/futura, reglas de desactualización) y **Playwright** (humo: carga del mapa, filtro, ficha, enlace a Google Maps, navegación por teclado, `/admin` no existe en el build).
- Estructura de `src/`:

```
src/
  pages/ (index.astro, lista.astro, recurso/[id].astro, imprimir.astro, data/*.json.ts, admin/* [solo dev])
  components/ (Mapa, FichaRecurso, LineaTiempo, BadgeEstado, FiltroPanel, AlertasVigentes)
  lib/ (schema.ts, content.ts, gmaps.ts, geo.ts, traslados.ts, tiempo.ts, tipos.ts)
  styles/
scripts/ (validate-content.ts, new-resource.ts, export-backup.ts)
```

## 8. Calidad, seguridad y accesibilidad (requisitos de aceptación)

- WCAG 2.2 AA: navegación completa por teclado, foco visible, `aria` en mapa y ficha, contraste, textos alternativos, tamaño táctil ≥ 44 px, `prefers-reduced-motion`, la lista es equivalente funcional al mapa.
- Lighthouse móvil ≥ 90 en Performance, Accesibilidad, Best Practices y SEO.
- Seguridad: CSP estricta vía `<meta>`, sin `innerHTML` con contenido de TOML (escapar siempre), sanitizar URLs (solo `https:`; dominios permitidos para `gmaps_url`: `google.com/maps`, `maps.app.goo.gl`, `goo.gl/maps`), sin trackers. Los links externos con `rel="noopener noreferrer"`.
- **Honestidad del dato:** nunca presentar como vigente un dato desactualizado; mostrar siempre "actualizado hace X". Un traslado proyectado se rotula claramente como **proyección, no confirmado**.
- Degradación elegante: si JS falla, `/lista` y las fichas siguen funcionando (HTML puro).
- Cero errores en `astro check`, ESLint y Prettier. El build falla si el contenido TOML no valida.

## 9. EL ARNÉS (construir ANTES que la app)

Crea primero esta infraestructura para trabajar con Claude Code de forma disciplinada y repetible:

### 9.1 `CLAUDE.md` (raíz)
Debe contener: propósito del proyecto y su criticidad; stack; comandos (`dev`, `build`, `check`, `test`, `validate`, `admin`); mapa de carpetas; reglas de oro (el contenido solo se modifica vía TOML validado; nunca editar `dist/`; el historial es append-only; todo dato nuevo pasa por `npm run validate`); convenciones de código y de commits (Conventional Commits en español); definición de "terminado" (check + test + validate + build verdes); y lista de cosas prohibidas (agregar DB, claves de API obligatorias, trackers, `innerHTML` con datos).

### 9.2 `.claude/settings.json`
- **Permisos:** permitir `npm run *`, `npx astro *`, `npx vitest *`, `npx playwright *`, lectura general y edición en `src/`, `content/`, `scripts/`, `docs/`; **denegar** `rm -rf`, `git push --force`, lectura de `.env*`, y escrituras en `dist/` y `node_modules/`.
- **Hooks:**
  - `PostToolUse` (Write|Edit sobre `content/**/*.toml`): ejecutar `npm run validate -- --changed` y devolver errores al agente.
  - `PostToolUse` (Write|Edit sobre `src/**/*.{ts,astro}`): `npx prettier --write` del archivo.
  - `Stop`: ejecutar `npm run check` y avisar si hay errores sin resolver.
  - `PreToolUse` (Bash): bloquear comandos destructivos fuera de la carpeta del proyecto.

### 9.3 Subagentes (`.claude/agents/`)
- `toml-schema-guardian` — revisa que todo TOML cumpla el esquema, detecta referencias rotas, fechas incoherentes y ediciones indebidas al historial.
- `a11y-reviewer` — audita accesibilidad (teclado, ARIA, contraste, lector de pantalla) en componentes y páginas; solo lectura, entrega hallazgos priorizados.
- `map-qa` — prueba con Playwright la vista de mapa, filtros, ficha, traslados (anterior/actual/futuro) y enlaces a Google Maps; reporta capturas.
- `emergency-ux-reviewer` — revisa textos y flujos desde la perspectiva de una persona estresada, con poca señal y un celular básico; propone simplificaciones.
- `security-reviewer` — busca XSS, URLs inseguras, fugas de tokens y que `/admin` no entre al build.

### 9.4 Skills (`.claude/skills/<nombre>/SKILL.md`, con frontmatter `name` y `description` claros)
- `agregar-recurso` — flujo para crear un recurso: elegir tipo, pedir/pegar link de Google Maps, extraer coordenadas con `gmaps.ts`, generar el TOML desde plantilla, validar.
- `registrar-evento` — agregar al historial (estado, observación, alerta, resolución de alerta, corrección) respetando *append-only*.
- `gestionar-traslado` — registrar, proyectar, iniciar, completar o cancelar un traslado, manteniendo coherencia anterior/actual/futuro.
- `parsear-link-gmaps` — procedimiento y casos límite para links de Google Maps (incluye cómo resolver enlaces cortos).
- `nuevo-tipo-recurso` — cómo añadir un tipo a `tipos.toml` con ícono, campos extra y pruebas.
- `publicar` — checklist previa a publicar: validate, check, test, build, revisión de alertas críticas desactualizadas, tamaño del bundle, preview, commit y despliegue.
- `auditoria-accesibilidad` — checklist WCAG específico del proyecto.

### 9.5 Comandos slash (`.claude/commands/`)
`/nuevo-recurso`, `/evento`, `/trasladar`, `/validar`, `/publicar`, `/revisar-a11y`.

### 9.6 Scripts y CI
- `scripts/validate-content.ts` (salida legible: archivo, línea, mensaje, sugerencia), `scripts/new-resource.ts`, `scripts/export-backup.ts`.
- `.github/workflows/ci.yml`: install → validate → check → lint → test → build → verificar que `dist/` no contiene `/admin` → Lighthouse CI → artefacto. Workflow de despliegue opcional a GitHub Pages (y notas para Netlify/Cloudflare).
- `.editorconfig`, `.nvmrc`, `.env.example`.

### 9.7 Contenido de ejemplo
Incluye datos **ficticios claramente marcados** (`[ejemplo]`) para demostrar: una torre de iluminación con historial, alerta y traslado proyectado; un punto de agua; un albergue; un puesto médico; un punto de alimentación; un requerimiento abierto; un corte vial; una zona de riesgo. El sitio debe poder ocultar los ejemplos con un solo flag.

## 10. Plan de trabajo (sigue este orden)

1. **Planifica** (modo plan): resume arquitectura, riesgos y decisiones; espera mi aprobación solo si hay ambigüedades reales; si no, continúa.
2. **Arnés:** CLAUDE.md, settings, hooks, subagentes, skills, comandos, scripts de validación, CI.
3. **Núcleo de datos:** esquemas Zod, loader TOML, `gmaps.ts`, `traslados.ts`, `tiempo.ts` con **tests primero**.
4. **Vista pública:** layout, mapa, filtros, ficha, línea de tiempo, traslados, lista, impresión, feeds JSON/GeoJSON, PWA.
5. **Panel admin (dev):** endpoints, formularios desde esquema, acciones rápidas, extracción de coordenadas, vista previa, validación y respaldo; modo GitHub opcional.
6. **Revisiones con subagentes:** a11y, seguridad, UX de emergencia, QA de mapa. Corrige hallazgos.
7. **Documentación:** `README.md` (instalación, uso diario del admin, cómo publicar en 3 hostings), `docs/OPERACION.md` (guía de una página para actualizar en terreno), `docs/DECISIONES.md`, `docs/DATOS.md` (referencia del modelo TOML).
8. **Entrega:** resumen de lo construido, resultados de tests/Lighthouse, limitaciones conocidas y próximos pasos sugeridos.

## 11. Ideas adicionales a evaluar (propón y justifica antes de implementar)

- Leyenda de "estado de la información" por institución y teléfono de verificación.
- Radio de cobertura aproximado para torres, baños y puntos de agua.
- Cálculo de distancia al recurso más cercano usando geolocalización del dispositivo (solo en el cliente, sin enviar ni guardar nada).
- Vista de "línea de tiempo del incidente" con todos los eventos de todos los recursos.
- Suscripción RSS/Atom de alertas críticas.
- Modo "baja conectividad" (sin mapa, solo lista + texto).
- Versión en otros idiomas (inglés, creole, mapudungun) para zonas multilingües, usando un archivo de textos TOML.

## 12. Criterios finales de aceptación

- `npm run validate && npm run check && npm test && npm run build` pasan sin errores.
- El sitio generado funciona abriendo `dist/` con cualquier servidor estático y bajo un subdirectorio (`ASTRO_BASE=/mapa/`).
- Puedo pegar un link de Google Maps en el admin, crear una torre de iluminación, registrar una observación, proyectar un traslado y ver todo reflejado en el sitio público tras un build, sin tocar código.
- Un usuario en un celular con 3G puede abrir una ficha, ver el estado, la hora de última actualización, el punto anterior/actual/futuro y pulsar un botón para abrir la ruta en Google Maps.
- `/admin` no existe en el build de producción.

**Antes de escribir código, confirma en 5 líneas tu comprensión del objetivo y lista cualquier supuesto que vayas a tomar. Luego empieza por el arnés.**
