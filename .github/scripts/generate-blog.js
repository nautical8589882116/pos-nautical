#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');
const posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'blog/posts.json'), 'utf8'));
posts.sort((a, b) => (a.date < b.date ? 1 : -1));
const site = 'https://www.nautical.co.in';
const updated = new Date().toISOString().slice(0, 10);
function esc(s) {
  return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}
const cards = posts.map((p, i) => {
  const newest = i === 0 ? '<span class="tag amber">Newest</span>' : '';
  return `
    <article class="post" id="post-${esc(p.slug)}">
      <div class="meta-row">
        <time class="date" datetime="${esc(p.datetime || p.date)}">${esc(p.dateLabel || p.date)}</time>
        <span class="tag">${esc(p.tag)}</span>
        ${newest}
      </div>
      <h2><a href="${esc(p.path)}">${esc(p.title)}</a></h2>
      <p class="excerpt">${esc(p.excerpt)}</p>
      <p class="differs"><strong>How it differs:</strong> ${esc(p.differs)}</p>
      <div class="url-box">
        <div class="url-label">Public URL to open & index in Google</div>
        <code class="url-value">${esc(p.canonical)}</code>
        <div class="url-actions">
          <a class="btn-sm" href="${esc(p.path)}">Open this blog →</a>
          <a class="btn-sm outline" href="${esc(p.canonical)}" target="_blank" rel="noopener">Open full URL</a>
          <a class="btn-sm outline" href="https://search.google.com/search-console" target="_blank" rel="noopener">Open Search Console</a>
        </div>
      </div>
    </article>`;
}).join('\n');
const ldPosts = posts.map((p) =>
  `{"@type":"BlogPosting","headline":${JSON.stringify(p.title)},"url":${JSON.stringify(p.canonical)},"datePublished":${JSON.stringify(p.datetime || p.date)}}`
).join(',');
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Nautical Blog — Operator guides</title>
<meta name="description" content="Timestamped Nautical guides for restaurants, cafés, bars and retail." />
<meta name="robots" content="index,follow" />
<link rel="canonical" href="${site}/blog/" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@600;700&display=swap" rel="stylesheet" />
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Blog","name":"Nautical Blog","url":"${site}/blog/","blogPost":[${ldPosts}]}
</script>
<style>
:root{--navy:#0B2545;--deep:#061A33;--teal:#17C3CE;--soft:#E6FAFB;--ink:#1F2933;--slate:#5A6B7B;--sand:#F7F9FB;--amber:#F6A609;--paper:#fff}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:var(--paper);color:var(--ink)}
body{font-family:Inter,-apple-system,Segoe UI,sans-serif;font-size:18px;line-height:1.7}
a{color:var(--teal);text-decoration:none}
.wrap{max-width:760px;margin:0 auto;padding:0 22px}
.hero{background:var(--navy);color:#fff;padding:56px 0}
.kicker{color:var(--teal);font-family:Sora,sans-serif;font-weight:600;font-size:13px;letter-spacing:.16em;text-transform:uppercase}
h1{font-family:Sora,sans-serif;font-weight:700;font-size:clamp(28px,4.5vw,40px);margin:12px 0;color:#fff}
.deck{color:#b8c9d9;font-size:17px}
section{padding:40px 0}.sand{background:var(--sand)}
h2.sec{font-family:Sora,sans-serif;color:var(--navy);font-size:22px;margin:0 0 16px}
.steps{list-style:none;margin:0;padding:0;counter-reset:step}
.steps li{position:relative;padding:14px 14px 14px 56px;margin:0 0 10px;background:#fff;border:1.5px solid #e2e8ef;border-radius:12px}
.steps li::before{counter-increment:step;content:counter(step);position:absolute;left:14px;top:14px;width:28px;height:28px;border-radius:50%;background:var(--teal);color:var(--deep);font-family:Sora,sans-serif;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center}
.post{border:1.5px solid #e2e8ef;border-radius:14px;padding:22px;margin:0 0 16px;background:#fff}
.meta-row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:8px}
.date{font-family:Sora,sans-serif;font-weight:600;font-size:13px;color:var(--teal)}
.tag{font-size:12px;font-weight:600;text-transform:uppercase;color:var(--navy);background:var(--soft);border-radius:999px;padding:3px 10px}
.tag.amber{background:#fff8e8;color:#8a5a00}
h2{font-family:Sora,sans-serif;color:var(--navy);font-size:20px;margin:0 0 8px}
h2 a{color:var(--navy)}.excerpt,.differs{color:var(--slate);font-size:15px}
.url-box{background:var(--sand);border-radius:10px;padding:12px;margin-top:12px}
.url-label{font-size:12px;font-weight:600;text-transform:uppercase;color:var(--slate)}
.url-value{display:block;font-size:13px;word-break:break-all;background:#fff;padding:8px;border-radius:6px;margin:6px 0 10px;border:1px solid #e2e8ef}
.url-actions{display:flex;flex-wrap:wrap;gap:8px}
.btn-sm{display:inline-block;background:var(--teal);color:var(--deep);font-family:Sora,sans-serif;font-weight:700;font-size:13px;padding:8px 14px;border-radius:999px}
.btn-sm.outline{background:#fff;border:1.5px solid var(--teal);color:var(--navy)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}
.stat{border:1.5px solid var(--teal);border-radius:12px;padding:14px;text-align:center}
.stat strong{display:block;font-family:Sora,sans-serif;color:var(--navy);font-size:22px}
.cta{background:var(--deep);color:#fff;padding:48px 0;text-align:center}
.btn{display:inline-block;background:var(--teal);color:var(--deep);font-family:Sora,sans-serif;font-weight:700;padding:12px 20px;border-radius:999px}
footer{background:var(--navy);color:#9fb0c3;font-size:13px;padding:20px 0}
@media(max-width:640px){.stats{grid-template-columns:1fr}}
</style>
</head>
<body>
<header class="hero"><div class="wrap">
  <p class="kicker">Nautical · Blog index</p>
  <h1>Operator guides, by date</h1>
  <p class="deck">Every post is timestamped, tagged, and linked to a public URL you can open and submit to Google Search Console.</p>
</div></header>
<section class="sand"><div class="wrap">
  <h2 class="sec">Index this site in Google (one-time + per post)</h2>
  <ol class="steps">
    <li><strong>1. Open Search Console</strong> — Go to <a href="https://search.google.com/search-console" target="_blank" rel="noopener">search.google.com/search-console</a> and select the property for <code>www.nautical.co.in</code>.</li>
    <li><strong>2. Submit the sitemap</strong> — Sitemaps → add <code>${site}/sitemap.xml</code> (rebuilt on every push to main).</li>
    <li><strong>3. Open each post URL</strong> — Use <em>Open this blog</em> or <em>Open full URL</em> on the cards below.</li>
    <li><strong>4. Request indexing</strong> — URL Inspection → paste that URL → Request indexing.</li>
  </ol>
</div></section>
<section><div class="wrap">
  <div class="stats">
    <div class="stat"><strong>${posts.length}</strong><span>Published guides</span></div>
    <div class="stat"><strong>${esc(posts[posts.length-1]?.date||'')} – ${esc(posts[0]?.date||'')}</strong><span>Date range</span></div>
    <div class="stat"><strong>4</strong><span>Operator types</span></div>
  </div>
  <h2 class="sec">All posts (newest first)</h2>
  ${cards}
</div></section>
<section class="cta"><div class="wrap">
  <h2 style="color:#fff;font-family:Sora,sans-serif">Run the floor from one deck.</h2>
  <p style="color:#d5e2ee">Tap Tap Go. Order in 3 Seconds.</p>
  <a class="btn" href="https://app.nautical.co.in/">Try Nautical POS</a>
</div></section>
<footer><div class="wrap">Nautical Blog · Index rebuilt ${esc(updated)} from blog/posts.json</div></footer>
</body>
</html>`;
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${site}/blog/</loc><lastmod>${updated}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
${posts.map((p) => `  <url><loc>${p.canonical}</loc><lastmod>${p.date}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(ROOT, 'blog/index.html'), indexHtml);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap);
console.log('Generated index with', posts.length, 'posts');
