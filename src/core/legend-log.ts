import { ATTACK_COUNTS, Collections, LEGEND_LEAGUE_ID } from '@app/constants';
import { ClanLogsEntity, ClanLogType } from '@app/entities';
import {
  Collection,
  EmbedBuilder,
  escapeMarkdown,
  PermissionsString,
  WebhookClient,
  WebhookMessageCreateOptions
} from 'discord.js';
import moment from 'moment';
import { ObjectId, WithId } from 'mongodb';
import { BattleLogDto } from '../api/generated.js';
import { getLegendBattleLog } from '../helper/legends.helper.js';
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
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, {
        label: LegendLog.name
      });
      return null;
    }
  }

  private async embed(cache: Cache) {
    const { body: clan, res } = await this.client.coc.getClan(cache.tag);
    if (!res.ok) return null;

    const { startTime, endTime } = Util.getPreviousLegendTimestamp();
    const season = Util.getSeason(new Date(endTime));
    const battleDate = new Date(startTime).toISOString().slice(0, 10);

    const legendMembers = clan.memberList.filter(
      (mem) => (mem.leagueTier && mem.leagueTier.id >= LEGEND_LEAGUE_ID) || mem.trophies >= 5000
    );
    const battleLogResults = await Promise.all(
      legendMembers.map((m) => getLegendBattleLog(m.tag).catch(() => [] as BattleLogDto[]))
    );
    const logsByTag = new Map<string, BattleLogDto[]>(
      legendMembers.map((m, i) => [m.tag, battleLogResults[i]])
    );

    const members = [];
    for (const [tag, battles] of logsByTag) {
      const dayBattles = battles.filter((b) => b.battleDate === battleDate);
      if (!dayBattles.length) continue;

      const attacks = dayBattles.filter((b) => b.isAttack && b.trophyChange > 0);
      const defenses = dayBattles.filter((b) => !b.isAttack || b.trophyChange <= 0);

      const trophiesFromAttacks = attacks.reduce((acc, b) => acc + b.trophyChange, 0);
      const trophiesFromDefenses = defenses.reduce((acc, b) => acc + b.trophyChange, 0);
      const netTrophies = trophiesFromAttacks + trophiesFromDefenses;
      const lastBattle = dayBattles.at(0)!;
      const currentTrophies = lastBattle.trophies;

      members.push({
        name: lastBattle.name,
        tag,
        attackCount: attacks.length,
        defenseCount: defenses.length,
        trophiesFromAttacks,
        trophiesFromDefenses,
        netTrophies,
        currentTrophies
      });
    }
    members.sort((a, b) => b.currentTrophies - a.currentTrophies);

    const embed = new EmbedBuilder()
      .setTitle(`${escapeMarkdown(clan.name)} (${clan.tag})`)
      .setURL(
        `https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(clan.tag)}`
      )
      .setColor(this.client.embed(cache.guild));

    embed.setDescription(
      [
        '**Legend League Attacks**',
        `\`GAIN  LOSS  FINAL \` **NAME**`,
        ...members.slice(0, 99).map((mem) => {
          const attacks = padStart(
            `+${mem.trophiesFromAttacks}${ATTACK_COUNTS[Math.min(8, mem.attackCount)]}`,
            5
          );
          const defense = padStart(
            `-${Math.abs(mem.trophiesFromDefenses)}${ATTACK_COUNTS[Math.min(8, mem.defenseCount)]}`,
            5
          );
          return `\`${attacks} ${defense}  ${padStart(mem.currentTrophies, 4)} \` \u200e${escapeMarkdown(mem.name)}`;
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
        await this.exec(log.clanTag, {
          logType: log.logType,
          channel: log.channelId
        } satisfies Feed);
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
