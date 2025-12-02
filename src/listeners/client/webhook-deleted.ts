import { Collections } from '@app/constants';
import { Guild } from 'discord.js';
import { Listener } from '../../lib/handlers.js';

export default class WebhookDeletedListener extends Listener {
  public constructor() {
    super('webhookDeleted', {
      event: 'guildDelete',
      emitter: 'client',
      category: 'client'
    });
  }

  public async exec(_guild: Guild) {
    const collections = [
      Collections.WAR_REMINDERS,
      Collections.CLAN_GAMES_REMINDERS,
      Collections.RAID_REMINDERS
    ];

    for (const collection of collections) {
      if (collection) continue;

      // await this.client.db
      //   .collection(collection)
      //   .updateOne({ $or: [{ guild: guild.id }, { guildId: guild.id }] }, { $set: { webhook: null } });
    }
  }
}
