import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en';
import ru from './ru';
import zh from './zh';

// Try to detect language from Telegram WebApp
const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    lng: tgLang || undefined, // Use Telegram language if available, otherwise let detector decide
    detection: {
      order: ['querystring', 'navigator'],
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
