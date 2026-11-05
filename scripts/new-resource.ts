import { existsSync } from 'node:fs';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parse } from 'smol-toml';
import { z } from 'zod';

import { TipoRecurso, type TipoRecursoT } from '../src/lib/schema';
import { ahoraIsoChile } from '../src/lib/tiempo';
import { parsearLinkGmaps } from '../src/lib/gmaps';

/**
 * Crea un recurso en content/recursos/<ID>.toml con su evento inicial.
 * No escribe nada si el id ya existe o si falta un dato obligatorio.
 */

function argumento(nombre: string): string | undefined {
  const indice = process.argv.indexOf(`--${nombre}`);
  if (indice === -1) return undefined;
  return process.argv[indice + 1];
}

function escapar(valor: string): string {
  return valor.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

async function cargarTipos(): Promise<TipoRecursoT[]> {
  const ruta = join(process.cwd(), 'content', 'tipos.toml');
  const contenido = await readFile(ruta, 'utf8');
  const datos = z.strictObject({ tipos: z.array(TipoRecurso) }).parse(parse(contenido));
  return datos.tipos.filter((tipo) => tipo.categoria === 'movil' || tipo.categoria === 'fijo');
}

async function main(): Promise<number> {
  const tipos = await cargarTipos();
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const tipoId = argumento('tipo') ?? (await preguntarTipo(rl, tipos));
    const tipo = tipos.find((t) => t.id === tipoId);
    if (tipo === undefined) {
      console.error(`✗ El tipo "${tipoId}" no existe o no admite recursos.`);
      return 1;
    }

    const id = (argumento('id') ?? (await rl.question('Identificador (ej. TIL-002): ')))
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{2,4}-\d{3,4}$/.test(id)) {
      console.error('✗ El identificador debe tener el formato AAA-000.');
      return 1;
    }

    const ruta = join(process.cwd(), 'content', 'recursos', `${id}.toml`);
    if (existsSync(ruta)) {
      console.error(`✗ Ya existe ${ruta}. No se sobrescribe un recurso.`);
      return 1;
    }

    const nombre = (argumento('nombre') ?? (await rl.question('Nombre visible: '))).trim();
    if (nombre === '') {
      console.error('✗ El nombre es obligatorio.');
      return 1;
    }

    const institucion = (
      argumento('institucion') ?? (await rl.question('Institución responsable: '))
    ).trim();

    const entradaUbicacion = (
      argumento('ubicacion') ?? (await rl.question('Link de Google Maps o "lat,lng": '))
    ).trim();
    const parseado = parsearLinkGmaps(entradaUbicacion);
    if (!parseado.ok) {
      console.error(`✗ ${parseado.error}`);
      return 1;
    }

    const nombreLugar = (await rl.question('Nombre del lugar: ')).trim();
    const zona = (await rl.question('Zona (id de content/zonas.toml, opcional): ')).trim();
    const autor = (await rl.question('Autor del primer evento: ')).trim() || 'Operador';

    const fecha = ahoraIsoChile();
    const lineas: string[] = [
      `id = "${id}"`,
      `tipo = "${tipo.id}"`,
      `nombre = "${escapar(nombre)}"`,
      `institucion = "${escapar(institucion)}"`,
      'descripcion = ""',
      'publicado = true',
      'ejemplo = false',
      'estado_actual = "planificado"',
    ];
    if (zona !== '') lineas.push(`zona = "${escapar(zona)}"`);
    lineas.push('', '[detalles]');
    for (const campo of tipo.campos) {
      if (!campo.requerido) continue;
      const valor = await rl.question(
        `  ${campo.etiqueta}${campo.unidad ? ` (${campo.unidad})` : ''}: `,
      );
      const limpio = valor.trim();
      if (campo.tipo === 'entero' || campo.tipo === 'decimal') {
        lineas.push(`${campo.clave} = ${Number(limpio) || 0}`);
      } else if (campo.tipo === 'booleano') {
        lineas.push(
          `${campo.clave} = ${limpio.toLowerCase() === 's' || limpio.toLowerCase() === 'si'}`,
        );
      } else if (campo.tipo !== 'fecha_hora') {
        lineas.push(`${campo.clave} = "${escapar(limpio)}"`);
      }
    }

    lineas.push(
      '',
      '[ubicacion_actual]',
      `nombre = "${escapar(nombreLugar || nombre)}"`,
      `lat = ${parseado.coordenadas.lat}`,
      `lng = ${parseado.coordenadas.lng}`,
    );
    if (parseado.coordenadas.fuente !== 'texto' && parseado.urlOriginal.startsWith('https://')) {
      lineas.push(`gmaps_url = "${escapar(parseado.urlOriginal)}"`);
    }
    lineas.push(
      `desde = ${fecha}`,
      '',
      '[[historial_estado]]',
      `fecha = ${fecha}`,
      'estado = "planificado"',
      `autor = "${escapar(autor)}"`,
      'nota = "Creado desde la terminal."',
      '',
    );

    const temporal = `${ruta}.tmp`;
    await writeFile(temporal, lineas.join('\n'), 'utf8');
    await rename(temporal, ruta);

    console.log(`\n✓ Creado ${ruta}`);
    console.log('  Siguiente paso: npm run validate -- --changed');
    return 0;
  } finally {
    rl.close();
  }
}

async function preguntarTipo(
  rl: ReturnType<typeof createInterface>,
  tipos: TipoRecursoT[],
): Promise<string> {
  console.log('Tipos disponibles:');
  for (const tipo of tipos) console.log(`  ${tipo.id.padEnd(26)} ${tipo.etiqueta}`);
  return (await rl.question('\nTipo: ')).trim();
}

main()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((cause: unknown) => {
    console.error('✗ No se pudo crear el recurso:', cause);
    process.exitCode = 1;
  });
