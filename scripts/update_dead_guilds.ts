import 'dotenv/config';

import { Collections, INACTIVE_GUILD_DURATION } from '@app/constants';
import { ClanStoresEntity } from '@app/entities';
import { AnyBulkWriteOperation } from 'mongodb';
import { mongoClient } from '../src/struct/database.js';

const BATCH_SIZE = 500;

(async () => {
  await mongoClient.connect().then(() => console.log('MongoDB Connected!'));
  const stores = mongoClient.db('clashperk').collection<ClanStoresEntity>(Collections.CLAN_STORES);
  const guilds = mongoClient
    .db('clashperk')
    .collection<{ guild: string; updatedAt: Date; name: string }>(Collections.BOT_GUILDS);

  let ops: AnyBulkWriteOperation<ClanStoresEntity>[] = [];
  let modified = 0;

  const flush = async () => {
    if (!ops.length) return;
    const { modifiedCount } = await stores.bulkWrite(ops, { ordered: false });
    modified += modifiedCount;
    console.log(`Flushed ${ops.length} guilds - ${modifiedCount} clans disabled`);
    ops = [];
  };

  for await (const guild of guilds.find()) {
    const lastExecution = guild.updatedAt || guild._id.getTimestamp();
    const isDead = lastExecution.getTime() <= Date.now() - INACTIVE_GUILD_DURATION;
    if (!isDead) continue;

    ops.push({
      updateMany: {
        filter: { guild: guild.guild, patron: false },
        update: { $set: { lastExecution } }
      }
    });

    if (ops.length >= BATCH_SIZE) await flush();
  }

  await flush();
  console.log(`Disabled ${modified} clans.`);

  return mongoClient.close();
})();
