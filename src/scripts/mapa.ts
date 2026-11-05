import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import type { RecursoVista } from '../lib/vista';
import { esDesactualizado, formatearAbsoluta, formatearRelativa } from '../lib/tiempo';

/**
 * Isla del mapa. TypeScript vanilla: sin framework, sin HTML dinámico
 * construido con texto del contenido (todo va por textContent).
 */

interface ZonaGeoVista {
  id: string;
  nombre: string;
  tipo: string;
  etiqueta: string;
  color: string;
  geometria: { tipo: 'punto' | 'linea' | 'poligono'; coordenadas: Array<[number, number]> };
  detalles: Array<{ clave: string; valor: string | number | boolean }>;
}

interface DatosMapa {
  centro: { lat: number; lng: number; zoom: number };
  teselas: { url: string; atribucion: string; maxZoom: number };
  umbralHoras: number;
  recursos: RecursoVista[];
  zonasGeo: ZonaGeoVista[];
}

function leerDatos(): DatosMapa | null {
  const nodo = document.getElementById('datos-mapa');
  if (nodo === null || nodo.textContent === null) return null;
  try {
    return JSON.parse(nodo.textContent) as DatosMapa;
  } catch {
    return null;
  }
}

function crear<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  texto?: string,
  clase?: string,
): HTMLElementTagNameMap[K] {
  const nodo = document.createElement(etiqueta);
  if (texto !== undefined) nodo.textContent = texto;
  if (clase !== undefined) nodo.className = clase;
  return nodo;
}

function iniciarMapa(contenedor: HTMLElement, datos: DatosMapa): void {
  const mapa = L.map(contenedor, {
    center: [datos.centro.lat, datos.centro.lng],
    zoom: datos.centro.zoom,
    zoomControl: false,
    keyboard: true,
    scrollWheelZoom: false,
  });

  L.control.zoom({ zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(mapa);

  L.tileLayer(datos.teselas.url, {
    maxZoom: datos.teselas.maxZoom,
    attribution: datos.teselas.atribucion,
  }).addTo(mapa);

  const cluster = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 52,
    chunkedLoading: true,
    iconCreateFunction: (grupo) => {
      const cantidad = grupo.getChildCount();
      const tamano = cantidad < 10 ? 'small' : cantidad < 100 ? 'medium' : 'large';
      const caja = crear('div', undefined, `marker-cluster marker-cluster-${tamano}`);
      caja.setAttribute('role', 'button');
      caja.tabIndex = 0;
      caja.setAttribute('aria-label', `${cantidad} recursos en este sector. Activar para ampliar.`);
      const interior = crear('div');
      interior.append(crear('span', String(cantidad)));
      caja.append(interior);
      caja.addEventListener('keydown', (evento) => {
        if (evento.key !== 'Enter' && evento.key !== ' ') return;
        evento.preventDefault();
        grupo.zoomToBounds({ padding: [24, 24] });
      });
      return L.divIcon({
        html: caja,
        className: 'marcador-cluster-envoltorio',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
    },
  });
  const grupoTrazos = L.layerGroup().addTo(mapa);
  const grupoPuntosTraslado = L.layerGroup().addTo(mapa);
  const grupoZonas = L.layerGroup().addTo(mapa);

  const marcadores = new Map<string, L.Marker>();
  const recursos = new Map(datos.recursos.map((recurso) => [recurso.id, recurso]));

  const icono = (recurso: RecursoVista, variante: 'actual' | 'anterior' | 'futuro'): L.DivIcon => {
    const caja = crear('div', undefined, `marcador marcador--${recurso.tipo.forma}`);
    if (variante === 'anterior') caja.classList.add('marcador--anterior');
    if (variante === 'futuro') caja.classList.add('marcador--futuro');
    caja.style.background = recurso.tipo.color;
    const simbolo = crear('span', recurso.tipo.simbolo);
    caja.append(simbolo);
    return L.divIcon({
      html: caja,
      className: 'marcador-envoltorio',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  };

  for (const recurso of datos.recursos) {
    const marcador = L.marker([recurso.ubicacion.lat, recurso.ubicacion.lng], {
      icon: icono(recurso, 'actual'),
      keyboard: true,
      title: `${recurso.nombre} — ${recurso.estadoTexto}`,
      riseOnHover: true,
    });

    marcador.on('add', () => {
      const elemento = marcador.getElement();
      if (elemento != null) {
        elemento.setAttribute(
          'aria-label',
          `${recurso.nombre}. ${recurso.tipo.etiqueta}. ${recurso.estadoTexto}. Abrir ficha.`,
        );
      }
    });

    marcador.on('click', () => abrirFicha(recurso));
    marcadores.set(recurso.id, marcador);

    if (recurso.anterior !== undefined) {
      L.marker([recurso.anterior.lat, recurso.anterior.lng], {
        icon: icono(recurso, 'anterior'),
        keyboard: false,
        interactive: false,
        title: `Ubicación anterior de ${recurso.nombre}`,
      }).addTo(grupoPuntosTraslado);
    }

    if (recurso.futura !== undefined) {
      const futura = recurso.futura;
      const contenido = crear('div');
      contenido.append(crear('strong', futura.etiqueta));
      contenido.append(crear('div', `${recurso.nombre} hacia ${futura.nombre}`));
      if (futura.fecha !== undefined) {
        contenido.append(crear('div', formatearAbsoluta(futura.fecha), 'frescura'));
      }
      L.marker([futura.lat, futura.lng], {
        icon: icono(recurso, 'futuro'),
        keyboard: false,
        title: `${futura.etiqueta}: ${recurso.nombre}`,
      })
        .bindTooltip(contenido, { direction: 'top' })
        .addTo(grupoPuntosTraslado);
    }
  }

  const dibujarTrazos = (visibles: Set<string>): void => {
    grupoTrazos.clearLayers();
    for (const recurso of datos.recursos) {
      if (!visibles.has(recurso.id)) continue;
      if (recurso.lineas.historica !== undefined) {
        const [inicio, fin] = recurso.lineas.historica;
        L.polyline(
          [
            [inicio.lat, inicio.lng],
            [fin.lat, fin.lng],
          ],
          { color: '#6b7280', weight: 3, opacity: 0.7 },
        ).addTo(grupoTrazos);
      }
      if (recurso.lineas.proyectada !== undefined) {
        const [inicio, fin] = recurso.lineas.proyectada;
        L.polyline(
          [
            [inicio.lat, inicio.lng],
            [fin.lat, fin.lng],
          ],
          {
            color: recurso.tipo.color,
            weight: 3,
            dashArray: '8 8',
            opacity: 0.9,
          },
        ).addTo(grupoTrazos);
      }
    }
  };

  // Zonas y rutas
  for (const zona of datos.zonasGeo) {
    const puntos = zona.geometria.coordenadas.map(([lng, lat]) => [lat, lng] as [number, number]);
    let capa: L.Layer;
    if (zona.geometria.tipo === 'poligono') {
      capa = L.polygon(puntos, {
        color: zona.color,
        weight: 2,
        fillOpacity: 0.18,
      });
    } else if (zona.geometria.tipo === 'linea') {
      capa = L.polyline(puntos, { color: zona.color, weight: 4, dashArray: '4 6' });
    } else {
      const primero = puntos[0];
      capa = L.circleMarker(primero ?? [datos.centro.lat, datos.centro.lng], {
        radius: 9,
        color: zona.color,
        fillOpacity: 0.35,
      });
    }

    const contenido = crear('div');
    contenido.append(crear('strong', zona.nombre));
    contenido.append(crear('div', zona.etiqueta));
    for (const detalle of zona.detalles) {
      contenido.append(crear('div', `${detalle.clave}: ${String(detalle.valor)}`));
    }
    capa.bindTooltip(contenido, { sticky: true });
    capa.addTo(grupoZonas);
  }

  // Ficha
  const dialogo = document.getElementById('ficha-mapa');
  const cuerpo = document.getElementById('ficha-mapa-cuerpo');
  const tituloFicha = document.getElementById('ficha-mapa-titulo');
  let ultimoDisparador: HTMLElement | null = null;

  const abrirFicha = (recurso: RecursoVista): void => {
    if (!(dialogo instanceof HTMLDialogElement) || cuerpo === null) return;
    if (tituloFicha !== null) tituloFicha.textContent = recurso.nombre;
    cuerpo.replaceChildren(...construirFicha(recurso));
    const elemento = marcadores.get(recurso.id)?.getElement() ?? null;
    ultimoDisparador = elemento;
    dialogo.showModal();
    const url = new URL(window.location.href);
    url.searchParams.set('recurso', recurso.id);
    window.history.replaceState(null, '', url);
  };

  if (dialogo instanceof HTMLDialogElement) {
    dialogo.addEventListener('close', () => {
      if (ultimoDisparador?.isConnected === true) {
        ultimoDisparador.focus();
      } else {
        document.getElementById('alternar-filtros')?.focus();
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('recurso');
      window.history.replaceState(null, '', url);
    });
    dialogo.querySelector('[data-cerrar-ficha]')?.addEventListener('click', () => dialogo.close());
  }

  function construirFicha(recurso: RecursoVista): HTMLElement[] {
    const nodos: HTMLElement[] = [];

    const encabezado = crear('div');
    const tipo = crear('p', `${recurso.tipo.etiqueta} · ${recurso.institucion}`, 'frescura');
    encabezado.append(tipo);

    const estado = crear('p');
    const badge = crear(
      'span',
      `${recurso.estadoTexto}`,
      `badge badge--${recurso.tono === 'ok' ? 'ok' : recurso.tono === 'falla' ? 'falla' : recurso.tono === 'alerta' ? 'alerta' : 'neutral'}`,
    );
    estado.append(badge);
    encabezado.append(estado);

    const frescura = crear('p', undefined, 'frescura');
    frescura.dataset['fecha'] = recurso.frescura.fecha;
    frescura.dataset['umbral'] = String(datos.umbralHoras);
    const textoFrescura = crear('span', `Actualizado ${formatearRelativa(recurso.frescura.fecha)}`);
    textoFrescura.dataset['frescuraTexto'] = '';
    frescura.append(textoFrescura);
    const hora = crear('time', ` · ${recurso.frescura.absoluta}`);
    hora.dateTime = recurso.frescura.fecha;
    frescura.append(hora);
    encabezado.append(frescura);

    if (esDesactualizado(recurso.frescura.fecha, datos.umbralHoras)) {
      frescura.classList.add('frescura--vencida');
      const aviso = crear('div', undefined, 'aviso aviso--critico');
      aviso.append(crear('p', 'Información desactualizada'));
      aviso.append(
        crear(
          'p',
          `El último dato tiene más de ${datos.umbralHoras} horas. Confirma antes de desplazarte.`,
        ),
      );
      encabezado.append(aviso);
    }

    if (recurso.descripcion !== '') {
      encabezado.append(crear('p', recurso.descripcion));
    }
    nodos.push(encabezado);

    // Ubicación
    const ubicacion = crear('section', undefined, 'ficha__seccion');
    ubicacion.append(crear('h3', 'Ubicación actual'));
    ubicacion.append(crear('p', recurso.ubicacion.nombre));
    const coord = crear(
      'p',
      `Coordenadas: ${recurso.ubicacion.lat.toFixed(5)}, ${recurso.ubicacion.lng.toFixed(5)}`,
      'ficha__coordenadas',
    );
    ubicacion.append(coord);

    const acciones = crear('div', undefined, 'ficha__acciones');
    const maps = crear('a', 'Cómo llegar en Google Maps', 'boton boton--grande');
    maps.href = recurso.gmaps;
    maps.target = '_blank';
    maps.rel = 'noopener noreferrer';
    acciones.append(maps);

    const copiar = crear('button', 'Copiar coordenadas', 'boton boton--secundario');
    copiar.type = 'button';
    copiar.addEventListener('click', () => {
      const texto = `${recurso.ubicacion.lat}, ${recurso.ubicacion.lng}`;
      navigator.clipboard
        .writeText(texto)
        .then(() => {
          copiar.textContent = 'Coordenadas copiadas';
        })
        .catch(() => {
          copiar.textContent = texto;
        });
    });
    acciones.append(copiar);
    ubicacion.append(acciones);
    nodos.push(ubicacion);

    // Traslados
    if (
      recurso.anterior !== undefined ||
      recurso.futura !== undefined ||
      recurso.lineas.historica !== undefined
    ) {
      const traslados = crear('section', undefined, 'ficha__seccion');
      traslados.append(crear('h3', 'Traslados'));
      const lista = crear('ul', undefined, 'traslados');

      if (recurso.anterior !== undefined) {
        const item = crear('li', undefined, 'traslado');
        item.append(crear('span', 'Ubicación anterior', 'traslado__etiqueta'));
        item.append(crear('div', recurso.anterior.nombre));
        lista.append(item);
      }

      const actual = crear('li', undefined, 'traslado traslado--actual');
      actual.append(crear('span', 'Ubicación actual', 'traslado__etiqueta'));
      actual.append(crear('div', recurso.ubicacion.nombre));
      lista.append(actual);

      if (recurso.futura !== undefined) {
        const futura = recurso.futura;
        const item = crear('li', undefined, 'traslado');
        item.append(crear('span', futura.etiqueta, 'traslado__etiqueta'));
        item.append(crear('div', futura.nombre));
        if (futura.fecha !== undefined) {
          item.append(crear('div', `Estimado: ${formatearAbsoluta(futura.fecha)}`, 'frescura'));
        }
        if (futura.motivo !== '') item.append(crear('div', futura.motivo, 'frescura'));
        lista.append(item);
      }

      traslados.append(lista);
      nodos.push(traslados);
    }

    // Detalles
    if (recurso.detalles.length > 0) {
      const detalles = crear('section', undefined, 'ficha__seccion');
      detalles.append(crear('h3', 'Datos del recurso'));
      const dl = crear('dl', undefined, 'detalles');
      for (const detalle of recurso.detalles) {
        dl.append(crear('dt', detalle.etiqueta));
        dl.append(
          crear(
            'dd',
            detalle.unidad === undefined ? detalle.valor : `${detalle.valor} ${detalle.unidad}`,
          ),
        );
      }
      detalles.append(dl);
      nodos.push(detalles);
    }

    // Alertas
    if (recurso.alertas.length > 0) {
      const alertas = crear('section', undefined, 'ficha__seccion');
      alertas.append(crear('h3', 'Alertas vigentes'));
      for (const alerta of recurso.alertas) {
        const aviso = crear(
          'div',
          undefined,
          `aviso ${alerta.severidad === 'critica' ? 'aviso--critico' : alerta.severidad === 'precaucion' ? '' : 'aviso--info'}`,
        );
        const titulo = crear(
          'p',
          `${alerta.severidad === 'critica' ? 'Crítica' : alerta.severidad === 'precaucion' ? 'Precaución' : 'Información'}: ${alerta.texto}`,
        );
        aviso.append(titulo);
        aviso.append(crear('p', alerta.absoluta, 'frescura'));
        alertas.append(aviso);
      }
      nodos.push(alertas);
    }

    // Historial
    if (recurso.historial.length > 0) {
      const historial = crear('section', undefined, 'ficha__seccion');
      historial.append(crear('h3', 'Historial de estado'));
      const lista = crear('ol', undefined, 'linea-tiempo');
      for (const [indice, evento] of recurso.historial.entries()) {
        const item = crear(
          'li',
          undefined,
          `linea-tiempo__evento${indice === 0 ? ' linea-tiempo__evento--actual' : ''}`,
        );
        const tituloEvento = crear('strong', evento.estadoTexto);
        if (evento.corregido) tituloEvento.classList.add('correccion');
        item.append(tituloEvento);
        item.append(crear('div', `${evento.absoluta} · ${evento.autor}`, 'linea-tiempo__fecha'));
        if (evento.nota !== undefined) item.append(crear('p', evento.nota, 'linea-tiempo__nota'));
        lista.append(item);
      }
      historial.append(lista);
      nodos.push(historial);
    }

    // Observaciones
    if (recurso.observaciones.length > 0) {
      const observaciones = crear('section', undefined, 'ficha__seccion');
      observaciones.append(crear('h3', 'Observaciones'));
      for (const observacion of recurso.observaciones) {
        const bloque = crear('div');
        bloque.append(crear('p', observacion.texto));
        bloque.append(crear('p', `${observacion.absoluta} · ${observacion.autor}`, 'frescura'));
        observaciones.append(bloque);
      }
      nodos.push(observaciones);
    }

    if (recurso.correcciones.length > 0) {
      const correcciones = crear('section', undefined, 'ficha__seccion');
      correcciones.append(crear('h3', 'Correcciones'));
      for (const correccion of recurso.correcciones) {
        const bloque = crear('div');
        bloque.append(crear('p', correccion.nota));
        bloque.append(crear('p', `${correccion.absoluta} · ${correccion.autor}`, 'frescura'));
        correcciones.append(bloque);
      }
      nodos.push(correcciones);
    }

    const enlace = crear('a', 'Abrir ficha completa', 'boton boton--secundario');
    enlace.href = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/recurso/${recurso.id}/`;
    const pie = crear('section', undefined, 'ficha__seccion');
    pie.append(enlace);
    nodos.push(pie);

    return nodos;
  }

  // Filtros
  const busqueda = document.getElementById('busqueda');
  const filtroEstado = document.getElementById('filtro-estado');
  const filtroZona = document.getElementById('filtro-zona');
  const mostrarTraslados = document.getElementById('mostrar-traslados');
  const mostrarZonas = document.getElementById('mostrar-zonas');
  const resultado = document.getElementById('resultado-mapa');
  const panel = document.getElementById('panel-filtros');
  const botonFiltros = document.getElementById('alternar-filtros');
  const limpiar = document.getElementById('limpiar-filtros');

  const aplicar = (): void => {
    const texto = busqueda instanceof HTMLInputElement ? busqueda.value.trim().toLowerCase() : '';
    const estado = filtroEstado instanceof HTMLSelectElement ? filtroEstado.value : '';
    const zona = filtroZona instanceof HTMLSelectElement ? filtroZona.value : '';
    const tiposMarcados = new Set(
      [...document.querySelectorAll<HTMLInputElement>('input[name="tipo"]:checked')].map(
        (input) => input.value,
      ),
    );

    const visibles = new Set<string>();
    cluster.clearLayers();

    for (const recurso of datos.recursos) {
      const coincideTexto =
        texto === '' ||
        `${recurso.nombre} ${recurso.tipo.etiqueta} ${recurso.ubicacion.nombre} ${recurso.id}`
          .toLowerCase()
          .includes(texto);
      const coincideEstado = estado === '' || recurso.estado === estado;
      const coincideZona = zona === '' || recurso.zona === zona;
      const coincideTipo = tiposMarcados.size === 0 || tiposMarcados.has(recurso.tipo.id);
      if (!coincideTexto || !coincideEstado || !coincideZona || !coincideTipo) continue;

      const marcador = marcadores.get(recurso.id);
      if (marcador !== undefined) cluster.addLayer(marcador);
      visibles.add(recurso.id);
    }

    const muestraTraslados =
      mostrarTraslados instanceof HTMLInputElement && mostrarTraslados.checked;
    dibujarTrazos(muestraTraslados ? visibles : new Set());
    if (muestraTraslados) {
      if (!mapa.hasLayer(grupoPuntosTraslado)) mapa.addLayer(grupoPuntosTraslado);
    } else {
      mapa.removeLayer(grupoPuntosTraslado);
    }

    const muestraZonas = mostrarZonas instanceof HTMLInputElement && mostrarZonas.checked;
    if (muestraZonas) {
      if (!mapa.hasLayer(grupoZonas)) mapa.addLayer(grupoZonas);
    } else {
      mapa.removeLayer(grupoZonas);
    }

    if (resultado !== null) {
      resultado.textContent = visibles.size === 1 ? '1 recurso' : `${visibles.size} recursos`;
      if (visibles.size === 0) resultado.textContent = 'Ningún recurso coincide con los filtros';
    }
  };

  const controles: Array<Element | null> = [busqueda, filtroEstado, filtroZona, mostrarTraslados];
  for (const control of controles) {
    control?.addEventListener('input', aplicar);
    control?.addEventListener('change', aplicar);
  }
  mostrarZonas?.addEventListener('change', aplicar);

  limpiar?.addEventListener('click', () => {
    if (busqueda instanceof HTMLInputElement) busqueda.value = '';
    if (filtroEstado instanceof HTMLSelectElement) filtroEstado.value = '';
    if (filtroZona instanceof HTMLSelectElement) filtroZona.value = '';
    for (const input of document.querySelectorAll<HTMLInputElement>('input[name="tipo"]')) {
      input.checked = true;
    }
    if (mostrarTraslados instanceof HTMLInputElement) mostrarTraslados.checked = true;
    if (mostrarZonas instanceof HTMLInputElement) mostrarZonas.checked = true;
    aplicar();
  });

  botonFiltros?.addEventListener('click', () => {
    if (!(panel instanceof HTMLElement)) return;
    const expandido = panel.hasAttribute('hidden');
    if (expandido) {
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', '');
    }
    botonFiltros.setAttribute('aria-expanded', String(expandido));
    mapa.invalidateSize();
  });

  mapa.addLayer(cluster);
  aplicar();

  const parametros = new URLSearchParams(window.location.search);
  const solicitado = parametros.get('recurso');
  if (solicitado !== null) {
    const recurso = recursos.get(solicitado);
    if (recurso !== undefined) {
      abrirFicha(recurso);
    }
  }

  if (datos.recursos.length > 0) {
    const puntos = datos.recursos.map(
      (recurso) => [recurso.ubicacion.lat, recurso.ubicacion.lng] as [number, number],
    );
    mapa.fitBounds(L.latLngBounds(puntos).pad(0.15), { maxZoom: datos.centro.zoom });
  }
}

const contenedor = document.getElementById('mapa');
if (contenedor !== null) {
  const datos = leerDatos();
  if (datos !== null) iniciarMapa(contenedor, datos);
}
