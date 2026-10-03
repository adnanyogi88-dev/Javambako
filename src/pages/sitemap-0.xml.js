import { isPublished } from '../publication.js';
import { getCollection } from 'astro:content';

export const prerender = true;

const xml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const categorySlug = (value) => value.toLocaleLowerCase('id-ID')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export async function GET({ site }) {
  const origin = site || new URL('https://javatobacco.com');
  const posts = await getCollection('blog', isPublished);
  posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const categories = [...new Set(posts.flatMap((post) => post.data.categories || []))];
  const entries = [
    { path: '/', lastmod: null },
    { path: '/blog/', lastmod: posts[0]?.data.updated || posts[0]?.data.date },
    { path: '/daftar-mitra/', lastmod: null },
    ...categories.map((category) => ({ path: `/blog/kategori/${categorySlug(category)}/`, lastmod: null })),
    ...posts.map((post) => ({
      path: `/blog/${post.data.slug || post.slug}/`,
      lastmod: post.data.updated || post.data.date,
    })),
  ];
  const urls = entries.map(({ path, lastmod }) => {
    const modified = lastmod ? `\n    <lastmod>${new Date(lastmod).toISOString()}</lastmod>` : '';
    return `  <url>\n    <loc>${xml(new URL(path, origin).href)}</loc>${modified}\n  </url>`;
  }).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
