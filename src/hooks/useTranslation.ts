import { useAppStore } from '../store/useAppStore';
import { translate, TranslationKey } from '../localization';

export function useTranslation() {
  const language = useAppStore((state) => state.language);

  const t = (key: TranslationKey): any => {
    return translate(language, key);
  };

  return { t, language };
}
