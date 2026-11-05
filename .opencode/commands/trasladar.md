---
description: Registra, inicia, completa o cancela el traslado de un recurso
agent: build
---

Carga la skill `gestionar-traslado`. Gestiona este traslado: $ARGUMENTS

Antes de escribir, confirma en una línea:

- recurso, origen, destino y motivo;
- si es **proyección**, **en curso**, **completado** o **cancelado**;
- qué pasa con `ubicacion_actual` y con el historial de estado.

Después:

1. Aplica los cambios en `content/recursos/<ID>.toml` sin romper la coherencia
   anterior / actual / futura.
2. Ejecuta `npm run validate -- --changed`.
3. Resume qué verá la ciudadanía: ubicación anterior, actual y futura, con fechas y el rótulo de
   proyección cuando corresponda.
