---
description: Corre el checklist completo previo a publicar
agent: build
---

Carga la skill `publicar` y ejecuta el checklist completo.

1. Corre `npm run verify` y reporta cada paso (validate, check, lint, test, build, budget).
2. Revisa el contenido crítico: alertas críticas desactualizadas, traslados proyectados vencidos y
   recursos `en_traslado` sin cierre. Cita los archivos y líneas.
3. Confirma que `dist/` no contiene `/admin`.
4. Resume en 5 líneas: verde/rojo por paso, riesgos de datos y qué falta antes de publicar.

No hagas `git push` ni despliegues: solo el checklist y el resumen.
