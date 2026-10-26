import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { getArticleImage } from './articleImages.js';

const contentDir = resolve('src/content/blog');
const articleSlugs = new Set(readdirSync(contentDir).filter((file) => file.endsWith('.md')).map((file) => {
  const source = readFileSync(resolve(contentDir, file), 'utf8');
  return source.match(/^slug:\s*["']?([^\r\n"']+)/m)?.[1]?.trim() || basename(file, '.md');
}));

// Preserve imported Markdown while normalizing its rendered structure and
// migrating contextual links from legacy WordPress paths to Astro article URLs.
export default function remarkDemoteH1() {
  return (tree, file = {}) => {
    const data = file.data?.astro?.frontmatter || {};
    const cover = getArticleImage({ data });
    const normalize = (value) => {
      try { return decodeURIComponent(new URL(value, 'https://javatobacco.com').pathname); }
      catch { return value; }
    };
    let firstParagraph = true;
    tree.children = tree.children.flatMap((node) => {
      if (node.type !== 'paragraph') return [node];
      const isFirst = firstParagraph;
      firstParagraph = false;
      const image = node.children?.length === 1 && node.children[0].type === 'image' ? node.children[0] : null;
      // Imported covers were the opening standalone image; the template now owns the cover.
      if (image && isFirst && (normalize(image.url) === normalize(cover)
        || /^https?:\/\/(www\.)?javatobacco\.com\/wp-content\/uploads\//.test(image.url))) return [];
      return [node];
    });
    const visit = (node) => {
      if (node.type === 'heading' && node.depth === 1) node.depth = 2;
      if (node.type === 'link' && node.url) {
        try {
          const url = new URL(node.url, 'https://javatobacco.com');
          if (url.hostname === 'javatobacco.com') {
            const slug = url.pathname.split('/').filter(Boolean)[0];
            if (articleSlugs.has(slug)) node.url = `/blog/${slug}/`;
          }
        } catch {
          // Keep malformed legacy links unchanged so content rendering never fails.
        }
      }
      if (node.children) {
        node.children = node.children.map((child) => {
          // Preserve the Markdown source and description; never silently hide unavailable archive illustrations.
          if (child.type === 'image' && /^https?:\/\/(www\.)?javatobacco\.com\/wp-content\/uploads\//.test(child.url)
            && !existsSync(resolve('public', `.${normalize(child.url)}`))) {
            return { type: 'text', value: ` [Gambar arsip belum tersedia${child.alt ? `: ${child.alt}` : ''}.] ` };
          }
          return child;
        });
        node.children.forEach(visit);
      }
    };
    visit(tree);
  };
}
