// Single source of the facts shown on the site. Keep in sync with the CV; never invent numbers.

export const profile = {
  name: 'Kostyantyn Karimov',
  title: 'AI Automation & Agents Engineer',
  focus: ['n8n', 'LLM pipelines', 'RAG & vector search', 'AI voice agents ↔ CRM', 'JavaScript / TypeScript'],
  pitch: 'I wire AI agents, LLMs and CRMs into automations that work in production, not just in a demo.',
  location: 'Uzhhorod, Ukraine',
  timezone: 'UTC+2',
  availability: 'Open to remote work',
  remote: '4+ years, fully remote',
  languages: 'English B2+ · German B2 · Ukrainian, Russian native',
  email: 'kostyantyn.karimov@gmail.com',
  links: {
    github: 'https://github.com/kostyantyn94',
    linkedin: 'https://www.linkedin.com/in/kostyantyn-karimov-2a234b1a3',
  },
  current: {
    role: 'Integrations & AI Voice Agents Engineer',
    company: 'Callers.ai',
    since: 'Aug 2025',
  },
} as const;

export const keyFigures = [
  { value: '82%', label: 'of software items classified without an LLM call' },
  { value: '67%', label: 'of leads decided by rules, no model involved' },
  { value: '0', label: 'LLM and CRM calls when the same data arrives again' },
  { value: '4+ yrs', label: 'working remotely' },
] as const;

export const stack = [
  { group: 'Automation', items: ['n8n', 'Make', 'Zapier', 'Webhooks', 'REST APIs', 'HubSpot', 'Pipedrive'] },
  { group: 'AI & RAG', items: ['Claude API', 'OpenAI API', 'ElevenLabs Agents', 'pgvector', 'RAG', 'MCP'] },
  { group: 'Code & data', items: ['TypeScript', 'JavaScript', 'Node.js', 'PostgreSQL', 'Python', 'Docker'] },
] as const;

export const selectedWork = [
  { title: 'Live Pipeline', kind: 'Playground · Level 4', note: 'Webhook → rules → LLM → CRM, node by node' },
  { title: 'Ask my CV', kind: 'Playground · Level 3', note: 'RAG over pgvector, hybrid search, cited answers' },
  { title: 'Lead pipeline', kind: 'Project · Oct 2026', note: 'n8n, PostgreSQL, HubSpot API v3, LLM' },
  { title: 'SWInv', kind: 'Project · Sep 2026', note: 'n8n, PostgreSQL, Ollama, JSON Schema' },
] as const;
