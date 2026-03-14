import { translations, type Locale } from './translations';

const DEFAULT_LOCALE: Locale = 'ar';

export function getTranslations(lang: string | undefined) {
  const locale = (lang && lang in translations ? lang : DEFAULT_LOCALE) as Locale;
  return translations[locale];
}

export function useTranslations(currentLocale?: string) {
  const dict = getTranslations(currentLocale);

  return function t(key: string): any {
    return key.split('.').reduce((obj: any, part: string) => {
      if (obj && part in obj) return obj[part];
      return undefined;
    }, dict) ?? key;
  };
}
