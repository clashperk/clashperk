import { CLAN_GAMES_STARTING_DATE, Collections } from '@app/constants';
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
import moment from 'moment';
import { ObjectId, WithId } from 'mongodb';
import { clanGamesEmbedMaker } from '../helper/clan-games.helper.js';
import { EMOJIS } from '../util/emojis.js';
import { Enqueuer } from './enqueuer.js';
import { RootLog } from './root-log.js';

export class ClanGamesLog extends RootLog {
  declare public cached: Collection<string, Cache>;
  public refreshRate: number;
  public intervalId!: NodeJS.Timeout;

  public constructor(private enqueuer: Enqueuer) {
    super(enqueuer.client);
    this.client = enqueuer.client;
    this.refreshRate = 30 * 60 * 1000;
  }

  public override get collection() {
    return this.client.db.collection<ClanLogsEntity>(Collections.CLAN_LOGS);
  }

  public override get permissions(): PermissionsString[] {
    return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
    if (cache.message && new Date().getDate() === CLAN_GAMES_STARTING_DATE) {
      const messageDate = moment(
        Number(SnowflakeUtil.deconstruct(cache.message).timestamp)
      ).startOf('month');
      const currentDate = moment().startOf('month');

      if (moment(messageDate).isBefore(moment(currentDate), 'month')) {
        delete cache.message;
      }
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
          .setCustomId(
            JSON.stringify({ cmd: 'clan-games', max: false, tag, season: this.seasonId })
          )
          .setEmoji(EMOJIS.REFRESH)
          .setStyle(ButtonStyle.Secondary)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            JSON.stringify({
              cmd: 'clan-games',
              max: true,
              filter: false,
              tag,
              season: this.seasonId
            })
          )
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
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, {
        label: ClanGamesLog.name
      });
      return null;
    }
  }

  private async edit(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super.editMessage(cache, webhook, payload);
    } catch (error) {
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, {
        label: ClanGamesLog.name
      });
      return null;
    }
  }

  private embed(cache: Cache, { clan, ...data }: Feed) {
    return clanGamesEmbedMaker(clan, {
      members: data.members,
      seasonId: this.seasonId,
      color: cache.color
    });
  }

  private didStart() {
    const startTime = new Date();
    startTime.setDate(CLAN_GAMES_STARTING_DATE);
    startTime.setHours(6, 0, 0, 0);

    const endTime = new Date();
    endTime.setDate(CLAN_GAMES_STARTING_DATE + 6);
    endTime.setHours(10, 0, 0, 0);

    return new Date() >= startTime && new Date() <= endTime;
  }

  public async init() {
    if (this.didStart()) {
      this._flush();
      return this._init();
    }

    clearInterval(this.intervalId);
    this.intervalId = setInterval(
      async () => {
        if (this.didStart()) {
          this._flush();
          await this._init();
          clearInterval(this.intervalId);
        }
      },
      5 * 60 * 1000
    ).unref();
  }

  private async flush(intervalId: NodeJS.Timeout) {
    if (this.didStart()) return null;
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
      color: data.color,
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
  color?: number | null;
  threadId?: string;
  logType: string;
  deepLink?: string;
  retries: number;
}
