import { expect, test } from '@playwright/test';

test.describe('vista pública', () => {
  test('la portada carga el mapa y el resumen del incidente', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (error) => errores.push(error.message));

    await page.goto('/');

    await expect(page).toHaveTitle(/Recursos de Emergencia/);
    await expect(page.locator('#mapa')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ahora mismo' })).toBeVisible();
    await expect(page.getByRole('status')).toContainText(/recurso/);

    // La isla del mapa monta Leaflet dentro del contenedor.
    await expect(page.locator('#mapa.leaflet-container')).toBeVisible({ timeout: 15_000 });
    expect(errores).toEqual([]);
  });

  test('el buscador filtra y anuncia el resultado', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Filtros', exact: true }).click();

    await page.getByLabel('Buscar por nombre, tipo o sector').fill('agua');
    await expect(page.getByRole('status')).toContainText('1 recurso');

    await page.getByLabel('Buscar por nombre, tipo o sector').fill('zzzz');
    await expect(page.getByRole('status')).toContainText('Ningún recurso coincide');
  });

  test('la ficha del mapa muestra estado, frescura y enlace de Google Maps', async ({ page }) => {
    await page.goto('/?recurso=TIL-001');

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText('Torre de iluminación');
    await expect(dialogo).toContainText(/Actualizado hace/);

    const maps = dialogo.getByRole('link', { name: /Cómo llegar en Google Maps/ });
    await expect(maps).toHaveAttribute('href', /^https:\/\//);
    await expect(maps).toHaveAttribute('rel', /noopener noreferrer/);

    await page.getByRole('button', { name: 'Cerrar ficha' }).click();
    await expect(dialogo).toBeHidden();
  });

  test('el traslado proyectado se rotula como proyección', async ({ page }) => {
    await page.goto('/recurso/TIL-001/');

    await expect(page.getByText('Proyección, no confirmada').first()).toBeVisible();
    await expect(page.getByText(/no ocurrió/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Cómo llegar en Google Maps/ })).toHaveAttribute(
      'href',
      /^https:\/\//,
    );
  });

  test('la ficha de un recurso con traslado completado muestra anterior y actual', async ({
    page,
  }) => {
    await page.goto('/recurso/BAN-001/');
    await expect(page.getByText('Ubicación anterior')).toBeVisible();
    await expect(page.getByText('Ubicación actual').first()).toBeVisible();
    await expect(page.getByText('Escuela El Mirador').first()).toBeVisible();
  });

  test('la lista funciona sin JavaScript', async ({ browser }) => {
    const contexto = await browser.newContext({ javaScriptEnabled: false });
    const page = await contexto.newPage();
    await page.goto('/lista/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Recursos de emergencia');
    await expect(page.locator('table').first().locator('tbody tr')).toHaveCount(7);
    await expect(page.getByRole('link', { name: /Batería de baños químicos/ })).toBeVisible();

    await contexto.close();
  });

  test('la navegación por teclado llega al contenido', async ({ page }) => {
    await page.goto('/lista/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Saltar al contenido principal' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#contenido')).toBeFocused();
  });

  test('no hay desborde horizontal a 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await page.goto('/lista/');

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde).toBeLessThanOrEqual(1);
  });
});

test.describe('artefacto estático', () => {
  test('/admin no existe en producción', async ({ request }) => {
    const respuesta = await request.get('/admin/');
    expect(respuesta.status()).toBe(404);
  });

  test('los endpoints de escritura no existen en producción', async ({ request }) => {
    const crear = await request.post('/api/admin/crear', { data: {} });
    expect(crear.status()).toBe(404);
    const guardar = await request.post('/api/admin/guardar', { data: {} });
    expect(guardar.status()).toBe(404);
  });

  test('la CSP publicada es la estricta', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain("script-src 'self'");
    expect(html).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(html).not.toContain('ws:');
    expect(html).toContain('https://tile.openstreetmap.org');
  });

  test('los feeds JSON y GeoJSON son válidos', async ({ request }) => {
    const json = await request.get('/data/recursos.json');
    expect(json.ok()).toBeTruthy();
    const datos = (await json.json()) as { recursos: Array<{ id: string }> };
    expect(datos.recursos.length).toBeGreaterThan(0);
    expect(datos.recursos.some((recurso) => recurso.id === 'TIL-001')).toBe(true);

    const geojson = await request.get('/data/recursos.geojson');
    expect(geojson.ok()).toBeTruthy();
    const coleccion = (await geojson.json()) as { type: string; features: unknown[] };
    expect(coleccion.type).toBe('FeatureCollection');
    expect(coleccion.features.length).toBeGreaterThan(0);
  });

  test('cada recurso tiene URL propia', async ({ request }) => {
    const respuesta = await request.get('/recurso/AGU-014/');
    expect(respuesta.ok()).toBeTruthy();
    const html = await respuesta.text();
    expect(html).toContain('Punto de agua potable');
    expect(html).toContain('Cómo llegar en Google Maps');
  });
});
