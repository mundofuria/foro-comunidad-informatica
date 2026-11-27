// Ventana de salida (?salida): obedece al panel de operación y oculta todo lo que no sea la placa.
// El panel y la salida son dos ventanas del mismo navegador y se hablan por BroadcastChannel.
(function () {
	if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
	if (!new URLSearchParams(location.search).has('salida') || !('BroadcastChannel' in window)) return;

	var canal = new BroadcastChannel('foco-pantalla');
	var deck, negro, aviso, apagado = false, actual = 0;

	function placas() { return Array.prototype.filter.call(deck.children, function (s) { return s.tagName === 'SECTION'; }); }

	function informar() {
		var todas = placas();
		var i = todas.findIndex(function (s) { return s.hasAttribute('data-deck-active'); });
		if (i >= 0) actual = i;
		canal.postMessage({ t: 'estado', i: actual, total: todas.length, nombre: todas[actual] && todas[actual].getAttribute('data-label'), negro: apagado, completa: !!document.fullscreenElement });
	}

	// Obliga al navegador a dibujar de nuevo la placa activa y repite sus entradas.
	function refrescar() {
		var activa = deck.querySelector('section[data-deck-active]');
		if (!activa) return;
		activa.style.display = 'none';
		setTimeout(function () {
			activa.style.display = '';
			window.dispatchEvent(new Event('foco-refrescar'));
		}, 80);
	}

	function preparar() {
		deck.setAttribute('no-rail', '');
		if (deck.shadowRoot) {
			var estilo = document.createElement('style');
			estilo.textContent = '.overlay,.tapzones{display:none !important}';
			deck.shadowRoot.appendChild(estilo);
		}
		document.documentElement.style.cursor = 'none';
		negro = document.createElement('div');
		negro.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:#000;z-index:2147483646;opacity:0;pointer-events:none;transition:opacity .35s ease;';
		aviso = document.createElement('div');
		aviso.textContent = 'Llevá esta ventana a la pantalla LED y hacé clic para pantalla completa';
		aviso.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;background:#F2F7FF;color:#071B3D;font:700 18px/1.3 system-ui,sans-serif;padding:12px 22px;border-radius:40px;text-align:center;';
		document.body.appendChild(negro);
		document.body.appendChild(aviso);
		window.addEventListener('click', function () {
			if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
			aviso.style.display = 'none';
		});
		document.addEventListener('fullscreenchange', informar);
		document.addEventListener('slidechange', function () { setTimeout(informar, 0); });
		canal.onmessage = function (e) {
			var m = e.data || {};
			if (m.t === 'ir') { apagado = false; negro.style.opacity = 0; deck.goTo(m.i); }
			if (m.t === 'negro') { apagado = !!m.on; negro.style.opacity = apagado ? 1 : 0; }
			if (m.t === 'historias') window.dispatchEvent(new Event('foco-historias'));
			if (m.t === 'refrescar') refrescar();
			setTimeout(informar, 0);
		};
		informar();
	}

	var espera = setInterval(function () {
		deck = document.querySelector('deck-stage');
		if (!deck || typeof deck.goTo !== 'function' || !deck.querySelector('section[data-deck-active]')) return;
		clearInterval(espera);
		preparar();
	}, 150);
})();
