import { Collection, EmbedBuilder, escapeMarkdown, PermissionsString, WebhookClient, WebhookMessageCreateOptions } from 'discord.js';
import { ObjectId } from 'mongodb';
import { LegendAttacks, LegendLogModel } from '../types/index.js';
import { ATTACK_COUNTS, Collections } from '../util/constants.js';
import { Season, Util } from '../util/index.js';
import BaseLog from './BaseLog.js';
import RPCHandler from './RPCHandler.js';

export default class LegendLog extends BaseLog {
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
    return this.client.db.collection(Collections.LEGEND_LOGS);
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient) {
    const embed = await this.embed(cache);
    if (!embed) return null;

    const msg = await this.send(cache, webhook, {
      embeds: [embed],
      threadId: cache.threadId
    });
    if (!msg) return null;
    await this.collection.updateOne({ clanId: cache.clanId }, { $set: { lastPosted: new Date() } });
  }

  private async send(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super._send(cache, webhook, payload);
    } catch (error: any) {
      this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'LegendLog' });
      return null;
    }
  }

  private pad(num: number | string, padding = 4) {
    return num.toString().padStart(padding, ' ');
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
            `${this.pad(`+${mem.trophiesFromAttacks}${ATTACK_COUNTS[Math.min(9, mem.attackCount)]}`, 5)} ${this.pad(
              `-${Math.abs(mem.trophiesFromDefenses)}${ATTACK_COUNTS[Math.min(9, mem.defenseCount)]}`,
              5
            )}  ${this.pad(mem.current.end)} ${escapeMarkdown(mem.name)}`
        ),
        '```'
      ].join('\n')
    );
    embed.setFooter({ text: `End of Day ${Util.getPreviousLegendDay()} (${seasonId})` });

    if (!members.length) return null;
    return embed;
  }

  public async init() {
    for await (const data of this.collection.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })) {
      this.cached.set((data.clanId as ObjectId).toHexString(), {
        tag: data.tag,
        clanId: data.clanId,
        guild: data.guild,
        channel: data.channel,
        retries: 0,
        webhook: data.webhook ? new WebhookClient(data.webhook) : null
      });
    }

    this._refresh();
  }

  public async add(clanId: string) {
    const data = await this.collection.findOne({ clanId: new ObjectId(clanId) });

    if (!data) return null;
    return this.cached.set(clanId, {
      tag: data.tag,
      clanId: data.clanId,
      guild: data.guild,
      channel: data.channel,
      retries: 0,
      webhook: data.webhook ? new WebhookClient(data.webhook) : null
    });
  }

  private async _refresh() {
    if (this.timeout) clearTimeout(this.timeout);
    try {
      const { startTime } = Util.getCurrentLegendTimestamp();
      const logs = await this.client.db
        .collection<LegendLogModel>(Collections.LEGEND_LOGS)
        .find({ lastPosted: { $lt: new Date(startTime) } })
        .toArray();

      for (const log of logs) {
        if (!this.client.guilds.cache.has(log.guild)) continue;
        if (this.queued.has(log._id.toHexString())) continue;

        this.queued.add(log._id.toHexString());
        await this.exec(log.tag, { channel: log.channel });
        this.queued.delete(log._id.toHexString());
        await Util.delay(3000);
      }
    } finally {
      this.timeout = setTimeout(this._refresh.bind(this), this.refreshRate).unref();
    }
  }
}

interface Cache {
  tag: string;
  clanId: ObjectId;
  webhook: WebhookClient | null;
  deleted?: boolean;
  channel: string;
  guild: string;
  threadId?: string;
  retries: number;
  updatedAt?: Date;
}
