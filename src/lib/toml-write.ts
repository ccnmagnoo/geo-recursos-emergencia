/**
 * Serialización TOML para el panel de administración.
 *
 * No usamos `stringify` de smol-toml porque convierte las fechas a UTC y
 * perdería la hora local de Chile. Aquí las fechas se escriben sin comillas,
 * como fecha-hora TOML con offset.
 */

const FECHA_TOML = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(-03:00|-04:00)$/;

/** Cadena TOML con comillas y escapes. */
export function cita(valor: string): string {
  return `"${valor
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')}"`;
}

export function valorToml(valor: string | number | boolean): string {
  if (typeof valor === 'boolean') return valor ? 'true' : 'false';
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) throw new RangeError('Número inválido para TOML.');
    return String(valor);
  }
  if (FECHA_TOML.test(valor)) return valor;
  return cita(valor);
}

/** Agrega un bloque al final, con una línea en blanco de separación. */
export function agregarBloque(texto: string, bloque: string): string {
  const limpio = texto.replace(/\s+$/, '');
  return `${limpio}\n\n${bloque.trim()}\n`;
}

export function reemplazarEstadoActual(texto: string, estado: string): string {
  const patron = /^estado_actual\s*=\s*"[^"]*"\s*$/m;
  if (!patron.test(texto)) {
    throw new Error('El archivo no tiene una línea estado_actual que reemplazar.');
  }
  return texto.replace(patron, `estado_actual = ${cita(estado)}`);
}

interface Rango {
  inicio: number;
  fin: number;
}

function rangoSeccion(texto: string, nombre: string): Rango | null {
  const lineas = texto.split('\n');
  const cabecera = new RegExp(`^\\[${nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\s*$`);
  let inicio = -1;
  let offset = 0;
  const offsets: number[] = [];
  for (const linea of lineas) {
    offsets.push(offset);
    offset += linea.length + 1;
  }
  for (let i = 0; i < lineas.length; i += 1) {
    if (inicio === -1 && cabecera.test(lineas[i] ?? '')) {
      inicio = i;
      continue;
    }
    if (inicio !== -1 && /^\s*\[/.test(lineas[i] ?? '')) {
      return {
        inicio: offsets[inicio] ?? 0,
        fin: (offsets[i] ?? texto.length) - 1,
      };
    }
  }
  if (inicio === -1) return null;
  return { inicio: offsets[inicio] ?? 0, fin: texto.length };
}

/** Reemplaza una sección `[nombre]` completa por el bloque entregado. */
export function reemplazarSeccion(texto: string, nombre: string, nuevo: string): string {
  const rango = rangoSeccion(texto, nombre);
  if (rango === null) {
    return agregarBloque(texto, `[${nombre}]\n${nuevo.trim()}`);
  }
  return `${texto.slice(0, rango.inicio)}${nuevo.trim()}\n${texto.slice(rango.fin).replace(/^\n*/, '\n')}`;
}

interface Bloque {
  inicio: number;
  fin: number;
  texto: string;
}

/** Busca un bloque `[[tabla]]` por el valor de su `id`. */
export function bloquePorId(texto: string, tabla: string, id: string): Bloque | null {
  const lineas = texto.split('\n');
  const offsets: number[] = [];
  let offset = 0;
  for (const linea of lineas) {
    offsets.push(offset);
    offset += linea.length + 1;
  }

  const cabecera = `[[${tabla}]]`;
  for (let i = 0; i < lineas.length; i += 1) {
    if ((lineas[i] ?? '').trim() !== cabecera) continue;
    let fin = lineas.length;
    for (let j = i + 1; j < lineas.length; j += 1) {
      if (/^\s*\[/.test(lineas[j] ?? '')) {
        fin = j;
        break;
      }
    }
    const inicioOffset = offsets[i] ?? 0;
    const finOffset = fin === lineas.length ? texto.length : (offsets[fin] ?? texto.length) - 1;
    const cuerpo = texto.slice(inicioOffset, finOffset);
    if (
      new RegExp(`^id\\s*=\\s*"${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'm').test(cuerpo)
    ) {
      return { inicio: inicioOffset, fin: finOffset, texto: cuerpo };
    }
  }
  return null;
}

/** Reemplaza o agrega claves dentro de un bloque ya ubicado. */
export function fijarClaves(texto: string, bloque: Bloque, claves: Record<string, string>): string {
  let cuerpo = bloque.texto;
  for (const [clave, valor] of Object.entries(claves)) {
    const patron = new RegExp(`^${clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*=.*$`, 'm');
    if (patron.test(cuerpo)) {
      cuerpo = cuerpo.replace(patron, `${clave} = ${valor}`);
    } else {
      cuerpo = `${cuerpo.replace(/\s+$/, '')}\n${clave} = ${valor}\n`;
    }
  }
  return `${texto.slice(0, bloque.inicio)}${cuerpo}${texto.slice(bloque.fin)}`;
}

/** Devuelve el contenido de una clave simple dentro de un bloque. */
export function leerClave(bloque: Bloque, clave: string): string | undefined {
  const patron = new RegExp(`^${clave}\\s*=\\s*(.+)$`, 'm');
  const coincidencia = patron.exec(bloque.texto);
  return coincidencia?.[1]?.trim();
}

/** Reemplaza el bloque de ubicación actual con el destino. */
export function moverUbicacion(
  texto: string,
  lugar: { nombre: string; lat: number; lng: number; gmaps_url?: string },
  fecha: string,
): string {
  const lineas = [
    '[ubicacion_actual]',
    `nombre = ${cita(lugar.nombre)}`,
    `lat = ${lugar.lat}`,
    `lng = ${lugar.lng}`,
    ...(lugar.gmaps_url === undefined ? [] : [`gmaps_url = ${cita(lugar.gmaps_url)}`]),
    `desde = ${fecha}`,
  ];
  return reemplazarSeccion(texto, 'ubicacion_actual', lineas.join('\n'));
}
