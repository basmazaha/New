import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://example.com', // ← غيّريه لاحقًا للدومين الحقيقي على Cloudflare

  output: 'server', // أو 'hybrid' لو عايزة بعض الصفحات static

  adapter: cloudflare({
    // خيارات مهمة لـ Cloudflare
    imageService: 'cloudflare', // لدعم تحسين الصور عبر Cloudflare Images
    // platformProxy: { enabled: true }, // فعّليه في الـ dev لو عايزة simulate Cloudflare runtime محليًا
  }),

  vite: {
    ssr: {
      // هذا الحل الرئيسي لمشكلة jsonwebtoken في الـ build
      noExternal: [
        'jsonwebtoken',
        'jwa',           // dependency داخلي لـ jsonwebtoken
        'jws',           // dependency داخلي لـ jsonwebtoken
      ],
      // اختياري: لو ظهرت مشاكل مع node:crypto أو غيره
      // external: ['node:crypto', 'node:fs/promises', 'node:path', 'node:url'],
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

  // اختياري: لو عايزة تحددي Node.js version في الـ build
  // vite: {
  //   ...الإعدادات السابقة...
  //   optimizeDeps: {
  //     esbuildOptions: {
  //       target: 'es2022',
  //     },
  //   },
  // },
});
