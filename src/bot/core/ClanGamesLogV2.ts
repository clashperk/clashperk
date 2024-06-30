import { ClanLogsEntity, ClanLogType } from '@app/entities';
import { APIClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  PermissionsString,
  SnowflakeUtil,
  WebhookClient,
  WebhookMessageCreateOptions
} from 'discord.js';
import { ObjectId, WithId } from 'mongodb';
import { Collections } from '../util/Constants.js';
import { EMOJIS } from '../util/Emojis.js';
import { clanGamesEmbedMaker } from '../util/Helper.js';
import { ClanGamesConfig } from '../util/index.js';
import BaseClanLog from './BaseClanLog.js';
import RPCHandler from './RPCHandler.js';

export default class ClanGamesLogV2 extends BaseClanLog {
  public declare cached: Collection<string, Cache>;
  public refreshRate: number;
  public intervalId!: NodeJS.Timeout;

  public constructor(private handler: RPCHandler) {
    super(handler.client);
    this.client = handler.client;
    this.refreshRate = 30 * 60 * 1000;
  }

  public override get collection() {
    return this.client.db.collection<ClanLogsEntity>(Collections.CLAN_LOGS);
  }

  public override get permissions(): PermissionsString[] {
    return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
    if (cache.message && new Date().getDate() === ClanGamesConfig.STARTING_DATE) {
      const lastMonthIndex = new Date(Number(SnowflakeUtil.deconstruct(cache.message).timestamp)).getMonth();
      if (lastMonthIndex < new Date().getMonth()) delete cache.message;
    }

    const embed = this.embed(cache, data);

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
          .setCustomId(JSON.stringify({ cmd: 'clan-games', max: false, tag, season: this.seasonId }))
          .setEmoji(EMOJIS.REFRESH)
          .setStyle(ButtonStyle.Secondary)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId(JSON.stringify({ cmd: 'clan-games', max: true, filter: false, tag, season: this.seasonId }))
          .setLabel('Maximum Points')
          .setStyle(ButtonStyle.Primary)
      );
    return row;
  }

  private get seasonId() {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  }

  private async send(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super.sendMessage(cache, webhook, payload);
    } catch (error) {
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, { label: ClanGamesLogV2.name });
      return null;
    }
  }

  private async edit(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super.editMessage(cache, webhook, payload);
    } catch (error) {
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, { label: ClanGamesLogV2.name });
      return null;
    }
  }

  private embed(cache: Cache, { clan, ...data }: Feed) {
    const embed = clanGamesEmbedMaker(clan, { members: data.members, seasonId: this.seasonId, color: cache.color });
    return embed;
  }

  public async init() {
    if (ClanGamesConfig.Started) {
      this._flush();
      return this._init();
    }

    clearInterval(this.intervalId);
    this.intervalId = setInterval(
      async () => {
        if (ClanGamesConfig.Started) {
          this._flush();
          await this._init();
          clearInterval(this.intervalId);
        }
      },
      5 * 60 * 1000
    ).unref();
  }

  private async flush(intervalId: NodeJS.Timeout) {
    if (ClanGamesConfig.Started) return null;
    await this.init();
    clearInterval(intervalId);
    return this.cached.clear();
  }

  private _flush() {
    const intervalId: NodeJS.Timeout = setInterval(
      () => {
        this.flush(intervalId);
      },
      5 * 60 * 1000
    );
    return intervalId.unref();
  }

  public async _init() {
    const guildIds = this.client.guilds.cache.map((guild) => guild.id);
    for await (const data of this.collection.find({
      guildId: { $in: guildIds },
      logType: ClanLogType.CLAN_GAMES_EMBED_LOG,
      isEnabled: true
    })) {
      this.setCache(data);
    }
  }

  public async add(guildId: string) {
    for await (const data of this.collection.find({
      guildId,
      logType: ClanLogType.CLAN_GAMES_EMBED_LOG,
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
  clan: APIClan;
  total: number;
  members: { name: string; points: number }[];
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
