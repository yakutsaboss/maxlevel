import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en';
import ru from './ru';
import zh from './zh';

// Try to detect language: saved user choice > Telegram WebApp > browser
const savedLang = localStorage.getItem('maxlevel-language');
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
    lng: savedLang || tgLang || undefined, // Saved choice > Telegram language > detector
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      lookupLocalStorage: 'maxlevel-language',
    },
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
