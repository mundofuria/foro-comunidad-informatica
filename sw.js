// Guarda toda la presentación para que funcione sin internet.
// Con conexión siempre manda la versión publicada; sin conexión, la copia guardada.
importScripts('sw-lista.js');

const CACHE = 'foco-' + self.VERSION;
const url = (ruta) => new URL(ruta, self.registration.scope).href;

self.addEventListener('install', (e) => {
	e.waitUntil(caches.open(CACHE).then(async (c) => {
		await c.addAll(self.LISTA.map((r) => new Request(url(r), { cache: 'reload' })));
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
