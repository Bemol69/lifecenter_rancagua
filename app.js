// Solo interacción: menú, revelados, contadores, filtros, día de hoy, estado abierto/cerrado,
// visor de afiches, popup, formulario a WhatsApp y mapa diferido.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  let SITIO = {};
  try { SITIO = JSON.parse($('#sitio').textContent); } catch { /* sin datos */ }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* sin storage */ } },
  };
  const wa = (t) => `https://api.whatsapp.com/send?phone=${SITIO.whatsapp}&text=${encodeURIComponent(t)}`;

  // ---------- Menú y nav ----------
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  burger.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); } });

  // ---------- Revelados y contadores ----------
  const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  function contar(el) {
    const fin = Number(el.dataset.count) || 0;
    if (reduce || fin < 2) return;
    const t0 = performance.now(), dur = 1400;
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = miles(Math.round(fin * e));
      if (p < 1) requestAnimationFrame(paso);
    };
    el.textContent = '0'; requestAnimationFrame(paso);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in'); io.unobserve(en.target);
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    $$('[data-reveal]').forEach((el) => io.observe(el));
    const io2 = new IntersectionObserver((es) => es.forEach((en) => {
      if (en.isIntersecting) { $$('[data-count]', en.target).forEach(contar); io2.unobserve(en.target); }
    }), { threshold: 0.4 });
    $$('.cifras').forEach((el) => io2.observe(el));
  } else $$('[data-reveal]').forEach((el) => el.classList.add('is-in'));

  // ---------- Filtros ----------
  $$('.chip').forEach((chip) => chip.addEventListener('click', () => {
    $$('.chip').forEach((c) => c.classList.toggle('is-on', c === chip));
    const f = chip.dataset.filtro;
    $$('.svc').forEach((s) => { s.hidden = f !== '*' && s.dataset.cat !== f; });
  }));

  // ---------- Hora de Chile: día de hoy y estado abierto/cerrado ----------
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  function ahoraChile() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    const idx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    return { idx, min: Number(p.hour) * 60 + Number(p.minute) };
  }
  const aMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
  const fmt = (h) => h.replace(/^0/, '');
  function estado(h, now) {
    const dia = (i) => h[(i + 6) % 7]; // h empieza en Lunes
    const hoy = dia(now.idx);
    const tramos = hoy && !hoy.cerrado ? hoy.tramos : [];
    for (const [a, c] of tramos) {
      if (now.min >= aMin(a) && now.min < aMin(c)) return { abierto: true, txt: `Abierto ahora · cierra a las ${fmt(c)}` };
    }
    const prox = tramos.find(([a]) => now.min < aMin(a));
    if (prox) return { abierto: false, txt: `Cerrado · abre hoy a las ${fmt(prox[0])}` };
    for (let k = 1; k <= 7; k++) {
      const d = dia(now.idx + k);
      if (d && !d.cerrado && d.tramos.length) {
        const cuando = k === 1 ? 'mañana' : `el ${d.dia.toLowerCase()}`;
        return { abierto: false, txt: `Cerrado · abre ${cuando} a las ${fmt(d.tramos[0][0])}` };
      }
    }
    return { abierto: false, txt: 'Cerrado' };
  }
  function pintar() {
    // Permite probar con ?hora=lunes-11:00 (solo para revisar la página)
    let now = ahoraChile();
    const t = new URLSearchParams(location.search).get('hora');
    if (t) {
      const [d, hm] = t.split('-'); const i = DIAS.findIndex((x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === d);
      if (i >= 0 && hm) now = { idx: i, min: aMin(hm) };
    }
    $$('.dia').forEach((el) => el.classList.toggle('is-hoy', el.dataset.dia === DIAS[now.idx]));
    $$('[data-hdia]').forEach((el) => el.classList.toggle('is-hoy', el.dataset.hdia === DIAS[now.idx]));
    if (SITIO.horario && SITIO.horario.length === 7) {
      const e = estado(SITIO.horario, now);
      $$('[data-estado]').forEach((el) => { el.hidden = false; el.classList.toggle('is-abierto', e.abierto); $('b', el).textContent = e.txt; });
    }
  }
  pintar(); setInterval(pintar, 60000);

  // ---------- Visor de afiches ----------
  const visor = $('#visor');
  if (visor) {
    $$('[data-flyer]').forEach((b) => b.addEventListener('click', () => {
      const f = SITIO.flyers[Number(b.dataset.flyer)]; if (!f) return;
      $('#visorImg').src = f.i; $('#visorImg').alt = f.t; $('#visorT').textContent = f.t; $('#visorX2').textContent = f.x || '';
      $('#visorWa').href = f.m; visor.showModal();
    }));
    $('#visorX').addEventListener('click', () => visor.close());
    visor.addEventListener('click', (e) => { if (e.target === visor) visor.close(); });
  }

  // ---------- Popup del flyer (una vez por visita) ----------
  const popup = $('#popup');
  if (popup && !store.get('lc_popup')) {
    setTimeout(() => { try { popup.showModal(); store.set('lc_popup', '1'); } catch { /* sin dialog */ } }, 2500);
    popup.addEventListener('click', (e) => { if (e.target === popup || e.target.closest('[data-cerrar-popup]')) popup.close(); });
  }

  // ---------- Formulario a WhatsApp ----------
  const form = $('#form');
  function mensaje() {
    const v = Object.fromEntries(new FormData(form).entries());
    const esp = { perro: '🐶 Perro', gato: '🐱 Gato', otro: '🐾 Otro' }[v.especie] || '';
    return [
      'Hola Life Center 👋 Quiero agendar una hora.',
      '',
      `👤 *Nombre:* ${v.nombre.trim()}`,
      `🐾 *Mascota:* ${v.mascota.trim()} (${esp})`,
      `🩺 *Necesita:* ${v.servicio}`,
      v.zona ? `📍 *Desde:* ${v.zona}` : '',
      v.dia ? `📅 *Día preferido:* ${v.dia}` : '',
      v.detalle.trim() ? `💬 ${v.detalle.trim()}` : '',
    ].filter((x, i, a) => x !== '' || (i > 0 && a[i - 1] !== '')).join('\n');
  }
  function validar() {
    const faltan = ['nombre', 'mascota', 'servicio'].filter((n) => !form.elements[n].value.trim());
    ['nombre', 'mascota', 'servicio'].forEach((n) => form.elements[n].classList.toggle('is-bad', faltan.includes(n)));
    const err = $('#error');
    err.hidden = !faltan.length;
    if (faltan.length) { err.textContent = 'Falta completar: ' + faltan.map((n) => ({ nombre: 'tu nombre', mascota: 'el nombre de tu mascota', servicio: 'lo que necesita' }[n])).join(', ') + '.'; form.elements[faltan[0]].focus(); }
    return !faltan.length;
  }
  if (form) {
    $('#verMsg').addEventListener('click', () => { if (!validar()) return; $('#previewTxt').textContent = mensaje(); $('#preview').hidden = false; });
    form.addEventListener('submit', (e) => { e.preventDefault(); if (validar()) window.open(wa(mensaje()), '_blank', 'noopener'); });
    // Botones "Cotizar" preseleccionan el servicio en el formulario si el usuario lo elige desde las tarjetas (no aplica: abren WhatsApp directo)
  }

  // ---------- Mapa diferido ----------
  const mapa = $('[data-mapa]');
  function cargarMapa() {
    if (!mapa || mapa.querySelector('iframe')) return;
    const f = document.createElement('iframe');
    f.src = mapa.dataset.mapa; f.title = mapa.dataset.titulo; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    mapa.replaceChildren(f);
  }
  if (mapa) {
    $('.mapa__ver', mapa).addEventListener('click', cargarMapa);
    if ('IntersectionObserver' in window) {
      const im = new IntersectionObserver((es) => { if (es[0].isIntersecting) { cargarMapa(); im.disconnect(); } }, { rootMargin: '300px' });
      im.observe(mapa);
    }
  }
})();
