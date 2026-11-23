# Placas LED · v3 (animada)

Archivo: `Placas LED FoCo v3.dc.html`, con un lienzo de 3840 × 1920 que se escala a cualquier pantalla. Son 69 placas: 49 del día y 20 del cierre (10 placas × 2 variantes). El contenido está en `data/foco.json`, verificado contra foco.informaticos.ar el 23/11/2026.

## Operación
- Flechas: navegar · P: pausa · F: pantalla completa · Panel lateral de miniaturas: saltar a cualquier placa.
- URL: `?modo=cierre` (solo cierre), `?modo=dia`, `?auto` (avance automático), `?static` (sin animaciones, estado final).
- Tweaks: modo, autoplay, segundos (13 por defecto; frases 10). Las placas de cierre nunca avanzan solas.

## Sistema
- Fondo azul profundo con degradés y 2–3 masas de color que se mueven en ciclos de 30–40 s, grano fino contra el banding y grilla de puntos de 10 px.
- Marca de agua: isotipo FOCO grande, recortado y al 4–6 %. En el pie, el FOCO chico siempre en el mismo lugar. Sin cruces ni "+".
- Tipografía: Montserrat (reemplazo de Gotham) + JetBrains Mono para metadatos. Nada por debajo de 64 px.
- Movimiento: títulos por línea con máscara, trazos que se dibujan, barras que crecen. Easing cubic-bezier(.2,.7,.2,1). Solo se anima transform y opacity, salvo los trazos SVG.
- Zona segura del 6 % (230 / 115 px).

## ⚠ Imágenes y modo offline (acción necesaria)
El sitio bloquea las descargas automáticas (protección anti-bots), así que no pude bajar fotos ni logos al proyecto. Hoy las placas los cargan desde foco.informaticos.ar, lo que **requiere internet**.
Para que funcione 100 % offline, descargar a mano y subir con el mismo nombre de archivo que tienen en el sitio:
- `assets/personas/` → fotos de expositores (la lista y las URLs están en `assets/personas/_fuentes.csv`).
- `assets/comunidades/` → logos de `.../assets/img/comunidades-logos/` (por ejemplo `odia.svg`, `wigar.svg`).
- `assets/fotos/` → `fachada.webp` (Cero + Infinito) y `26.webp` (foto grupal de comunidades).
Cuando estén subidas, se conectan las copias locales (el reproductor ya prioriza la local sobre la remota) y se genera la versión standalone.
Si una foto no carga, aparece un monograma con las iniciales, con el mismo tratamiento.

**Juan: validar permisos y derechos de uso de las fotos de expositores antes del evento.**

## Decisiones
- La agenda y los bloques no mencionan aulas ni auditorios; solo el hall central para el cierre.
- Charlas y conversatorios sin hora, sala ni orden.
- Se quitó "Un espacio de la AGC" de todas las placas (pedido del cliente).
- Ezequiel Tosco no aparece. Confirmar si se quiere en el panel de cierre.
- Sin hashtag ni redes: el sitio no publica ninguno.
- Frase de cierre original: "El futuro no está escrito. Lo escribimos en comunidad." (deriva de "Pero el futuro no está escrito").
- Las 14 ilustraciones de charlas están hechas por código (SVG, trazo grueso, paleta de marca); no hay imágenes generadas ni stock.
- Logos de comunidades en blanco monocromo. Si alguno trae fondo opaco y queda como bloque, pasarlo a baldosa clara.
- El logo completo dice "I Foro del Conocimiento": se usa solo el isotipo FOCO. Pedir el logo actualizado (idealmente en SVG).
- Celeste de texto aclarado a #9DD0F8 para sostener 7:1 sobre las masas de color.

## Errores en el sitio
- "Coti / Cybecirujas" → Cybercirujas · "¿Qué es Cybercirujas?Combatiendo" sin espacio · "Acreditacion" sin tilde · punto final en "Colonialismo digital…".
- El link de "Ciberseguridad en municipios" apunta a /charlas/primer-empleo-en-tecnologia-lo-que-nadie-te-cuenta/.
- "Desarrollo de videojuegos…" apunta a /charlas/desarrollar-videojuegos-en-argentina/.
- "¿R para qué?" ya no figura en el listado de charlas.
- "Cyber Cirujas" (comunidades) vs. "Cybercirujas" (charlas).
- "Andres Snitcofski" sin tilde: se respetó; confirmar.
- Los conversatorios del sitio muestran "Tarde, desde las 14 h · Auditorios": se ignoró la sala.
- Falta la hora de finalización (el panel empieza a las 17:00).

## Pendientes
- Resolución real del panel LED.
- PNG por placa: exportar a PDF con `?static` (una página por placa).
