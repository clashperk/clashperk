import { TextChannel } from 'discord.js';
import moment from 'moment';
import { Client } from '../struct/client.js';
import { EMOJIS } from '../util/emojis.js';
import { i18n } from '../util/i18n.js';
import { Enqueuer } from './enqueuer.js';

const SUPPORT_SERVER_GENERAL_CHANNEL_ID = '609074828707758150';

export class MaintenanceLog {
  public inMaintenance: boolean;
  public startTime: Date | null;
  private client: Client;
  private redisKey = 'maintenance_start_timestamp';

  public constructor(enqueuer: Enqueuer) {
    this.client = enqueuer.client;

    this.startTime = null;
    this.inMaintenance = Boolean(false);
  }

  public async init() {
    try {
      const timestamp = await this.client.redis.connection.get(this.redisKey);
      if (timestamp) {
        this.inMaintenance = Boolean(true);
        this.client.inMaintenance = Boolean(true);
        this.startTime = new Date(Number(timestamp));
      }
    } catch {}

    return this.check();
  }

  private async check() {
    try {
      const { res } = await this.client.coc.getClans({
        minMembers: Math.floor(Math.random() * 40) + 10,
        limit: 1
      });
      if (res.status === 503 && !this.inMaintenance) {
        this.inMaintenance = Boolean(true);
        this.client.enqueuer.flush();
        this.startTime = new Date();
        this.sendMessages();
        this.client.inMaintenance = Boolean(true);
        this.client.util.setMaintenanceBreak(false);
        await this.updateTimestamp(this.startTime);
      }

      if (res.status === 200 && this.inMaintenance) {
        const duration = Date.now() - this.startTime!.getTime();
        if (duration > 60_000) {
          this.inMaintenance = Boolean(false);
          this.startTime = null;
          this.sendMessages(duration);
          this.client.enqueuer.init();
          this.client.inMaintenance = Boolean(false);
          this.client.util.setMaintenanceBreak(true);
          await this.updateTimestamp(this.startTime);
        }
      }
    } finally {
      setTimeout(this.check.bind(this), 30000);
    }
  }

  private sendMessages(dur = 0) {
    this.client.logger.info(this.getMessage(), { label: MaintenanceLog.name });
    this.deliverMessages(dur);
    this.sendSupportServerMessage(dur);
  }

  private async deliverMessages(dur = 0) {
    for (const setting of this.client.settings.flatten()) {
      if (!setting.eventsChannel) continue;
      if (setting.eventsChannel === SUPPORT_SERVER_GENERAL_CHANNEL_ID) continue;

      if (this.client.settings.hasCustomBot(setting.guildId) && !this.client.isCustom()) continue;

      const channel = this.client.channels.cache.get(setting.eventsChannel) as TextChannel | null;
      if (
        channel?.isTextBased() &&
        channel
          .permissionsFor(this.client.user)
          ?.has(['SendMessages', 'ViewChannel', 'UseExternalEmojis'])
      ) {
        const message = i18n(
          this.inMaintenance ? 'common.maintenance_start' : 'common.maintenance_end',
          {
            lng: channel.guild.preferredLocale,
            duration: `(Started ${this.dur(dur)} ago)`
          }
        );
        await channel.send(`**${EMOJIS.COC_LOGO} ${message}**`);
      }
    }
  }

  private async sendSupportServerMessage(dur = 0) {
    const channel = this.client.channels.cache.get(SUPPORT_SERVER_GENERAL_CHANNEL_ID);
    if (channel)
      await (channel as TextChannel).send(`**${EMOJIS.COC_LOGO} ${this.getMessage(dur)}**`);
  }

  private getMessage(dur = 0) {
    if (this.inMaintenance) return `Maintenance break has started!`;
    return `Maintenance break is ending soon! (Started ${this.dur(dur)} ago)`;
  }

  private dur(ms: number) {
    return moment.duration(ms).format('D[d], H[h], m[m]', { trim: 'both mid' });
  }

  private async updateTimestamp(timestamp: Date | null) {
    this.startTime = timestamp;

    try {
      if (!timestamp) {
        return await this.client.redis.connection.del(this.redisKey);
      }
      await this.client.redis.connection.set(this.redisKey, timestamp.getTime().toString());
    } catch {}
  }
}
