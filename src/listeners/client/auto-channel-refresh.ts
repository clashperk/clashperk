import { Collections } from '@app/constants';
import { Listener } from '../../lib/handlers.js';
import { Util } from '../../util/toolkit.js';

export default class AutoChannelRefreshListener extends Listener {
  public constructor() {
    super('auto-channel-refresh', {
      event: 'clientReady',
      emitter: 'client',
      category: 'client'
    });
  }

  public async exec() {
    if (new Date().getTime() >= new Date('2026-08-09').getTime()) return;
    const collection = this.client.db.collection(Collections.CLAN_LOGS);
    for await (const log of collection.find({
      guildId: { $in: [...this.client.guilds.cache.keys()] }
    })) {
      const channel = await this.client.channels.fetch(log.channelId).catch(() => null);
      if (!channel) continue;

      if (channel.isThread()) {
        try {
          if (channel.archived && channel.unarchivable) await channel.setArchived(false);

          this.client.logger.debug(`Cannel unarchived: ${channel.id}`, { label: 'Unarchive' });
        } catch (error) {
          this.client.logger.error(`Cannel unarchive failed - ${channel.id} - ${error.message}`, {
            label: 'Unarchive'
          });
        }

        await collection.updateOne(
          { _id: log._id },
          { $set: { threadId: channel.id, parentId: channel.parentId } }
        );
      }

      await Util.delay(250);
    }
  }
}
