---
description: Crea un recurso nuevo con su ubicación y estado inicial
agent: build
---

Carga la skill `agregar-recurso` y crea un recurso con estos datos: $ARGUMENTS

Pasos obligatorios:

1. Si falta el tipo, el nombre o la ubicación, pregunta antes de escribir.
2. Si hay un link de Google Maps, parsea las coordenadas con `src/lib/gmaps.ts` (o `npx tsx scripts/gmaps.ts`).
3. Genera el TOML en `content/recursos/<ID>.toml` respetando los campos de `content/tipos.toml`.
4. Ejecuta `npm run validate -- --changed` y corrige lo que aparezca.
5. Muéstrame el archivo creado y el resultado de la validación. No hagas commit sin pedirlo.
