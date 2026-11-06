---
name: Nuevo tipo de recurso
description: Añadir un tipo a tipos.toml con color, forma y símbolo accesibles, campos de detalle y pruebas, sin tocar código de la interfaz.
---

# Nuevo tipo de recurso

El catálogo es dato: agregar un tipo **no requiere código**. La interfaz, los filtros, la leyenda
y los formularios del panel se generan desde `content/tipos.toml`.

## 1. Define la identidad visual

| Campo                          | Regla                                                                       |
| ------------------------------ | --------------------------------------------------------------------------- |
| `id`                           | `snake_case`, 3-40 caracteres, único. Es la clave que usan los recursos.    |
| `etiqueta` / `etiqueta_plural` | Como se muestra en filtros y fichas.                                        |
| `categoria`                    | `movil`, `fijo`, `zona` o `requerimiento`. Define en qué carpeta se usa.    |
| `movil`                        | `true` solo si el recurso puede trasladarse y tiene historial de ubicación. |
| `geometrias`                   | `["punto"]` para casi todo; `["linea"]` o `["poligono"]` en zonas.          |
| `color`                        | Hex de 6 dígitos. Debe contrastar ≥ 4.5:1 con texto blanco.                 |
| `forma`                        | `circulo`, `cuadrado`, `rombo`, `triangulo`, `hexagono`, `estrella`.        |
| `icono`                        | Id de `src/lib/iconos.ts` (ej. `torre`, `agua`, `albergue`).                |
| `orden`                        | Orden en la leyenda y los filtros. Deja espacio (10, 20, 30…).              |

**El color nunca va solo.** Un tipo nuevo necesita forma, color e icono distintos de sus vecinos;
si no, una persona con daltonismo no puede distinguirlo. Si el icono que necesitas no existe, se
agrega al set (trazo 24×24, estilo Lucide) antes de usarlo: el esquema rechaza ids desconocidos.

Verifica el contraste con la fórmula WCAG antes de elegir. Un color oscuro y saturado suele
funcionar; los pasteles no.

## 2. Declara los campos de detalle

```toml
[[tipos]]
id = "grua"
etiqueta = "Grúa"
etiqueta_plural = "Grúas"
categoria = "movil"
movil = true
geometrias = ["punto"]
color = "#0f766e"
forma = "rombo"
icono = "grua"
orden = 115

[[tipos.campos]]
clave = "capacidad_toneladas"
etiqueta = "Capacidad"
tipo = "decimal"
unidad = "t"
min = 0
requerido = true

[[tipos.campos]]
clave = "tipo_grua"
etiqueta = "Tipo de grúa"
tipo = "opcion"
opciones = ["pluma", "horquilla", "telescópica"]
requerido = true
```

Tipos de campo disponibles: `texto`, `entero`, `decimal`, `booleano`, `opcion`, `fecha_hora`.
Reglas que valida el esquema:

- `opcion` exige `opciones` y ningún otro tipo las declara.
- `min` no puede superar a `max`.
- `requerido = true` obliga a que todo recurso de ese tipo traiga el campo.

## 3. Prueba

```bash
npm run validate
npm run check
npm run test
```

Si el tipo participa en lógica especial (por ejemplo, `requerimiento`), agrega un caso en
`tests/unit/schema.spec.ts`. Para tipos de zona, crea un ejemplo en `content/zonas_geo/` y
comprueba que el mapa dibuja la geometría y que el filtro lo lista.

## 4. Revisa en pantalla

1. La leyenda muestra el tipo con forma, color y símbolo.
2. El filtro por tipo funciona y su nombre está en plural.
3. La ficha lista los detalles con su unidad, en el orden declarado.
4. En móvil, el nombre del tipo no rompe el layout a 360 px.
5. El formulario del panel (`npm run admin`) genera los campos correctos, incluidos los de opción.

## 5. Documenta

Agrega el tipo a `docs/DATOS.md` si cambia el modelo (por ejemplo, un campo con semántica
especial) y anota en el commit: `feat(tipos): agrega grúa con capacidad y tipo`.
