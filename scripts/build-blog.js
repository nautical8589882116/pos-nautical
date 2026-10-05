#!/usr/bin/env node
/*
 * Builds the static site for https://blog.nautical.co.in
 *
 *   node scripts/build-blog.js [--posts blog/posts.json] [--src blog] [--out dist]
 *
 * Input:  blog/posts.json  (one entry per post) + blog/<slug>.html (the post itself)
 * Output: dist/index.html            page 1  (newest PER_PAGE posts)
 *         dist/page/<n>/index.html   page n  (older posts, PER_PAGE each)
 *         dist/<slug>/index.html     full post
 *         dist/sitemap.xml, dist/robots.txt, dist/404.html, dist/redirects.json, dist/server.py
 *
 * To publish a post: add blog/<slug>.html + one entry in blog/posts.json, push to main.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://blog.nautical.co.in';
const MAIN_SITE = 'https://www.nautical.co.in';
const PER_PAGE = 5;

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
}
const POSTS_FILE = path.resolve(ROOT, arg('posts', 'blog/posts.json'));
const SRC_DIR = path.resolve(ROOT, arg('src', 'blog'));
const OUT = path.resolve(ROOT, arg('out', 'dist'));

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function fail(msg) { console.error(`build-blog: ${msg}`); process.exit(1); }

// ---------- load + validate ----------
const raw = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
if (!Array.isArray(raw)) fail('posts.json must be an array');
const seen = new Set();
const posts = raw.filter((p) => !p.draft).map((p, i) => {
  for (const k of ['slug', 'title', 'date']) if (!p[k]) fail(`entry #${i} is missing "${k}"`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) fail(`bad slug "${p.slug}" (use lower-case-with-dashes)`);
  if (['page', 'blog', 'assets'].includes(p.slug)) fail(`slug "${p.slug}" is reserved`);
  if (seen.has(p.slug)) fail(`duplicate slug "${p.slug}"`);
  seen.add(p.slug);
  const file = path.join(SRC_DIR, p.file || `${p.slug}.html`);
  if (!fs.existsSync(file)) fail(`post file not found: ${path.relative(ROOT, file)}`);
  const sortKey = Date.parse(p.datetime || p.date);
  if (Number.isNaN(sortKey)) fail(`bad date for "${p.slug}"`);
  return { ...p, file, sortKey, url: `${SITE}/${p.slug}/` };
});
// newest first; ties broken by slug so output is stable
posts.sort((a, b) => b.sortKey - a.sortKey || a.slug.localeCompare(b.slug));

const pageCount = Math.max(1, Math.ceil(posts.length / PER_PAGE));
const pageUrl = (n) => (n === 1 ? '/' : `/page/${n}/`);

// ---------- output helpers ----------
fs.rmSync(OUT, { recursive: true, force: true });
function write(rel, content) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@600;700&display=swap" rel="stylesheet" />';
const CSS = `
:root{--navy:#0B2545;--deep:#061A33;--teal:#17C3CE;--soft:#E6FAFB;--ink:#1F2933;--slate:#5A6B7B;--sand:#F7F9FB;--line:#E2E8EF;--paper:#fff}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--paper);color:var(--ink)}
body{font-family:Inter,-apple-system,"Segoe UI",sans-serif;font-size:17px;line-height:1.7}
a{color:var(--teal);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:780px;margin:0 auto;padding:0 20px}
.top{background:var(--deep);padding:14px 0}.top .wrap{display:flex;justify-content:space-between;align-items:center;gap:12px}
.brand{font-family:Sora,sans-serif;font-weight:700;color:#fff;font-size:17px}.brand span{color:var(--teal)}
.top a.home{color:#b8c9d9;font-size:14px}
.hero{background:var(--navy);color:#fff;padding:48px 0 40px}
.kicker{color:var(--teal);font-family:Sora,sans-serif;font-weight:600;font-size:13px;letter-spacing:.16em;text-transform:uppercase}
h1{font-family:Sora,sans-serif;font-weight:700;font-size:clamp(28px,4.5vw,40px);line-height:1.2;margin:10px 0}
.deck{color:#b8c9d9;margin:0}
main{padding:36px 0 24px}
.post{border:1.5px solid var(--line);border-radius:14px;padding:22px;margin:0 0 16px;background:#fff;transition:border-color .15s}
.post:hover{border-color:var(--teal)}
.meta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:6px}
.date{font-family:Sora,sans-serif;font-weight:600;font-size:13px;color:var(--teal)}
.tag{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--navy);background:var(--soft);border-radius:999px;padding:2px 10px}
.post h2{font-family:Sora,sans-serif;font-size:21px;line-height:1.35;margin:0 0 8px}
.post h2 a{color:var(--navy)}
.excerpt{color:var(--slate);font-size:15.5px;margin:0 0 12px}
.more{font-family:Sora,sans-serif;font-weight:600;font-size:14px}
.pager{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;padding:12px 0 40px}
.pager a,.pager span{min-width:40px;height:40px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;border:1.5px solid var(--line);font-family:Sora,sans-serif;font-weight:600;font-size:14px;color:var(--navy)}
.pager a:hover{border-color:var(--teal);text-decoration:none}
.pager .cur{background:var(--navy);border-color:var(--navy);color:#fff}
.pager .dis{color:#b5c0cb}
.empty{color:var(--slate);text-align:center;padding:40px 0}
footer{border-top:1px solid var(--line);color:var(--slate);font-size:14px;padding:24px 0 40px}
@media (max-width:560px){.post{padding:18px}.post h2{font-size:19px}}
`;

function shell({ title, description, canonical, head = '', body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="robots" content="index,follow,max-image-preview:large" />
<link rel="canonical" href="${esc(canonical)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Nautical Blog" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(canonical)}" />
${FONTS}
${head}
<style>${CSS}</style>
</head>
<body>
<div class="top"><div class="wrap"><a class="brand" href="/">Nautical <span>Blog</span></a><a class="home" href="${MAIN_SITE}/">nautical.co.in →</a></div></div>
${body}
<footer><div class="wrap">© ${new Date().getFullYear()} Nautical POS · <a href="${MAIN_SITE}/">nautical.co.in</a> · <a href="/sitemap.xml">Sitemap</a></div></footer>
</body>
</html>
`;
}

function pager(n) {
  if (pageCount < 2) return '';
  const parts = [];
  parts.push(n > 1 ? `<a href="${pageUrl(n - 1)}" rel="prev">← Newer</a>` : '<span class="dis">← Newer</span>');
  for (let i = 1; i <= pageCount; i++) {
    parts.push(i === n ? `<span class="cur" aria-current="page">${i}</span>` : `<a href="${pageUrl(i)}">${i}</a>`);
  }
  parts.push(n < pageCount ? `<a href="${pageUrl(n + 1)}" rel="next">Older →</a>` : '<span class="dis">Older →</span>');
  return `<nav class="pager" aria-label="Blog pages">${parts.join('')}</nav>`;
}

function card(p) {
  return `<article class="post">
  <div class="meta"><time class="date" datetime="${esc(p.datetime || p.date)}">${esc(p.dateLabel || p.date)}</time>${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ''}</div>
  <h2><a href="/${esc(p.slug)}/">${esc(p.title)}</a></h2>
  ${p.excerpt ? `<p class="excerpt">${esc(p.excerpt)}</p>` : ''}
  <a class="more" href="/${esc(p.slug)}/">Read the full post →</a>
</article>`;
}

// ---------- listing pages ----------
for (let n = 1; n <= pageCount; n++) {
  const slice = posts.slice((n - 1) * PER_PAGE, n * PER_PAGE);
  const canonical = SITE + pageUrl(n);
  const links = [
    n > 1 ? `<link rel="prev" href="${SITE}${pageUrl(n - 1)}" />` : '',
    n < pageCount ? `<link rel="next" href="${SITE}${pageUrl(n + 1)}" />` : '',
  ].join('');
  const ld = {
    '@context': 'https://schema.org', '@type': 'Blog', name: 'Nautical Blog', url: canonical,
    blogPost: slice.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: p.url, datePublished: p.datetime || p.date })),
  };
  const html = shell({
    title: n === 1 ? 'Nautical Blog — Guides for restaurants, cafés, bars and shops' : `Nautical Blog — Page ${n} of ${pageCount}`,
    description: 'Practical guides from Nautical POS on menus, QR ordering, inventory and marketing for restaurants, cafés, bars and retail shops.',
    canonical,
    head: `${links}<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
    body: `<header class="hero"><div class="wrap"><div class="kicker">Nautical Blog${n > 1 ? ` · Page ${n}` : ''}</div><h1>Guides for running the floor</h1><p class="deck">Newest first. ${posts.length} post${posts.length === 1 ? '' : 's'} across ${pageCount} page${pageCount === 1 ? '' : 's'}.</p></div></header>
<main><div class="wrap">
${slice.length ? slice.map(card).join('\n') : '<p class="empty">No posts yet.</p>'}
</div></main>
<div class="wrap">${pager(n)}</div>`,
  });
  write(n === 1 ? 'index.html' : `page/${n}/index.html`, html);
}
// /page/1/ is the same as / — keep it out of the index and send people home.
write('page/1/index.html', `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Nautical Blog</title><link rel="canonical" href="${SITE}/"><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0; url=/"></head><body><a href="/">Nautical Blog</a></body></html>\n`);

// ---------- post pages ----------
const redirects = { '/blog': '/', '/blog/': '/', '/page/1': '/', '/page/1/': '/', '/index.html': '/' };

function rewriteLinks(html, slugs) {
  // root-relative links: /blog -> /, /blog/<slug>(.html) -> /<slug>/, anything else -> main site
  return html.replace(/(\s(?:href|src)=["'])(\/[^"']*)(["'])/g, (m, a, url, b) => {
    if (url.startsWith('//')) return m;
    const clean = url.split(/[?#]/)[0];
    const hit = clean.match(/^\/blog\/?([a-z0-9-]*?)(?:\.html)?\/?$/);
    if (hit) {
      if (!hit[1]) return `${a}/${b}`;
      if (slugs.has(hit[1])) return `${a}/${hit[1]}/${b}`;
    }
    return `${a}${MAIN_SITE}${url}${b}`;
  }).replace(/(https?:\/\/(?:www\.)?nautical\.co\.in\/blog\/)([a-z0-9-]+)(?:\.html)?(["'#?])/g, (m, pre, slug, end) =>
    (slugs.has(slug) ? `${SITE}/${slug}/${end}` : m));
}

const NAV = `<nav style="background:#061A33;padding:10px 20px;font:600 14px/1.4 Sora,Inter,'Segoe UI',sans-serif;display:flex;justify-content:space-between;gap:12px;position:relative;z-index:50"><a href="/" style="color:#17C3CE;text-decoration:none">← Nautical Blog</a><a href="${MAIN_SITE}/" style="color:#b8c9d9;text-decoration:none">nautical.co.in</a></nav>`;

for (const p of posts) {
  let html = fs.readFileSync(p.file, 'utf8').replace(/^\uFEFF/, '');
  // drop editor notes placed before the doctype
  const dt = html.search(/<!DOCTYPE/i);
  if (dt > 0) html = html.slice(dt);
  html = rewriteLinks(html, seen);
  const canon = `<link rel="canonical" href="${p.url}" />`;
  html = /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html)
    ? html.replace(/<link[^>]+rel=["']canonical["'][^>]*>/i, canon)
    : html.replace(/<\/head>/i, `${canon}\n</head>`);
  html = html.replace(/(<meta[^>]+property=["']og:url["'][^>]+content=["'])[^"']*(["'])/i, `$1${p.url}$2`);
  html = html.replace(/("mainEntityOfPage"\s*:\s*)"[^"]*"/, `$1"${p.url}"`);
  if (!/<meta[^>]+name=["']robots["']/i.test(html)) html = html.replace(/<\/head>/i, '<meta name="robots" content="index,follow,max-image-preview:large" />\n</head>');
  html = html.replace(/<body([^>]*)>/i, `<body$1>\n${NAV}`);
  write(`${p.slug}/index.html`, html);
  for (const legacy of [`/${p.slug}`, `/${p.slug}.html`, `/blog/${p.slug}`, `/blog/${p.slug}/`, `/blog/${p.slug}.html`]) redirects[legacy] = `/${p.slug}/`;
  for (const old of p.aliases || []) redirects[old] = `/${p.slug}/`;
}

// ---------- sitemap / robots / 404 ----------
const today = new Date().toISOString().slice(0, 10);
const day = (p) => String(p.updated || p.datetime || p.date).slice(0, 10);
const urls = [
  ...Array.from({ length: pageCount }, (_, i) => ({ loc: SITE + pageUrl(i + 1), lastmod: i === 0 && posts[0] ? day(posts[0]) : today })),
  ...posts.map((p) => ({ loc: p.url, lastmod: day(p) })),
];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
write('404.html', shell({
  title: 'Page not found — Nautical Blog', description: 'This page does not exist.', canonical: `${SITE}/`,
  head: '<meta name="robots" content="noindex" />',
  body: '<header class="hero"><div class="wrap"><div class="kicker">404</div><h1>That page is not here</h1><p class="deck"><a href="/" style="color:#17C3CE">Go to the latest posts →</a></p></div></header>',
}));
write('redirects.json', JSON.stringify(redirects, null, 2) + '\n');
fs.copyFileSync(path.join(__dirname, 'blog-server.py'), path.join(OUT, 'server.py'));

console.log(`build-blog: ${posts.length} posts, ${pageCount} page(s), ${PER_PAGE} per page -> ${path.relative(ROOT, OUT) || '.'}`);
posts.forEach((p, i) => console.log(`  p${Math.floor(i / PER_PAGE) + 1}  ${day(p)}  /${p.slug}/`));
