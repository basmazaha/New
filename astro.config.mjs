import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://example.com', // غيريه لاحقًا

  output: 'server',

  adapter: cloudflare({
    imageService: 'cloudflare',
  }),

  vite: {
    ssr: {
      // اجبري حزم jsonwebtoken وتبعياته
      noExternal: [
        'jsonwebtoken',
        'jwa',
        'jws',
      ],
      // دعم Node.js built-ins اللي بتظهر في الـ warnings
      external: ['node:crypto', 'node:fs/promises', 'node:path', 'node:url'],
    },
    // تحسين الـ build لدعم Node 22+
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2022',
      },
    },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'ar',
        locales: {
          ar: 'ar',
          en: 'en',
        },
      },
    }),
  ],

  i18n: {
    defaultLocale: 'ar',
    locales: ['ar', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: true,
    },
  },

  trailingSlash: 'ignore',
});
