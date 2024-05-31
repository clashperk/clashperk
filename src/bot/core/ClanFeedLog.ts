import { APIPlayer } from 'clashofclans.js';
import { Collection, EmbedBuilder, parseEmoji, PermissionsString, WebhookClient, WebhookMessageCreateOptions } from 'discord.js';
import { ObjectId } from 'mongodb';
import { ClanFeedLogModel } from '../types/index.js';
import { CLAN_FEED_LOG_TYPES, Collections, COLOR_CODES, DEEP_LINK_TYPES, FeatureFlags, PLAYER_ROLES_MAP } from '../util/Constants.js';
import { TOWN_HALLS } from '../util/Emojis.js';
import { unitsFlatten } from '../util/Helper.js';
import { Season, Util } from '../util/index.js';
import { RAW_TROOPS_FILTERED } from '../util/Troops.js';
import BaseLog from './BaseLog.js';
import RPCHandler from './RPCHandler.js';

const OP: { [key: string]: number } = {
  NAME_CHANGE: COLOR_CODES.PEACH,
  TOWN_HALL_UPGRADE: COLOR_CODES.CYAN,
  PROMOTED: COLOR_CODES.CYAN,
  DEMOTED: COLOR_CODES.RED,
  WAR_PREF_CHANGE: COLOR_CODES.CYAN
};

const clanTypeEvents = {
  CAPITAL_HALL_LEVEL_UP: COLOR_CODES.CYAN,
  CAPITAL_LEAGUE_CHANGE: COLOR_CODES.CYAN,
  WAR_LEAGUE_CHANGE: COLOR_CODES.CYAN,
  CLAN_LEVEL_UP: COLOR_CODES.CYAN
} satisfies Record<string, number>;

const logTypes: Record<string, string> = {
  NAME_CHANGE: CLAN_FEED_LOG_TYPES.PLAYER_NAME_CHANGE,
  TOWN_HALL_UPGRADE: CLAN_FEED_LOG_TYPES.TOWN_HALL_UPGRADE,
  WAR_PREF_CHANGE: CLAN_FEED_LOG_TYPES.WAR_PREFERENCE_CHANGE
};

export default class ClanFeedLog extends BaseLog {
  public declare cached: Collection<string, Cache>;
  private readonly queued = new Set<string>();

  public constructor(private handler: RPCHandler) {
    super(handler.client);
    this.client = handler.client;
  }

  public override get permissions(): PermissionsString[] {
    return ['SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ReadMessageHistory', 'ViewChannel'];
  }

  public override get collection() {
    return this.client.db.collection(Collections.CLAN_FEED_LOGS);
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
    if (data.type && data.type in clanTypeEvents) {
      return this.clanTypeEmbeds(cache, webhook, data);
    }

    const members = data.members.filter((mem) => Object.keys(OP).includes(mem.op));
    if (!members.length) return null;
    const delay = members.length >= 5 ? 2000 : 250;

    members.sort((a, b) => a.rand - b.rand);
    const messages = (await Promise.all(members.map((mem) => this.embed(cache, mem, data)))).filter((m) => m);

    for (const message of messages) {
      if (!message) continue;
      const msg = await this.send(cache, webhook, {
        content: message.content,
        embeds: [message.embed],
        threadId: cache.threadId
      });
      await this.updateMessageId(cache, msg);
      await Util.delay(delay);
    }

    return members.length;
  }

  private async send(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super._send(cache, webhook, payload);
    } catch (error: any) {
      this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'DonationLog' });
      return null;
    }
  }

  private clanTypeEmbeds(cache: Cache, webhook: WebhookClient, data: Feed) {
    const embed = new EmbedBuilder()
      .setColor(clanTypeEvents[data.type as keyof typeof clanTypeEvents])
      .setTitle(`\u200e${data.clan.name} (${data.clan.tag})`)
      .setThumbnail(data.clan.badge);

    if (data.type === 'CLAN_LEVEL_UP') {
      embed.setDescription(`Clan leveled up to **${data.clan.level}**`);
    }

    if (data.type === 'CAPITAL_HALL_LEVEL_UP') {
      embed.setDescription(`Capital Hall leveled up to **${data.clan.capitalHallLevel}**`);
    }

    if (data.type === 'CAPITAL_LEAGUE_CHANGE') {
      embed.setDescription(`Capital League changed to **${data.clan.capitalLeague.name}**`);
    }

    if (data.type === 'WAR_LEAGUE_CHANGE') {
      embed.setDescription(`War League changed to **${data.clan.warLeague.name}**`);
    }

    return this.send(cache, webhook, {
      embeds: [embed],
      threadId: cache.threadId
    });
  }

  private async embed(cache: Cache, member: Member, data: Feed) {
    const { body: player, res } = await this.client.http.getPlayer(member.tag);
    if (!res.ok) return null;

    const isEnabled = await this.client.isFeatureEnabled(FeatureFlags.CLAN_MEMBERS_PROMOTION_LOG, cache.guild, false);
    if (!isEnabled && ['DEMOTED', 'PROMOTED'].includes(member.op)) return null;

    // do not post if the logTypes are set and the logType is not included
    if (cache.logTypes && !cache.logTypes.includes(logTypes[member.op])) return null;

    let content: string | undefined;
    const embed = new EmbedBuilder().setColor(OP[member.op]).setTitle(`\u200e${player.name} (${player.tag})`);
    if (!cache.deepLink || cache.deepLink === DEEP_LINK_TYPES.OPEN_IN_COS) {
      embed.setURL(`https://www.clashofstats.com/players/${player.tag.replace('#', '')}`);
    }
    if (cache.deepLink === DEEP_LINK_TYPES.OPEN_IN_GAME) {
      embed.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(player.tag)}`);
    }
    if (member.op === 'NAME_CHANGE') {
      embed.setDescription(`Name changed from **${member.name}**`);
      embed.setFooter({ text: `${data.clan.name}`, iconURL: data.clan.badge });
    }
    if (member.op === 'PROMOTED') {
      embed.setFooter({ text: `${data.clan.name}`, iconURL: data.clan.badge });
      embed.setDescription(`Promoted to **${PLAYER_ROLES_MAP[member.role]}**`);
    }
    if (member.op === 'DEMOTED') {
      embed.setFooter({ text: `${data.clan.name}`, iconURL: data.clan.badge });
      embed.setDescription(`Demoted to **${PLAYER_ROLES_MAP[member.role]}**`);
    }
    if (member.op === 'TOWN_HALL_UPGRADE') {
      if (cache.role) content = `<@&${cache.role}>`;
      const { id } = parseEmoji(TOWN_HALLS[player.townHallLevel])!;
      embed.setThumbnail(`https://cdn.discordapp.com/emojis/${id!}.png?v=1`);
      embed.setFooter({ text: `${data.clan.name}`, iconURL: data.clan.badge });
      embed.setDescription(
        `Town Hall was upgraded to ${player.townHallLevel} with ${this.remainingUpgrades(player)}% remaining troop upgrades.`
      );
    }
    if (member.op === 'WAR_PREF_CHANGE' && player.warPreference) {
      const { id } = parseEmoji(TOWN_HALLS[player.townHallLevel])!;
      embed.setThumbnail(`https://cdn.discordapp.com/emojis/${id!}.png?v=1`);
      embed.setFooter({ text: `${data.clan.name}`, iconURL: data.clan.badge });
      if (player.warPreference === 'in') {
        embed.setDescription(`**Opted in** for clan wars.`);
        embed.setColor(COLOR_CODES.DARK_GREEN);
      }
      if (player.warPreference === 'out') {
        embed.setDescription(`**Opted out** of clan wars.`);
        embed.setColor(COLOR_CODES.DARK_RED);
      }
    }
    embed.setTimestamp();
    return { embed, content };
  }

  private remainingUpgrades(data: APIPlayer) {
    const apiTroops = unitsFlatten(data);
    const rem = RAW_TROOPS_FILTERED.reduce(
      (prev, unit) => {
        const apiTroop = apiTroops.find((u) => u.name === unit.name && u.village === unit.village && u.type === unit.category);
        if (unit.village === 'home') {
          prev.levels += Math.min(apiTroop?.level ?? 0, unit.levels[data.townHallLevel - 2]);
          prev.total += unit.levels[data.townHallLevel - 2];
        }
        return prev;
      },
      { total: 0, levels: 0 }
    );
    if (rem.total === 0) return (0).toFixed(2);
    return (100 - (rem.levels * 100) / rem.total).toFixed(2);
  }

  public async init() {
    for await (const data of this.collection.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })) {
      this.cached.set((data.clanId as ObjectId).toHexString(), {
        clanId: data.clanId,
        guild: data.guild,
        channel: data.channel,
        tag: data.tag,
        deepLink: data.deepLink,
        logTypes: data.logTypes,
        role: data.role,
        retries: data.retries ?? 0,
        webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
      });
    }
  }

  public async add(id: string) {
    const data = await this.collection.findOne({ clanId: new ObjectId(id) });
    if (!data) return null;

    return this.cached.set(id, {
      clanId: data.clanId,
      guild: data.guild,
      channel: data.channel,
      tag: data.tag,
      role: data.role,
      deepLink: data.deepLink,
      logTypes: data.logTypes,
      retries: data.retries ?? 0,
      webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
    });
  }

  private async _refresh() {
    const logs = await this.client.db
      .collection(Collections.CLAN_FEED_LOGS)
      .aggregate<ClanFeedLogModel & { _id: ObjectId }>([
        { $match: { lastPosted: { $lte: new Date(Season.endTimestamp) } } },
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
      ])
      .toArray();

    for (const log of logs) {
      if (!this.client.guilds.cache.has(log.guild)) continue;
      if (this.queued.has(log._id.toHexString())) continue;

      this.queued.add(log._id.toHexString());
      await this.exec(log.tag, {});
      this.queued.delete(log._id.toHexString());
      await Util.delay(3000);
    }
  }
}

interface Member {
  op: string;
  tag: string;
  name: string;
  rand: number;
  role: string;
  donations: number;
  donationsReceived: number;
}

interface Feed {
  clan: {
    tag: string;
    name: string;
    badge: string;
    level: number;
    warLeague: { name: string };
    capitalLeague: { name: string };
    capitalHallLevel: number;
  };
  members: Member[];
  memberList: {
    tag: string;
    role: string;
    clan: { tag: string };
  }[];
  type?: string;
}

interface Cache {
  tag: string;
  clanId: ObjectId;
  webhook: WebhookClient | null;
  deleted?: boolean;
  channel: string;
  role?: string;
  guild: string;
  threadId?: string;
  logTypes?: string[];
  deepLink?: string;
  retries: number;
}
