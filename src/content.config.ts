import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    scheduledAt: z.coerce.date().optional(),
    educational: z.boolean().default(false),
    imageAlt: z.string().optional(),
    image: z.string().optional(),
    author: z.string().optional(),
    slug: z.string().optional(),
    lang: z.string().default('id'),
    status: z.enum(['published', 'draft', 'preview']).default('published'),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    wordpress_id: z.string().optional(),
    original_url: z.string().optional(),
  }),
});

export const collections = { blog };
