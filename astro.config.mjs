// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Internal pages that must not reach search engines.
const NOT_IN_SITEMAP = ['/styleguide', '/og', '/cv'];

// https://astro.build/config
export default defineConfig({
  site: 'https://kostyantynkarimov.com',
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  // Short link for the CV, e.g. on LinkedIn or in emails.
  redirects: { '/cv': '/Kostyantyn_Karimov_CV.pdf' },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !NOT_IN_SITEMAP.some((path) => new URL(page).pathname.startsWith(path)),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
