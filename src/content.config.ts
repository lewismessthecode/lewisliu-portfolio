import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    github: z.string().optional(),
    demo: z.string().optional(),
    order: z.number().default(99),
    date: z.coerce.date().optional(),
  }),
})

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    date: z.coerce.date(),
    type: z.literal('post').default('post'),
    lang: z.string().optional(),
  }),
})

const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/notes' }),
  schema: z.object({
    title: z.string(),
    tags: z.array(z.string()),
    date: z.coerce.date(),
    type: z.literal('note').default('note'),
  }),
})

export const collections = { projects, posts, notes }
