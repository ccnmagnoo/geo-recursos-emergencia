---
description: Agrega un evento al historial de un recurso (append-only)
agent: build
---

Carga la skill `registrar-evento`. Registra este evento: $ARGUMENTS

Reglas:

1. Identifica el recurso y el tipo de evento (estado, observación, alerta, resolución o corrección).
2. Si es un cambio de estado, actualiza `estado_actual` y agrega el evento al final del historial.
3. Nunca borres ni reordenes eventos existentes. Si hay un error, agrega `[[correcciones]]`.
4. Usa la fecha indicada; si no hay, usa la hora actual en `America/Santiago` con offset `-03:00`/`-04:00`.
5. Ejecuta `npm run validate -- --changed` y muestra el diff del archivo.
