import { ClanLogsEntity, ClanLogType } from '@app/entities';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  PermissionsString,
  WebhookClient,
  WebhookMessageCreateOptions
} from 'discord.js';
import { ObjectId, WithId } from 'mongodb';
import { Collections } from '../util/constants.js';
import { EMOJIS } from '../util/emojis.js';
import { lastSeenEmbedMaker } from '../util/helper.js';
import { Util } from '../util/util.js';
import BaseClanLog from './base-clan-log.js';
import RPCHandler from './rpc-handler.js';

export default class LastSeenLogV2 extends BaseClanLog {
  public declare cached: Collection<string, Cache>;
  private readonly queued = new Set<string>();
  public refreshRate: number;
  private timeout!: NodeJS.Timeout | null;

  public constructor(private handler: RPCHandler) {
    super(handler.client);
    this.client = handler.client;
    this.refreshRate = 3 * 1000;
  }

  public override get collection() {
    return this.client.db.collection<ClanLogsEntity>(Collections.CLAN_LOGS);
  }

  public override get permissions(): PermissionsString[] {
    return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
    if (cache.logType !== data.logType) return null;

    const embed = await this.embed(cache);
    if (!embed) return null;

    if (!cache.message) {
      const msg = await this.send(cache, webhook, {
        embeds: [embed],
        threadId: cache.threadId,
        components: [this._components(cache.tag)]
      });

      return this.updateMessageId(cache, msg);
    }

    const msg = await this.edit(cache, webhook, {
      embeds: [embed],
      threadId: cache.threadId,
      components: [this._components(cache.tag)]
    });

    return this.updateMessageId(cache, msg);
  }

  private _components(tag: string) {
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId(JSON.stringify({ cmd: 'lastseen', tag }))
          .setEmoji(EMOJIS.REFRESH)
      )
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setCustomId(JSON.stringify({ cmd: 'lastseen', tag, score: true }))
          .setLabel('Scoreboard')
      );

    return row;
  }

  private async send(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super.sendMessage(cache, webhook, payload);
    } catch (error) {
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, { label: LastSeenLogV2.name });
      return null;
    }
  }

  private async edit(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super.editMessage(cache, webhook, payload);
    } catch (error) {
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, { label: LastSeenLogV2.name });
      return null;
    }
  }

  private async embed(cache: Cache) {
    const clan = await this.client.redis.getClan(cache.tag);
    if (!clan) return null;

    const embed = await lastSeenEmbedMaker(clan, { color: cache.color, scoreView: false });
    return embed;
  }

  private async _refresh() {
    if (this.timeout) clearTimeout(this.timeout);

    try {
      const guildIds = this.client.guilds.cache.map((guild) => guild.id);
      const cursor = this.collection.aggregate<WithId<ClanLogsEntity>>([
        {
          $match: {
            guildId: { $in: guildIds },
            logType: ClanLogType.LAST_SEEN_EMBED_LOG,
            lastPostedAt: { $lte: new Date(Date.now() - this.refreshRate * 2) }
          }
        },
        {
          $lookup: {
            from: Collections.CLAN_STORES,
            localField: 'clanId',
            foreignField: '_id',
            as: '_store',
            pipeline: [{ $match: { active: true, paused: false } }, { $project: { _id: 1 } }]
          }
        },
        { $unwind: { path: '$_store' } }
      ]);

      for await (const log of cursor) {
        if (!this.client.guilds.cache.has(log.guildId)) continue;
        const logId = log._id.toHexString();
        if (this.queued.has(logId)) continue;

        this.queued.add(logId);
        await this.exec(log.clanTag, { logType: ClanLogType.LAST_SEEN_EMBED_LOG, channel: log.channelId } satisfies Feed);
        this.queued.delete(logId);
        await Util.delay(3000);
      }
    } finally {
      this.timeout = setTimeout(this._refresh.bind(this), this.refreshRate).unref();
    }
  }

  public async init() {
    const guildIds = this.client.guilds.cache.map((guild) => guild.id);
    for await (const data of this.collection.find({
      guildId: { $in: guildIds },
      logType: ClanLogType.LAST_SEEN_EMBED_LOG,
      isEnabled: true
    })) {
      this.setCache(data);
    }
    (async () => {
      await this._refresh();
    })();
  }

  public async add(guildId: string) {
    for await (const data of this.collection.find({
      guildId,
      logType: ClanLogType.LAST_SEEN_EMBED_LOG,
      isEnabled: true
    })) {
      this.setCache(data);
    }
  }

  private setCache(data: WithId<ClanLogsEntity>) {
    this.cached.set(data._id.toHexString(), {
      _id: data._id,
      guild: data.guildId,
      channel: data.channelId,
      message: data.messageId,
      tag: data.clanTag,
      deepLink: data.deepLink,
      logType: data.logType,
      retries: 0,
      webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
    });
  }
}

interface Feed {
  logType: ClanLogType;
  channel: string;
}

interface Cache {
  _id: ObjectId;
  tag: string;
  webhook: WebhookClient | null;
  deleted?: boolean;
  role?: string;
  channel: string;
  message?: string | null;
  guild: string;
  color?: number;
  threadId?: string;
  logType: string;
  deepLink?: string;
  retries: number;
}
