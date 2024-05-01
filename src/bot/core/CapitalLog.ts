import { APIClan } from 'clashofclans.js';
import { AttachmentBuilder, Collection, EmbedBuilder, PermissionsString, WebhookClient, WebhookMessageCreateOptions } from 'discord.js';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import { CapitalLogModel, ClanCapitalGoldModel, ClanCapitalRaidAttackData } from '../types/index.js';
import { Collections } from '../util/Constants.js';
import { Season, Util } from '../util/index.js';
import BaseLog from './BaseLog.js';
import RPCHandler from './RPCHandler.js';

export default class CapitalLog extends BaseLog {
  public declare cached: Collection<string, Cache>;
  private readonly refreshRate: number;
  private readonly queued = new Set<string>();
  private timeout!: NodeJS.Timeout | null;

  public constructor(private handler: RPCHandler) {
    super(handler.client);
    this.client = handler.client;
    this.refreshRate = 30 * 60 * 1000;
  }

  public override get permissions(): PermissionsString[] {
    return ['SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ReadMessageHistory', 'ViewChannel', 'AttachFiles'];
  }

  public override get collection() {
    return this.client.db.collection(Collections.CAPITAL_LOGS);
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient) {
    const embedBuilder = await this.embed(cache);
    if (!embedBuilder) return null;
    const { embed } = embedBuilder;

    await this.send(cache, webhook, { embeds: [embed], threadId: cache.threadId });
    const capitalDonationEmbed = await this.capitalDonations(cache);
    if (capitalDonationEmbed) await this.send(cache, webhook, { embeds: [capitalDonationEmbed], threadId: cache.threadId });

    for (const buffer of embedBuilder.files) {
      await this.send(cache, webhook, { files: [buffer], threadId: cache.threadId });
    }

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

  private async rankings(tag: string) {
    const ranks = await this.client.db
      .collection(Collections.CAPITAL_RANKS)
      .aggregate<{ country: string; countryCode: string; clans: { rank: number } }>([
        {
          $match: {
            season: Season.ID
          }
        },
        {
          $unwind: {
            path: '$clans'
          }
        },
        {
          $match: {
            'clans.tag': tag
          }
        }
      ])
      .toArray();

    return {
      globalRank: ranks.find(({ countryCode }) => countryCode === 'global')?.clans.rank ?? null,
      countryRank: ranks.find(({ countryCode }) => countryCode !== 'global') ?? null
    };
  }

  private async embed(cache: Cache) {
    const { body: clan, res: _res } = await this.client.http.getClan(cache.tag);
    if (!_res.ok) return null;

    const { body: data, res } = await this.client.http.getRaidSeasons(clan.tag, 1);
    if (!res.ok) return null;
    if (!data.items.length) return null;
    const raid = data.items.at(0);
    if (!raid?.members) return null;

    const season = await this.client.db
      .collection<ClanCapitalRaidAttackData>(Collections.CAPITAL_RAID_SEASONS)
      .findOne({ weekId: moment(raid.startTime).format('YYYY-MM-DD'), tag: clan.tag });

    const members = raid.members.map((m) => ({ ...m, attackLimit: m.attackLimit + m.bonusAttackLimit }));
    clan.memberList.forEach((member) => {
      const attack = members.find((attack) => attack.tag === member.tag);
      if (!attack) {
        members.push({
          name: member.name,
          tag: member.tag,
          capitalResourcesLooted: 0,
          attacks: 0,
          attackLimit: 5,
          bonusAttackLimit: 0
        });
      }
    });

    members.sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted);
    const weekend = Util.raidWeekDateFormat(moment(raid.startTime).toDate(), moment(raid.endTime).toDate());

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${clan.name} (${clan.tag})`,
        iconURL: clan.badgeUrls.small
      })
      .setTimestamp()
      .setFooter({ text: `Week of ${weekend}` });

    embed.setDescription(
      [
        `**Clan Capital Raids**`,
        '```',
        '\u200e # LOOTED HITS  NAME',
        members
          .map((mem, i) => {
            const looted = this.padding(mem.capitalResourcesLooted);
            const attacks = `${mem.attacks}/${mem.attackLimit}`.padStart(4, ' ');
            return `\u200e${(i + 1).toString().padStart(2, ' ')} ${looted} ${attacks}  ${mem.name}`;
          })
          .join('\n'),
        '```'
      ].join('\n')
    );

    const offensiveReward = this.client.http.calcRaidMedals(raid);
    const raidsCompleted = this.client.http.calcRaidCompleted(raid.attackLog);

    const query = new URLSearchParams({
      clanName: clan.name,
      clanBadgeUrl: clan.badgeUrls.large,
      startDate: moment(raid.startTime).toDate().toUTCString(),
      endDate: moment(raid.endTime).toDate().toUTCString(),
      offensiveReward: offensiveReward.toString(),
      defensiveReward: raid.defensiveReward.toString(),
      totalLoot: raid.capitalTotalLoot.toString(),
      totalAttacks: raid.totalAttacks.toString(),
      enemyDistrictsDestroyed: raid.enemyDistrictsDestroyed.toString(),
      raidsCompleted: raidsCompleted.toString()
    });

    const hasTrophyCard = Boolean(
      season?.clanCapitalPoints && season._clanCapitalPoints && season._clanCapitalPoints !== season.clanCapitalPoints
    );

    const files: AttachmentBuilder[] = [];

    files.push(
      new AttachmentBuilder(`${process.env.ASSET_API_BACKEND!}/capital/raid-medals-card?${query.toString()}`, {
        name: 'capital-raid-trophy-card.jpeg'
      })
    );

    if (hasTrophyCard) {
      const { globalRank, countryRank } = await this.rankings(clan.tag);
      const type =
        season!._capitalLeague!.id > season!.capitalLeague!.id
          ? 'Promoted'
          : season!._capitalLeague!.id === season!.capitalLeague!.id
            ? 'Stayed'
            : 'Demoted';
      const trophiesEarned = season!._clanCapitalPoints! - season!.clanCapitalPoints!;

      query.set('type', type);
      query.set('remark', type === 'Stayed' ? 'Stayed in the same League' : type);
      query.set('leagueId', season!._capitalLeague!.id.toString());
      query.set('trophiesEarned', `${trophiesEarned < 0 ? '' : '+'}${trophiesEarned}`);
      query.set('trophies', season!._clanCapitalPoints!.toString());
      query.set('globalRank', globalRank ? `Global Rank: ${globalRank}` : '');
      query.set('localRank', countryRank ? `Local Rank: ${countryRank.clans.rank} (${countryRank.country})` : '');

      files.push(
        new AttachmentBuilder(`${process.env.ASSET_API_BACKEND!}/capital/raid-trophies-card?${query.toString()}`, {
          name: 'capital-raid-trophy-card.jpeg'
        })
      );
    }
    return { embed, files };
  }

  private async capitalDonations(cache: Cache) {
    const { body: clan, res } = await this.client.http.getClan(cache.tag);
    if (!res.ok) return null;

    const { endTime, prevWeekEndTime } = Util.getRaidWeekEndTimestamp();

    const contributions = await this.client.db
      .collection(Collections.CAPITAL_CONTRIBUTIONS)
      .aggregate<ClanCapitalGoldModel & { total: number }>([
        {
          $match: {
            'clan.tag': clan.tag
            // 'tag': { $in: clan.memberList.map((clan) => clan.tag) }
          }
        },
        {
          $match: {
            createdAt: {
              $gt: prevWeekEndTime,
              $lt: endTime
            }
          }
        },
        {
          $addFields: {
            total: {
              $subtract: ['$current', '$initial']
            }
          }
        },
        {
          $group: {
            _id: '$tag',
            name: {
              $first: '$name'
            },
            tag: {
              $first: '$tag'
            },
            total: {
              $sum: '$total'
            }
          }
        },
        {
          $sort: {
            total: -1
          }
        }
      ])
      .toArray();

    const embed = this.getCapitalContributionsEmbed({
      clan,
      weekend: Util.raidWeekDateFormat(moment(prevWeekEndTime).toDate(), moment(endTime).toDate()),
      contributions
    });
    return embed;
  }

  private getCapitalContributionsEmbed({
    clan,
    weekend,
    contributions
  }: {
    clan: APIClan;
    weekend: string;
    contributions: (ClanCapitalGoldModel & { total: number })[];
  }) {
    const members: { name: string; raids: number }[] = [];
    clan.memberList.forEach((member) => {
      const attack = contributions.find((attack) => attack.tag === member.tag);
      if (attack) members.push({ name: member.name, raids: attack.total });
      else members.push({ name: member.name, raids: 0 });
    });

    members.sort((a, b) => b.raids - a.raids);
    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${clan.name} (${clan.tag})`,
        iconURL: clan.badgeUrls.small
      })
      .setDescription(
        [
          `**Clan Capital Contributions**`,
          '```',
          '\u200e #  TOTAL  NAME',
          members.map((mem, i) => `\u200e${(i + 1).toString().padStart(2, ' ')}  ${this.padding(mem.raids, 5)}  ${mem.name}`).join('\n'),
          '```'
        ].join('\n')
      )
      .setTimestamp()
      .setFooter({ text: `Week of ${weekend}` });

    return embed;
  }

  private padding(num: number, pad = 6) {
    return num.toString().padStart(pad, ' ');
  }

  public async init() {
    for await (const data of this.collection.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })) {
      this.cached.set((data.clanId as ObjectId).toHexString(), {
        tag: data.tag,
        clanId: data.clanId,
        guild: data.guild,
        channel: data.channel,
        webhook: data.webhook ? new WebhookClient(data.webhook) : null,
        retries: 0,
        threadId: data.threadId
      });
    }

    return this._refresh();
  }

  public async add(clanId: string) {
    const data = await this.collection.findOne({ clanId: new ObjectId(clanId) });

    if (!data) return null;
    return this.cached.set(clanId, {
      tag: data.tag,
      clanId: data.clanId,
      guild: data.guild,
      channel: data.channel,
      webhook: data.webhook ? new WebhookClient(data.webhook) : null,
      retries: 0
    });
  }

  private async _refresh() {
    if (this.timeout) clearTimeout(this.timeout);
    try {
      const { endTime } = Util.getRaidWeekEndTimestamp();

      const timestamp = new Date(endTime.getTime() + 1000 * 60 * 90);
      if (timestamp.getTime() > Date.now()) return;

      const logs = await this.client.db
        .collection<CapitalLogModel>(Collections.CAPITAL_LOGS)
        .find({ lastPosted: { $lt: timestamp } })
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
