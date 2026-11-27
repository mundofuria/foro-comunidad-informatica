// Guarda toda la presentación para que funcione sin internet.
// Con conexión siempre manda la versión publicada; sin conexión, la copia guardada.
importScripts('sw-lista.js');

const CACHE = 'foco-' + self.VERSION;
const url = (ruta) => new URL(ruta, self.registration.scope).href;

// El servidor a veces responde con un error pasajero: se reintenta cada archivo
// en vez de cancelar todo el guardado por uno solo.
async function guardar(c, ruta) {
	for (let intento = 1; ; intento++) {
		try {
			const r = await fetch(new Request(url(ruta), { cache: 'reload' }));
			if (!r.ok) throw new Error(ruta + ' ' + r.status);
			return await c.put(url(ruta), r);
		} catch (error) {
			if (intento >= 6) throw error;
			await new Promise((ok) => setTimeout(ok, intento * 1500));
		}
	}
}

self.addEventListener('install', (e) => {
	e.waitUntil(caches.open(CACHE).then(async (c) => {
		// De a seis, para no saturar la red ni el servidor.
		for (let i = 0; i < self.LISTA.length; i += 6) {
			await Promise.all(self.LISTA.slice(i, i + 6).map((r) => guardar(c, r)));
		}
		await c.put(url('sw-completo'), new Response('ok'));
		await self.skipWaiting();
	}));
});

self.addEventListener('activate', (e) => {
	e.waitUntil(caches.keys()
		.then((ks) => Promise.all(ks.filter((k) => k.startsWith('foco-') && k !== CACHE).map((k) => caches.delete(k))))
		.then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
	const pedido = e.request;
	if (pedido.method !== 'GET' || !pedido.url.startsWith(self.registration.scope)) return;
	e.respondWith((async () => {
		const cache = await caches.open(CACHE);
		const limpia = pedido.url.split('#')[0].split('?')[0];
		const clave = limpia === self.registration.scope ? url('index.html') : limpia;
		const guardada = await cache.match(clave);
		const red = fetch(pedido, { cache: 'no-cache' }).then((r) => {
			if (r.ok) cache.put(clave, r.clone());
			return r;
		});
		if (!guardada) return red;
		// Si la red tarda demasiado (wifi saturado), se sirve la copia.
		const tarde = new Promise((ok) => setTimeout(() => ok(guardada), 3000));
		return Promise.race([red.then((r) => (r.ok ? r : guardada)).catch(() => guardada), tarde]);
	})());
});
