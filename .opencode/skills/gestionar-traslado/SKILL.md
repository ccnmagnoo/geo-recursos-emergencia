---
name: Gestionar traslado
description: Registrar, proyectar, iniciar, completar o cancelar el traslado de un recurso manteniendo coherentes la ubicación anterior, actual y futura.
---

# Gestionar un traslado

## El modelo

- **Anterior** = `origen` del último traslado `completado`.
- **Actual** = `[ubicacion_actual]`.
- **Futura** = `destino` del próximo traslado `proyectado` o `en_curso`.

Solo puede haber **un** traslado `en_curso` por recurso. Un traslado `proyectado` exige
`fecha_estimada`; uno `completado` exige `fecha_real`; uno `cancelado` no lleva `fecha_real`.

## Proyectar (aún no ocurre)

```toml
[[traslados]]
id = "T-0002"
estado = "proyectado"
motivo = "Seguridad: avance del frente de fuego"
autor = "Operador A"
fecha_estimada = 2026-11-06T09:00:00-03:00
origen = { nombre = "Plaza Las Palmas", lat = -33.04512, lng = -71.5231 }
destino = { nombre = "Estadio Municipal", lat = -33.0512, lng = -71.51, gmaps_url = "https://maps.app.goo.gl/…" }
```

El sitio lo muestra como **proyección, no confirmada**, con línea punteada. No cambies
`ubicacion_actual` todavía.

## Iniciar

1. Cambia `estado = "en_curso"` en el traslado (sin borrar `fecha_estimada`).
2. Agrega un evento `en_traslado` al historial y actualiza `estado_actual = "en_traslado"`.
3. Deja `ubicacion_actual` como el origen hasta que llegue. El texto público debe decir
   "en traslado hacia …", no "instalado en …".

## Completar

1. `estado = "completado"` y agrega `fecha_real`.
2. Copia el `destino` a `[ubicacion_actual]`, con `desde = fecha_real`.
3. Agrega el evento de estado final (`operativo` o el que corresponda) y actualiza
   `estado_actual`.
4. Verifica que `origen` del traslado coincida con la ubicación anterior real.

```toml
estado_actual = "operativo"

[ubicacion_actual]
nombre = "Estadio Municipal"
lat = -33.0512
lng = -71.51
gmaps_url = "https://maps.app.goo.gl/…"
desde = 2026-11-06T09:45:00-03:00

[[historial_estado]]
fecha = 2026-11-06T09:45:00-03:00
estado = "operativo"
autor = "Operador A"
nota = "Instalada en el estadio."
```

## Cancelar

`estado = "cancelado"`, sin `fecha_real`, y una nota en `motivo` o `notas` explicando por qué.
Agrega una observación si el recurso vuelve a operar en el mismo lugar.

## Verificar

```bash
npm run validate -- --changed
```

Además de lo automático, revisa a ojo:

- ¿El mapa muestra anterior atenuado, actual sólido y futuro punteado?
- ¿La ficha dice claramente cuál es cuál y con qué fecha?
- ¿El botón de Google Maps apunta al destino **futuro** o al actual según corresponda?
- Si cancelaste, ¿desapareció la línea proyectada y el rótulo?
