import { InitOptions } from 'i18next';

const allowedLocales = {
  'fr': 'fr-FR', // French/Français
  'de': 'de-DE', // German/Deutsch
  'it': 'it-IT', // Italian/Italiano
  'es-ES': 'es-ES', // Spanish/Español
  'bg': 'bg-BG' // Bulgarian/Български
  // 'no': 'no-NO', // Norwegian/Norsk
  // 'nl': 'nl-NL', // Dutch/Nederlands
  // 'uk': 'uk-UA', // Ukrainian/Українська
  // 'pt-BR': 'pt-BR', // Portuguese/Português
  // 'tr': 'tr-TR', // Turkish/Türkçe
  // 'hu': 'hu-HU' // Hungarian/Magyar
};

export const fallbackLng = Object.fromEntries(Object.entries(allowedLocales).map(([lngCode, locale]) => [lngCode, [locale, 'en-US']]));

export const defaultOptions: InitOptions = {
  debug: false,
  lng: 'en-US',
  load: 'currentOnly',
  defaultNS: 'translation',
  ns: ['translation'],
  preload: ['en-US', 'en-GB', ...Object.values(allowedLocales)],
  fallbackLng: { ...fallbackLng, default: ['en-US'] }
};
