import fs from 'fs';
import { fileURLToPath } from 'url';
import locale from '../src/util/locales.js';

(() => {
  const data = JSON.stringify(locale, null, 2);
  fs.writeFileSync(fileURLToPath(new URL('../../locales/en-US/translation.json', import.meta.url)), data);
  fs.writeFileSync(fileURLToPath(new URL('../locales/en-US/translation.json', import.meta.url)), data);
})();
