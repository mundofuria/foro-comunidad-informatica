// Pestaña "Externo" del panel: cargar material de terceros y mandarlo a la pantalla.
window.Externo = (function () {
	var $ = function (id) { return document.getElementById(id); };
	var canal = 'BroadcastChannel' in window ? new BroadcastChannel('foco-pantalla') : null;
	var items = [], abierto = false, previa = null, aire = null, enviadoEn = 0, visto = 0, boton = null, rotacion = null;
	var pref = { sonido: false, ajuste: 'ajustar', repetir: false };
	var TIPOS = { imagen: 'Foto', video: 'Video', youtube: 'YouTube', pdf: 'PDF' };

	function buscar(id) { return items.find(function (i) { return i.id === id; }); }
	function alerta(t) { $('alerta').textContent = t; }
	function conectada() { return Date.now() - visto < 3500; }
	function reloj(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

	// ---------- miniaturas ----------
	function marco(dibujo, ancho, alto, nombre) {
		var c = document.createElement('canvas'); c.width = 480; c.height = 240;
		var g = c.getContext('2d'); g.fillStyle = '#0a2550'; g.fillRect(0, 0, 480, 240);
		if (dibujo) { var k = Math.min(480 / ancho, 240 / alto); g.drawImage(dibujo, (480 - ancho * k) / 2, (240 - alto * k) / 2, ancho * k, alto * k); }
		else { g.fillStyle = '#f2f7ff'; g.textAlign = 'center'; g.font = '700 34px system-ui'; g.fillText(nombre, 240, 130, 440); }
		return c.toDataURL('image/jpeg', .82);
	}
	function miniImagen(archivo) {
		return createImageBitmap(archivo).then(function (b) { return marco(b, b.width, b.height); });
	}
	function miniVideo(archivo) {
		return new Promise(function (ok, mal) {
			var v = document.createElement('video'), url = URL.createObjectURL(archivo);
			var fin = function (x, e) { clearTimeout(tope); URL.revokeObjectURL(url); if (e) mal(e); else ok(x); };
			var tope = setTimeout(function () { fin(null, new Error('sin respuesta')); }, 15000);
			v.muted = true; v.preload = 'auto';
			v.onerror = function () { fin(null, new Error('formato')); };
			v.onloadeddata = function () {
				if (!v.videoWidth) return fin(null, new Error('formato'));
				v.onseeked = function () { fin(marco(v, v.videoWidth, v.videoHeight)); };
				v.currentTime = Math.min(1.5, (v.duration || 3) / 2);
			};
			v.src = url;
		});
	}
	function miniPdf(archivo) {
		return FocoExt.abrirPdf(archivo).then(function (doc) {
			var paginas = doc.numPages;
			return FocoExt.paginaPdf(doc, 1, 480, 240).then(function (c) { var m = marco(c, c.width, c.height); doc.destroy(); return { mini: m, paginas: paginas }; });
		});
	}

	// ---------- carga ----------
	function clase(f) {
		var n = f.name.toLowerCase();
		if (/\.(pptx?|ppsx?|key|odp)$/.test(n)) return 'presentacion';
		if (f.type === 'application/pdf' || /\.pdf$/.test(n)) return 'pdf';
		if (/^image\//.test(f.type) && !/heic|heif|tiff/.test(f.type)) return 'imagen';
		if (/^video\//.test(f.type) || /\.(mp4|m4v|webm|mov)$/.test(n)) return 'video';
		return null;
	}

	function cargar(lista) {
		var problemas = [];
		alerta('Cargando ' + lista.length + (lista.length === 1 ? ' archivo…' : ' archivos…'));
		return lista.reduce(function (cadena, f) {
			return cadena.then(function () {
				var tipo = clase(f);
				if (tipo === 'presentacion') { problemas.push(f.name + ': exportá la presentación a PDF.'); return; }
				if (!tipo) { problemas.push(f.name + ': formato no admitido.'); return; }
				var hacer = tipo === 'imagen' ? miniImagen(f) : tipo === 'video' ? miniVideo(f) : miniPdf(f);
				return hacer.then(function (r) {
					var item = { tipo: tipo, nombre: f.name, blob: f, mini: r.mini || r, paginas: r.paginas || 0 };
					return FocoExt.agregar(item).then(function (id) { item.id = id; items.push(item); previa = id; pintar(); })
						.catch(function () { problemas.push(f.name + ': no se pudo guardar (¿es demasiado pesado?).'); });
				}).catch(function () {
					problemas.push(f.name + (tipo === 'video' ? ': el navegador no puede reproducirlo; pedilo en MP4.' : ': no se pudo abrir.'));
				});
			});
		}, Promise.resolve()).then(function () { alerta(problemas.join(' · ')); pintar(); });
	}

	function agregarEnlace() {
		var texto = $('ext-enlace').value, id = FocoExt.youtubeId(texto);
		if (!id) { alerta('Ese enlace no parece de un video de YouTube.'); return; }
		var item = { tipo: 'youtube', nombre: 'youtu.be/' + id, youtube: id, mini: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' };
		FocoExt.agregar(item).then(function (n) { item.id = n; items.push(item); previa = n; $('ext-enlace').value = ''; $('ext-enlace').blur(); alerta(''); pintar(); });
	}

	function borrar(id) {
		if (aire && aire.id === id) ocultar();
		FocoExt.borrar(id).then(function () {
			items = items.filter(function (i) { return i.id !== id; });
			if (previa === id) previa = items.length ? items[items.length - 1].id : null;
			pintar();
		});
	}

	// ---------- órdenes a la pantalla ----------
	function mandar(id, manual) {
		if (!conectada()) { alerta('La pantalla no está abierta: tocá “Abrir pantalla”.'); return false; }
		var item = buscar(id);
		if (!item) return false;
		if (manual) pararRotacion();
		window.FocoPanel.pararLoop();
		canal.postMessage({ t: 'ext', id: id, sonido: pref.sonido, ajuste: pref.ajuste, repetir: pref.repetir, pagina: 1 });
		aire = { id: id, tipo: item.tipo, nombre: item.nombre, pagina: 1, paginas: item.paginas, pausado: false, t: 0, dur: 0, error: '' };
		enviadoEn = Date.now();
		alerta(item.tipo === 'youtube' && !navigator.onLine ? 'Sin internet: los videos de YouTube no se pueden ver.' : '');
		window.FocoPanel.pintar();
		return true;
	}
	function orden(cmd, v) { if (canal && aire) canal.postMessage({ t: 'ext-orden', cmd: cmd, v: v }); }
	function ocultar() { pararRotacion(); if (canal) canal.postMessage({ t: 'ext-fin' }); aire = null; enviadoEn = Date.now(); window.FocoPanel.pintar(); }

	function pagina(d) {
		if (!aire || aire.tipo !== 'pdf') return;
		var p = Math.min(Math.max(1, aire.pagina + d), aire.paginas || 1);
		aire.pagina = p; enviadoEn = Date.now(); orden('pagina', p); pintar();
	}

	function pararRotacion() { clearInterval(rotacion); rotacion = null; var b = $('ext-rotar'); if (b) b.setAttribute('aria-pressed', 'false'); }
	function rotar() {
		if (rotacion) return pararRotacion();
		var fotos = items.filter(function (i) { return i.tipo === 'imagen'; });
		if (fotos.length < 2) { alerta('Para rotar hacen falta al menos dos fotos.'); return; }
		var k = Math.max(0, fotos.findIndex(function (i) { return i.id === previa; }));
		if (!mandar(fotos[k].id, true)) return;
		var seg = Math.max(4, Number($('ext-segundos').value) || 8);
		rotacion = setInterval(function () {
			fotos = items.filter(function (i) { return i.tipo === 'imagen'; });
			if (!fotos.length) return pararRotacion();
			k = (k + 1) % fotos.length; mandar(fotos[k].id, false); previa = fotos[k].id; pintar();
		}, seg * 1000);
		$('ext-rotar').setAttribute('aria-pressed', 'true');
	}

	// ---------- dibujo ----------
	function pintar() {
		var lista = $('ext-lista');
		lista.textContent = '';
		items.forEach(function (i) {
			var caja = document.createElement('div'); caja.className = 'ext-item';
			var b = document.createElement('button'); b.type = 'button'; b.className = 'placa'; b.dataset.ext = i.id; b.title = i.nombre;
			var img = document.createElement('img'); img.alt = ''; img.src = i.mini;
			img.onerror = function () { img.onerror = null; img.src = marco(null, 0, 0, TIPOS[i.tipo]); };
			var s = document.createElement('span'); s.textContent = TIPOS[i.tipo] + (i.paginas ? ' (' + i.paginas + ' pág.)' : '') + ' · ' + i.nombre;
			b.append(img, s);
			b.classList.toggle('preparada', i.id === previa);
			b.classList.toggle('al-aire', !!aire && aire.id === i.id);
			b.onclick = function () { previa = i.id; pintar(); };
			b.ondblclick = function () { previa = i.id; mandar(i.id, true); pintar(); };
			var x = document.createElement('button'); x.type = 'button'; x.className = 'ext-quitar'; x.textContent = '✕'; x.setAttribute('aria-label', 'Quitar ' + i.nombre);
			x.onclick = function () { borrar(i.id); };
			caja.append(b, x);
			lista.appendChild(caja);
		});
		$('ext-vacio').hidden = items.length > 0;
		var v = aire && (aire.tipo === 'video' || aire.tipo === 'youtube');
		$('ext-pausa').disabled = !v; $('ext-pausa').textContent = v && aire.pausado ? '▶ Reproducir' : '❚❚ Pausar';
		$('ext-reiniciar').disabled = !aire || aire.tipo === 'imagen';
		var esPdf = aire && aire.tipo === 'pdf';
		$('ext-paginas').hidden = !esPdf;
		if (esPdf) $('ext-pagina').textContent = 'Página ' + aire.pagina + ' de ' + (aire.paginas || '…');
		$('ext-sonido').setAttribute('aria-pressed', pref.sonido); $('ext-sonido').textContent = pref.sonido ? '🔊 Sonido: encendido' : '🔇 Sonido: apagado';
		$('ext-ajuste').textContent = pref.ajuste === 'llenar' ? 'Imagen: llena la pantalla' : 'Imagen: entera';
		$('ext-repetir').setAttribute('aria-pressed', pref.repetir); $('ext-repetir').textContent = pref.repetir ? 'Repetir video: sí' : 'Repetir video: no';
		$('ext-volver').disabled = !aire;
		if (abierto) window.FocoPanel.pintar();
	}

	// Lo que muestran los dos monitores cuando hay material externo.
	function monitores() {
		var p = abierto ? buscar(previa) : null;
		if (abierto) {
			if (p) { $('previa-img').src = p.mini; $('previa-nombre').textContent = TIPOS[p.tipo] + ' · ' + p.nombre; }
			else { $('previa-img').removeAttribute('src'); $('previa-nombre').textContent = '—'; }
		}
		if (aire) {
			var a = buscar(aire.id);
			if (a && $('aire-img').getAttribute('src') !== a.mini) $('aire-img').src = a.mini;
			$('aire-nombre').textContent = window.FocoPanel.negro() ? 'Pantalla en negro' : TIPOS[aire.tipo] + (aire.tipo === 'pdf' ? ' ' + aire.pagina + '/' + (aire.paginas || '…') : '') + ' · ' + aire.nombre;
		}
	}

	function textoReloj() {
		if (!aire) return null;
		if ((aire.tipo === 'video' || aire.tipo === 'youtube') && aire.dur) return reloj(aire.t) + ' / ' + reloj(aire.dur) + (aire.pausado ? ' · EN PAUSA' : '');
		return 'EXTERNO';
	}

	// La pantalla informa qué está mostrando.
	function estado(m) {
		visto = Date.now();
		// Justo después de una orden puede llegar un estado viejo.
		if (Date.now() - enviadoEn < 900) return;
		var antes = aire ? [aire.id, aire.pagina, aire.pausado, aire.error].join() : '';
		var previoError = aire ? aire.error : '';
		aire = m.externo || null;
		var ahora = aire ? [aire.id, aire.pagina, aire.pausado, aire.error].join() : '';
		if (aire && aire.error && aire.error !== previoError) alerta(aire.error);
		else if (!aire && previoError && $('alerta').textContent === previoError) alerta('');
		if (!aire) pararRotacion();
		if (antes !== ahora && items.length) pintar();
	}

	// ---------- pestaña ----------
	function abrir() {
		abierto = true;
		document.body.classList.add('modo-externo');
		$('momentos').querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === boton); });
		window.FocoPanel.pararLoop();
		pintar();
	}
	function cerrar() {
		if (!abierto) return;
		abierto = false;
		document.body.classList.remove('modo-externo');
		if (boton) boton.setAttribute('aria-pressed', 'false');
	}
	function agregarBoton(contenedor) {
		boton = document.createElement('button');
		boton.type = 'button'; boton.textContent = 'Externo'; boton.id = 'ext-tab'; boton.setAttribute('aria-pressed', 'false');
		boton.onclick = function () { abrir(); boton.blur(); };
		contenedor.appendChild(boton);
	}

	function paso(d) {
		if (aire && aire.tipo === 'pdf' && previa === aire.id) return pagina(d);
		if (!items.length) return;
		var k = items.findIndex(function (i) { return i.id === previa; });
		previa = items[k < 0 ? 0 : Math.min(items.length - 1, Math.max(0, k + d))].id;
		pintar();
	}
	function enviar() { if (previa === null) { alerta('Primero cargá un archivo o un enlace.'); return; } mandar(previa, true); pintar(); }

	function tecla(e) {
		var k = e.key;
		if (k === 'Enter') { e.preventDefault(); if (!e.repeat) enviar(); return true; }
		if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown') { e.preventDefault(); paso(1); return true; }
		if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); paso(-1); return true; }
		if (k === ' ') { e.preventDefault(); orden('pausa'); return true; }
		return false;
	}

	$('ext-cargar').onclick = function () { $('ext-archivos').click(); };
	$('ext-archivos').onchange = function () { var l = Array.prototype.slice.call(this.files); this.value = ''; this.blur(); if (l.length) cargar(l); };
	$('ext-agregar').onclick = agregarEnlace;
	$('ext-enlace').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); agregarEnlace(); } });
	$('ext-pausa').onclick = function () { orden('pausa'); };
	$('ext-reiniciar').onclick = function () { orden('reiniciar'); if (aire) { aire.pagina = 1; pintar(); } };
	$('ext-sonido').onclick = function () { pref.sonido = !pref.sonido; orden('sonido', pref.sonido); pintar(); };
	$('ext-ajuste').onclick = function () { pref.ajuste = pref.ajuste === 'llenar' ? 'ajustar' : 'llenar'; orden('ajuste', pref.ajuste); pintar(); };
	$('ext-repetir').onclick = function () { pref.repetir = !pref.repetir; orden('repetir', pref.repetir); pintar(); };
	$('ext-anterior').onclick = function () { pagina(-1); };
	$('ext-siguiente').onclick = function () { pagina(1); };
	$('ext-rotar').onclick = rotar;
	$('ext-volver').onclick = ocultar;

	FocoExt.listar().then(function (l) { items = l; previa = l.length ? l[0].id : null; pintar(); })
		.catch(function () { alerta('Este navegador no permite guardar material externo.'); });

	return {
		activo: function () { return abierto; }, alAire: function () { return !!aire; },
		agregarBoton: agregarBoton, cerrar: cerrar, enviar: enviar, paso: paso, tecla: tecla,
		monitores: monitores, reloj: textoReloj, estado: estado,
		// Se envió una placa: el material externo deja la pantalla.
		salio: function () { pararRotacion(); aire = null; enviadoEn = Date.now(); if (items.length) pintar(); }
	};
})();
