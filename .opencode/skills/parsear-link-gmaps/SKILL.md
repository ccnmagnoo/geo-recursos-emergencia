---
name: Parsear link de Google Maps
description: Extraer latitud y longitud de un link de Google Maps, incluidos enlaces cortos, y qué guardar en el TOML cuando no se puede resolver.
---

# Parsear un link de Google Maps

Implementación: `src/lib/gmaps.ts`. Pruebas: `tests/unit/gmaps.spec.ts`.
Herramienta rápida:

```bash
npx tsx scripts/gmaps.ts "https://maps.app.goo.gl/…"
```

## Orden de prioridad (no lo cambies sin actualizar las pruebas)

1. `!3d<lat>!4d<lng>` — posición exacta del pin. **Máxima prioridad.**
2. `@<lat>,<lng>,<zoom>z` — centro de la vista. Menos preciso: puede no ser el pin.
3. `?q=`, `?query=`, `?ll=`, `?destination=` con `<lat>,<lng>`.
4. Coordenadas decimales pegadas directamente: `-33.0451, -71.5231`.
5. Enlaces cortos `maps.app.goo.gl/…` y `goo.gl/maps/…`.

## Enlaces cortos

No se pueden resolver en el navegador por CORS. Se resuelven **en el servidor de desarrollo**,
que sigue las redirecciones y devuelve la URL final:

1. Solo en `astro dev` existe `POST /api/dev/gmaps-resolve`.
2. El endpoint acepta únicamente hosts de la allowlist, aplica timeout de 5 s, no reenvía
   credenciales y rechaza IPs privadas tras la resolución.
3. Si falla, el panel pide las coordenadas a mano y muestra un mini-mapa para arrastrar el pin.

Nunca resuelvas un enlace corto llamando a un proxy público ni a un servicio de terceros.

## Qué guardar

```toml
[ubicacion_actual]
nombre = "Estadio Municipal"
lat = -33.0512
lng = -71.51
gmaps_url = "https://maps.app.goo.gl/AbC123"   # el link ORIGINAL, siempre
```

- Conserva el link original tal cual, aunque tengas coordenadas.
- Si el link no es de Google Maps o no pasa `esUrlGmapsPermitida()`, **no lo guardes** en
  `gmaps_url`: deja solo `lat`/`lng`. El sitio construirá
  `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`.
- Si las coordenadas vienen de `@`, avisa que pueden ser el centro de la vista y no el pin.

## Casos límite

- Enlaces con `!3d` y `@` a la vez: gana `!3d!4d`.
- Coordenadas con coma decimal (`-33,0451`) → normalizar a punto.
- Latitudes fuera de `[-90, 90]` o longitudes fuera de `[-180, 180]` → error, no "corregir".
- `https://www.google.com/maps/place/…/@-33.04,-71.52,15z` → devuelve el centro y márcalo como
  `fuente: 'centro-mapa'`.
- Enlace de indicaciones con origen y destino: usar `destination`, nunca el origen.
