import 'dotenv/config';

import { Collections } from '@app/constants';
import { ClanStoresEntity } from '@app/entities';
import { mongoClient } from '../src/struct/database.js';

(async () => {
  await mongoClient.connect().then(() => console.log('MongoDB Connected!'));
  const stores = mongoClient.db('clashperk').collection<ClanStoresEntity>(Collections.CLAN_STORES);
  const guilds = mongoClient
    .db('clashperk')
    .collection<{ guild: string; updatedAt: Date; name: string }>(Collections.BOT_GUILDS);

  for await (const guild of guilds.find()) {
    const isDead =
      !guild.updatedAt || guild.updatedAt.getTime() <= Date.now() - 365 * 24 * 60 * 60 * 1000;
    let modified = false;
    if (isDead) {
      const { modifiedCount } = await stores.updateMany(
        { guild: guild.guild, patron: false },
        { $set: { lastExecution: guild.updatedAt || guild._id.getTimestamp() } }
      );
      modified = !!modifiedCount;
    }
    if (modified)
      console.log(
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        `Disabling guild ${guild.name} (${guild.guild}) - ${guild.updatedAt || guild._id.getTimestamp()}`
      );
  }

  return mongoClient.close();
})();
