#!/usr/bin/env node
// Builds the blog with 1, 5, 6 and 11 fake posts and checks pagination. Run: node scripts/test-blog.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const assert = require('assert');

const BUILD = path.join(__dirname, 'build-blog.js');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'blogtest-'));

function run(count) {
  const src = path.join(tmp, `src${count}`);
  const out = path.join(tmp, `out${count}`);
  fs.mkdirSync(src, { recursive: true });
  const posts = [];
  for (let i = 1; i <= count; i++) {
    const slug = `post-${String(i).padStart(2, '0')}`;
    const d = new Date(Date.UTC(2026, 0, i)).toISOString().slice(0, 10);
    posts.push({ slug, title: `Post ${i}`, date: d, excerpt: `Excerpt ${i}` });
    fs.writeFileSync(path.join(src, `${slug}.html`),
      `<!-- note --><!DOCTYPE html><html><head><title>P${i}</title><link rel="canonical" href="https://nautical.co.in/blog/${slug}"></head><body><a href="/blog">blog</a><a href="/blog/post-01.html">first</a><img src="/img/x.png"><img src="/media/${slug}/shot.png"></body></html>`);
  }
  for (let i = 1; i <= count; i++) {
    const dir = path.join(src, 'media', `post-${String(i).padStart(2, '0')}`);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'shot.png'), 'png');
  }
  fs.writeFileSync(path.join(src, 'posts.json'), JSON.stringify(posts.reverse()));
  execFileSync(process.execPath, [BUILD, '--posts', path.join(src, 'posts.json'), '--src', src, '--out', out], { stdio: 'pipe' });
  return out;
}

const read = (f) => fs.readFileSync(f, 'utf8');
const cards = (html) => (html.match(/<article class="post">/g) || []).length;
const firstSlug = (html) => html.match(/<h2><a href="\/([^/]+)\//)[1];

// 5 posts -> one page, no pager
let out = run(5);
assert.strictEqual(cards(read(path.join(out, 'index.html'))), 5);
assert.ok(!read(path.join(out, 'index.html')).includes('class="pager"'), '5 posts: no pager');
assert.ok(!fs.existsSync(path.join(out, 'page/2')), '5 posts: no page 2');

// 6 posts -> 5 + 1, newest first
out = run(6);
let p1 = read(path.join(out, 'index.html'));
assert.strictEqual(cards(p1), 5);
assert.strictEqual(firstSlug(p1), 'post-06', 'newest post first');
assert.strictEqual(cards(read(path.join(out, 'page/2/index.html'))), 1);
assert.strictEqual(firstSlug(read(path.join(out, 'page/2/index.html'))), 'post-01');
assert.ok(p1.includes('href="/page/2/"'), 'page 1 links to page 2');

// 11 posts -> 5 + 5 + 1, page links 1..3 everywhere
out = run(11);
for (const [rel, n] of [['index.html', 5], ['page/2/index.html', 5], ['page/3/index.html', 1]]) {
  const h = read(path.join(out, rel));
  assert.strictEqual(cards(h), n, `${rel} card count`);
  for (const link of ['href="/"', 'href="/page/2/"', 'href="/page/3/"'].filter((l) => !(rel === 'index.html' && l === 'href="/"'))) {
    assert.ok(h.includes(link) || h.includes('aria-current'), `${rel} has ${link}`);
  }
}
assert.ok(read(path.join(out, 'page/3/index.html')).includes('<link rel="canonical" href="https://blog.nautical.co.in/page/3/" />'));
assert.ok(read(path.join(out, 'page/2/index.html')).includes('rel="prev" href="https://blog.nautical.co.in/"'));

// post page: canonical rewritten, note stripped, links rewritten, nav injected
const post = read(path.join(out, 'post-03/index.html'));
assert.ok(post.startsWith('<!DOCTYPE html>'), 'editor note removed');
assert.ok(post.includes('<link rel="canonical" href="https://blog.nautical.co.in/post-03/" />'));
assert.ok(post.includes('href="/"') && post.includes('href="/post-01/"'), 'blog links rewritten');
assert.ok(post.includes('src="https://www.nautical.co.in/img/x.png"'), 'other root links go to main site');
assert.ok(post.includes('← Nautical Blog'), 'nav injected');
assert.ok(post.includes('src="/media/post-03/shot.png"'), 'blog media links stay local');
assert.ok(fs.existsSync(path.join(out, 'media/post-01/shot.png')), 'media copied');

// sitemap: 3 pages + 11 posts
const sm = read(path.join(out, 'sitemap.xml'));
assert.strictEqual((sm.match(/<url>/g) || []).length, 14);
const redirects = JSON.parse(read(path.join(out, 'redirects.json')));
assert.strictEqual(redirects['/blog/post-03.html'], '/post-03/');
assert.ok(fs.existsSync(path.join(out, 'server.py')));

// a post that points at a missing media file must fail the build
fs.rmSync(path.join(tmp, 'src5', 'media', 'post-02'), { recursive: true, force: true });
assert.throws(() => execFileSync(process.execPath, [BUILD, '--posts', path.join(tmp, 'src5', 'posts.json'), '--src', path.join(tmp, 'src5'), '--out', path.join(tmp, 'bad')], { stdio: 'pipe' }), 'missing media fails the build');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('test-blog: all checks passed');
