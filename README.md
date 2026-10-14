# kostyantynkarimov.com

Personal site of Kostyantyn Karimov, AI Automation & Agents Engineer.

Not a business card but a playground: visitors run live demos, from a webhook normalizer to a full
intake → rules → LLM → CRM pipeline, a SQL playground on real PostgreSQL in the browser and RAG over a
vector database. Each demo shows the code that just ran.

> Status: base set up (stack, design tokens, components). Pages and demos are in progress.

## Stack

- [Astro 7](https://astro.build) for static pages, [React 19](https://react.dev) islands for the interactive demos
- TypeScript everywhere
- [Tailwind CSS 4](https://tailwindcss.com) with "product dark" design tokens (monochrome, hairlines, Geist and Geist Mono)
- [Shiki](https://shiki.style) code highlighting at build time, light and dark themes in one render
- [Lucide](https://lucide.dev) icons
- [Vitest](https://vitest.dev) for demo logic, `astro check` for types, Prettier for formatting
- Planned: PGlite + pgvector (Postgres in the browser), React Flow, Cloudflare Workers + Claude API,
  ElevenLabs Agents. Hosting on Cloudflare.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev      # http://localhost:4321, style guide at /styleguide
npm run ci       # format check, type check, tests, build
```

## Structure

```text
src/
  components/ui/   base components: Button, Card, Chip, CodeBlock, LevelBadge, StatusPill, ...
  layouts/         BaseLayout: meta tags, fonts, theme without a flash
  lib/             plain TypeScript helpers, unit-tested
  pages/           routes; /styleguide shows every token and component
  styles/          global.css: color tokens for both themes, Tailwind theme
```

## License

Code: [MIT](LICENSE). Texts, photo and CV: © Kostyantyn Karimov, all rights reserved.
