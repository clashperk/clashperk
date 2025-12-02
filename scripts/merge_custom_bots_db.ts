process.env.TZ = 'UTC';
import 'dotenv/config';

import { Collections } from '@app/constants';
import { CustomBotsEntity, PatreonMembersEntity } from '@app/entities';
import { RouteBases, Routes } from 'discord.js';
import { mongoClient } from '../src/struct/database.js';

(async () => {
  await mongoClient.connect().then(() => console.log('MongoDB Connected!'));
  const db = mongoClient.db('clashperk');
  const _bots = db.collection<CustomBotsEntity>(Collections.CUSTOM_BOTS);
  const _users = db.collection<PatreonMembersEntity>(Collections.PATREON_MEMBERS);

  const bots = await _bots.find({}).toArray();

  for (const bot of bots) {
    await _bots.updateOne({ serviceId: bot.serviceId }, { $set: { guildIds: [] } });

    const user = await _users.findOne({ id: bot.patronId });
    if (!user) continue;

    for (const { id } of user.guilds) {
      const res = await fetch(
        `${RouteBases.api}${Routes.applicationGuildCommands(bot.serviceId, id)}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bot ${bot.token}`, 'Content-Type': 'application/json' }
        }
      );
      const result = await res.json();
      if (!res.ok) console.log(bot.serviceId, id, res.status, result);

      if (res.ok) {
        await _bots.updateOne({ serviceId: bot.serviceId }, { $addToSet: { guildIds: id } });
      }
    }
  }

  console.log('Done');
})();
