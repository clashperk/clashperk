import { APIClan } from 'clashofclans.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  PermissionsString,
  Snowflake,
  SnowflakeUtil,
  WebhookClient
} from 'discord.js';
import { ObjectId } from 'mongodb';
import { Collections } from '../util/constants.js';
import { EMOJIS } from '../util/emojis.js';
import { clanGamesEmbedMaker } from '../util/helper.js';
import { ClanGamesConfig } from '../util/index.js';
import BaseLog from './BaseLog.js';
import RPCHandler from './RPCHandler.js';

export default class ClanGamesLog extends BaseLog {
  public declare cached: Collection<string, Cache>;
  public intervalId!: NodeJS.Timeout;

  public constructor(private handler: RPCHandler) {
    super(handler.client);
    this.client = handler.client;
  }

  public override get collection() {
    return this.client.db.collection(Collections.CLAN_GAMES_LOGS);
  }

  public override get permissions(): PermissionsString[] {
    return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
    if (cache.message && new Date().getDate() === ClanGamesConfig.STARTING_DATE) {
      const lastMonthIndex = new Date(Number(SnowflakeUtil.deconstruct(cache.message).timestamp)).getMonth();
      if (lastMonthIndex < new Date().getMonth()) delete cache.message;
    }

    if (!cache.message) {
      const msg = await this.send(cache, webhook, data);
      return this.updateMessageId(cache, msg);
    }

    const msg = await this.edit(cache, webhook, data);
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

  private async send(cache: Cache, webhook: WebhookClient, data: Feed) {
    const embed = this.embed(cache, data);

    try {
      return await super._send(cache, webhook, {
        embeds: [embed],
        threadId: cache.threadId,
        components: [this._components(data.clan.tag)]
      });
    } catch (error: any) {
      this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'LastSeenLog' });
      return null;
    }
  }

  private async edit(cache: Cache, webhook: WebhookClient, data: Feed) {
    const embed = this.embed(cache, data);
    try {
      return await super._edit(cache, webhook, {
        embeds: [embed],
        threadId: cache.threadId,
        components: [this._components(data.clan.tag)]
      });
    } catch (error: any) {
      this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'LastSeenLog' });
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

  private async _init() {
    for await (const data of this.collection.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })) {
      this.cached.set((data.clanId as ObjectId).toHexString(), {
        clanId: data.clanId,
        tag: data.tag,
        color: data.color,
        guild: data.guild,
        channel: data.channel,
        message: data.message,
        webhook: data.webhook ? new WebhookClient(data.webhook) : null
      });
    }
  }

  public async add(id: string) {
    if (!ClanGamesConfig.Started) return null;
    const data = await this.collection.findOne({ clanId: new ObjectId(id) });

    if (!data) return null;
    return this.cached.set(id, {
      clanId: data.clanId,
      tag: data.tag,
      color: data.color,
      guild: data.guild,
      channel: data.channel,
      message: data.message,
      webhook: data.webhook ? new WebhookClient(data.webhook) : null
    });
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
}

interface Cache {
  tag: string;
  clanId: ObjectId;
  guild: Snowflake;
  color?: number;
  channel: Snowflake;
  message?: Snowflake;
  threadId?: string;
  webhook: WebhookClient | null;
}

interface Feed {
  clan: APIClan;
  total: number;
  members: { name: string; points: number }[];
}
