---
name: Registrar evento
description: Agregar al historial de un recurso un cambio de estado, observación, alerta, resolución o corrección respetando el historial append-only.
---

# Registrar un evento

El historial **nunca se edita ni se borra**. Un error se corrige con una `[[correcciones]]` que
apunta al evento equivocado. Si sientes la tentación de borrar una línea, esta skill existe para
evitarlo.

## Plantillas

Todas las fechas en ISO con offset chileno. `autor` es texto libre (nombre o rol, nunca datos
personales de afectados).

### Cambio de estado

Agrega al final y **actualiza `estado_actual`** para que coincidan:

```toml
estado_actual = "con_falla"

[[historial_estado]]
fecha = 2026-11-05T19:10:00-03:00
estado = "con_falla"
autor = "Operador A"
nota = "Falla el foco 3; queda operativa con 3 focos."
```

### Observación

```toml
[[observaciones]]
fecha = 2026-11-05T19:15:00-03:00
autor = "Operador A"
texto = "Combustible al 40%. Se pidió relleno."
```

### Alerta

```toml
[[alertas]]
id = "A-0007"
fecha = 2026-11-05T19:20:00-03:00
severidad = "critica"   # info | precaucion | critica
texto = "Sin combustible; se apaga en 2 horas."
vigente = true
```

### Resolver alerta

No borres la alerta: cambia `vigente` a `false` y, si quieres dejar rastro, agrega una observación
con la hora de resolución. Si la alerta tenía `expira`, puedes fijarla en vez de desactivarla.

### Corrección

```toml
[[correcciones]]
corrige = "historial_estado:2026-11-05T19:10:00-03:00"
fecha = 2026-11-05T19:25:00-03:00
autor = "Operador A"
nota = "El estado real era operativo; la falla se detectó 20 minutos después."
```

Formatos de `corrige`: `historial_estado:<fecha>`, `observaciones:<fecha>`,
`alertas:<id>`, `traslados:<id>`. La fecha o el id deben existir en ese mismo recurso.

## Verificar

```bash
npm run validate -- --changed
```

El validador comprueba:

- que `estado_actual` coincida con el último evento;
- que no haya fechas futuras (salvo una proyección de traslado);
- que los ids de alerta sean únicos en todo el sitio;
- que las correcciones apunten a algo real;
- que `expira` sea posterior a la alerta.

## Qué no hacer

- No reordenes ni "limpies" eventos viejos.
- No cambies el `autor` de un evento pasado.
- No uses la corrección para reescribir la realidad: si el dato cambió, es un evento nuevo.
