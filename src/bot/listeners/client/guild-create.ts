import { ChannelType, EmbedBuilder, Guild, PermissionFlagsBits, TextChannel, WebhookClient } from 'discord.js';
import { Listener } from '../../lib/index.js';
import { mixpanel } from '../../struct/_Mixpanel.js';
import { Collections, Settings } from '../../util/constants.js';
import { EMOJIS } from '../../util/emojis.js';
import { welcomeEmbedMaker } from '../../util/helper.js';

export default class GuildCreateListener extends Listener {
  private webhook: WebhookClient | null = null;

  public constructor() {
    super('guildCreate', {
      emitter: 'client',
      event: 'guildCreate',
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
    this.client.logger.debug(`${guild.name} (${guild.id})`, { label: 'GUILD_CREATE' });

    await this.intro(guild).catch(() => null);

    if (this.client.isCustom()) {
      await this.createCommands(guild);
      await this.onReady();
    }

    if (!this.client.isOwner(guild.ownerId)) {
      await this.client.stats.post();
      await this.client.stats.addition(guild.id);
    }

    await this.restore(guild);
    await this.client.stats.guilds(guild, 0);

    const values = this.client.shard
      ? ((await this.client.shard.fetchClientValues('guilds.cache.size').catch(() => [0])) as number[])
      : [this.client.guilds.cache.size];
    const guilds = values.reduce((prev, curr) => curr + prev, 0);
    const user = await this.client.users.fetch(guild.ownerId);

    if (!this.client.isOwner(guild.ownerId)) {
      mixpanel.track('Guild create', {
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
        .setColor(0x38d863)
        .setAuthor({ name: `${guild.name} (${guild.id})`, iconURL: guild.iconURL({ forceStatic: false })! })
        .setTitle(`${EMOJIS.OWNER} ${user.displayName} (${user.id})`)
        .setFooter({ text: `${guild.memberCount} members (Shard ${guild.shard.id})`, iconURL: user.displayAvatarURL() })
        .setTimestamp();
      return webhook.send({
        embeds: [embed],
        username: this.client.user!.displayName,
        avatarURL: this.client.user!.displayAvatarURL({ extension: 'png' }),
        content: `**Total ${guilds.toLocaleString()} | Growth ${await this.growth()}**`
      });
    }
  }

  private async growth() {
    const cursor = this.client.db.collection(Collections.BOT_GROWTH).find();
    const data = await cursor.sort({ createdAt: -1 }).limit(1).next();
    return [data!.addition, data!.deletion, data!.addition - data!.deletion].join('/');
  }

  private async intro(guild: Guild) {
    const embed = welcomeEmbedMaker();

    if (guild.systemChannelId) {
      const channel = guild.channels.cache.get(guild.systemChannelId) as TextChannel;
      if (
        channel
          .permissionsFor(this.client.user!.id)
          ?.has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ViewChannel])
      ) {
        return channel.send({ embeds: [embed] });
      }
    }

    const channel = guild.channels.cache
      .filter((channel) => channel.type === ChannelType.GuildText)
      .sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime())
      .filter((channel) =>
        channel
          .permissionsFor(this.client.user!.id)!
          .has([PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.ViewChannel])
      )
      .first();
    if (channel) return (channel as TextChannel).send({ embeds: [embed] });
    return this.client.logger.info(`Failed on ${guild.name} (${guild.id})`, { label: 'INTRO_MESSAGE' });
  }

  private async restore(guild: Guild) {
    const db = this.client.db.collection(Collections.CLAN_STORES);

    for await (const data of db.find({ guild: guild.id, active: true })) {
      this.client.rpcHandler.add(data._id.toString(), { tag: data.tag, guild: guild.id, op: 0 });
    }

    await db.updateMany({ guild: guild.id }, { $set: { paused: false } });
  }

  private async createCommands(guild: Guild) {
    const patron = await this.client.patreonHandler.findGuild(guild.id);
    if (!patron?.applicationId) return;

    const app = await this.client.customBotManager.findBot({ applicationId: this.client.user!.id });
    if (!app) return;

    const commands = await this.client.customBotManager.createCommands(app.applicationId, guild.id, app.token);

    if (commands.length) {
      await this.client.customBotManager.addGuild({ guildId: guild.id, applicationId: app.applicationId });
      if (app.isLive) await this.client.settings.setCustomBot(guild);
    }

    return commands;
  }

  private async onReady() {
    const app = await this.client.customBotManager.findBot({ applicationId: this.client.user!.id });
    if (!app || app.isLive) return;

    return this.client.customBotManager.handleOnReady(app);
  }
}
