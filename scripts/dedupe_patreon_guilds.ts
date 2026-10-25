import 'dotenv/config';

import { Collections } from '@app/constants';
import { PatreonMembersEntity } from '@app/entities';
import { mongoClient } from '../src/struct/database.js';

// Dry run by default; pass --write to apply.
const write = process.argv.includes('--write');

(async () => {
  await mongoClient.connect().then(() => console.log('MongoDB Connected!'));
  const collection = mongoClient
    .db('clashperk')
    .collection<PatreonMembersEntity>(Collections.PATREON_MEMBERS);

  for await (const member of collection.find({}, { projection: { id: 1, name: 1, guilds: 1 } })) {
    const guilds = new Map<string, PatreonMembersEntity['guilds'][number]>();
    for (const guild of member.guilds) {
      const existing = guilds.get(guild.id);
      // Later entries carry the newest server name; keep the highest limit, which can be raised manually.
      guilds.set(guild.id, { ...guild, limit: Math.max(guild.limit, existing?.limit ?? 0) });
    }
    if (guilds.size === member.guilds.length) continue;

    console.log(`${member.name} (${member.id}): ${member.guilds.length} -> ${guilds.size} guilds`);
    if (write) {
      await collection.updateOne({ _id: member._id }, { $set: { guilds: [...guilds.values()] } });
    }
  }

  await mongoClient.close();
})();
