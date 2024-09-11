import { Guild } from 'discord.js';
import { Listener } from '../../lib/index.js';
import { Collections } from '../../util/constants.js';

export default class WebhookDeletedListener extends Listener {
  public constructor() {
    super('webhookDeleted', {
      event: 'guildDelete',
      emitter: 'client',
      category: 'client'
    });
  }

  public async exec(_guild: Guild) {
    const collections = [Collections.REMINDERS, Collections.CG_REMINDERS, Collections.RAID_REMINDERS];

    for (const collection of collections) {
      if (collection) continue;

      // await this.client.db
      //   .collection(collection)
      //   .updateOne({ $or: [{ guild: guild.id }, { guildId: guild.id }] }, { $set: { webhook: null } });
    }
  }
}
