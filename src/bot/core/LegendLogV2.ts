import { ClanLogsEntity, ClanLogType } from '@app/entities';
import { Collection, EmbedBuilder, escapeMarkdown, PermissionsString, WebhookClient, WebhookMessageCreateOptions } from 'discord.js';
import { ObjectId, WithId } from 'mongodb';
import { LegendAttacks } from '../types/index.js';
import { ATTACK_COUNTS, Collections } from '../util/_constants.js';
import { padStart } from '../util/_Helper.js';
import { Season, Util } from '../util/index.js';
import BaseClanLog from './BaseClanLog.js';
import RPCHandler from './RPCHandler.js';

export default class LegendLogV2 extends BaseClanLog {
  public declare cached: Collection<string, Cache>;
  private readonly refreshRate: number;
  private readonly queued = new Set<string>();
  private timeout!: NodeJS.Timeout | null;

  public constructor(private handler: RPCHandler) {
    super(handler.client);
    this.client = handler.client;
    this.refreshRate = 15 * 60 * 1000;
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
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, { label: LegendLogV2.name });
      return null;
    }
  }

  private async embed(cache: Cache) {
    const { body: clan, res } = await this.client.http.getClan(cache.tag);
    if (!res.ok) return null;

    const { startTime, endTime } = Util.getPreviousLegendTimestamp();
    const timestamp = new Date(endTime);
    const seasonId = Season.generateID(Season.getLastMondayOfMonth(timestamp.getMonth(), timestamp.getFullYear(), timestamp));

    const raw = await this.client.db
      .collection<LegendAttacks>(Collections.LEGEND_ATTACKS)
      .find({
        tag: {
          $in: clan.memberList.map((mem) => mem.tag)
        },
        seasonId
      })
      .toArray();

    const members = [];
    for (const legend of raw) {
      const logs = legend.logs.filter((atk) => atk.timestamp >= startTime && atk.timestamp <= endTime);
      if (logs.length === 0) continue;

      const attacks = logs.filter((en) => en.inc > 0);
      const defenses = logs.filter((en) => en.inc <= 0);

      const [initial] = logs;
      const [current] = logs.slice(-1);

      const attackCount = Math.min(attacks.length);
      const defenseCount = Math.min(defenses.length);

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
        '```',
        '\u200e GAIN  LOSS FINAL NAME',
        ...members.map(
          (mem) =>
            `${padStart(`+${mem.trophiesFromAttacks}${ATTACK_COUNTS[Math.min(9, mem.attackCount)]}`, 5)} ${padStart(
              `-${Math.abs(mem.trophiesFromDefenses)}${ATTACK_COUNTS[Math.min(9, mem.defenseCount)]}`,
              5
            )}  ${padStart(mem.current.end, 4)} ${escapeMarkdown(mem.name)}`
        ),
        '```'
      ].join('\n')
    );
    embed.setFooter({ text: `End of Day ${Util.getPreviousLegendDay()} (${seasonId})` });

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
  color?: number;
  threadId?: string;
  logType: string;
  deepLink?: string;
  retries: number;
}
