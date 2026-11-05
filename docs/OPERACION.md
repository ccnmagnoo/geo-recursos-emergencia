# Operación en terreno

Una página para quien actualiza el mapa durante la emergencia. Si tienes poco tiempo, lee solo
esto.

## Antes de la emergencia

1. Ten el repositorio clonado y `npm install` hecho.
2. Prueba `npm run admin` y crea un recurso de prueba en tu computador.
3. Define quién es el responsable de publicar y quién más puede editar.
4. Acuerda el umbral de desactualización (`umbral_desactualizado_horas` en `content/site.toml`):
   12 h es un buen punto de partida para recursos móviles.

## Durante la emergencia

### Actualizar un recurso

```bash
npm run admin
```

1. Abre el recurso en **Recursos**.
2. Usa la acción que corresponda:
   - **Cambiar estado** cuando el recurso empieza, falla o se retira.
   - **Agregar observación** para el detalle que no cabe en el estado (combustible, fila, horario).
   - **Emitir alerta** solo si la gente necesita saberlo ahora. `Crítica` es para riesgo o falta de
     algo esencial.
   - **Proyectar traslado** si se va a mover. Queda como proyección hasta que confirmes la llegada.
   - **Confirmar llegada** cuando el recurso está instalado en el destino.
3. Escribe siempre **quién registra**, para poder preguntar después.
4. Verifica que la hora sea la correcta (por defecto es la hora actual de Chile).

### Crear un recurso nuevo

1. **Recursos → Nuevo recurso**.
2. Elige el tipo. El panel muestra los campos de ese tipo.
3. Pega el link de Google Maps y pulsa **Extraer coordenadas**.
   - Si el link es corto, el panel lo resuelve en tu computador.
   - Revisa que el pin sea el lugar correcto, no el centro del mapa.
4. Completa los datos obligatorios y guarda.

### Corregir un error

**No borres ni edites eventos del historial.** Usa **Corregir un evento**: se agrega una nota que
apunta al evento equivocado y el sitio muestra ambos. Así se mantiene la trazabilidad.

Si el error es de un dato de la ficha (nombre, institución, coordenadas), usa **Editar TOML
directamente** y guarda; el panel valida y revierte si algo queda mal.

## Publicar

```bash
npm run validate
git status
git add content/
git commit -m "feat(contenido): actualiza recursos del sector norte"
git push
```

Espera a que el hosting termine y abre el sitio público en tu celular. Revisa:

- [ ] El recurso aparece en el mapa y en la lista.
- [ ] La hora de actualización es la correcta.
- [ ] El botón de Google Maps abre el lugar correcto.
- [ ] Si hay una alerta crítica, se ve en la portada.
- [ ] Si hay un traslado proyectado, dice **proyección, no confirmada**.

## Cada hora (si la emergencia sigue activa)

- Revisa las alertas críticas: ¿siguen vigentes? Resuélvelas si ya no aplican.
- Revisa los traslados proyectados: ¿la hora estimada sigue siendo realista?
- Revisa los recursos `en_traslado` hace más de 2 horas: confirma o corrige.
- Actualiza el estado de los recursos que llevan más de tu umbral sin cambios.

El sitio muestra "Información desactualizada" cuando un dato supera el umbral. Eso es una señal
para actualizar, no un error del sitio.

## Respaldo

```bash
npm run backup
```

Crea `backups/content-AAAAMMDD-HHMM.zip`. Guárdalo fuera del computador si vas a editar en terreno.

El panel además copia cada archivo a `.backup/` antes de modificarlo. El botón **Deshacer** del
recurso restaura la copia más reciente.

## Qué no hacer

- No borres eventos del historial ni "limpies" el TOML a mano.
- No cambies un estado sin agregar el evento correspondiente.
- No inventes una hora de llegada: si no sabes, deja el traslado como proyectado.
- No marques `publicado = false` para "arreglar" un dato: corrígelo.
- No publiques `dist/` a mano ni edites archivos dentro de `dist/`.
- No pegues links de Google Maps de otros dominios; usa coordenadas.

## Si algo falla

| Síntoma                             | Qué hacer                                                   |
| ----------------------------------- | ----------------------------------------------------------- |
| `npm run validate` muestra un error | Lee `archivo:línea`, corrige el TOML y vuelve a correr.     |
| El panel no deja guardar            | Revisa el mensaje: el cambio dejaría el contenido inválido. |
| El build falla                      | Corre `npm run check` y `npm run test` para ver el detalle. |
| El sitio no refleja el cambio       | ¿Hiciste commit y push? ¿El hosting terminó de construir?   |
| El mapa no carga                    | Revisa la conexión; la lista sigue funcionando.             |

## Contacto técnico

Anota aquí a la persona que mantiene el repositorio:

- Nombre:
- Teléfono:
- Horario:
