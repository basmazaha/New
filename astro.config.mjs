import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';  // ← غيري vercel لـ cloudflare هنا

export default defineConfig({
  site: 'https://example.com', // غيّريه لاحقًا للـ domain النهائي بتاعك على Cloudflare

  output: 'server',  // سيبيه زي ما هو (أو 'hybrid' لو عايزة بعض الصفحات static)

  adapter: cloudflare({
    // options اللي تناسب Cloudflare (مش زي Vercel)
    // مثال: لو عايزة image optimization على Cloudflare
    imageService: 'cloudflare',  // أو 'passthrough' أو 'compile' – جربي 'cloudflare' لو عندك صور
    // platformProxy: { enabled: true } لو عايزة simulate Cloudflare runtime محليًا في dev (اختياري)
  }),

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'ar',
        locales: {
          ar: 'ar',
          en: 'en'
        }
      }
    })
  ],

  i18n: {
    defaultLocale: 'ar',
    locales: ['ar', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: true
    }
  },

  trailingSlash: 'ignore'
});