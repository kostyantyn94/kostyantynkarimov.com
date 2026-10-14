// Single source of the facts shown on the site. Keep in sync with the CV; never invent numbers.

export const profile = {
  name: 'Kostyantyn Karimov',
  title: 'AI Automation & Agents Engineer',
  pitch: 'I wire AI agents, LLMs and CRMs into automations that work in production, not just in a demo.',
  location: 'Uzhhorod, Ukraine',
  timezone: 'UTC+2',
  availability: 'Open to remote work',
  remote: '4+ years, fully remote',
  languages: 'English B2+ · German B2 · Ukrainian, Russian native',
  email: 'kostyantyn.karimov@gmail.com',
  cv: '/Kostyantyn_Karimov_CV.pdf',
  links: {
    github: 'https://github.com/kostyantyn94',
    linkedin: 'https://www.linkedin.com/in/kostyantyn-karimov-2a234b1a3',
    source: 'https://github.com/kostyantyn94/kostyantynkarimov.com',
  },
} as const;

export const keyFigures = [
  { value: '82%', label: 'of software items classified without an LLM call' },
  { value: '67%', label: 'of leads decided by rules, no model involved' },
  { value: '0', label: 'LLM and CRM calls when the same data arrives again' },
  { value: '4+ yrs', label: 'working remotely' },
] as const;

// Short version for the bento tile; the full list is in `skills`.
export const stack = [
  { group: 'Automation', items: ['n8n', 'Make', 'Zapier', 'Webhooks', 'REST APIs', 'HubSpot', 'Pipedrive'] },
  { group: 'AI & RAG', items: ['Claude API', 'OpenAI API', 'ElevenLabs Agents', 'pgvector', 'RAG', 'MCP'] },
  { group: 'Code & data', items: ['TypeScript', 'JavaScript', 'Node.js', 'PostgreSQL', 'Python', 'Docker'] },
] as const;

export type Level = 1 | 2 | 3 | 4;

export interface Demo {
  slug: string;
  level: Level;
  title: string;
  summary: string;
  proves: string;
  /** Flip to true when the demo ships; until then the card says "In progress" and has no link. */
  live: boolean;
}

export const demos: Demo[] = [
  {
    slug: 'webhook-inspector',
    level: 1,
    title: 'Webhook Inspector',
    summary: 'Send a messy lead and watch it get normalized, validated and deduplicated.',
    proves: 'Clean input before anything else touches it.',
    live: false,
  },
  {
    slug: 'rule-engine',
    level: 1,
    title: 'Rule Engine',
    summary: 'Rules are rows in a table. Change one and see which leads still need a model.',
    proves: 'Deterministic first, cheap by design.',
    live: false,
  },
  {
    slug: 'sql-playground',
    level: 2,
    title: 'SQL Playground',
    summary: 'A real PostgreSQL database running in your browser. Query it, break it, reset it.',
    proves: 'Schemas, views, upserts, triggers, query plans.',
    live: false,
  },
  {
    slug: 'ask-my-cv',
    level: 3,
    title: 'Ask my CV',
    summary: 'Switch between keyword, vector and hybrid search, see what each one found, get an answer with sources.',
    proves: 'RAG on a vector database: embeddings, pgvector, hybrid ranking.',
    live: false,
  },
  {
    slug: 'llm-qualifier',
    level: 3,
    title: 'LLM Qualifier',
    summary:
      'The model answers in JSON, and the JSON is checked before anyone trusts it. Then break the model on purpose.',
    proves: 'Structured output, validation, graceful fallback.',
    live: false,
  },
  {
    slug: 'live-pipeline',
    level: 4,
    title: 'Live Pipeline',
    summary: 'Submit a lead and follow it node by node into a CRM. Then take the CRM down.',
    proves: 'End-to-end integration that survives failures.',
    live: false,
  },
];

export const voiceDemo = {
  title: 'Voice Agent',
  summary:
    'Talk to an AI voice agent that qualifies you as a lead. Its tool calls show up live, and the record lands in a CRM.',
  proves: 'What I do at work: AI voice agents connected to a CRM.',
  live: false,
} as const;

export interface Project {
  name: string;
  title: string;
  date: string;
  repo: string;
  solves: string;
  how: string[];
  proof: { value: string; label: string }[];
  stack: string[];
}

export const projects: Project[] = [
  {
    name: 'Lead pipeline',
    title: 'Lead intake → rules → LLM → CRM',
    date: 'Oct 2026',
    repo: 'https://github.com/kostyantyn94/lead-pipeline-n8n',
    solves:
      'Inbound leads from forms and ads are validated, deduplicated, enriched, qualified and pushed into HubSpot without manual work. Sales only sees the doubtful cases, and every human decision becomes a rule.',
    how: [
      '6 n8n workflows; rules stored as database rows',
      'The LLM only for what rules cannot decide: schema-validated JSON, confidence thresholds, retries, fallback to review',
      'HubSpot v3 sync with an offline mock, error handler, dashboard',
      'Workflows generated from code, logic unit-tested outside n8n',
    ],
    proof: [
      { value: '67%', label: 'decided without the model' },
      { value: '0', label: 'LLM and CRM calls on a repeat run' },
      { value: '4.9 s', label: 'for 55 sample leads' },
    ],
    stack: ['n8n', 'PostgreSQL 17', 'HubSpot API v3', 'OpenAI-compatible LLM', 'Docker Compose', 'node:test'],
  },
  {
    name: 'SWInv',
    title: 'Software inventory with AI classification',
    date: 'Sep 2026',
    repo: 'https://github.com/kostyantyn94/swinv',
    solves:
      'Software inventory and policy compliance across Windows and Linux/macOS fleets, fully on-prem. A local LLM classifies only what dictionaries and rules cannot.',
    how: [
      'Collectors → n8n webhook → PostgreSQL; rules stored as data',
      'LLM output validated against a JSON Schema with confidence thresholds',
      'Priority-protected upserts (human › rule › AI), DB-trigger audit log, review form that turns decisions into rules',
      '5 workflows generated from Python with JavaScript Code nodes',
    ],
    proof: [
      { value: '82%', label: 'classified without an LLM call' },
      { value: '562 → 298', label: 'packages normalized into products' },
      { value: '0.3 s', label: 'repeat run, 0 AI calls' },
    ],
    stack: ['n8n', 'PostgreSQL 16', 'Ollama · qwen2.5:14b', 'JSON Schema', 'Python', 'JavaScript'],
  },
];

export interface Job {
  period: string;
  title: string;
  company: string;
  summary?: string;
  points?: string[];
  tags: string[];
}

export const experience: Job[] = [
  {
    period: 'Aug 2025 — Present',
    title: 'Integrations & AI Voice Agents Engineer',
    company: 'Callers.ai',
    points: [
      "Integrate AI voice agents (ElevenLabs) with HubSpot, Pipedrive and customers' custom CRMs via REST APIs: fetching, creating and updating leads.",
      "Build and maintain n8n and Zapier workflows for the company's integrations and internal automation.",
      'Build, test and monitor integrations with Zoom, Slack, calendars and CRMs.',
      'Troubleshoot client issues with SQL and Grafana logs; build BI dashboards, internal mini-apps and automation scripts in JavaScript.',
      "Maintain the company's frontend on Next.js and Storyblok.",
    ],
    tags: ['ElevenLabs', 'n8n', 'Zapier', 'REST APIs', 'HubSpot', 'Pipedrive', 'SQL', 'Grafana'],
  },
  {
    period: 'Mar 2025 — Jun 2025',
    title: 'Frontend Engineer',
    company: 'VISO',
    tags: ['TypeScript', 'React', 'Next.js'],
  },
  {
    period: 'Dec 2024 — Feb 2025',
    title: 'JavaScript Engineer',
    company: 'Synchronous Health',
    tags: ['React', 'Next.js', 'Node.js'],
  },
  {
    period: 'Jan 2023 — Nov 2024',
    title: 'IT Support Specialist',
    company: 'Synchronous Health',
    tags: ['Support', 'Power BI'],
  },
  {
    period: 'May 2024 — Sep 2024',
    title: 'JavaScript Trainee',
    company: 'DevIT Group',
    tags: ['Shopify', 'Node.js', 'Remix'],
  },
  {
    period: 'Feb 2022 — Nov 2022',
    title: 'IT Support Specialist (German)',
    company: 'Paymash',
    tags: ['Ticketing in German'],
  },
];

export const skills = [
  {
    title: 'AI voice agents ↔ CRM',
    text: "AI voice agents connected to HubSpot, Pipedrive and customers' custom CRMs through REST APIs: fetching, creating and updating leads.",
    tools: ['ElevenLabs Agents', 'HubSpot', 'Pipedrive', 'REST APIs', 'Webhooks'],
  },
  {
    title: 'Workflow automation',
    text: 'n8n, Make and Zapier workflows with branching, retries and error handling, between the tools a business already uses.',
    tools: ['n8n', 'Make', 'Zapier', 'Zoom', 'Slack', 'Google Sheets'],
  },
  {
    title: 'LLM pipelines & RAG',
    text: 'Rules first, the model only where needed, every answer validated. Retrieval on a vector database with hybrid ranking and cited sources.',
    tools: ['Claude API', 'OpenAI API', 'Ollama', 'MCP', 'pgvector', 'Embeddings', 'Hybrid search'],
  },
  {
    title: 'JavaScript / TypeScript',
    text: 'The code between the tools: Node.js scripts and services, n8n Code nodes, internal mini-apps, React and Next.js frontends. This site is TypeScript too.',
    tools: ['JavaScript', 'TypeScript', 'Node.js', 'n8n Code nodes', 'React', 'Next.js'],
  },
] as const;

export const infra = [
  'PostgreSQL / SQL',
  'Python (scripting)',
  'Docker',
  'Grafana',
  'Power BI',
  'Cloudflare',
  'PowerShell',
  'bash',
  'Ansible',
] as const;

export const principles = [
  {
    title: 'Rules first, the model only for what is left.',
    text: 'Cheaper, faster, predictable, and the split is measurable.',
  },
  { title: 'Never trust raw model output.', text: 'A closed JSON schema, validation and confidence thresholds.' },
  {
    title: 'A human for the doubtful cases.',
    text: 'Every human decision becomes a rule, so the same case never needs a human twice.',
  },
  { title: 'Idempotent by design.', text: 'The same data sent twice creates nothing new and costs nothing.' },
  { title: 'Failures are expected.', text: 'Retries, an error handler, and nothing left hanging.' },
  { title: 'An audit trail for every decision.', text: 'Who decided, a human, a rule or the AI, and why.' },
  {
    title: 'Answers come from sources.',
    text: 'Retrieve first, cite what was used, and say "I don\'t know" when nothing relevant was found.',
  },
] as const;
