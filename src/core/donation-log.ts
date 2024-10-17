import { Collections, DonationLogFrequencyTypes } from '@app/constants';
import { ClanLogsEntity, ClanLogType } from '@app/entities';
import { Collection, EmbedBuilder, escapeMarkdown, PermissionsString, time, WebhookClient, WebhookMessageCreateOptions } from 'discord.js';
import moment from 'moment';
import { ObjectId, WithId } from 'mongodb';
import { title } from 'radash';
import { padStart } from '../util/helper.js';
import { Season, Util } from '../util/toolkit.js';
import { Enqueuer } from './enqueuer.js';
import { RootLog } from './root-log.js';

export class DonationLog extends RootLog {
  public declare cached: Collection<string, Cache>;
  private readonly queued = new Set<string>();
  private readonly refreshRate: number;
  private readonly timeouts: {
    daily?: NodeJS.Timeout;
    weekly?: NodeJS.Timeout;
    monthly?: NodeJS.Timeout;
  };

  public constructor(private enqueuer: Enqueuer) {
    super(enqueuer.client);
    this.client = enqueuer.client;
    this.refreshRate = 30 * 60 * 1000;
    this.timeouts = {};
  }

  public override get permissions(): PermissionsString[] {
    return ['SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
  }

  public override get collection() {
    return this.client.db.collection<ClanLogsEntity>(Collections.CLAN_LOGS);
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
    if (data.logType !== cache.logType) return null;

    const embed = await this.rangeDonation(cache, { gte: data.gte, lte: data.lte, interval: data.interval, tag: cache.tag });
    if (!embed) return;

    await this.send(cache, webhook, {
      embeds: [embed],
      threadId: cache.threadId
    });

    return this.collection.updateOne({ _id: cache._id }, { $set: { lastPostedAt: new Date() } });
  }

  private async send(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super.sendMessage(cache, webhook, payload);
    } catch (error) {
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, { label: DonationLog.name });
      return null;
    }
  }

  public async rangeDonation(
    cache: Cache,
    {
      tag,
      gte,
      lte,
      interval
    }: {
      tag: string;
      gte: string;
      lte: string;
      interval: string;
    }
  ) {
    const clan = await this.client.redis.getClan(tag);
    if (!clan?.members) return null;

    const { aggregations } = await this.client.elastic.search({
      index: 'donation_events',
      size: 0,
      from: 0,
      query: {
        bool: {
          filter: [
            {
              term: {
                clan_tag: clan.tag
              }
            },
            {
              range: {
                created_at: {
                  gte,
                  lte
                }
              }
            }
          ]
        }
      },
      aggs: {
        players: {
          terms: {
            field: 'tag',
            size: 10000
          },
          aggs: {
            donated: {
              filter: { term: { op: 'DONATED' } },
              aggs: {
                total: {
                  sum: {
                    field: 'value'
                  }
                }
              }
            },
            received: {
              filter: { term: { op: 'RECEIVED' } },
              aggs: {
                total: {
                  sum: {
                    field: 'value'
                  }
                }
              }
            }
          }
        }
      }
    });

    const { buckets } = (aggregations?.players ?? []) as { buckets: AggsBucket[] };
    const playersMap = buckets.reduce<Record<string, { donated: number; received: number }>>((acc, cur) => {
      acc[cur.key] = {
        donated: cur.donated.total.value,
        received: cur.received.total.value
      };
      return acc;
    }, {});

    const playerTags = Object.keys(playersMap);
    const currentMemberTags = clan.memberList.map((member) => member.tag);
    const oldMemberTags = playerTags.filter((tag) => !currentMemberTags.includes(tag));

    const players = await this.client.db
      .collection(Collections.PLAYERS)
      .find({ tag: { $in: oldMemberTags } }, { projection: { name: 1, tag: 1 } })
      .toArray();

    const result = [...clan.memberList, ...players].map((player) => ({
      name: player.name,
      tag: player.tag,
      donated: playersMap[player.tag]?.donated ?? 0, // eslint-disable-line
      received: playersMap[player.tag]?.received ?? 0 // eslint-disable-line
    }));

    result.sort((a, b) => b.received - a.received);
    result.sort((a, b) => b.donated - a.donated);

    const embed = new EmbedBuilder().setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.large });
    if (cache.color) embed.setColor(cache.color);

    const [description] = Util.splitMessage(
      [
        `**${title(interval.toLowerCase())} Donations**`,
        `${time(moment(gte).toDate())} - ${time(moment(lte).toDate())}`,
        '',
        ...result.map((player) => {
          const don = padStart(player.donated, 5);
          const rec = padStart(player.received, 5);
          const name = escapeMarkdown(player.name);
          return `\` ${don} ${rec} \` \u200e${name}`;
        })
      ].join('\n'),
      { maxLength: 4096 }
    );
    embed.setDescription(description);

    const donated = result.reduce((acc, cur) => acc + cur.donated, 0);
    const received = result.reduce((acc, cur) => acc + cur.received, 0);
    embed.setFooter({ text: `[${donated} DON | ${received} REC]` });
    embed.setTimestamp();
    return embed;
  }

  private async _refreshDaily() {
    if (this.timeouts.daily) clearTimeout(this.timeouts.daily);
    try {
      const interval = DonationLogFrequencyTypes.DAILY;
      const lte = moment().startOf('day').toDate();
      const gte = moment(lte).subtract(1, 'd').toISOString();

      const timestamp = new Date(lte.getTime() + 15 * 60 * 1000);
      if (timestamp.getTime() > Date.now()) return;

      const guildIds = this.client.guilds.cache.map((guild) => guild.id);
      const logs = await this.collection
        .find({
          isEnabled: true,
          guildId: { $in: guildIds },
          lastPostedAt: { $lt: timestamp },
          logType: ClanLogType.DAILY_DONATION_LOG
        })
        .toArray();

      for (const log of logs) {
        if (!this.client.guilds.cache.has(log.guildId)) continue;
        const id = log._id.toHexString();
        if (this.queued.has(id)) continue;

        this.queued.add(id);
        await this.exec(log.clanTag, {
          gte,
          lte: lte.toISOString(),
          interval,
          channel: log.channelId,
          logType: ClanLogType.DAILY_DONATION_LOG
        } satisfies Feed);
        this.queued.delete(id);
        await Util.delay(2000);
      }
    } finally {
      this.timeouts.daily = setTimeout(this._refreshDaily.bind(this), this.refreshRate).unref();
    }
  }

  private async _refreshWeekly() {
    if (this.timeouts.weekly) clearTimeout(this.timeouts.weekly);
    try {
      const interval = DonationLogFrequencyTypes.WEEKLY;
      const lte = moment().startOf('week').toDate();
      const gte = moment(lte).subtract(7, 'days').toISOString();

      const timestamp = new Date(lte.getTime() + 15 * 60 * 1000);
      if (timestamp.getTime() > Date.now()) return;

      const guildIds = this.client.guilds.cache.map((guild) => guild.id);
      const logs = await this.collection
        .find({
          isEnabled: true,
          guildId: { $in: guildIds },
          lastPostedAt: { $lt: timestamp },
          logType: ClanLogType.WEEKLY_DONATION_LOG
        })
        .toArray();

      for (const log of logs) {
        if (!this.client.guilds.cache.has(log.guildId)) continue;
        const id = log._id.toHexString();
        if (this.queued.has(id)) continue;

        this.queued.add(id);
        await this.exec(log.clanTag, {
          gte,
          lte: lte.toISOString(),
          interval,
          channel: log.channelId,
          logType: ClanLogType.WEEKLY_DONATION_LOG
        } satisfies Feed);
        this.queued.delete(id);
        await Util.delay(2000);
      }
    } finally {
      this.timeouts.weekly = setTimeout(this._refreshWeekly.bind(this), this.refreshRate).unref();
    }
  }

  private async _refreshMonthly() {
    if (this.timeouts.monthly) clearTimeout(this.timeouts.monthly);
    try {
      const interval = DonationLogFrequencyTypes.MONTHLY;
      const season = moment(Season.ID);
      const lte = Season.getLastMondayOfMonth(season.month() - 1, season.year());
      const gte = Season.getLastMondayOfMonth(lte.getMonth() - 1, lte.getFullYear()).toISOString();

      const timestamp = new Date(lte.getTime() + 10 * 60 * 1000);
      if (timestamp.getTime() > Date.now()) return;

      const guildIds = this.client.guilds.cache.map((guild) => guild.id);
      const logs = await this.collection
        .find({
          isEnabled: true,
          guildId: { $in: guildIds },
          lastPostedAt: { $lt: timestamp },
          logType: ClanLogType.MONTHLY_DONATION_LOG
        })
        .toArray();

      for (const log of logs) {
        if (!this.client.guilds.cache.has(log.guildId)) continue;
        const id = log._id.toHexString();
        if (this.queued.has(id)) continue;

        this.queued.add(id);
        await this.exec(log.clanTag, {
          gte,
          lte: lte.toISOString(),
          interval,
          channel: log.channelId,
          logType: ClanLogType.MONTHLY_DONATION_LOG
        } satisfies Feed);
        this.queued.delete(id);
        await Util.delay(2000);
      }
    } finally {
      this.timeouts.monthly = setTimeout(this._refreshMonthly.bind(this), this.refreshRate).unref();
    }
  }

  public async init() {
    const guildIds = this.client.guilds.cache.map((guild) => guild.id);
    for await (const data of this.collection.find({
      guildId: { $in: guildIds },
      logType: {
        $in: [ClanLogType.DAILY_DONATION_LOG, ClanLogType.WEEKLY_DONATION_LOG, ClanLogType.MONTHLY_DONATION_LOG]
      },
      isEnabled: true
    })) {
      this.setCache(data);
    }
    (async () => {
      await this._refreshDaily();
      await this._refreshWeekly();
      await this._refreshMonthly();
    })();
  }

  public async add(guildId: string) {
    for await (const data of this.collection.find({
      guildId,
      logType: {
        $in: [ClanLogType.DAILY_DONATION_LOG, ClanLogType.WEEKLY_DONATION_LOG, ClanLogType.MONTHLY_DONATION_LOG]
      },
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
      tag: data.clanTag,
      deepLink: data.deepLink,
      logType: data.logType,
      color: data.color,
      retries: 0,
      webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
    });
  }
}

interface AggsBucket {
  key: string;
  doc_count: number;
  donated: {
    total: {
      value: number;
    };
  };
  received: {
    total: {
      value: number;
    };
  };
}

interface Feed {
  gte: string;
  lte: string;
  logType: ClanLogType;
  channel: string;
  interval: DonationLogFrequencyTypes;
}

interface Cache {
  _id: ObjectId;
  tag: string;
  webhook: WebhookClient | null;
  deleted?: boolean;
  role?: string;
  channel: string;
  guild: string;
  color?: number | null;
  threadId?: string;
  logType: string;
  deepLink?: string;
  retries: number;
}
