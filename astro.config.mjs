import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gasolineras-espana.es',
  integrations: [tailwind({ applyBaseStyles: false }), sitemap()],
});
