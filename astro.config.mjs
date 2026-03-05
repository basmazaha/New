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
      // الحل الرئيسي: اجبري حزم jsonwebtoken وتبعياتها
      noExternal: [
        'jsonwebtoken',
        'jwa',
        'jws',
      ],
      // إضافة مهمة جدًا لدعم crypto في Cloudflare
      external: ['node:crypto', 'node:fs/promises', 'node:path', 'node:url'],
    },
    // إضافة لتحسين الـ build على Cloudflare
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
