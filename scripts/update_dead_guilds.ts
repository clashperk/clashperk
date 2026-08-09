import 'dotenv/config';

import { Collections } from '@app/constants';
import { ClanStoresEntity } from '@app/entities';
import { mongoClient } from '../src/struct/database.js';

(async () => {
  await mongoClient.connect().then(() => console.log('MongoDB Connected!'));
  const stores = mongoClient.db('clashperk').collection<ClanStoresEntity>(Collections.CLAN_STORES);
  const guilds = mongoClient
    .db('clashperk')
    .collection<{ guild: string; updatedAt: Date }>(Collections.BOT_GUILDS);

  for await (const guild of guilds.find()) {
    const isDead = guild.updatedAt.getTime() <= Date.now() - 365 * 24 * 60 * 60 * 1000;
    if (isDead) {
      await stores.updateMany(
        { guild: guild.guild, patron: false },
        { $set: { lastExecution: guild.updatedAt } }
      );
    }
  }

  return mongoClient.close();
})();
