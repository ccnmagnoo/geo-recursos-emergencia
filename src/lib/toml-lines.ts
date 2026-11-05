/**
 * Traduce una ruta de error (la que entrega Zod) a un número de línea del TOML.
 *
 * Es una heurística deliberada: no reimplementamos un parser con posiciones,
 * solo ubicamos la sección y la clave. Si no se encuentra, el validador
 * muestra el archivo sin línea en vez de inventar una.
 */

interface Seccion {
  nombre: string;
  /** Línea 1-based donde empieza la sección. */
  linea: number;
  /** Índice de esta sección entre las que tienen el mismo nombre. */
  indice: number;
}

function cabecera(linea: string): { nombre: string; array: boolean } | null {
  const tablaArray = /^\s*\[\[\s*([^[\]]+?)\s*\]\]\s*(?:#.*)?$/.exec(linea);
  if (tablaArray?.[1] !== undefined) return { nombre: tablaArray[1].trim(), array: true };
  const tabla = /^\s*\[\s*([^[\]]+?)\s*\]\s*(?:#.*)?$/.exec(linea);
  if (tabla?.[1] !== undefined) return { nombre: tabla[1].trim(), array: false };
  return null;
}

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function encontrarLinea(texto: string, path: Array<string | number>): number | undefined {
  const lineas = texto.split(/\r?\n/);
  if (path.length === 0) return 1;

  const secciones: Seccion[] = [];
  const contadores = new Map<string, number>();
  for (const [indice, linea] of lineas.entries()) {
    const encontrada = cabecera(linea);
    if (encontrada === null) continue;
    const ocurrencia = contadores.get(encontrada.nombre) ?? 0;
    contadores.set(encontrada.nombre, ocurrencia + 1);
    secciones.push({ nombre: encontrada.nombre, linea: indice + 1, indice: ocurrencia });
  }

  const primero = path[0];
  const segundo = path[1];

  let seccion: Seccion | undefined;
  if (typeof primero === 'string') {
    const ocurrencia = typeof segundo === 'number' ? segundo : 0;
    seccion = secciones.find((s) => s.nombre === primero && s.indice === ocurrencia);
  }

  const claves = path.filter((segmento): segmento is string => typeof segmento === 'string');
  const clave = claves.length >= 2 ? claves[claves.length - 1] : undefined;

  if (seccion !== undefined) {
    const siguiente = secciones.find(
      (s) =>
        s.linea > seccion.linea && !(s.indice === seccion.indice && s.nombre === seccion.nombre),
    );
    const desde = seccion.linea - 1;
    const hasta = siguiente === undefined ? lineas.length : siguiente.linea - 1;

    if (clave !== undefined) {
      const patron = new RegExp(`^\\s*${escaparRegex(clave)}\\s*=`);
      for (let i = desde; i < hasta; i += 1) {
        const linea = lineas[i];
        if (linea !== undefined && patron.test(linea)) return i + 1;
      }
      // Claves dentro de tablas en línea: origen = { nombre = "…" }
      const suelto = new RegExp(`(?:^|[{,\\s])${escaparRegex(clave)}\\s*=`);
      for (let i = desde; i < hasta; i += 1) {
        const linea = lineas[i];
        if (linea !== undefined && suelto.test(linea)) return i + 1;
      }
    }
    return seccion.linea;
  }

  // Clave de primer nivel: antes de la primera cabecera.
  const finPrimerNivel = secciones[0]?.linea ?? lineas.length + 1;
  const buscada =
    typeof primero === 'string'
      ? primero
      : claves.length > 0
        ? claves[claves.length - 1]
        : undefined;
  if (buscada !== undefined) {
    const patron = new RegExp(`^\\s*${escaparRegex(buscada)}\\s*=`);
    for (let i = 0; i < finPrimerNivel - 1; i += 1) {
      const linea = lineas[i];
      if (linea !== undefined && patron.test(linea)) return i + 1;
    }
  }
  return undefined;
}
