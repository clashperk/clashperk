import { Guild } from 'discord.js';
import { Listener } from '../../lib/index.js';
import { Collections } from '../../util/_constants.js';

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
      Collections.DONATION_LOGS,
      Collections.CAPITAL_LOGS,
      Collections.CLAN_WAR_LOGS,
      Collections.LAST_SEEN_LOGS,
      Collections.CLAN_FEED_LOGS,
      Collections.JOIN_LEAVE_LOGS,
      Collections.CLAN_GAMES_LOGS,
      Collections.CLAN_EMBED_LOGS,
      Collections.REMINDERS,
      Collections.CG_REMINDERS,
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
