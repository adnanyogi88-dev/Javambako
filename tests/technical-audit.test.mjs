import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import remark from '../src/remark-demote-h1.mjs';
import { PAGE_SIZE, blogPagePath } from '../src/blogPagination.js';
const image = (url, alt = 'Diagram') => ({ type: 'image', url, alt });
const paragraph = (child) => ({ type: 'paragraph', children: [child] });
test('duplicate opening cover is removed but supporting local image remains', () => {
  const url = '/images/education-2026/cek-fakta-informasi-tembakau.webp';
  const tree = { type: 'root', children: [paragraph(image(url)), paragraph({ type: 'text', value: 'Text' }), paragraph(image(url))] };
  remark()(tree, { data: { astro: { frontmatter: { image: url } } } });
  assert.equal(tree.children.length, 2);
  assert.equal(tree.children[1].children[0].type, 'image');
});
test('unavailable supporting archive illustration retains its description', () => {
  const tree = { type: 'root', children: [paragraph({ type: 'text', value: 'Text' }), paragraph(image('https://javatobacco.com/wp-content/uploads/old.jpg', 'Diagram batch'))] };
  remark()(tree);
  assert.match(tree.children[1].children[0].value, /Diagram batch/);
  assert.match(tree.children[1].children[0].value, /belum tersedia/);
});
test('all archive pages have unique articles, canonical URLs and crawlable pagination', () => {
  const pages = [1, ...readdirSync('dist/blog/page').map(Number).sort((a,b)=>a-b)];
  const slugs = [];
  for (const page of pages) {
    const path = blogPagePath(page);
    const html = readFileSync(`dist${path}index.html`, 'utf8');
    assert.ok(html.includes(`rel="canonical" href="https://javatobacco.com${path}"`));
    const items = [...html.matchAll(/<h2><a href="([^\"]+)">/g)].map(m=>m[1]);
    assert.ok(items.length > 0 && items.length <= PAGE_SIZE);
    slugs.push(...items);
    if (page > 1) assert.ok(html.includes(`href="${blogPagePath(page-1)}" rel="prev"`));
    if (page < pages.length) assert.ok(html.includes(`href="${blogPagePath(page+1)}" rel="next"`));
    assert.ok(readFileSync('dist/sitemap-0.xml','utf8').includes(`https://javatobacco.com${path}</loc>`));
  }
  assert.equal(new Set(slugs).size, slugs.length);
  // Every rendered article must be reachable through the archive exactly once.
  const articles = readdirSync('dist/blog', { withFileTypes: true }).filter(d => d.isDirectory() && !['page','kategori'].includes(d.name));
  assert.equal(slugs.length, articles.length);
  for (const slug of slugs) assert.ok(existsSync(`dist${slug}index.html`));
});
test('article accessibility, structured data, cover and sources are present', () => {
  const html = readFileSync('dist/blog/cek-fakta-informasi-tembakau/index.html','utf8');
  assert.match(html, /class="skip-link" href="#main-content"/);
  assert.match(html, /<main id="main-content"[^>]+tabindex="-1"/);
  assert.match(html, /class="featured-frame"/);
  assert.match(html, /Oleh Redaksi Java Tobacco/);
  assert.equal([...html.matchAll(/<h1[ >]/g)].length, 1);
  const schemas = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  const article = schemas.find(s => s['@type'] === 'Article');
  assert.equal(article.author['@type'], 'Organization');
  for (const domain of ['www.icmje.org','www.nccih.nih.gov','www.cdc.gov']) assert.ok(html.includes(domain));
});
