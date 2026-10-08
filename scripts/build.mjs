// Arma la web para publicar. Vercel lo ejecuta en cada cambio (ver vercel.json).
//  1. Lee sitio.config.json (desarrollador) y data/*.json (lo edita el cliente en /admin)
//  2. Optimiza fotos a WebP y escribe tarjetas dentro del HTML (Google las ve sin JS)
//  3. Reemplaza %%MARCADORES%% y bloques <!-- SI:CLAVE -->, genera SEO, robots.txt y sitemap.xml
// Uso local: node scripts/build.mjs  →  servir la carpeta dist/
import { readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ICONOS, iconoSvg } from './iconos.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA = join(ROOT, 'data');
const DIST = join(ROOT, 'dist');

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const readData = (f) => {
  if (!existsSync(join(DATA, f))) return {};
  try { return readJson(join(DATA, f)); } catch (e) { console.warn(`⚠️  data/${f} dañado, se usan valores por defecto: ${e.message}`); return {}; }
};

// dist/ se vacía por dentro (en Windows la carpeta puede estar abierta por el servidor local)
mkdirSync(DIST, { recursive: true });
for (const f of readdirSync(DIST)) rmSync(join(DIST, f), { recursive: true, force: true });

let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.warn('⚠️  sharp no está instalado (npm install): se usan las fotos originales'); }
const OPT = 'img/_opt';
const optimizadas = new Map();
function optimizar(src, ancho) {
  const path = String(src || '').replace(/^\//, '');
  if (!sharp || !/\.(jpe?g|png|webp)$/i.test(path) || !existsSync(join(ROOT, path))) return Promise.resolve(path);
  const key = `${path}@${ancho}`;
  if (!optimizadas.has(key)) {
    optimizadas.set(key, (async () => {
      try {
        const buf = readFileSync(join(ROOT, path));
        const out = `${OPT}/${createHash('sha1').update(buf).digest('hex').slice(0, 12)}-${ancho}.webp`;
        mkdirSync(join(DIST, OPT), { recursive: true });
        await sharp(buf).rotate().resize({ width: ancho, withoutEnlargement: true }).webp({ quality: 78 }).toFile(join(DIST, out));
        return out;
      } catch (e) { console.warn(`⚠️  No se pudo optimizar ${path}: ${e.message}`); return path; }
    })());
  }
  return optimizadas.get(key);
}

const config = readJson(join(ROOT, 'sitio.config.json'));
const ajustes = readData('ajustes.json');
const flyerData = readData('flyer.json');
const testimoniosData = readData('testimonios.json');

const propio = config.site_url && !/\.vercel\.app/.test(config.site_url);
const SITE = (!propio && process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : config.site_url || 'http://localhost:5620').replace(/\/$/, '');

// ---------- 1. Datos ----------
const str = (v) => (v === undefined || v === null ? '' : String(v).trim());
const rel = (p) => str(p).replace(/^\//, '');
const num = (v, def) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : def);
const lista = (v) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
const hora = (v) => (/^([01]?\d|2[0-3]):[0-5]\d$/.test(str(v)) ? str(v).padStart(5, '0') : '');

const T = {
  nombre: str(config.nombre), marca_a: str(config.marca_a), marca_b: str(config.marca_b), lema: str(config.lema), rubro: str(config.rubro),
  whatsapp: str(ajustes.whatsapp).replace(/\D/g, ''),
  mensaje: str(ajustes.mensaje_whatsapp) || 'Hola! Quiero agendar una hora.',
  instagram: str(ajustes.instagram).replace(/^@/, ''), email: str(ajustes.email),
  ciudad: str(ajustes.ciudad), region: str(ajustes.region), direccion: str(ajustes.direccion), referencia: str(ajustes.referencia),
  zonas: lista(ajustes.zonas),
};
if (!T.nombre || !T.ciudad) throw new Error('Faltan datos obligatorios: nombre (sitio.config.json) y ciudad (data/ajustes.json)');
if (T.whatsapp && (!/^\d{10,15}$/.test(T.whatsapp) || (T.whatsapp.startsWith('56') && !/^569\d{8}$/.test(T.whatsapp)))) {
  throw new Error(`WhatsApp inválido "${T.whatsapp}": en Chile son 11 dígitos, ej 56912345678`);
}
const wa = (texto) => `https://api.whatsapp.com/send?phone=${T.whatsapp}&text=${encodeURIComponent(texto)}`;

function readFolder(folder) {
  let files = [];
  try { files = readdirSync(join(DATA, folder)).filter((f) => f.endsWith('.json')); } catch { return []; }
  const items = [];
  for (const file of files) {
    try { items.push({ id: basename(file, '.json'), ...readJson(join(DATA, folder, file)) }); }
    catch (e) { console.warn(`⚠️  Se omitió ${folder}/${file}: ${e.message}`); }
  }
  return items;
}

const CATEGORIAS = { vacunas: 'Vacunas y control', cirugias: 'Cirugías', diagnostico: 'Diagnóstico', atencion: 'Consultas y urgencias' };
const MAX_SERVICIOS = 10; // demo
const servicios = readFolder('servicios')
  .filter((s) => s.visible !== false && str(s.nombre))
  .map((s) => {
    const precio = num(s.precio, 0);
    const cat = CATEGORIAS[s.categoria] ? s.categoria : 'atencion';
    return {
      id: s.id, nombre: str(s.nombre), texto: str(s.texto), categoria: cat, icono: ICONOS[s.icono] ? s.icono : 'huella',
      precio, nota: str(s.precio_nota), destacado: s.destacado === true, orden: num(s.orden, 1000),
      mensaje: `Hola Life Center 👋 Quiero info de *${str(s.nombre)}*`,
    };
  })
  .sort((a, b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre, 'es'))
  .slice(0, MAX_SERVICIOS);
const categorias = Object.entries(CATEGORIAS).filter(([id]) => servicios.some((s) => s.categoria === id));

const horario = (Array.isArray(ajustes.horario) ? ajustes.horario : []).map((d) => ({
  dia: str(d && d.dia), cerrado: d && d.cerrado === true,
  tramos: [[hora(d && d.abre), hora(d && d.cierra)], [hora(d && d.abre2), hora(d && d.cierra2)]].filter(([a, c]) => a && c),
})).filter((d) => d.dia);
const hayHorario = horario.length === 7;

const semana = (Array.isArray(ajustes.semana) ? ajustes.semana : []).map((d) => ({
  dia: str(d && d.dia), titulo: str(d && d.titulo), texto: str(d && d.texto),
  color: ['marino', 'naranja', 'verde', 'amarillo', 'crema'].includes(str(d && d.color)) ? str(d.color) : 'crema',
  mensaje: str(d && d.mensaje) || T.mensaje,
})).filter((d) => d.dia && d.titulo);

const cifras = (Array.isArray(ajustes.cifras) ? ajustes.cifras : [])
  .map((c) => ({ numero: Math.max(0, Math.round(num(c && c.numero, 0))), prefijo: str(c && c.prefijo), sufijo: str(c && c.sufijo), texto: str(c && c.texto) }))
  .filter((c) => c.texto).slice(0, 4);
const testimonios = (Array.isArray(testimoniosData.testimonios) ? testimoniosData.testimonios : [])
  .map((t) => ({ texto: str(t && t.texto), nombre: str(t && t.nombre), detalle: str(t && t.detalle) })).filter((t) => t.texto && t.nombre);

const flyer = {
  mostrar: flyerData.mostrar === true && !!str(flyerData.imagen), popup: flyerData.popup === true,
  imagen: rel(flyerData.imagen), titulo: str(flyerData.titulo), texto: str(flyerData.texto),
  mensaje: str(flyerData.mensaje) || T.mensaje,
};
// Cartelera: flyers y casos reales (data/cartelera.json)
const cartelera = (Array.isArray(readData('cartelera.json').items) ? readData('cartelera.json').items : [])
  .map((c) => ({ imagen: rel(c && c.imagen), titulo: str(c && c.titulo), texto: str(c && c.texto), mensaje: str(c && c.mensaje) || T.mensaje }))
  .filter((c) => c.imagen && c.titulo).slice(0, 6);
console.log(`✅ datos: ${servicios.length} servicios, ${cartelera.length} flyers, ${horario.length} días de horario, ${testimonios.length} testimonios`);

// ---------- 2. HTML ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const abs = (p) => `${SITE}/${String(p).replace(/^\//, '')}`;
const pad = (n) => String(n).padStart(2, '0');
const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const flecha = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const servicioHtml = (s, i) => `
        <article class="svc svc--${s.categoria}${s.destacado ? ' svc--big' : ''}" data-cat="${s.categoria}" data-reveal style="--d:${(i % 4) * 70}ms">
          <div class="svc__ico">${iconoSvg(s.icono)}</div>
          <h3>${esc(s.nombre)}</h3>
          <p>${esc(s.texto)}</p>
          <div class="svc__foot">
            <div class="svc__precio">${s.precio ? `<strong>$${miles(s.precio)}</strong>${s.nota ? `<small>${esc(s.nota)}</small>` : ''}` : '<strong class="svc__cotiza">Cotizar por WhatsApp</strong>'}</div>
            <a class="svc__go" target="_blank" rel="noopener" href="${esc(wa(s.mensaje))}" aria-label="Consultar ${esc(s.nombre)} por WhatsApp">${flecha}</a>
          </div>
        </article>`;

const diaHtml = (d, i) => `
        <article class="dia dia--${d.color}" data-dia="${esc(d.dia)}" data-reveal style="--d:${i * 60}ms">
          <span class="dia__nombre">${esc(d.dia)}</span>
          <h3>${esc(d.titulo)}</h3>
          <p>${esc(d.texto)}</p>
          <span class="dia__hoy">Hoy</span>
          <a class="dia__btn" target="_blank" rel="noopener" href="${esc(wa(d.mensaje))}">Agendar ${flecha}</a>
        </article>`;

const filtrosHtml = [['*', 'Todo'], ...categorias].map(([id, n], i) =>
  `<button type="button" class="chip${i === 0 ? ' is-on' : ''}" data-filtro="${esc(id)}">${esc(n)}</button>`).join('');

const carteleraHtml = (c, i, arr) => `
        <button type="button" class="pin" data-flyer="${i}" data-reveal style="--r:${[-3, 2, -1.500, 3, -2, 1][i % 6]}deg;--d:${i * 90}ms" aria-label="Ver ${esc(c.titulo)}">
          <img src="${esc(c.mini)}" alt="${esc(c.titulo)}" loading="lazy" decoding="async">
          <span class="pin__tag">${esc(c.titulo)}</span>
        </button>`;
await Promise.all(cartelera.map(async (c) => { c.mini = await optimizar(c.imagen, 700); c.grande = await optimizar(c.imagen, 1100); }));

const cifraHtml = (c) => `
        <div class="stat"><strong><span>${esc(c.prefijo)}</span><span data-count="${c.numero}">${miles(c.numero)}</span><span>${esc(c.sufijo)}</span></strong><p>${esc(c.texto)}</p></div>`;
const testimonioHtml = (t, i) => `
        <figure class="quote" data-reveal style="--d:${i * 80}ms">
          <div class="quote__stars" aria-label="5 estrellas">★★★★★</div>
          <blockquote>“${esc(t.texto)}”</blockquote>
          <figcaption><strong>${esc(t.nombre)}</strong>${t.detalle ? `<span>${esc(t.detalle)}</span>` : ''}</figcaption>
        </figure>`;

const horarioTabla = horario.map((d) => `
            <tr data-hdia="${esc(d.dia)}"><th>${esc(d.dia)}</th><td>${d.cerrado || !d.tramos.length ? 'Cerrado' : d.tramos.map(([a, c]) => `${a} a ${c}`).join(' y ')}</td></tr>`).join('');

// ---------- 3. Marcadores ----------
const col = config.colores || {};
const fu = config.fuentes || {};
const F1 = fu.titulos || 'Fredoka', F2 = fu.texto || 'Nunito Sans';
const fp = (f, w) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@${w}`;
const heroFoto = rel(ajustes.hero_foto) || 'img/chaucha.jpg';
const SEO_TITULO = str(config.seo_titulo) || `${T.nombre} · ${T.rubro} en ${T.ciudad}`;
const SEO_DESCRIPCION = str(config.seo_descripcion);
const mapaQ = encodeURIComponent(`${T.direccion}, Chile`);
const waNum = T.whatsapp ? `+${T.whatsapp.slice(0, 2)} ${T.whatsapp.slice(2, 3)} ${T.whatsapp.slice(3, 7)} ${T.whatsapp.slice(7)}` : '';

const VARS = {
  NOMBRE: T.nombre, MARCA_A: T.marca_a, MARCA_B: T.marca_b, LEMA: T.lema, RUBRO: T.rubro, SEO_TITULO, SEO_DESCRIPCION,
  CIUDAD: T.ciudad, REGION: T.region, EMAIL: T.email, INSTAGRAM: T.instagram,
  DIRECCION: T.direccion, REFERENCIA: T.referencia,
  WHATSAPP: T.whatsapp ? '1' : '', WA_LINK: T.whatsapp ? wa(T.mensaje) : '#contacto', WA_NUMERO: waNum, TEL_LINK: T.whatsapp ? `tel:+${T.whatsapp}` : '#',
  HERO_EYEBROW: str(ajustes.hero_eyebrow), HERO_TITULO: str(ajustes.hero_titulo), HERO_BAJADA: str(ajustes.hero_bajada), HERO_FOTO_PIE: str(ajustes.hero_foto_pie),
  HERO_FOTO: await optimizar(heroFoto, 900), HERO_FOTO_MOVIL: await optimizar(heroFoto, 600),
  LOGO: await optimizar('img/logo.png', 256),
  HORARIO: hayHorario ? '1' : '', HORARIO_TABLA: horarioTabla,
  DIRECCION_SI: T.direccion ? '1' : '', MAPA_EMBED: `https://www.google.com/maps?q=${mapaQ}&output=embed`,
  MAPA_LINK: `https://www.google.com/maps/search/?api=1&query=${mapaQ}`,
  SEMANA: semana.length ? '1' : '', CARTELERA: cartelera.length ? '1' : '', CIFRAS: cifras.length ? '1' : '',
  TESTIMONIOS: testimonios.length ? '1' : '', FLYER: flyer.mostrar ? '1' : '', EMAIL_SI: T.email ? '1' : '',
  FLYER_IMG: flyer.mostrar ? await optimizar(flyer.imagen, 800) : '', FLYER_TITULO: flyer.titulo, FLYER_TEXTO: flyer.texto,
  FLYER_LINK: T.whatsapp ? wa(flyer.mensaje) : '#contacto', FLYER_POPUP: flyer.mostrar && flyer.popup ? '1' : '',
  FUENTES_URL: `https://fonts.googleapis.com/css2?${fp(F1, '500;600;700')}&${fp(F2, '400;600;700;800')}&display=swap`,
  FUENTE_TITULOS: F1, FUENTE_TEXTO: F2,
  GITHUB_REPO: str(config.github_repo), SITE_URL: `${SITE}/`, ANIO: String(new Date().getFullYear()),
  COLOR_MARINO: col.marino, COLOR_NARANJA: col.naranja, COLOR_AMARILLO: col.amarillo, COLOR_VERDE: col.verde,
  COLOR_CREMA: col.crema, COLOR_PAPEL: col.papel, COLOR_LINEA: col.linea,
  SITIO_JSON: JSON.stringify({
    whatsapp: T.whatsapp, horario, mensaje: T.mensaje,
    servicios: servicios.map((s) => s.nombre),
    flyers: cartelera.map((c) => ({ t: c.titulo, x: c.texto, i: c.grande, m: wa(c.mensaje) })),
  }).replace(/</g, '\\u003c'),
};

function render(text, file, escape) {
  let out = text;
  for (let prev; prev !== out;) {
    prev = out;
    out = out.replace(/<!-- SI:([A-Z0-9_]+) -->([\s\S]*?)<!-- \/SI:\1 -->/g, (m, key, body) => (str(VARS[key]) ? body : ''));
  }
  const missing = new Set();
  out = out.replace(/%%([A-Z0-9_]+)%%/g, (m, key) => {
    const v = VARS[key];
    if (v === undefined || v === null || (v === '' && key.startsWith('COLOR_'))) { missing.add(key); return m; }
    return escape && !['SITIO_JSON', 'HORARIO_TABLA'].includes(key) ? esc(v) : String(v);
  });
  if (missing.size) throw new Error(`${file}: faltan valores para ${[...missing].join(', ')}`);
  return out;
}

// ---------- 4. SEO ----------
const DIAS_SCHEMA = { Lunes: 'Monday', Martes: 'Tuesday', 'Miércoles': 'Wednesday', Jueves: 'Thursday', Viernes: 'Friday', 'Sábado': 'Saturday', Domingo: 'Sunday' };
const jsonLd = {
  '@context': 'https://schema.org', '@type': str(config.schema_tipo) || 'LocalBusiness', '@id': `${SITE}/#empresa`,
  name: T.nombre, slogan: T.lema || undefined, description: SEO_DESCRIPCION, url: `${SITE}/`,
  logo: abs('img/logo.png'), image: [abs(heroFoto)], email: T.email || undefined,
  telephone: T.whatsapp ? `+${T.whatsapp}` : undefined, priceRange: '$$',
  address: { '@type': 'PostalAddress', streetAddress: T.direccion || undefined, addressLocality: T.ciudad, addressRegion: T.region || undefined, addressCountry: 'CL' },
  openingHoursSpecification: hayHorario ? horario.filter((d) => !d.cerrado && d.tramos.length && DIAS_SCHEMA[d.dia]).map((d) => ({
    '@type': 'OpeningHoursSpecification', dayOfWeek: DIAS_SCHEMA[d.dia], opens: d.tramos[0][0], closes: d.tramos[d.tramos.length - 1][1],
  })) : undefined,
  sameAs: T.instagram ? [`https://www.instagram.com/${T.instagram}/`] : undefined,
  hasOfferCatalog: {
    '@type': 'OfferCatalog', name: 'Servicios',
    itemListElement: servicios.map((s) => ({
      '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.nombre, description: s.texto },
      ...(s.precio ? { price: s.precio, priceCurrency: 'CLP' } : {}),
    })),
  },
};
const head = `<link rel="canonical" href="${SITE}/">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(T.nombre)}">
  <meta property="og:locale" content="es_CL">
  <meta property="og:url" content="${SITE}/">
  <meta property="og:title" content="${esc(SEO_TITULO)}">
  <meta property="og:description" content="${esc(SEO_DESCRIPCION)}">
  <meta property="og:image" content="${abs(heroFoto)}">
  <meta name="twitter:card" content="summary_large_image">${config.google_verificacion ? `\n  <meta name="google-site-verification" content="${esc(config.google_verificacion)}">` : ''}
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`;

// ---------- 5. dist/ ----------
const BLOQUES = {
  '<!-- SERVICIOS -->': servicios.map(servicioHtml).join(''),
  '<!-- FILTROS -->': filtrosHtml,
  '<!-- SEMANA_DIAS -->': semana.map(diaHtml).join(''),
  '<!-- CARTELERA_ITEMS -->': cartelera.map(carteleraHtml).join(''),
  '<!-- CIFRAS_ITEMS -->': cifras.map(cifraHtml).join(''),
  '<!-- TESTIMONIOS_ITEMS -->': testimonios.map(testimonioHtml).join(''),
  '<!-- ZONAS -->': T.zonas.map((z) => `<option>${esc(z)}</option>`).join(''),
  '<!-- TIPOS -->': servicios.map((s) => `<option>${esc(s.nombre)}</option>`).join(''),
};
let html = readFileSync(join(ROOT, 'index.html'), 'utf8');
for (const marker of ['<!-- SEO:HEAD', ...Object.keys(BLOQUES)]) if (!html.includes(marker)) throw new Error(`Falta el marcador ${marker} en index.html`);
html = render(html, 'index.html', true).replace(/<!-- SEO:HEAD[^>]*-->/, head);
for (const [marker, contenido] of Object.entries(BLOQUES)) html = html.replaceAll(marker, contenido);

cpSync(join(ROOT, 'img'), join(DIST, 'img'), { recursive: true });
cpSync(join(ROOT, 'admin'), join(DIST, 'admin'), { recursive: true });
cpSync(join(ROOT, 'data'), join(DIST, 'data'), { recursive: true });
const css = render(readFileSync(join(ROOT, 'styles.css'), 'utf8'), 'styles.css', false);
const js = render(readFileSync(join(ROOT, 'app.js'), 'utf8'), 'app.js', false);
const version = (t) => createHash('sha1').update(t).digest('hex').slice(0, 10);
html = html.replace('href="styles.css"', `href="styles.css?v=${version(css)}"`).replace('src="app.js"', `src="app.js?v=${version(js)}"`);
writeFileSync(join(DIST, 'index.html'), html);
writeFileSync(join(DIST, 'styles.css'), css);
writeFileSync(join(DIST, 'app.js'), js);
writeFileSync(join(DIST, 'admin', 'config.yml'), render(readFileSync(join(ROOT, 'admin', 'config.yml'), 'utf8'), 'admin/config.yml', false));

writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`);
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE}/</loc><lastmod>${new Date().toISOString().slice(0, 10)}</lastmod></url>
</urlset>
`);
console.log(`✅ sitio listo en dist/ para ${SITE}`);
