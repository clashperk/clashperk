import { EmbedBuilder, Guild, WebhookClient } from 'discord.js';
import { Listener } from '../../lib/handlers.js';
import { mixpanel } from '../../struct/mixpanel.js';
import { Collections, Settings } from '../../util/constants.js';
import { EMOJIS } from '../../util/emojis.js';

export default class GuildDeleteListener extends Listener {
  public webhook: WebhookClient | null = null;

  public constructor() {
    super('guildDelete', {
      emitter: 'client',
      event: 'guildDelete',
      category: 'client'
    });
  }

  private getWebhook() {
    if (this.webhook) return this.webhook;

    const url = this.client.settings.get<string>('global', Settings.GUILD_LOG_WEBHOOK_URL, null);
    if (!url) return null;

    this.webhook = new WebhookClient({ url });
    return this.webhook;
  }

  public async exec(guild: Guild) {
    if (!guild.available) return;
    this.client.util.setPresence();
    this.client.logger.debug(`${guild.name} (${guild.id})`, { label: 'GUILD_DELETE' });

    await this.delete(guild);

    if (this.client.isCustom()) {
      await this.onDelete(guild.id);
    }

    if (!this.client.isOwner(guild.ownerId)) {
      await this.client.stats.post();
      await this.client.stats.deletion();
    }
    await this.client.stats.guilds(guild, 0);

    const values = this.client.shard
      ? ((await this.client.shard.fetchClientValues('guilds.cache.size').catch(() => [0])) as number[])
      : [this.client.guilds.cache.size];
    const guilds = values.reduce((prev, curr) => curr + prev, 0);
    const user = await this.client.users.fetch(guild.ownerId);

    if (!this.client.isOwner(guild.ownerId)) {
      mixpanel.track('Guild delete', {
        distinct_id: guild.ownerId,
        guild_id: guild.id,
        name: guild.name,
        owner_id: guild.ownerId,
        owner_name: user.username,
        member_count: guild.memberCount,
        total_guild_count: guilds
      });
    }

    const webhook = this.getWebhook();
    if (webhook) {
      const embed = new EmbedBuilder()
        .setColor(0xeb3508)
        .setAuthor({ name: `${guild.name} (${guild.id})`, iconURL: guild.iconURL()! })
        .setTitle(`${EMOJIS.OWNER} ${user.displayName} (${user.id})`)
        .setFooter({ text: `${guild.memberCount} members (Shard ${guild.shard.id})`, iconURL: user.displayAvatarURL() })
        .setTimestamp();
      return webhook.send({
        embeds: [embed],
        username: this.client.user!.displayName,
        avatarURL: this.client.user!.displayAvatarURL({ forceStatic: false }),
        content: `**Total ${guilds} | Growth ${await this.growth()}**`
      });
    }
  }

  private async growth() {
    const cursor = this.client.db.collection(Collections.BOT_GROWTH).find();
    const data = await cursor.sort({ createdAt: -1 }).limit(1).next();
    return [data!.addition, data!.deletion, data!.addition - data!.deletion].join('/');
  }

  private async delete(guild: Guild) {
    if (this.client.settings.hasCustomBot(guild) && !this.client.isCustom()) return;

    const db = this.client.db.collection(Collections.CLAN_STORES);
    for await (const data of db.find({ guild: guild.id })) {
      this.client.rpcHandler.delete({ tag: data.tag, guild: guild.id });
    }

    await db.updateMany({ guild: guild.id }, { $set: { paused: true } });
  }

  private async onDelete(guildId: string) {
    const app = await this.client.customBotManager.findBot({ applicationId: this.client.user!.id });
    if (!app) return;

    return this.client.settings.deleteCustomBot(guildId);
  }
}
