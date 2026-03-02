// src/i18n/utils.ts
import { translations, type Locale } from './translations';

const DEFAULT_LOCALE: Locale = 'ar';

export function getTranslations(lang: string | undefined): typeof translations['ar'] {
  const locale = (lang && lang in translations ? lang : DEFAULT_LOCALE) as Locale;
  return translations[locale];
}

/**
 * إرجاع دالة t جاهزة للاستخدام
 */
export function useTranslations(currentLocale?: string) {
  const tDict = getTranslations(currentLocale);

  return function t(key: string): string {
    // دعم النقاط المركبة hero.title , services.cards[0].title , إلخ
    return key.split('.').reduce((obj: any, part: string) => {
      if (obj && part in obj) return obj[part];
      return undefined;
    }, tDict) ?? key;   // إرجاع المفتاح نفسه كـ fallback
  };
}
