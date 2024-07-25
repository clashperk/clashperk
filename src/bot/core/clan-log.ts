import { APIPlayer, APIPlayerItem } from 'clashofclans.js';
import { Collection, EmbedBuilder, PermissionsString, WebhookClient, WebhookMessageCreateOptions, parseEmoji } from 'discord.js';
import moment from 'moment';
import { ObjectId, WithId } from 'mongodb';
import { ClanLogType, ClanLogsEntity, LogAction, LogActions } from '../entities/clan-logs.entity.js';
import { FlagsEntity } from '../entities/flags.entity.js';
import { COLOR_CODES, Collections, DEEP_LINK_TYPES, PLAYER_ROLES_MAP, Settings } from '../util/constants.js';
import { BLUE_NUMBERS, EMOJIS, HEROES, HOME_BASE_LEAGUES, RED_NUMBERS, TOWN_HALLS } from '../util/emojis.js';
import { unitsFlatten } from '../util/helper.js';
import { Util } from '../util/index.js';
import { RAW_TROOPS_FILTERED } from '../util/troops.js';
import BaseClanLog from './base-clan-log.js';
import RPCHandler from './rpc-handler.js';

const COLOR_MAPS: { [key: string]: number } = {
  [LogActions.NAME_CHANGE]: COLOR_CODES.PEACH,
  [LogActions.TOWN_HALL_UPGRADE]: COLOR_CODES.CYAN,
  [LogActions.PROMOTED]: COLOR_CODES.CYAN,
  [LogActions.DEMOTED]: COLOR_CODES.RED,
  [LogActions.WAR_PREF_CHANGE]: COLOR_CODES.CYAN,
  [LogActions.JOINED]: COLOR_CODES.GREEN,
  [LogActions.LEFT]: COLOR_CODES.RED
};

const logActionsMap: Record<string, LogAction[]> = {
  [ClanLogType.MEMBER_JOIN_LEAVE_LOG]: [LogActions.JOINED, LogActions.LEFT],
  [ClanLogType.ROLE_CHANGE_LOG]: [LogActions.DEMOTED, LogActions.PROMOTED],
  [ClanLogType.TOWN_HALL_UPGRADE_LOG]: [LogActions.TOWN_HALL_UPGRADE],
  [ClanLogType.WAR_PREFERENCE_LOG]: [LogActions.WAR_PREF_CHANGE],
  [ClanLogType.NAME_CHANGE_LOG]: [LogActions.NAME_CHANGE],
  [ClanLogType.CLAN_ACHIEVEMENTS_LOG]: [
    LogActions.WAR_LEAGUE_CHANGE,
    LogActions.CAPITAL_HALL_LEVEL_UP,
    LogActions.CLAN_LEVEL_UP,
    LogActions.CAPITAL_LEAGUE_CHANGE
  ]
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
    const actions = logActionsMap[cache.logType] ?? [];

    if (data.logType === 'DONATION_LOG') {
      if (cache.logType !== ClanLogType.CONTINUOUS_DONATION_LOG) return null;
      return this.getDonationLogEmbed(cache, webhook, data);
    }

    if (data.type) {
      if (!actions.includes(data.type)) return null;
      return this.getClanLogEmbed(cache, webhook, data);
    }

    const members = data.members.filter((member) => (Object.values(LogActions) as string[]).includes(member.op));
    if (!members.length) return null;

    const delay = members.length >= 5 ? 2000 : 250;

    for (const member of members) {
      if (!actions.includes(LogActions[member.op as LogAction])) continue;

      const result = await this.getPlayerLogEmbed(cache, member, data);
      if (!result) continue;

      await this.send(cache, webhook, {
        content: result.content,
        embeds: [result.embed],
        threadId: cache.threadId
      });

      await Util.delay(delay);
    }

    return members.length;
  }

  private async getPlayerLogEmbed(cache: Cache, member: Member, data: Feed) {
    const actions = logActionsMap[cache.logType] ?? [];
    if (!actions.includes(LogActions[member.op as LogAction])) return null;

    const { body: player, res } = await this.client.http.getPlayer(member.tag);
    if (!res.ok) return null;

    let content: string | undefined;

    const embed = new EmbedBuilder();
    embed.setColor(COLOR_MAPS[member.op]);
    embed.setTitle(`\u200e${player.name} (${player.tag})`);
    embed.setTimestamp();

    if (!cache.deepLink || cache.deepLink === DEEP_LINK_TYPES.OPEN_IN_COS) {
      embed.setURL(`https://www.clashofstats.com/players/${player.tag.slice(1)}`);
    } else {
      embed.setURL(`https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${encodeURIComponent(player.tag)}`);
    }

    if (member.op === LogActions.NAME_CHANGE) {
      embed.setDescription(`Name changed from **${member.name}**`);
      embed.setFooter({ text: `${data.clan.name}`, iconURL: data.clan.badge });
    }

    if (member.op === LogActions.PROMOTED) {
      embed.setFooter({ text: `${data.clan.name}`, iconURL: data.clan.badge });
      embed.setDescription(`Was Promoted to **${PLAYER_ROLES_MAP[member.role]}**`);
    }

    if (member.op === LogActions.DEMOTED) {
      embed.setFooter({ text: `${data.clan.name}`, iconURL: data.clan.badge });
      embed.setDescription(`Was Demoted to **${PLAYER_ROLES_MAP[member.role]}**`);
    }

    if (member.op === LogActions.TOWN_HALL_UPGRADE) {
      if (cache.role) content = `<@&${cache.role}>`;
      const { id } = parseEmoji(TOWN_HALLS[player.townHallLevel])!;
      embed.setThumbnail(`https://cdn.discordapp.com/emojis/${id!}.png?v=1`);
      embed.setFooter({ text: `${data.clan.name}`, iconURL: data.clan.badge });
      embed.setDescription(
        `Town Hall was upgraded to ${player.townHallLevel} with ${this.remainingUpgrades(player)}% remaining troop upgrades.`
      );
    }

    if (member.op === LogActions.WAR_PREF_CHANGE && player.warPreference) {
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

    if (member.op === LogActions.LEFT) {
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
          `${TOWN_HALLS[player.townHallLevel]} **${player.townHallLevel}**`,
          `${HOME_BASE_LEAGUES[player.league?.id ?? 29000000]}**${player.trophies}**`,
          `${EMOJIS.TROOPS_DONATE} **${member.donations}**${EMOJIS.UP_KEY} **${member.donationsReceived}**${EMOJIS.DOWN_KEY}`
        ].join(' ')
      );
    }

    if (member.op === LogActions.JOINED) {
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

    if (data.type === LogActions.CLAN_LEVEL_UP) {
      embed.setDescription(`Clan leveled up to **${data.clan.level}**`);
    }

    if (data.type === LogActions.CAPITAL_HALL_LEVEL_UP) {
      embed.setDescription(`Capital Hall leveled up to **${data.clan.capitalHallLevel}**`);
    }

    if (data.type === LogActions.CAPITAL_LEAGUE_CHANGE) {
      const isPromoted = this.isPromoted(data.clan.capitalLeague, data.clan.oldCapitalLeague);
      embed.setColor(isPromoted ? COLOR_CODES.DARK_GREEN : COLOR_CODES.DARK_RED);
      embed.setDescription(`Capital League was ${isPromoted ? 'promoted' : 'demoted'} to **${data.clan.capitalLeague.name}**`);
    }

    if (data.type === LogActions.WAR_LEAGUE_CHANGE) {
      const isPromoted = this.isPromoted(data.clan.capitalLeague, data.clan.oldCapitalLeague);
      embed.setColor(isPromoted ? COLOR_CODES.DARK_GREEN : COLOR_CODES.DARK_RED);
      embed.setDescription(`War League was ${isPromoted ? 'promoted' : 'demoted'} to **${data.clan.warLeague.name}**`);
    }

    return this.send(cache, webhook, {
      embeds: [embed],
      threadId: cache.threadId
    });
  }

  private async getDonationLogEmbed(cache: Cache, webhook: WebhookClient, data: Feed) {
    const embed = new EmbedBuilder()
      .setTitle(`${data.clan.name} (${data.clan.tag})`)
      .setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.clan.tag)}`)
      .setThumbnail(data.clan.badgeUrl)
      .setFooter({ text: `${data.clan.members}/50`, iconURL: data.clan.badgeUrl })
      .setTimestamp()
      .setColor(COLOR_CODES.PURPLE);

    const donatingMembers = data.members.filter((m) => m.op === LogActions.DONATED);
    if (donatingMembers.length) {
      embed.addFields([
        {
          name: `${EMOJIS.USER_BLUE} Donated`,
          value: [
            donatingMembers
              .map((m) => {
                if (m.donations > (this.client.isCustom() ? 100 : 200)) {
                  const [div, mod] = this.divMod(m.donations);
                  const list = [`\u200e${TOWN_HALLS[m.townHallLevel]} ${BLUE_NUMBERS[(div > 900 ? 900 : div).toString()]} ${m.name}`];
                  if (mod > 0) {
                    return list.concat(`\u200e${TOWN_HALLS[m.townHallLevel]} ${BLUE_NUMBERS[mod.toString()]} ${m.name}`).join('\n');
                  }
                  return list.join('\n');
                }
                return `\u200e${TOWN_HALLS[m.townHallLevel]} ${BLUE_NUMBERS[m.donations]} ${m.name}`;
              })
              .join('\n')
              .slice(0, 1024)
          ].join('\n')
        }
      ]);
    }

    const receivingMembers = data.members.filter((m) => m.op === LogActions.RECEIVED);
    if (receivingMembers.length) {
      embed.addFields([
        {
          name: `${EMOJIS.USER_RED} Received`,
          value: [
            receivingMembers
              .map((m) => {
                if (m.donationsReceived > (this.client.isCustom() ? 100 : 200)) {
                  const [div, mod] = this.divMod(m.donationsReceived);
                  const list = [`\u200e${TOWN_HALLS[m.townHallLevel]} ${RED_NUMBERS[(div > 900 ? 900 : div).toString()]} ${m.name}`];
                  if (mod > 0) {
                    return list.concat(`\u200e${TOWN_HALLS[m.townHallLevel]} ${RED_NUMBERS[mod.toString()]!} ${m.name}`).join('\n');
                  }
                  return list.join('\n');
                }
                return `\u200e${TOWN_HALLS[m.townHallLevel]} ${RED_NUMBERS[m.donationsReceived]!} ${m.name}`;
              })
              .join('\n')
              .slice(0, 1024)
          ].join('\n')
        }
      ]);
    }

    return this.send(cache, webhook, {
      embeds: [embed],
      threadId: cache.threadId
    });
  }

  private formatHeroes(heroes: APIPlayerItem[]) {
    return heroes.length ? `${heroes.map((hero) => `${HEROES[hero.name]!}**${hero.level}**`).join(' ')}` : ``;
  }

  private divMod(num: number) {
    return [Math.floor(num / 100) * 100, num % 100];
  }

  private isPromoted(current?: { id: number }, old?: { id: number }) {
    if (!current?.id) return false;
    if (!old?.id) return true;

    return current.id > old.id;
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
    const guildIds = this.client.guilds.cache.map((guild) => guild.id);
    for await (const data of this.collection.find({
      isEnabled: true,
      logType: {
        $in: [
          ClanLogType.MEMBER_JOIN_LEAVE_LOG,
          ClanLogType.TOWN_HALL_UPGRADE_LOG,
          ClanLogType.ROLE_CHANGE_LOG,
          ClanLogType.ROLE_CHANGE_LOG,
          ClanLogType.WAR_PREFERENCE_LOG,
          ClanLogType.NAME_CHANGE_LOG,
          ClanLogType.HERO_UPGRADE_LOG,
          ClanLogType.CONTINUOUS_DONATION_LOG,
          ClanLogType.CLAN_ACHIEVEMENTS_LOG
        ]
      },
      guildId: { $in: guildIds }
    })) {
      this.setCache(data);
    }
  }

  public async add(guildId: string) {
    for await (const data of this.collection.find({
      guildId,
      isEnabled: true,
      logType: {
        $in: [
          ClanLogType.MEMBER_JOIN_LEAVE_LOG,
          ClanLogType.TOWN_HALL_UPGRADE_LOG,
          ClanLogType.ROLE_CHANGE_LOG,
          ClanLogType.ROLE_CHANGE_LOG,
          ClanLogType.WAR_PREFERENCE_LOG,
          ClanLogType.NAME_CHANGE_LOG,
          ClanLogType.HERO_UPGRADE_LOG,
          ClanLogType.CONTINUOUS_DONATION_LOG,
          ClanLogType.CLAN_ACHIEVEMENTS_LOG
        ]
      }
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
      role: data.roleId,
      deepLink: data.deepLink,
      logType: data.logType,
      retries: 0,
      webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
    });
  }
}

interface Member {
  op: LogAction;
  tag: string;
  name: string;
  role: string;
  leagueId: number;
  townHallLevel: number;
  donations: number;
  donationsReceived: number;
  logType: string;
}

interface Feed {
  clan: {
    tag: string;
    name: string;
    /** @deprecated To be deprecated */
    badge: string;
    /** Only for DONATION_LOG */
    badgeUrl: string;
    level: number;
    members: number;
    warLeague: { name: string; id: number };
    oldWarLeague: { name: string; id: number };
    capitalLeague: { name: string; id: number };
    oldCapitalLeague: { name: string; id: number };
    capitalHallLevel: number;
  };
  members: Member[];
  memberList: {
    tag: string;
    role: string;
    clan: { tag: string };
  }[];
  logType: string;
  type?: LogAction;
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
  logType: ClanLogType;
  deepLink?: string;
  retries: number;
}
