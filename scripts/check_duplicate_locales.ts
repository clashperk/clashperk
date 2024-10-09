import locale from '../src/util/locales.js';
const mappings: { context: string; text: string }[] = [];

type Reduced = Record<string, { keys: string[]; value: string; strings: string[]; count: number }>;

(async () => {
  function findDuplicatesRecursive(obj: any, root?: string) {
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        findDuplicatesRecursive(obj[key], root ? `${root}.${key}` : key);
      } else {
        const context = `${root}.${key}`;
        const text = obj[key];
        mappings.push({ context, text });
      }
    }
  }
  findDuplicatesRecursive(locale);

  const reduced = mappings.reduce<Reduced>((record, { context, text }) => {
    const key = text.toLowerCase().trim().replace('.', '');

    record[key] ??= {
      value: key,
      strings: [text],
      keys: [],
      count: 0
    };

    if (!record[key].strings.includes(text)) {
      record[key].strings.push(text);
    }

    record[key].keys.push(context);
    record[key].count++;

    return record;
  }, {});

  const duplicates = Object.values(reduced)
    .sort((a, b) => b.count - a.count)
    .filter((v) => v.count > 1);
  if (!duplicates.length) return;

  console.log('Duplicate strings found');
  console.log(duplicates.filter((v) => v.count > 1));
  const total = duplicates.reduce((acc, v) => acc + v.count, 0);
  throw new Error(`Duplicate strings found: ${total}`);
})();
