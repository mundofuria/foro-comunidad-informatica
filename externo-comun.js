// Material externo (fotos, videos, PDF y YouTube): lo que comparten el panel y la pantalla.
// Se guarda en este navegador (IndexedDB); nada se sube a internet.
window.FocoExt = (function () {
	function db(modo, hacer) {
		return new Promise(function (ok, mal) {
			var pedido = indexedDB.open('foco-externo', 1);
			pedido.onupgradeneeded = function () { pedido.result.createObjectStore('items', { keyPath: 'id', autoIncrement: true }); };
			pedido.onerror = function () { mal(pedido.error); };
			pedido.onsuccess = function () {
				var base = pedido.result, t = base.transaction('items', modo), r = hacer(t.objectStore('items'));
				t.oncomplete = function () { base.close(); ok(r && r.result); };
				t.onerror = t.onabort = function () { base.close(); mal(t.error); };
			};
		});
	}

	// Acepta los formatos habituales de enlace: watch, youtu.be, shorts, live y embed.
	function youtubeId(texto) {
		var u;
		try { u = new URL(String(texto).trim().replace(/^(?!https?:\/\/)/i, 'https://')); } catch (e) { return null; }
		var host = u.hostname.replace(/^(www|m|music)\./, ''), id = null;
		if (host === 'youtu.be') id = u.pathname.split('/')[1];
		else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
			var m = u.pathname.match(/^\/(?:shorts|live|embed|v)\/([^/]+)/);
			id = m ? m[1] : u.searchParams.get('v');
		}
		return id && /^[\w-]{11}$/.test(id) ? id : null;
	}

	var lector = null;
	function pdfjs() {
		if (!lector) {
			lector = import(new URL('vendor/pdfjs/pdf.min.js', document.baseURI).href).then(function (lib) {
				lib.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.js', document.baseURI).href;
				return lib;
			});
			lector.catch(function () { lector = null; });
		}
		return lector;
	}

	function abrirPdf(blob) {
		return Promise.all([pdfjs(), blob.arrayBuffer()]).then(function (r) {
			// Los archivos vienen de terceros: sin ejecución de código dentro del PDF.
			return r[0].getDocument({ data: r[1], isEvalSupported: false, standardFontDataUrl: new URL('vendor/pdfjs/standard_fonts/', document.baseURI).href }).promise;
		});
	}

	// Dibuja una página en un lienzo que cabe (o llena) la caja pedida.
	function paginaPdf(doc, numero, ancho, alto, llenar) {
		return doc.getPage(numero).then(function (pagina) {
			var base = pagina.getViewport({ scale: 1 });
			var escala = (llenar ? Math.max : Math.min)(ancho / base.width, alto / base.height);
			var vista = pagina.getViewport({ scale: escala });
			var lienzo = document.createElement('canvas');
			lienzo.width = Math.round(vista.width); lienzo.height = Math.round(vista.height);
			return pagina.render({ canvasContext: lienzo.getContext('2d'), viewport: vista }).promise.then(function () { return lienzo; });
		});
	}

	return {
		listar: function () { return db('readonly', function (s) { return s.getAll(); }); },
		leer: function (id) { return db('readonly', function (s) { return s.get(id); }); },
		agregar: function (item) { return db('readwrite', function (s) { return s.add(item); }); },
		borrar: function (id) { return db('readwrite', function (s) { return s.delete(id); }); },
		youtubeId: youtubeId, abrirPdf: abrirPdf, paginaPdf: paginaPdf
	};
})();
