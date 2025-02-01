process.env.TZ = 'UTC';
import { Collections } from '@app/constants';
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'url';
import { mongoClient } from '../src/struct/database.js';

const pkgPath = fileURLToPath(new URL('../dump.json', import.meta.url).href);
const tags = JSON.parse((await readFile(pkgPath)).toString()) as string[];

(async () => {
  await mongoClient.connect().then(() => console.log('MongoDB Connected!'));
  const db = mongoClient.db('clashperk');
  const collection = db.collection(Collections.PLAYER_RANKS);

  const batchSize = 10000;
  let startIndex = 0;

  while (startIndex < tags.length) {
    const batch = tags.slice(startIndex, startIndex + batchSize);
    await collection.updateMany({ tag: { $in: batch } }, { $set: { leagueId: 29000000 } });
    startIndex += batchSize;
    console.log(`Updated ${startIndex} players`);
  }

  console.log('Done');
})();
