---
name: Agregar recurso
description: Flujo completo para crear un recurso nuevo con su ubicación, estado inicial y link de Google Maps, validando antes de guardar.
---

# Agregar un recurso

## Antes de escribir

1. Elige el tipo en `content/tipos.toml`. Debe tener `categoria = "movil"` o `"fijo"`.
   Si no existe el tipo, usa la skill `nuevo-tipo-recurso` primero.
2. Elige un id estable `AAA-000` que no exista en `content/recursos/`, `content/requerimientos/`
   ni `content/zonas_geo/`. El id no se cambia después: es la URL pública.
3. Consigue la ubicación. Si tienes un link de Google Maps, usa `parsear-link-gmaps`.

## Crear el archivo

Con el panel: `npm run admin` → **Nuevo recurso**. Con la terminal:

```bash
npm run new -- --tipo torre_iluminacion --id TIL-002 --nombre "Torre N°2 — El Mirador"
```

Esqueleto mínimo (el resto se completa con las acciones):

```toml
id = "TIL-002"
tipo = "torre_iluminacion"
nombre = "Torre de iluminación N°2 — El Mirador"
institucion = "Municipalidad de Vista Verde"
descripcion = "Torre móvil de 4 focos LED."
publicado = true
ejemplo = false
estado_actual = "planificado"
zona = "el-mirador"

[detalles]
autonomia_horas = 20

[ubicacion_actual]
nombre = "Sede Vecinal El Mirador"
lat = -33.0498
lng = -71.5142
gmaps_url = "https://maps.app.goo.gl/…"
desde = 2026-11-05T18:00:00-03:00

[[historial_estado]]
fecha = 2026-11-05T18:00:00-03:00
estado = "planificado"
autor = "Operador A"
nota = "Asignada al sector."
```

## Reglas

- `estado_actual` **debe** coincidir con el evento más reciente de `[[historial_estado]]`.
- Todo campo `requerido = true` del tipo debe estar en `[detalles]`. No agregues claves que el
  tipo no declara: el validador las rechaza.
- Latitud y longitud con al menos 5 decimales. `lat` negativa en Chile.
- Siempre conserva el `gmaps_url` original aunque tengas coordenadas.
- Fechas con offset `-03:00` o `-04:00`, nunca `Z`.
- Si es una prueba o demostración: `ejemplo = true` y `[ejemplo]` en el nombre.

## Cerrar

```bash
npm run validate -- --changed
npm run dev
```

Revisa `/lista`, la ficha `/recurso/TIL-002` y que el marcador aparezca en el mapa con la forma y
el símbolo correctos. Luego commit:

```bash
git add content/recursos/TIL-002.toml
git commit -m "feat(contenido): agrega torre de iluminación TIL-002"
```
