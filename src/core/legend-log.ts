import { ATTACK_COUNTS, Collections, LEGEND_LEAGUE_ID } from '@app/constants';
import { ClanLogsEntity, ClanLogType, LegendAttacksEntity } from '@app/entities';
import { Collection, EmbedBuilder, escapeMarkdown, PermissionsString, WebhookClient, WebhookMessageCreateOptions } from 'discord.js';
import moment from 'moment';
import { ObjectId, WithId } from 'mongodb';
import { padStart } from '../util/helper.js';
import { Util } from '../util/toolkit.js';
import { Enqueuer } from './enqueuer.js';
import { RootLog } from './root-log.js';

export class LegendLog extends RootLog {
  declare public cached: Collection<string, Cache>;
  private readonly refreshRate: number;
  private readonly queued = new Set<string>();
  private timeout!: NodeJS.Timeout | null;

  public constructor(private enqueuer: Enqueuer) {
    super(enqueuer.client);
    this.client = enqueuer.client;
    this.refreshRate = 30 * 60 * 1000;
  }

  public override get permissions(): PermissionsString[] {
    return ['SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ReadMessageHistory', 'ViewChannel'];
  }

  public override get collection() {
    return this.client.db.collection<ClanLogsEntity>(Collections.CLAN_LOGS);
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
    if (cache.logType !== data.logType) return null;

    const embed = await this.embed(cache);
    if (!embed) return null;

    const msg = await this.send(cache, webhook, {
      embeds: [embed],
      threadId: cache.threadId
    });
    if (!msg) return null;
    await this.collection.updateOne({ _id: cache._id }, { $set: { lastPostedAt: new Date() } });
  }

  private async send(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super.sendMessage(cache, webhook, payload);
    } catch (error) {
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, { label: LegendLog.name });
      return null;
    }
  }

  private async embed(cache: Cache) {
    const { body: clan, res } = await this.client.coc.getClan(cache.tag);
    if (!res.ok) return null;

    const { startTime, endTime } = Util.getPreviousLegendTimestamp();
    const season = Util.getSeason(new Date(endTime));

    const result = await this.client.db
      .collection(Collections.LEGEND_ATTACKS)
      .find({
        tag: {
          $in: clan.memberList.map((mem) => mem.tag)
        },
        seasonId: season.seasonId
      })
      .toArray();
    const attackingMembers = result.map((mem) => mem.tag);

    const clanMembers: LegendAttacksEntity[] = clan.memberList
      .filter((mem) => !attackingMembers.includes(mem.tag) && (mem.leagueTier?.id === LEGEND_LEAGUE_ID || mem.trophies >= 5000))
      .map((mem) => ({
        name: mem.name,
        tag: mem.tag,
        streak: 0,
        logs: [
          {
            timestamp: startTime,
            start: mem.trophies,
            inc: 0,
            end: mem.trophies,
            type: 'hold'
          }
        ],

        // not confirmed
        initial: mem.trophies,
        seasonId: season.seasonId,
        trophies: mem.trophies
      }));

    const members = [];
    for (const legend of [...result, ...clanMembers]) {
      const logs = legend.logs.filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
      if (logs.length === 0) continue;

      const attacks = logs.filter((en) => en.type === 'attack');
      const defenses = logs.filter((en) => en.type === 'defense' || (en.type === 'attack' && en.inc === 0)) ?? [];

      const [initial] = logs;
      const [current] = logs.slice(-1);

      const possibleAttackCount = legend.attackLogs?.[moment(endTime).format('YYYY-MM-DD')] ?? 0;
      const possibleDefenseCount = legend.defenseLogs?.[moment(endTime).format('YYYY-MM-DD')] ?? 0;

      const attackCount = Math.max(attacks.length, possibleAttackCount);
      const defenseCount = Math.max(defenses.length, possibleDefenseCount);

      const trophiesFromAttacks = attacks.reduce((acc, cur) => acc + cur.inc, 0);
      const trophiesFromDefenses = defenses.reduce((acc, cur) => acc + cur.inc, 0);

      const netTrophies = trophiesFromAttacks + trophiesFromDefenses;

      members.push({
        name: legend.name,
        tag: legend.tag,
        attacks,
        defenses,
        attackCount,
        defenseCount,
        trophiesFromAttacks,
        trophiesFromDefenses,
        netTrophies,
        initial,
        current
      });
    }
    members.sort((a, b) => b.current.end - a.current.end);

    const embed = new EmbedBuilder()
      .setTitle(`${escapeMarkdown(clan.name)} (${clan.tag})`)
      .setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`)
      .setColor(this.client.embed(cache.guild));

    embed.setDescription(
      [
        '**Legend League Attacks**',
        `\`GAIN  LOSS  FINAL \` **NAME**`,
        ...members.slice(0, 99).map((mem) => {
          const attacks = padStart(`+${mem.trophiesFromAttacks}${ATTACK_COUNTS[Math.min(8, mem.attackCount)]}`, 5);
          const defense = padStart(`-${Math.abs(mem.trophiesFromDefenses)}${ATTACK_COUNTS[Math.min(8, mem.defenseCount)]}`, 5);
          return `\`${attacks} ${defense}  ${padStart(mem.current.end, 4)} \` \u200e${escapeMarkdown(mem.name)}`;
        })
      ].join('\n')
    );

    embed.setFooter({
      text: `End of Day ${Util.getPreviousLegendDay()}/${moment(season.endTime).diff(season.startTime, 'days')} (${season.seasonId})`
    });

    if (!members.length) return null;
    return embed;
  }

  private async _refresh() {
    if (this.timeout) clearTimeout(this.timeout);
    try {
      const { startTime } = Util.getCurrentLegendTimestamp();
      const logs = await this.collection
        .find({
          isEnabled: true,
          lastPostedAt: { $lt: new Date(startTime) },
          logType: ClanLogType.LEGEND_ATTACKS_DAILY_SUMMARY_LOG
        })
        .toArray();

      for (const log of logs) {
        if (!this.client.guilds.cache.has(log.guildId)) continue;
        if (this.queued.has(log._id.toHexString())) continue;

        this.queued.add(log._id.toHexString());
        await this.exec(log.clanTag, { logType: log.logType, channel: log.channelId } satisfies Feed);
        this.queued.delete(log._id.toHexString());
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
      logType: ClanLogType.LEGEND_ATTACKS_DAILY_SUMMARY_LOG,
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
      logType: ClanLogType.LEGEND_ATTACKS_DAILY_SUMMARY_LOG,
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
  guild: string;
  color?: number | null;
  threadId?: string;
  logType: string;
  deepLink?: string;
  retries: number;
}
