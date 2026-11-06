// Generado desde lucide-static v1.69.0 (ISC) + iconos propios.
// Los trazos son datos estáticos: no se construyen desde TOML.

export type IconoTag = 'path' | 'circle' | 'line' | 'rect' | 'polyline' | 'ellipse';

export interface IconoElemento {
  tag: IconoTag;
  attrs: Record<string, string>;
}

export const ICONOS = {
  punto: [{ tag: 'circle', attrs: { cx: '12', cy: '12', r: '3' } }],
  grua: [
    { tag: 'path', attrs: { d: 'M5 21h6' } },
    { tag: 'path', attrs: { d: 'M8 21V3' } },
    { tag: 'path', attrs: { d: 'M8 3h11' } },
    { tag: 'path', attrs: { d: 'M19 3v4' } },
    { tag: 'path', attrs: { d: 'M19 10v2' } },
    { tag: 'path', attrs: { d: 'M17 12h4' } },
  ],
  torre: [
    { tag: 'path', attrs: { d: 'M12 9v12' } },
    { tag: 'path', attrs: { d: 'M8 21h8' } },
    { tag: 'path', attrs: { d: 'M7 4h10l-1.5 4h-7z' } },
    { tag: 'path', attrs: { d: 'M12 1.5V3' } },
    { tag: 'path', attrs: { d: 'M5.5 2.5 6.7 3.8' } },
    { tag: 'path', attrs: { d: 'M18.5 2.5 17.3 3.8' } },
  ],
  generador: [
    {
      tag: 'path',
      attrs: {
        d: 'M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z',
      },
    },
  ],
  bano: [
    {
      tag: 'path',
      attrs: {
        d: 'M7 12h13a1 1 0 0 1 1 1 5 5 0 0 1-5 5h-.598a.5.5 0 0 0-.424.765l1.544 2.47a.5.5 0 0 1-.424.765H5.402a.5.5 0 0 1-.424-.765L7 18',
      },
    },
    { tag: 'path', attrs: { d: 'M8 18a5 5 0 0 1-5-5V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8' } },
  ],
  ducha: [
    { tag: 'path', attrs: { d: 'm4 4 2.5 2.5' } },
    { tag: 'path', attrs: { d: 'M13.5 6.5a4.95 4.95 0 0 0-7 7' } },
    { tag: 'path', attrs: { d: 'M15 5 5 15' } },
    { tag: 'path', attrs: { d: 'M14 17v.01' } },
    { tag: 'path', attrs: { d: 'M10 16v.01' } },
    { tag: 'path', attrs: { d: 'M13 13v.01' } },
    { tag: 'path', attrs: { d: 'M16 10v.01' } },
    { tag: 'path', attrs: { d: 'M11 20v.01' } },
    { tag: 'path', attrs: { d: 'M17 14v.01' } },
    { tag: 'path', attrs: { d: 'M20 11v.01' } },
  ],
  estanque: [
    { tag: 'rect', attrs: { x: '4', y: '5', width: '16', height: '15', rx: '3' } },
    { tag: 'path', attrs: { d: 'M4 10h16' } },
    {
      tag: 'path',
      attrs: { d: 'M12 12.5c1.4 1.8 2.3 2.8 2.3 3.9a2.3 2.3 0 0 1-4.6 0c0-1.1.9-2.1 2.3-3.9z' },
    },
  ],
  camion: [
    { tag: 'path', attrs: { d: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2' } },
    { tag: 'path', attrs: { d: 'M15 18H9' } },
    {
      tag: 'path',
      attrs: {
        d: 'M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14',
      },
    },
    { tag: 'circle', attrs: { cx: '17', cy: '18', r: '2' } },
    { tag: 'circle', attrs: { cx: '7', cy: '18', r: '2' } },
  ],
  cocina: [
    { tag: 'path', attrs: { d: 'M2 12h20' } },
    { tag: 'path', attrs: { d: 'M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8' } },
    { tag: 'path', attrs: { d: 'm4 8 16-4' } },
    {
      tag: 'path',
      attrs: { d: 'm8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8' },
    },
  ],
  medico_movil: [
    { tag: 'path', attrs: { d: 'M12 11v4' } },
    { tag: 'path', attrs: { d: 'M14 13h-4' } },
    { tag: 'path', attrs: { d: 'M16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2' } },
    { tag: 'path', attrs: { d: 'M18 6v14' } },
    { tag: 'path', attrs: { d: 'M6 6v14' } },
    { tag: 'rect', attrs: { width: '20', height: '14', x: '2', y: '6', rx: '2' } },
  ],
  ambulancia: [
    { tag: 'path', attrs: { d: 'M10 10H6' } },
    { tag: 'path', attrs: { d: 'M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2' } },
    {
      tag: 'path',
      attrs: {
        d: 'M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14',
      },
    },
    { tag: 'path', attrs: { d: 'M8 8v4' } },
    { tag: 'path', attrs: { d: 'M9 18h6' } },
    { tag: 'circle', attrs: { cx: '17', cy: '18', r: '2' } },
    { tag: 'circle', attrs: { cx: '7', cy: '18', r: '2' } },
  ],
  antena: [
    { tag: 'path', attrs: { d: 'M4.9 16.1C1 12.2 1 5.8 4.9 1.9' } },
    { tag: 'path', attrs: { d: 'M7.8 4.7a6.14 6.14 0 0 0-.8 7.5' } },
    { tag: 'circle', attrs: { cx: '12', cy: '9', r: '2' } },
    { tag: 'path', attrs: { d: 'M16.2 4.8c2 2 2.26 5.11.8 7.47' } },
    { tag: 'path', attrs: { d: 'M19.1 1.9a9.96 9.96 0 0 1 0 14.1' } },
    { tag: 'path', attrs: { d: 'M9.5 18h5' } },
    { tag: 'path', attrs: { d: 'm8 22 4-11 4 11' } },
  ],
  carga: [
    { tag: 'path', attrs: { d: 'm11 7-3 5h4l-3 5' } },
    { tag: 'path', attrs: { d: 'M14.856 6H16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.935' } },
    { tag: 'path', attrs: { d: 'M22 14v-4' } },
    { tag: 'path', attrs: { d: 'M5.14 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2.936' } },
  ],
  agua: [
    {
      tag: 'path',
      attrs: {
        d: 'M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79z',
      },
    },
    { tag: 'path', attrs: { d: 'M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0' } },
  ],
  banos: [
    { tag: 'path', attrs: { d: 'M10 4 8 6' } },
    { tag: 'path', attrs: { d: 'M17 19v2' } },
    { tag: 'path', attrs: { d: 'M2 12h20' } },
    { tag: 'path', attrs: { d: 'M7 19v2' } },
    {
      tag: 'path',
      attrs: { d: 'M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5' },
    },
  ],
  comida: [
    {
      tag: 'path',
      attrs: {
        d: 'M11.248 3c.273.1.808.53.747 1.36-.05.83-.938 1.2-.989 2.02-.06.78.333 1.24.727 1.62',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M16.252 3c.268.1.794.53.745 1.36-.06.83-.923 1.2-.993 2.02-.05.78.338 1.24.725 1.62',
      },
    },
    { tag: 'path', attrs: { d: 'M19.5 12 22 6' } },
    {
      tag: 'path',
      attrs: { d: 'M4 12a1 1 0 00-.99 1.133A9 9 0 0012 21a9 9 0 008.99-7.867A1 1 0 0020 12z' },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M6.252 3c.268.1.794.53.745 1.36-.06.83-.923 1.2-.993 2.02-.05.78.338 1.24.735 1.62',
      },
    },
    { tag: 'path', attrs: { d: 'M7 21h10' } },
  ],
  medico: [
    { tag: 'path', attrs: { d: 'M11 2v2' } },
    { tag: 'path', attrs: { d: 'M5 2v2' } },
    { tag: 'path', attrs: { d: 'M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1' } },
    { tag: 'path', attrs: { d: 'M8 15a6 6 0 0 0 12 0v-3' } },
    { tag: 'circle', attrs: { cx: '20', cy: '10', r: '2' } },
  ],
  albergue: [
    { tag: 'path', attrs: { d: 'M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8' } },
    { tag: 'path', attrs: { d: 'M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4' } },
    { tag: 'path', attrs: { d: 'M12 4v6' } },
    { tag: 'path', attrs: { d: 'M2 18h20' } },
  ],
  acopio: [
    {
      tag: 'path',
      attrs: {
        d: 'M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z',
      },
    },
    { tag: 'path', attrs: { d: 'M12 22V12' } },
    { tag: 'polyline', attrs: { points: '3.29 7 12 12 20.71 7' } },
    { tag: 'path', attrs: { d: 'm7.5 4.27 9 5.15' } },
  ],
  seguro: [
    {
      tag: 'path',
      attrs: {
        d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
      },
    },
    { tag: 'path', attrs: { d: 'm9 12 2 2 4-4' } },
  ],
  info: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '10' } },
    { tag: 'path', attrs: { d: 'M12 16v-4' } },
    { tag: 'path', attrs: { d: 'M12 8h.01' } },
  ],
  veterinaria: [
    { tag: 'circle', attrs: { cx: '11', cy: '4', r: '2' } },
    { tag: 'circle', attrs: { cx: '18', cy: '8', r: '2' } },
    { tag: 'circle', attrs: { cx: '20', cy: '16', r: '2' } },
    {
      tag: 'path',
      attrs: {
        d: 'M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z',
      },
    },
  ],
  combustible: [
    {
      tag: 'path',
      attrs: { d: 'M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6.998a2 2 0 0 0-.59-1.42L18 5' },
    },
    { tag: 'path', attrs: { d: 'M14 21V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16' } },
    { tag: 'path', attrs: { d: 'M2 21h13' } },
    { tag: 'path', attrs: { d: 'M3 9h11' } },
  ],
  mando: [
    { tag: 'path', attrs: { d: 'M16.247 7.761a6 6 0 0 1 0 8.478' } },
    { tag: 'path', attrs: { d: 'M19.075 4.933a10 10 0 0 1 0 14.134' } },
    { tag: 'path', attrs: { d: 'M4.925 19.067a10 10 0 0 1 0-14.134' } },
    { tag: 'path', attrs: { d: 'M7.753 16.239a6 6 0 0 1 0-8.478' } },
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '2' } },
  ],
  helipuerto: [
    { tag: 'path', attrs: { d: 'M11 17v4' } },
    { tag: 'path', attrs: { d: 'M14 3v8a2 2 0 0 0 2 2h5.865' } },
    { tag: 'path', attrs: { d: 'M17 17v4' } },
    {
      tag: 'path',
      attrs: { d: 'M18 17a4 4 0 0 0 4-4 8 6 0 0 0-8-6 6 5 0 0 0-6 5v3a2 2 0 0 0 2 2z' },
    },
    { tag: 'path', attrs: { d: 'M2 10v5' } },
    { tag: 'path', attrs: { d: 'M6 3h16' } },
    { tag: 'path', attrs: { d: 'M7 21h14' } },
    { tag: 'path', attrs: { d: 'M8 13H2' } },
  ],
  ropa: [
    {
      tag: 'path',
      attrs: {
        d: 'M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z',
      },
    },
  ],
  ruta: [
    { tag: 'circle', attrs: { cx: '6', cy: '19', r: '3' } },
    { tag: 'path', attrs: { d: 'M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15' } },
    { tag: 'circle', attrs: { cx: '18', cy: '5', r: '3' } },
  ],
  corte: [
    { tag: 'path', attrs: { d: 'M16.05 10.966a5 2.5 0 0 1-8.1 0' } },
    {
      tag: 'path',
      attrs: {
        d: 'm16.923 14.049 4.48 2.04a1 1 0 0 1 .001 1.831l-8.574 3.9a2 2 0 0 1-1.66 0l-8.574-3.91a1 1 0 0 1 0-1.83l4.484-2.04',
      },
    },
    { tag: 'path', attrs: { d: 'M16.949 14.14a5 2.5 0 1 1-9.9 0L10.063 3.5a2 2 0 0 1 3.874 0z' } },
    { tag: 'path', attrs: { d: 'M9.194 6.57a5 2.5 0 0 0 5.61 0' } },
  ],
  riesgo: [
    {
      tag: 'path',
      attrs: { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' },
    },
    { tag: 'path', attrs: { d: 'M12 9v4' } },
    { tag: 'path', attrs: { d: 'M12 17h.01' } },
  ],
  requerimiento: [
    { tag: 'path', attrs: { d: 'M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14' } },
    {
      tag: 'path',
      attrs: {
        d: 'm7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9',
      },
    },
    { tag: 'path', attrs: { d: 'm2 13 6 6' } },
  ],
} satisfies Record<string, IconoElemento[]>;

export type IconoId = keyof typeof ICONOS;

export const ICONO_IDS = Object.keys(ICONOS) as IconoId[];
