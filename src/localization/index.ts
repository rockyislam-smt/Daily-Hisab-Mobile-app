import { en } from './en';
import { bn } from './bn';

export type TranslationKey = keyof typeof en;
export type Language = 'en' | 'bn';

export const translations = { en, bn };

export function translate(lang: Language, key: TranslationKey): any {
  const dict = translations[lang] || translations.en;
  return dict[key] || translations.en[key] || key;
}

export { en, bn };
