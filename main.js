'use strict';

const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)');
const EASE_SPRING = 'cubic-bezier(.32, .72, 0, 1)';

/* ---------- Barra: borde al hacer scroll y sección activa ---------- */
const barra = document.getElementById('barra');
const actualizarBarra = () => barra.classList.toggle('con-scroll', scrollY > 8);
addEventListener('scroll', actualizarBarra, { passive: true });
actualizarBarra();

const enlacesNav = [...document.querySelectorAll('.nav a[href^="#"]')];
const observadorSecciones = new IntersectionObserver((entradas) => {
  for (const e of entradas) {
    if (!e.isIntersecting) continue;
    for (const a of enlacesNav) {
      a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id);
      if (a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'true');
    }
  }
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('main section[id]').forEach((s) => observadorSecciones.observe(s));

/* ---------- Menú móvil: nace del botón que lo abre ---------- */
const menuBtn = document.getElementById('menu-btn');
const menu = document.getElementById('menu-movil');

function abrirMenu(abrir) {
  menuBtn.setAttribute('aria-expanded', String(abrir));
  menuBtn.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
  if (abrir) {
    menu.hidden = false;
    menu.classList.add('cerrado');
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.remove('cerrado')));
  } else {
    menu.classList.add('cerrado');
    menu.addEventListener('transitionend', () => {
      if (menuBtn.getAttribute('aria-expanded') === 'false') menu.hidden = true;
    }, { once: true });
  }
}
menuBtn.addEventListener('click', () => abrirMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) abrirMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { abrirMenu(false); menuBtn.focus(); } });

/* ---------- Aparición al hacer scroll ---------- */
const observadorAparece = new IntersectionObserver((entradas) => {
  for (const e of entradas) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('visible');
    observadorAparece.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -8% 0px' });

document.querySelectorAll('.aparece').forEach((el) => {
  // Escalonado suave entre hermanos
  const hermanos = [...el.parentElement.children].filter((h) => h.classList.contains('aparece'));
  el.style.transitionDelay = Math.min(hermanos.indexOf(el), 4) * 70 + 'ms';
  observadorAparece.observe(el);
});

/* ---------- Hoja de detalle: sale de la tarjeta y vuelve a ella ---------- */
const hoja = document.getElementById('hoja');
const contenido = document.getElementById('hoja-contenido');
const botonCerrar = document.getElementById('hoja-cerrar');
let origen = null;      // botón de la tarjeta que abrió la hoja
let animacion = null;   // animación en curso (se puede interrumpir)

const esMovil = () => matchMedia('(max-width: 600px)').matches;

// Transformación que hace que la hoja "parezca" la tarjeta
function transformDesdeTarjeta() {
  if (esMovil()) return 'translateY(100%)';
  const t = origen.getBoundingClientRect();
  const h = hoja.getBoundingClientRect();
  const dx = (t.left + t.width / 2) - (h.left + h.width / 2);
  const dy = (t.top + t.height / 2) - (h.top + h.height / 2);
  const s = Math.max(t.width / h.width, .3);
  return `translate(${dx}px, ${dy}px) scale(${s})`;
}

function animarHoja(abrir) {
  // Interrumpible: parte del valor que se ve en pantalla, no del destino
  const actual = animacion ? getComputedStyle(hoja).transform : null;
  const opacidadActual = animacion ? getComputedStyle(hoja).opacity : null;
  animacion?.cancel();

  if (reducirMovimiento.matches) {
    animacion = hoja.animate(
      [{ opacity: opacidadActual ?? (abrir ? 0 : 1) }, { opacity: abrir ? 1 : 0 }],
      { duration: 200, easing: 'ease', fill: 'forwards' });
  } else {
    const fuera = transformDesdeTarjeta();
    const desde = actual && actual !== 'none' ? actual : (abrir ? fuera : 'none');
    animacion = hoja.animate([
      { transform: desde, opacity: opacidadActual ?? (abrir ? (esMovil() ? 1 : 0) : 1) },
      { transform: abrir ? 'none' : fuera, opacity: abrir ? 1 : (esMovil() ? 1 : 0) },
    ], { duration: abrir ? 520 : 380, easing: EASE_SPRING, fill: 'forwards' });
  }
  const esta = animacion;
  // Red de seguridad: si el navegador no pinta frames (pestaña en segundo plano), la cerramos igual
  const limite = (esta.effect.getTiming().duration || 0) + 150;
  setTimeout(() => { if (animacion === esta && esta.playState === 'running') esta.finish(); }, limite);
  return esta.finished.then(() => { if (animacion === esta) { animacion.cancel(); animacion = null; } return true; }, () => false);
}

function abrirHoja(boton) {
  origen = boton;
  const plantilla = boton.parentElement.querySelector('template.proyecto__detalle');
  contenido.replaceChildren(plantilla.content.cloneNode(true));
  contenido.scrollTop = 0;
  const titulo = contenido.querySelector('.detalle__titulo');
  if (titulo) titulo.id = 'hoja-titulo';
  prepararGaleria(contenido.querySelector('[data-galeria]'));

  document.documentElement.style.overflow = 'hidden';
  hoja.showModal();
  hoja.classList.add('abierta');
  animarHoja(true);
}

async function cerrarHoja() {
  if (!hoja.open || !hoja.classList.contains('abierta')) return;
  hoja.classList.remove('abierta');
  const completo = await animarHoja(false);
  if (!completo || hoja.classList.contains('abierta')) return; // se reabrió a medio camino
  hoja.close();
  document.documentElement.style.overflow = '';
  origen?.focus({ preventScroll: true });
}

document.querySelectorAll('.proyecto__abrir').forEach((b) => b.addEventListener('click', () => abrirHoja(b)));
botonCerrar.addEventListener('click', cerrarHoja);
hoja.addEventListener('cancel', (e) => { e.preventDefault(); cerrarHoja(); });
hoja.addEventListener('click', (e) => { if (e.target === hoja) cerrarHoja(); });

/* ---------- Galería: scroll-snap nativo + flechas y puntos ---------- */
function prepararGaleria(galeria) {
  if (!galeria) return;
  const marco = document.createElement('div');
  marco.className = 'galeria-marco';
  galeria.replaceWith(marco);
  marco.append(galeria);
  const fotos = [...galeria.querySelectorAll('img')];
  galeria.setAttribute('tabindex', '0');
  galeria.setAttribute('aria-label', `Galería de ${fotos.length} foto${fotos.length > 1 ? 's' : ''}`);
  if (fotos.length < 2) return;

  const crearFlecha = (clase, etiqueta, d) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'galeria__flecha ' + clase;
    b.setAttribute('aria-label', etiqueta);
    b.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${d}"/></svg>`;
    return b;
  };
  const prev = crearFlecha('galeria__flecha--prev', 'Foto anterior', 'M15 6l-6 6 6 6');
  const sig = crearFlecha('galeria__flecha--sig', 'Foto siguiente', 'M9 6l6 6-6 6');
  const puntos = document.createElement('div');
  puntos.className = 'galeria__puntos';
  puntos.setAttribute('aria-hidden', 'true');
  fotos.forEach(() => puntos.append(document.createElement('span')));
  marco.append(prev, sig, puntos);

  const indice = () => galeria.clientWidth ? Math.round(galeria.scrollLeft / galeria.clientWidth) : 0;
  const ir = (i) => galeria.scrollTo({ left: i * galeria.clientWidth, behavior: reducirMovimiento.matches ? 'auto' : 'smooth' });
  const actualizar = () => {
    const i = indice();
    prev.disabled = i === 0;
    sig.disabled = i === fotos.length - 1;
    [...puntos.children].forEach((p, n) => p.classList.toggle('activo', n === i));
  };
  prev.addEventListener('click', () => ir(indice() - 1));
  sig.addEventListener('click', () => ir(indice() + 1));
  galeria.addEventListener('scroll', () => requestAnimationFrame(actualizar), { passive: true });
  galeria.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(indice() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(indice() - 1); }
  });
  actualizar();
}
