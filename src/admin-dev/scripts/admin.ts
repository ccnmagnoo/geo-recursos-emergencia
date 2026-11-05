/** Comportamiento del panel local. Solo se carga en /admin (dev). */

interface CampoDetalle {
  clave: string;
  etiqueta: string;
  tipo: string;
  requerido: boolean;
  unidad: string;
  opciones: string[];
  min: number | null;
  max: number | null;
}

interface TipoDetalle {
  id: string;
  etiqueta: string;
  campos: CampoDetalle[];
}

interface Issue {
  severity: string;
  message: string;
  ruta: string;
  linea?: number;
}

function panelEstado(): HTMLElement | null {
  return document.getElementById('estado-panel');
}

function mostrarEstado(texto: string, tono: 'info' | 'error' | 'ok' = 'info'): void {
  const panel = panelEstado();
  if (panel === null) return;
  panel.hidden = false;
  panel.textContent = texto;
  panel.className = `aviso ${tono === 'error' ? 'aviso--critico' : 'aviso--info'}`;
}

function mostrarIssues(titulo: string, issues: Issue[]): void {
  const panel = panelEstado();
  if (panel === null) return;
  panel.hidden = false;
  panel.className = 'aviso aviso--info';
  panel.replaceChildren();

  const encabezado = document.createElement('p');
  encabezado.textContent = titulo;
  panel.append(encabezado);

  if (issues.length === 0) {
    const ok = document.createElement('p');
    ok.textContent = 'Sin problemas.';
    panel.append(ok);
    return;
  }

  const lista = document.createElement('ul');
  for (const issue of issues) {
    const item = document.createElement('li');
    const ubicacion = issue.linea === undefined ? issue.ruta : `${issue.ruta}:${issue.linea}`;
    item.textContent = `${ubicacion} — ${issue.message}`;
    lista.append(item);
  }
  panel.append(lista);
}

function leerTipos(): TipoDetalle[] {
  const nodo = document.getElementById('datos-tipos');
  if (nodo === null || nodo.textContent === null) return [];
  try {
    return JSON.parse(nodo.textContent) as TipoDetalle[];
  } catch {
    return [];
  }
}

function crearCampoDetalle(campo: CampoDetalle): HTMLElement {
  const contenedor = document.createElement('div');
  contenedor.className = 'campo';

  const id = `detalle-${campo.clave}`;
  const etiqueta = document.createElement('label');
  etiqueta.htmlFor = id;
  etiqueta.textContent = `${campo.etiqueta}${campo.unidad === '' ? '' : ` (${campo.unidad})`}${
    campo.requerido ? ' *' : ''
  }`;
  contenedor.append(etiqueta);

  let control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  if (campo.tipo === 'opcion') {
    const select = document.createElement('select');
    const vacio = document.createElement('option');
    vacio.value = '';
    vacio.textContent = '—';
    select.append(vacio);
    for (const opcion of campo.opciones) {
      const item = document.createElement('option');
      item.value = opcion;
      item.textContent = opcion;
      select.append(item);
    }
    control = select;
  } else if (campo.tipo === 'booleano') {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = 'true';
    control = input;
  } else if (campo.tipo === 'entero' || campo.tipo === 'decimal') {
    const input = document.createElement('input');
    input.type = 'number';
    input.step = campo.tipo === 'entero' ? '1' : 'any';
    if (campo.min !== null) input.min = String(campo.min);
    if (campo.max !== null) input.max = String(campo.max);
    control = input;
  } else if (campo.tipo === 'fecha_hora') {
    const input = document.createElement('input');
    input.type = 'datetime-local';
    control = input;
  } else {
    const input = document.createElement('input');
    input.type = 'text';
    control = input;
  }

  control.id = id;
  control.name = `detalles.${campo.clave}`;
  if (campo.requerido && campo.tipo !== 'booleano') control.required = true;
  contenedor.append(control);
  return contenedor;
}

function renderizarDetalles(): void {
  const select = document.getElementById('nuevo-tipo');
  const contenedor = document.getElementById('detalles-nuevo');
  if (!(select instanceof HTMLSelectElement) || contenedor === null) return;

  const tipos = leerTipos();
  const tipo = tipos.find((candidato) => candidato.id === select.value);
  contenedor.replaceChildren();
  if (tipo === undefined) return;

  for (const campo of tipo.campos) {
    contenedor.append(crearCampoDetalle(campo));
  }
}

function formularioAObjeto(formulario: HTMLFormElement): Record<string, unknown> {
  const datos: Record<string, unknown> = {};
  const detalles: Record<string, string> = {};

  for (const [clave, valor] of new FormData(formulario).entries()) {
    if (typeof valor !== 'string') continue;
    if (clave.startsWith('detalles.')) {
      detalles[clave.slice('detalles.'.length)] = valor;
      continue;
    }
    datos[clave] = valor;
  }

  datos['detalles'] = detalles;
  return datos;
}

async function enviar(formulario: HTMLFormElement): Promise<void> {
  const endpoint = formulario.dataset['endpoint'];
  if (endpoint === undefined) return;

  const boton = formulario.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (boton !== null) boton.disabled = true;
  mostrarEstado('Guardando…');

  try {
    const respuesta = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formularioAObjeto(formulario)),
    });
    const datos = (await respuesta.json()) as {
      ok?: boolean;
      error?: string;
      issues?: Issue[];
      salida?: string;
    };

    if (!respuesta.ok || datos.ok !== true) {
      mostrarEstado(datos.error ?? 'No se pudo guardar.', 'error');
      if (datos.issues !== undefined) {
        mostrarIssues(datos.error ?? 'Revisa estos problemas:', datos.issues);
      }
      return;
    }

    mostrarEstado('Guardado. Recargando…');
    if (datos.salida !== undefined) mostrarEstado(datos.salida);
    if (formulario.dataset['recargar'] === 'true') {
      window.setTimeout(() => window.location.reload(), 500);
    }
  } catch {
    mostrarEstado('Error de red al guardar. Revisa la consola del servidor.', 'error');
  } finally {
    if (boton !== null) boton.disabled = false;
  }
}

async function resolverGmaps(): Promise<void> {
  const link = document.getElementById('nuevo-link');
  const lat = document.getElementById('nuevo-lat');
  const lng = document.getElementById('nuevo-lng');
  if (!(link instanceof HTMLInputElement)) return;
  if (!(lat instanceof HTMLInputElement) || !(lng instanceof HTMLInputElement)) return;

  mostrarEstado('Resolviendo link…');
  try {
    const respuesta = await fetch('/api/admin/gmaps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: link.value }),
    });
    const datos = (await respuesta.json()) as {
      ok?: boolean;
      error?: string;
      coordenadas?: { lat: number; lng: number; fuente: string };
      urlFinal?: string;
    };

    if (datos.ok !== true || datos.coordenadas === undefined) {
      mostrarEstado(datos.error ?? 'No se pudo extraer la ubicación.', 'error');
      return;
    }

    lat.value = String(datos.coordenadas.lat);
    lng.value = String(datos.coordenadas.lng);
    if (datos.urlFinal !== undefined) link.value = datos.urlFinal;
    mostrarEstado(
      `Coordenadas obtenidas (${datos.coordenadas.fuente}). Revisa que el pin sea el correcto.`,
    );
  } catch {
    mostrarEstado('Error de red al resolver el link.', 'error');
  }
}

async function validar(): Promise<void> {
  mostrarEstado('Validando contenido…');
  try {
    const respuesta = await fetch('/api/admin/validar');
    const datos = (await respuesta.json()) as {
      ok?: boolean;
      resumen?: Record<string, number>;
      issues?: Issue[];
    };
    const resumen = datos.resumen;
    const titulo =
      resumen === undefined
        ? 'Resultado de validación'
        : `${resumen['recursos']} recursos · ${resumen['tipos']} tipos · ${resumen['errores']} errores · ${resumen['avisos']} avisos`;
    mostrarIssues(titulo, datos.issues ?? []);
  } catch {
    mostrarEstado('Error de red al validar.', 'error');
  }
}

async function respaldar(): Promise<void> {
  mostrarEstado('Creando respaldo de /content…');
  try {
    const respuesta = await fetch('/api/admin/respaldo', { method: 'POST' });
    const datos = (await respuesta.json()) as { ok?: boolean; salida?: string; error?: string };
    mostrarEstado(
      datos.ok === true
        ? (datos.salida ?? 'Respaldo creado.')
        : (datos.error ?? 'Falló el respaldo.'),
      datos.ok === true ? 'ok' : 'error',
    );
  } catch {
    mostrarEstado('Error de red al crear el respaldo.', 'error');
  }
}

async function deshacer(id: string): Promise<void> {
  mostrarEstado(`Restaurando el último respaldo de ${id}…`);
  try {
    const respuesta = await fetch('/api/admin/accion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, accion: 'deshacer' }),
    });
    const datos = (await respuesta.json()) as { ok?: boolean; error?: string; issues?: Issue[] };
    if (datos.ok !== true) {
      mostrarEstado(datos.error ?? 'No se pudo deshacer.', 'error');
      return;
    }
    mostrarEstado('Restaurado. Recargando…');
    window.setTimeout(() => window.location.reload(), 500);
  } catch {
    mostrarEstado('Error de red al deshacer.', 'error');
  }
}

document.addEventListener('submit', (evento) => {
  const formulario = evento.target;
  if (!(formulario instanceof HTMLFormElement)) return;
  if (formulario.dataset['endpoint'] === undefined) return;
  evento.preventDefault();
  void enviar(formulario);
});

document.addEventListener('click', (evento) => {
  const objetivo = evento.target;
  if (!(objetivo instanceof HTMLElement)) return;

  if (objetivo.closest('[data-resolver-gmaps]') !== null) {
    void resolverGmaps();
    return;
  }
  if (objetivo.closest('[data-validar]') !== null) {
    void validar();
    return;
  }
  if (objetivo.closest('[data-respaldo]') !== null) {
    void respaldar();
    return;
  }
  const deshacerBoton = objetivo.closest<HTMLElement>('[data-deshacer]');
  if (deshacerBoton !== null) {
    const id = deshacerBoton.dataset['deshacer'];
    if (id !== undefined) void deshacer(id);
  }
});

const selectorTipo = document.getElementById('nuevo-tipo');
if (selectorTipo instanceof HTMLSelectElement) {
  selectorTipo.addEventListener('change', renderizarDetalles);
  renderizarDetalles();
}
