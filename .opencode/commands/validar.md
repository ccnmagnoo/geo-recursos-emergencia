---
description: Valida todo el contenido TOML y explica los errores en lenguaje claro
agent: build
---

Ejecuta `npm run validate` y luego explica el resultado.

- Si hay errores: agrúpalos por archivo, traduce cada mensaje a una instrucción concreta ("en la
  línea 42, `fecha_real` no puede estar vacía porque el traslado está completado") y ofrece
  corregirlos.
- Si solo hay avisos: dilos y pregunta si corresponde corregirlos.
- Si todo está bien: muestra el resumen (recursos, tipos, requerimientos, zonas) y termina.

No modifiques archivos en este paso salvo que te lo pida después de explicar.
