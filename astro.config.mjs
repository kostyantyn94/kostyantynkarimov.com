// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Internal pages that must not reach search engines.
const NOT_IN_SITEMAP = ['/styleguide'];

// https://astro.build/config
export default defineConfig({
  site: 'https://kostyantynkarimov.com',
  trailingSlash: 'never',
  devToolbar: { enabled: false },
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
