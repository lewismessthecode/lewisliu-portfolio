import { getCollection } from 'astro:content'
import type { SiteData } from './commands'

export const profile = {
  name: 'Lewis Liu',
  role: 'Software engineer',
  description: 'I build tools for AI agents, reading, and bioinformatics.',
  bio: 'I’m a software engineer interested in useful tools and thoughtful interfaces. My work spans AI agents, developer tools, and bioinformatics. I previously worked at BGI Genomics on bioinformatics workflows and clinical interpretation.',
  email: 'lewis.o.liu@gmail.com',
  github: 'lewismessthecode',
  twitter: 'leeeewisliu',
} as const

export async function getSiteData(): Promise<SiteData> {
  const [projectEntries, postEntries, noteEntries] = await Promise.all([
    getCollection('projects'), getCollection('posts'), getCollection('notes'),
  ])

  const projects = projectEntries
    .sort((a, b) => a.data.order - b.data.order)
    .map(({ data, body }) => ({ ...data, body: body ?? '' }))
  const garden = [
    ...postEntries.map((entry) => ({
      slug: entry.id.replace(/\.md$/, ''), title: entry.data.title,
      date: entry.data.date.toISOString().slice(0, 10), tags: entry.data.tags,
      type: 'post' as const, body: entry.body ?? '',
    })),
    ...noteEntries.map((entry) => ({
      slug: entry.id.replace(/\.md$/, ''), title: entry.data.title,
      date: entry.data.date.toISOString().slice(0, 10), tags: entry.data.tags,
      type: 'note' as const, body: entry.body ?? '',
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return {
    about: `  ${profile.name}\n\n  ${profile.bio}`,
    skills: [
      { category: 'AI / LLM / Agents', items: ['Agent runtime', 'Agent harness', 'Evaluation', 'RAG'] },
      { category: 'Bioinformatics', items: ['Nextflow', 'WDL', 'Snakemake', 'NGS workflows', 'Variant interpretation'] },
      { category: 'Software', items: ['Python', 'FastAPI', 'TypeScript', 'React', 'Docker', 'Linux'] },
    ],
    projects,
    garden,
    contact: { email: profile.email, github: profile.github, twitter: profile.twitter },
    resume: `  ${profile.name}\n  ${profile.role}\n\n  EXPERIENCE\n  ──────────\n  Previously at BGI Genomics (深圳华大基因)\n  Software and bioinformatics engineering\n\n  SELECTED PROJECTS\n  ─────────────────\n${projects.filter((project) => project.featuredOrder !== undefined).sort((a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99)).map((project) => `  ${project.title} — ${project.description}`).join('\n')}\n\n  RECOGNITION\n  ───────────\n  2023 Aliyun Tianchi Bio AI Challenge — 1st place and Innovation Award\n  Co-author, Human Genomics 18:114 (2024)\n  DOI: 10.1186/s40246-024-00666-w\n\n  EDUCATION\n  ─────────\n  South China Agricultural University\n  Molecular Biology · BSc and MSc`,
  }
}
