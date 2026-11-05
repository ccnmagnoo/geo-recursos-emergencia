---
name: Publicar
description: Checklist previa a publicar el sitio, desde validar el contenido hasta revisar alertas críticas desactualizadas, presupuesto de bundle, preview y despliegue.
---

# Publicar

Una publicación defectuosa puede dejar a alguien sin el dato que necesita. Este checklist no se
salta ni se abrevia bajo presión.

## 1. Verificación automática

```bash
npm run validate
npm run check
npm run lint
npm run test
npm run build
npm run bundle:budget
```

Todos deben pasar. `npm run verify` hace la secuencia completa.

## 2. Revisión de contenido crítico (manual, 5 minutos)

- [ ] ¿Hay **alertas críticas vigentes** con más de `umbral_desactualizado_horas` sin actualizar?
      Si sí: actualízalas o márcalas como resueltas. No publiques una alerta vieja sin contexto.
- [ ] ¿Hay **traslados proyectados** con fecha estimada ya pasada? Confírmalos, cancélalos o
      actualiza la estimación.
- [ ] ¿Algún recurso quedó `en_traslado` desde hace horas sin evento de llegada?
- [ ] ¿Los recursos `ejemplo` están marcados y `mostrar_ejemplos` tiene el valor que corresponde?
- [ ] ¿Los teléfonos de emergencia de `content/site.toml` siguen siendo correctos?
- [ ] ¿La institución y el contacto del pie están actualizados?

## 3. Revisión visual

```bash
npm run build && npm run preview
```

- [ ] Portada en móvil (360 px): mapa, alertas vigentes y teléfonos visibles.
- [ ] Ficha: estado, "actualizado hace X", botón de Google Maps que abre el lugar correcto.
- [ ] Traslados: anterior / actual / proyectado se distinguen y la proyección está rotulada.
- [ ] `/lista` funciona con JavaScript desactivado.
- [ ] `/imprimir` se ve bien en blanco y negro.
- [ ] `dist/` no contiene `/admin` (lo cubre el test, revísalo igual).

## 4. Presupuesto y accesibilidad

- [ ] `npm run bundle:budget` bajo 200 KB gzip sin teselas.
- [ ] Sin errores nuevos en la consola del navegador.
- [ ] Navegación con Tab por el flujo principal.

## 5. Commit y publicación

```bash
git status
git add content/ src/ tests/ docs/ scripts/
git commit -m "feat(contenido): actualiza estado de recursos del sector norte"
git push
```

- Nunca `git push --force` sobre una rama publicada.
- Si el hosting publica desde `main`, espera el workflow y verifica la URL real.
- Si publicas en un subdirectorio, recuerda `ASTRO_BASE=/mapa/` y `ASTRO_SITE`.

## 6. Después de publicar

- [ ] Abre la URL pública (no local) en el celular.
- [ ] Comprueba una ficha compartida por WhatsApp: el título y la descripción se ven bien.
- [ ] Confirma la hora de publicación del pie.

## Si algo falla

No "arregles" el build borrando validaciones ni publicando `dist/` a mano. Revisa el error, corrige
el TOML o el código, y vuelve a empezar el checklist desde el paso 1.
