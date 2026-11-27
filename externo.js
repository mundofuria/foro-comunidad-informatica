// Material externo en la ventana de salida: una capa por encima de las placas, del mismo tamaño 2:1.
// Las placas no se tocan; al enviar cualquier placa la capa se retira.
window.FocoExterno = (function () {
	var capa, lienzo, actual = null, turno = 0, enNegro = false;
	var avisar = function () {};

	function armar() {
		if (capa) return;
		capa = document.createElement('div');
		capa.id = 'externo-capa';
		capa.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:#000;z-index:2147483000;opacity:0;visibility:hidden;transition:opacity .4s ease,visibility .4s;';
		lienzo = document.createElement('div');
		lienzo.style.cssText = 'position:absolute;overflow:hidden;background:radial-gradient(circle at 50% 45%,#0b356b 0%,#081f43 50%,#040f28 100%);';
		capa.appendChild(lienzo);
		document.body.appendChild(capa);
		medir();
		window.addEventListener('resize', function () { medir(); if (actual) acomodar(); });
	}

	function medir() {
		var ancho = Math.min(window.innerWidth, window.innerHeight * 2), alto = ancho / 2;
		lienzo.style.width = ancho + 'px'; lienzo.style.height = alto + 'px';
		lienzo.style.left = (window.innerWidth - ancho) / 2 + 'px'; lienzo.style.top = (window.innerHeight - alto) / 2 + 'px';
	}

	function limpiar(a) {
		if (!a) return;
		clearInterval(a.pulso); clearTimeout(a.espera);
		if (a.escucha) window.removeEventListener('message', a.escucha);
		if (a.video) { a.video.pause(); a.video.removeAttribute('src'); a.video.load(); }
		if (a.url) URL.revokeObjectURL(a.url);
		if (a.pdf) a.pdf.destroy();
		if (a.nodo) a.nodo.remove();
	}

	function relleno() { return actual.ajuste === 'llenar' ? 'cover' : 'contain'; }

	function acomodar() {
		var a = actual;
		if (a.tipo === 'imagen' || a.tipo === 'video') { if (a.medio) a.medio.style.objectFit = relleno(); }
		if (a.tipo === 'youtube' && a.medio) {
			// El video es 16:9 y la pantalla 2:1: entero deja franjas a los costados; llenar recorta arriba y abajo.
			var W = lienzo.clientWidth, H = lienzo.clientHeight;
			var ancho = a.ajuste === 'llenar' ? W : H * 16 / 9, alto = ancho * 9 / 16;
			a.medio.style.width = ancho + 'px'; a.medio.style.height = alto + 'px';
			a.medio.style.left = (W - ancho) / 2 + 'px'; a.medio.style.top = (H - alto) / 2 + 'px';
		}
		if (a.tipo === 'pdf' && a.pdf) dibujarPagina(a);
	}

	function dibujarPagina(a) {
		var pedido = a.pedido = (a.pedido || 0) + 1;
		var r = window.devicePixelRatio || 1;
		FocoExt.paginaPdf(a.pdf, a.pagina, lienzo.clientWidth * r, lienzo.clientHeight * r, a.ajuste === 'llenar').then(function (c) {
			if (actual !== a || a.pedido !== pedido) return;
			c.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:' + c.width / r + 'px;height:' + c.height / r + 'px;';
			var anteriores = Array.prototype.slice.call(a.nodo.children);
			a.nodo.appendChild(c);
			c.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
			setTimeout(function () { anteriores.forEach(function (x) { x.remove(); }); }, 260);
			avisar();
		}).catch(function () { falla(a, 'No se pudo dibujar la página del PDF.'); });
	}

	function falla(a, texto) { if (actual === a) { a.error = texto; avisar(); } }

	function medio(a, etiqueta) {
		var el = document.createElement(etiqueta);
		el.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;border:0;';
		a.medio = el;
		return el;
	}

	function reproducir(a) {
		var v = a.video;
		v.play().catch(function () {
			// El navegador no deja arrancar con sonido si nadie hizo clic en esta ventana.
			if (v.muted) return;
			v.muted = true;
			falla(a, 'Para escuchar el sonido hacé un clic en la pantalla y tocá Reiniciar.');
			v.play().catch(function () { falla(a, 'No se pudo reproducir el video.'); });
		});
	}

	function ordenYT(a, funcion, args) {
		if (a.medio && a.medio.contentWindow) a.medio.contentWindow.postMessage(JSON.stringify({ event: 'command', func: funcion, args: args || [] }), '*');
	}

	var CONSTRUIR = {
		imagen: function (a, item) {
			var img = medio(a, 'img');
			img.onerror = function () { falla(a, 'No se pudo abrir la imagen.'); };
			img.src = a.url = URL.createObjectURL(item.blob);
			a.nodo.appendChild(img);
		},
		video: function (a, item) {
			var v = a.video = medio(a, 'video');
			v.playsInline = true; v.muted = !a.sonido; v.loop = a.repetir; v.preload = 'auto';
			v.onerror = function () { if (v.getAttribute('src')) falla(a, 'Este video no se puede reproducir en el navegador: pedilo en MP4.'); };
			v.onplay = v.onpause = v.onended = function () { avisar(); };
			v.src = a.url = URL.createObjectURL(item.blob);
			a.nodo.appendChild(v);
			if (enNegro) a.reanudar = true; else reproducir(a);
		},
		youtube: function (a, item) {
			var f = medio(a, 'iframe');
			f.allow = 'autoplay; encrypted-media'; f.referrerPolicy = 'strict-origin-when-cross-origin'; f.tabIndex = -1; f.title = 'Video';
			f.style.pointerEvents = 'none';
			f.src = 'https://www.youtube.com/embed/' + item.youtube + '?autoplay=1&controls=0&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3&enablejsapi=1&mute=' + (a.sonido ? 0 : 1);
			a.estadoYT = -1;
			a.escucha = function (e) {
				if (e.source !== f.contentWindow) return;
				var d; try { d = JSON.parse(e.data); } catch (err) { return; }
				clearInterval(a.pulso);
				if (d.event === 'onError') { falla(a, d.info === 101 || d.info === 150 ? 'Este video no permite mostrarse fuera de YouTube.' : 'YouTube no pudo reproducir este video.'); return; }
				var i = d.info || {};
				var estado = d.event === 'onStateChange' ? d.info : i.playerState;
				if (typeof i.currentTime === 'number') a.t = i.currentTime;
				if (typeof i.duration === 'number' && i.duration) a.dur = i.duration;
				if (!a.sonido && (d.event === 'onApiChange' || estado === 1)) ['captions', 'cc'].forEach(function (m) { ordenYT(a, 'unloadModule', [m]); });
				if (typeof estado === 'number') {
					a.estadoYT = estado;
					if (estado === 1) { clearTimeout(a.espera); if (!/sonido/.test(a.error)) a.error = ''; }
					if (estado === 0 && a.repetir) { ordenYT(a, 'seekTo', [0, true]); ordenYT(a, 'playVideo'); }
					if (estado === 1 && enNegro) ordenYT(a, 'pauseVideo');
					avisar();
				}
			};
			window.addEventListener('message', a.escucha);
			f.addEventListener('load', function () { a.pulso = setInterval(function () { if (f.contentWindow) f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: item.youtube, channel: 'widget' }), '*'); }, 500); });
			// Si no arranca solo, suele ser por el sonido o por falta de conexión.
			a.espera = setTimeout(function () {
				if (actual !== a || a.estadoYT === 1) return;
				if (!navigator.onLine) falla(a, 'Sin internet: los videos de YouTube no se pueden ver.');
				else if (a.sonido) { ordenYT(a, 'mute'); ordenYT(a, 'playVideo'); falla(a, 'Para escuchar el sonido hacé un clic en la pantalla y tocá Reiniciar.'); }
				else falla(a, 'El video no arrancó: revisá la conexión y tocá Reiniciar.');
			}, 7000);
			a.nodo.appendChild(f);
		},
		pdf: function (a, item) {
			FocoExt.abrirPdf(item.blob).then(function (doc) {
				if (actual !== a) { doc.destroy(); return; }
				a.pdf = doc; a.paginas = doc.numPages; a.pagina = Math.min(Math.max(1, a.pagina), doc.numPages);
				dibujarPagina(a); avisar();
			}).catch(function (e) { falla(a, e && e.name === 'PasswordException' ? 'El PDF está protegido con contraseña.' : 'No se pudo abrir el PDF.'); });
		}
	};

	function mostrar(m) {
		armar();
		var mio = ++turno;
		return FocoExt.leer(m.id).then(function (item) {
			if (mio !== turno) return;
			if (!item) { avisar(); return; }
			var anterior = actual;
			var a = actual = { id: item.id, tipo: item.tipo, nombre: item.nombre, sonido: !!m.sonido, ajuste: m.ajuste || 'ajustar', repetir: !!m.repetir, pagina: m.pagina || 1, paginas: 0, error: '' };
			a.nodo = document.createElement('div');
			a.nodo.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;';
			lienzo.appendChild(a.nodo);
			CONSTRUIR[a.tipo](a, item);
			acomodar();
			a.nodo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450 });
			// El anterior se va recién cuando el nuevo ya cubrió la pantalla (y deja de sonar enseguida).
			if (anterior) { if (anterior.video) anterior.video.muted = true; if (anterior.tipo === 'youtube') ordenYT(anterior, 'mute'); setTimeout(function () { limpiar(anterior); }, 480); }
			capa.style.visibility = 'visible'; capa.style.opacity = 1;
			avisar();
		}).catch(function () { avisar(); });
	}

	function ocultar() {
		turno++;
		if (!actual) return;
		var a = actual; actual = null;
		capa.style.opacity = 0; capa.style.visibility = 'hidden';
		if (a.video) a.video.pause();
		if (a.tipo === 'youtube') ordenYT(a, 'pauseVideo');
		setTimeout(function () { limpiar(a); }, 450);
		avisar();
	}

	function pausado(a) { return a.tipo === 'video' ? a.video.paused : a.tipo === 'youtube' ? a.estadoYT !== 1 : false; }

	function orden(m) {
		var a = actual;
		if (!a) return;
		if (m.cmd === 'pausa') {
			if (a.video) { if (a.video.paused) reproducir(a); else a.video.pause(); }
			if (a.tipo === 'youtube') ordenYT(a, a.estadoYT === 1 ? 'pauseVideo' : 'playVideo');
		}
		if (m.cmd === 'reiniciar') {
			a.error = '';
			if (a.video) { a.video.currentTime = 0; a.video.muted = !a.sonido; reproducir(a); }
			if (a.tipo === 'youtube') { ordenYT(a, a.sonido ? 'unMute' : 'mute'); ordenYT(a, 'seekTo', [0, true]); ordenYT(a, 'playVideo'); }
			if (a.pdf) { a.pagina = 1; dibujarPagina(a); }
		}
		if (m.cmd === 'sonido') {
			a.sonido = !!m.v; a.error = '';
			if (a.video) {
				var andaba = !a.video.paused;
				a.video.muted = !a.sonido;
				// Sin un clic previo en la pantalla, el navegador pausa el video al activarle el sonido.
				if (andaba && a.sonido) setTimeout(function () {
					if (actual === a && a.video.paused && !enNegro) { a.video.muted = true; reproducir(a); falla(a, 'Para escuchar el sonido hacé un clic en la pantalla y tocá Reiniciar.'); }
				}, 200);
			}
			if (a.tipo === 'youtube') ordenYT(a, a.sonido ? 'unMute' : 'mute');
		}
		if (m.cmd === 'repetir') { a.repetir = !!m.v; if (a.video) a.video.loop = a.repetir; }
		if (m.cmd === 'ajuste') { a.ajuste = m.v; acomodar(); }
		if (m.cmd === 'pagina' && a.pdf) {
			var p = Math.min(Math.max(1, m.v), a.paginas);
			if (p !== a.pagina) { a.pagina = p; dibujarPagina(a); }
		}
		avisar();
	}

	// "Pantalla negra": además de tapar, detiene el video para que no siga sonando.
	function negro(on) {
		enNegro = !!on;
		var a = actual;
		if (!a) return;
		if (on && !pausado(a)) { a.reanudar = true; if (a.video) a.video.pause(); if (a.tipo === 'youtube') ordenYT(a, 'pauseVideo'); }
		if (!on && a.reanudar) { a.reanudar = false; if (a.video) reproducir(a); if (a.tipo === 'youtube') ordenYT(a, 'playVideo'); }
	}

	function estado() {
		var a = actual;
		if (!a) return null;
		return { id: a.id, tipo: a.tipo, nombre: a.nombre, sonido: a.sonido, ajuste: a.ajuste, repetir: a.repetir, pagina: a.pagina, paginas: a.paginas, error: a.error, pausado: pausado(a),
			t: a.video ? a.video.currentTime : a.t || 0, dur: a.video ? a.video.duration || 0 : a.dur || 0 };
	}

	return { mostrar: mostrar, ocultar: ocultar, orden: orden, negro: negro, estado: estado,
		repintar: function () { if (actual) acomodar(); },
		alCambiar: function (f) { avisar = f; } };
})();
