import { APIPlayer, APIPlayerItem } from 'clashofclans.js';
import { Collection, EmbedBuilder, PermissionsString, WebhookClient, WebhookMessageCreateOptions, parseEmoji } from 'discord.js';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import { ClanLogsEntity } from '../entities/clan-logs.entity.js';
import { FlagsEntity } from '../entities/flags.entity.js';
import { COLOR_CODES, Collections, DEEP_LINK_TYPES, FeatureFlags, PLAYER_ROLES_MAP, Settings } from '../util/Constants.js';
import { EMOJIS, HEROES, HOME_BASE_LEAGUES, TOWN_HALLS } from '../util/Emojis.js';
import { unitsFlatten } from '../util/Helper.js';
import { RAW_TROOPS_FILTERED } from '../util/Troops.js';
import { Util } from '../util/index.js';
import BaseClanLog from './BaseClanLog.js';
import RPCHandler from './RPCHandler.js';

const ACTIONS = {
  NAME_CHANGE: 'NAME_CHANGE',
  TOWN_HALL_UPGRADE: 'TOWN_HALL_UPGRADE',
  PROMOTED: 'PROMOTED',
  DEMOTED: 'DEMOTED',
  WAR_PREF_CHANGE: 'WAR_PREF_CHANGE',
  JOINED: 'JOINED',
  LEFT: 'LEFT'
} as const;

const COLOR_MAPS: { [key: string]: number } = {
  [ACTIONS.NAME_CHANGE]: COLOR_CODES.PEACH,
  [ACTIONS.TOWN_HALL_UPGRADE]: COLOR_CODES.CYAN,
  [ACTIONS.PROMOTED]: COLOR_CODES.CYAN,
  [ACTIONS.DEMOTED]: COLOR_CODES.RED,
  [ACTIONS.WAR_PREF_CHANGE]: COLOR_CODES.CYAN,
  [ACTIONS.JOINED]: COLOR_CODES.CYAN,
  [ACTIONS.LEFT]: COLOR_CODES.CYAN
};

export default class ClanLog extends BaseClanLog {
  public declare cached: Collection<string, Cache>;

  public constructor(private handler: RPCHandler) {
    super(handler.client);
    this.client = handler.client;
  }

  public override get permissions(): PermissionsString[] {
    return ['SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ReadMessageHistory', 'ViewChannel'];
  }

  public override get collection() {
    return this.client.db.collection<ClanLogsEntity>(Collections.CLAN_LOGS);
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
    if (data.type) {
      return this.getClanLogEmbed(cache, webhook, data);
    }

    const members = data.members.filter((mem) => (Object.values(ACTIONS) as string[]).includes(mem.op));
    if (!members.length) return null;

    const delay = members.length >= 5 ? 2000 : 250;
    const messages = (await Promise.all(members.map((mem) => this.getPlayerLogEmbed(cache, mem, data)))).filter((m) => m);

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

  private async getPlayerLogEmbed(cache: Cache, member: Member, data: Feed) {
    const { body: player, res } = await this.client.http.getPlayer(member.tag);
    if (!res.ok) return null;

    const isEnabled = await this.client.isFeatureEnabled(FeatureFlags.CLAN_MEMBERS_PROMOTION_LOG, cache.guild);
    if (!isEnabled && ['DEMOTED', 'PROMOTED'].includes(member.op)) return null;

    let content: string | undefined;

    const embed = new EmbedBuilder();
    embed.setColor(COLOR_MAPS[member.op]);
    embed.setTitle(`\u200e${player.name} (${player.tag})`);
    embed.setTimestamp();

    if (!cache.deepLink || cache.deepLink === DEEP_LINK_TYPES.OPEN_IN_COS) {
      embed.setURL(`https://www.clashofstats.com/players/${player.tag.replace('#', '')}`);
    } else {
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

    if (member.op === 'LEFT') {
      if (player.clan && player.clan.tag !== data.clan.tag) {
        embed.setFooter({
          text: `Left ${data.clan.name} [${data.memberList.length}/50] \nJoined ${player.clan.name}`,
          iconURL: data.clan.badge
        });
      } else {
        embed.setFooter({ text: `Left ${data.clan.name} [${data.memberList.length}/50]`, iconURL: data.clan.badge });
      }

      embed.setDescription(
        [
          `${TOWN_HALLS[player.townHallLevel]!} **${player.townHallLevel}**`,
          `${HOME_BASE_LEAGUES[player.league?.id ?? 29000000]!}**${player.trophies}**`,
          `${EMOJIS.TROOPS_DONATE} **${member.donations}**${EMOJIS.UP_KEY} **${member.donationsReceived}**${EMOJIS.DOWN_KEY}`
        ].join(' ')
      );
    }

    if (member.op === 'JOINED') {
      embed.setFooter({ text: `Joined ${data.clan.name} [${data.memberList.length}/50]`, iconURL: data.clan.badge });
      const heroes = player.heroes.filter((hero) => hero.village === 'home');
      embed.setDescription(
        [
          `${TOWN_HALLS[player.townHallLevel]!}**${player.townHallLevel}**`,
          `${HOME_BASE_LEAGUES[player.league?.id ?? 29000000]!}**${player.trophies}**`,
          `${this.formatHeroes(heroes)}`,
          `${heroes.length >= 2 ? '\n' : ''}${EMOJIS.WAR_STAR}**${player.warStars}**`,
          `${EMOJIS.TROOPS}${this.remainingUpgrades(player)}% rushed`
        ].join(' ')
      );

      if (!this.client.settings.get(cache.guild, Settings.HAS_FLAG_ALERT_LOG, false)) {
        const flag = await this.client.db.collection<FlagsEntity>(Collections.FLAGS).findOne({
          guild: cache.guild,
          tag: member.tag,
          flagType: 'ban',
          $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
        });

        if (flag) {
          const user = await this.client.users.fetch(flag.user, { cache: false }).catch(() => null);
          if (cache.role) content = `<@&${cache.role}>`;

          embed.setDescription(
            [
              embed.data.description,
              '',
              '**Flag**',
              `${flag.reason as string}`,
              `\`${user ? user.displayName : 'Unknown'} (${moment.utc(flag.createdAt).format('DD-MM-YYYY kk:mm')})\``
            ].join('\n')
          );
        }
      }
    }

    return { embed, content };
  }

  private async getClanLogEmbed(cache: Cache, webhook: WebhookClient, data: Feed) {
    const embed = new EmbedBuilder()
      .setColor(COLOR_CODES.CYAN)
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

  private formatHeroes(heroes: APIPlayerItem[]) {
    return heroes.length ? `${heroes.map((hero) => `${HEROES[hero.name]!}**${hero.level}**`).join(' ')}` : ``;
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

  private async send(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await super.sendMessage(cache, webhook, payload);
    } catch (error) {
      this.client.logger.error(`${error.toString()} {${cache._id.toString()}}`, { label: ClanLog.name });
      return null;
    }
  }

  public async init() {
    for await (const data of this.collection.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })) {
      this.cached.set((data._id as ObjectId).toHexString(), {
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

  public async add(id: string) {
    const data = await this.collection.findOne({ clanId: new ObjectId(id) });
    if (!data) return null;

    return this.cached.set(id, {
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

interface Member {
  op: string;
  tag: string;
  name: string;
  role: string;
  donations: number;
  donationsReceived: number;
  logType: string;
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
  type: string;
}

interface Cache {
  _id: ObjectId;
  tag: string;
  webhook: WebhookClient | null;
  deleted?: boolean;
  role?: string;
  channel: string;
  guild: string;
  threadId?: string;
  logType: string;
  deepLink?: string;
  retries: number;
}
