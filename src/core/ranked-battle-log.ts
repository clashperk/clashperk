import { Collections, COLOR_CODES, UNRANKED_TIER_ID } from '@app/constants';
import { ClanLogsEntity, ClanLogType } from '@app/entities';
import {
  Collection,
  EmbedBuilder,
  PermissionsString,
  WebhookClient,
  WebhookMessageCreateOptions
} from 'discord.js';
import moment from 'moment';
import { ObjectId, WithId } from 'mongodb';
import { cluster } from 'radash';
import { EMOJIS, PLAYER_LEAGUE_TIERS } from '../util/emojis.js';
import { formatLeague } from '../util/helper.js';
import { Util } from '../util/toolkit.js';
import { Enqueuer } from './enqueuer.js';
import { RootLog } from './root-log.js';

export class RankedBattleLog extends RootLog {
  declare public cached: Collection<string, Cache>;
  private readonly queued = new Set<string>();
  public refreshRate: number;
  private timeout!: NodeJS.Timeout | null;
  private lastPostedAt: Date | null = null;

  public constructor(private enqueuer: Enqueuer) {
    super(enqueuer.client);
    this.client = enqueuer.client;
    this.refreshRate = 10 * 60 * 1000;
  }

  public override get collection() {
    return this.client.db.collection<ClanLogsEntity>(Collections.CLAN_LOGS);
  }

  public override get permissions(): PermissionsString[] {
    return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
    if (cache.logType !== data.logType) return null;

    const embeds = await this.getEmbeds(cache);
    if (!embeds?.length) return null;

    for (const chunk of cluster(embeds, 10)) {
      await this.send(cache, webhook, {
        embeds: chunk,
        threadId: cache.threadId
      });
      await Util.delay(250);
    }

    await this.collection.updateOne(
      { _id: cache._id },
      { $set: { lastPostedAt: this.lastPostedAt || new Date() } }
    );
  }

  private async send(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super.sendMessage(cache, webhook, payload);
    } catch (error) {
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, {
        label: RankedBattleLog.name
      });
      return null;
    }
  }

  private async getEmbeds(cache: Cache) {
    const clan = await this.client.redis.getClan(cache.tag);
    if (!clan) return null;

    const { startTime } = Util.getTournamentWindow();
    const weekId = moment(startTime).subtract(7, 'days').format('YYYY-MM-DD');

    const rows = await this.client.clickhouse
      .query({
        format: 'JSON',
        query: `
          SELECT
            tag,
            leagueId,
            trophies
          FROM player_trophy_records
          WHERE weekId = {weekId: String}
            AND tag IN  {tags: Array(String)}
          ORDER BY createdAt DESC
          LIMIT 1 BY tag;
        `,
        query_params: {
          weekId,
          tags: clan.memberList.map((member) => member.tag)
        }
      })
      .then((res) => res.json<{ tag: string; leagueId: number; trophies: number }>());

    const result = rows.data.reduce<
      Record<string, { tag: string; leagueId: number; trophies: number }>
    >((record, row) => {
      record[row.tag] = row;
      return record;
    }, {});

    const embeds = clan.memberList
      .filter((player) => result[player.tag])
      .map((player) => {
        const leagueId = player.leagueTier?.id || UNRANKED_TIER_ID;
        const league = player.leagueTier?.name || 'Unranked';
        const trophies = result[player.tag].trophies;

        const status =
          result[player.tag].leagueId > leagueId
            ? `PROMOTED`
            : result[player.tag].leagueId === leagueId
              ? `STAYED`
              : `DEMOTED`;

        const color =
          status === 'PROMOTED'
            ? COLOR_CODES.GREEN
            : status === 'STAYED'
              ? COLOR_CODES.PEACH
              : COLOR_CODES.RED;

        const label =
          status === 'PROMOTED'
            ? `Promoted to ${PLAYER_LEAGUE_TIERS[league]} ${formatLeague(league)}`
            : status === 'STAYED'
              ? `Stayed in ${PLAYER_LEAGUE_TIERS[league]} ${formatLeague(league)}`
              : `Demoted to ${PLAYER_LEAGUE_TIERS[league]} ${formatLeague(league)}`;

        const embed = new EmbedBuilder()
          .setTitle(`${player.name} (${player.tag})`)
          .setDescription(
            `${label} ${EMOJIS.TROPHY} ${trophies >= 0 ? '+' : '-'}${Math.abs(trophies)}`
          )
          .setColor(color)
          .setFooter({ text: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.small });

        return embed;
      });

    return embeds;
  }

  private async _refresh() {
    if (this.timeout) clearTimeout(this.timeout);

    const { endTime } = Util.getTournamentWindow();
    const timestamp = moment(endTime).subtract(5, 'hours').toDate();
    if (timestamp.getTime() > Date.now()) return;
    this.lastPostedAt = timestamp;

    try {
      const guildIds = this.client.guilds.cache.map((guild) => guild.id);
      const cursor = this.collection.aggregate<WithId<ClanLogsEntity>>([
        {
          $match: {
            guildId: { $in: guildIds },
            logType: ClanLogType.RANKED_BATTLE_LEAGUE_CHANGE_LOG,
            lastPostedAt: { $lt: timestamp }
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
        await this.exec(log.clanTag, {
          logType: ClanLogType.RANKED_BATTLE_LEAGUE_CHANGE_LOG,
          channel: log.channelId
        } satisfies Feed);
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
      logType: ClanLogType.RANKED_BATTLE_LEAGUE_CHANGE_LOG,
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
      logType: ClanLogType.RANKED_BATTLE_LEAGUE_CHANGE_LOG,
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
      color: data.color,
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
  color?: number | null;
  threadId?: string;
  logType: string;
  deepLink?: string;
  retries: number;
}
