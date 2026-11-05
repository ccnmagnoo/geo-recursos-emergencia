# Modelo de datos TOML

Todo el contenido vive en `/content`. No hay base de datos. El build falla si algo no valida.

## Reglas generales

- **Fechas:** ISO 8601 con offset de Chile, por ejemplo `2026-11-05T14:00:00-03:00`.
  Se aceptan `-03:00` (horario de verano) y `-04:00` (invierno). **No se acepta `Z`.**
  Una fecha que no existe (30 de febrero) se rechaza antes de parsear.
- **Ids de recurso:** `AAA-000`, 2-4 letras mayúsculas, guion y 3-4 dígitos. El nombre del
  archivo debe ser igual al `id`.
- **Historial append-only:** no se edita ni se borra un evento. Para corregir se agrega una
  corrección.
- **Texto:** sin HTML. La interfaz escapa todo lo que viene del contenido.
- **`autor`:** es trazabilidad operativa. Usa un rol o identificador de turno; no escribas datos
  personales de afectados ni teléfonos en campos de texto libre. Ese contenido se publica.

## `content/site.toml`

```toml
titulo = "Mapa de Recursos de Emergencia"
subtitulo = "Incendio forestal — Sector Las Palmas"   # opcional
institucion = "Municipalidad de Vista Verde"
contacto = "Coordinación: +56 9 0000 0000"
umbral_desactualizado_horas = 12                      # 1 a 168
zona_horaria = "America/Santiago"                     # fijo
mostrar_ejemplos = true
aviso = "Datos de demostración."                      # opcional, banner superior

[mapa]
centro_lat = -33.0455
centro_lng = -71.5215
zoom = 14

[teselas]
url = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
atribucion = "© colaboradores de OpenStreetMap"
atribucion_url = "https://www.openstreetmap.org/copyright"   # opcional
max_zoom = 19

[[emergencias]]
nombre = "Bomberos"
telefono = "132"
descripcion = "Incendios y rescate"                  # opcional
```

Con `mostrar_ejemplos = false`, todo recurso con `ejemplo = true` desaparece del sitio, de los
feeds y del mapa.

## `content/tipos.toml`

Un arreglo `[[tipos]]`. Agregar un tipo no requiere tocar código.

```toml
[[tipos]]
id = "torre_iluminacion"
etiqueta = "Torre de iluminación"
etiqueta_plural = "Torres de iluminación"
categoria = "movil"            # movil | fijo | zona | requerimiento
movil = true
geometrias = ["punto"]         # punto | linea | poligono
color = "#b45309"              # contraste >= 4.5:1 con texto blanco
forma = "circulo"              # circulo | cuadrado | rombo | triangulo | hexagono | estrella
simbolo = "TI"                 # 1-2 caracteres
orden = 10
descripcion = "Torre móvil con focos LED."   # opcional

[[tipos.campos]]
clave = "autonomia_horas"
etiqueta = "Autonomía"
tipo = "entero"                # texto | entero | decimal | booleano | opcion | fecha_hora
unidad = "h"                   # opcional
min = 0
max = 200
requerido = true
ayuda = "Horas estimadas con estanque lleno."   # opcional

[[tipos.campos]]
clave = "tecnologia"
etiqueta = "Tecnología"
tipo = "opcion"
opciones = ["wifi", "satelital", "radio", "mixta"]   # obligatorio si tipo = opcion
requerido = true
```

Reglas:

- `opcion` exige `opciones`; ningún otro tipo las declara.
- `min` no puede ser mayor que `max`.
- Los campos `requerido = true` deben existir en `[detalles]` de cada recurso del tipo.
- No se permiten claves de detalle que el tipo no declare.

## `content/recursos/<ID>.toml`

```toml
id = "TIL-001"
tipo = "torre_iluminacion"
nombre = "Torre de iluminación N°1 — Sector Las Palmas"
institucion = "Municipalidad / Bomberos / SENAPRED"
descripcion = "Torre móvil de 4 focos LED."
publicado = true
ejemplo = false
estado_actual = "operativo"     # ver estados abajo
zona = "las-palmas"             # opcional, debe existir en zonas.toml

[detalles]                      # según el tipo
autonomia_horas = 20
combustible_pct = 70

[ubicacion_actual]
nombre = "Plaza Las Palmas"
lat = -33.04512
lng = -71.52310
gmaps_url = "https://maps.app.goo.gl/XXXXXXXX"   # opcional, dominio permitido
desde = 2026-11-05T14:00:00-03:00                # opcional

[[historial_estado]]
fecha = 2026-11-05T14:05:00-03:00
estado = "operativo"
autor = "Operador A"
nota = "Instalada y encendida."                  # opcional

[[observaciones]]
fecha = 2026-11-05T17:30:00-03:00
autor = "Operador A"
texto = "Combustible al 70%."

[[alertas]]
id = "A-0001"
fecha = 2026-11-05T18:10:00-03:00
severidad = "precaucion"        # info | precaucion | critica
texto = "Humo denso se acerca al sector."
vigente = true                  # por defecto true
expira = 2026-11-05T23:00:00-03:00   # opcional

[[traslados]]
id = "T-0001"
estado = "proyectado"           # proyectado | en_curso | completado | cancelado
motivo = "Seguridad: avance del frente de fuego"
autor = "Operador A"            # opcional
fecha_estimada = 2026-11-06T09:00:00-03:00
fecha_real = ""                 # vacío hasta completar
origen = { nombre = "Plaza Las Palmas", lat = -33.04512, lng = -71.5231 }
destino = { nombre = "Estadio Municipal", lat = -33.0512, lng = -71.51, gmaps_url = "https://maps.app.goo.gl/…" }

[[correcciones]]
corrige = "historial_estado:2026-11-05T14:05:00-03:00"
fecha = 2026-11-05T14:20:00-03:00
autor = "Operador A"
nota = "La hora real de encendido fue 14:15."
```

### Estados del recurso

| Valor               | Texto público     | Uso                         |
| ------------------- | ----------------- | --------------------------- |
| `operativo`         | Funcionando       | Prestando servicio          |
| `con_falla`         | Con falla         | Funciona parcialmente       |
| `fuera_de_servicio` | Fuera de servicio | No sirve en este momento    |
| `en_traslado`       | En traslado       | Se está moviendo            |
| `planificado`       | Planificado       | Aún no llega                |
| `retirado`          | Retirado          | Ya no está en la emergencia |

`estado_actual` **debe** coincidir con el evento más reciente de `[[historial_estado]]`.

### Traslados y ubicaciones

- **Anterior** = `origen` del último traslado `completado`.
- **Actual** = `[ubicacion_actual]`.
- **Futura** = `destino` del próximo traslado `proyectado` o `en_curso`.
- Solo puede haber un traslado `en_curso`.
- `proyectado` exige `fecha_estimada`; `completado` exige `fecha_real`; `cancelado` no lleva
  `fecha_real`.
- Al completar: copia el destino a `[ubicacion_actual]`, actualiza `desde`, agrega el evento de
  estado y actualiza `estado_actual`.

### Correcciones

`corrige` acepta:

- `historial_estado:<fecha>`
- `observaciones:<fecha>`
- `alertas:<id>`
- `traslados:<id>`

El evento original se muestra tachado y con la nota de corrección. Nunca se borra.

### Enlaces de Google Maps

Dominios permitidos: `google.com/maps/...`, `maps.google.com/maps/...`,
`maps.app.goo.gl/...` y `goo.gl/maps/...`. Siempre `https`. Si el enlace no es válido, el sitio
construye `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`.

## `content/requerimientos/<ID>.toml`

```toml
id = "REQ-001"
tipo_recurso = "bano_quimico"
nombre = "Faltan baños químicos en El Mirador"
cantidad = 4
prioridad = "alta"              # baja | media | alta | critica
estado = "asignado"             # abierto | asignado | cubierto
asignado_a = "BAN-001"          # obligatorio si estado != abierto
zona = "el-mirador"             # opcional
fecha = 2026-11-05T10:00:00-03:00
solicitado_por = "Junta de Vecinos El Mirador"
notas = "Se necesitan 2 unidades accesibles."   # opcional
publicado = true
ejemplo = false

[ubicacion]
nombre = "Escuela El Mirador"
lat = -33.0512
lng = -71.51
```

## `content/zonas_geo/<ID>.toml`

```toml
id = "ZR-001"
tipo = "zona_riesgo"
nombre = "Zona de riesgo — Ladera norte"
descripcion = "Polígono preliminar."
publicado = true
ejemplo = false
zona = "quebrada-seca"

[detalles]                      # según los campos del tipo
nivel = "alto"
instruccion = "No ingresar."

[geometria]
tipo = "poligono"               # punto | linea | poligono
coordenadas = [
  [-71.535, -33.038],           # [longitud, latitud]
  [-71.525, -33.038],
  [-71.525, -33.045],
  [-71.535, -33.045],
]
vigencia_desde = 2026-11-05T05:00:00-03:00
vigencia_hasta = 2026-11-06T23:59:00-03:00
fuente = "SENAPRED — informe preliminar"
```

El tipo debe tener `categoria = "zona"` y admitir la geometría usada.

## `content/zonas.toml`

```toml
[[zonas]]
id = "las-palmas"
nombre = "Las Palmas"
comuna = "Vista Verde"
```

## Validaciones que aplica el build

- Sintaxis TOML y esquema Zod estricto (no se permiten campos desconocidos).
- Fechas reales, con offset chileno y sin eventos futuros (salvo proyecciones).
- `estado_actual` coherente con el historial.
- Campos de detalle existentes y obligatorios.
- Ids únicos y archivo = id.
- Referencias: `zona`, `tipo`, `asignado_a`, `corrige`.
- Alertas: id único global, `expira` posterior a `fecha`.
- Traslados: fechas según estado, máximo uno en curso.
- Zonas: geometría permitida por el tipo y al menos 3 puntos en polígonos.
- Enlaces de Google Maps permitidos.
