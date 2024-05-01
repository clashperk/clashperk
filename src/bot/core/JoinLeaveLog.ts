import { APIPlayer, APIPlayerItem } from 'clashofclans.js';
import { Collection, EmbedBuilder, PermissionsString, WebhookClient, WebhookMessageCreateOptions } from 'discord.js';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import { FlagsEntity } from '../entities/flags.entity.js';
import { Collections, ColorCodes, DeepLinkTypes, Settings } from '../util/Constants.js';
import { EMOJIS, HEROES, HOME_BASE_LEAGUES, TOWN_HALLS } from '../util/Emojis.js';
import { unitsFlatten } from '../util/Helper.js';
import { RAW_TROOPS_FILTERED } from '../util/Troops.js';
import { Util } from '../util/index.js';
import BaseLog from './BaseLog.js';
import RPCHandler from './RPCHandler.js';

const OP: { [key: string]: number } = {
  JOINED: ColorCodes.GREEN,
  LEFT: ColorCodes.RED
};

export default class JoinLeaveLog extends BaseLog {
  public declare cached: Collection<string, Cache>;

  public constructor(private handler: RPCHandler) {
    super(handler.client);
    this.client = handler.client;
  }

  public override get permissions(): PermissionsString[] {
    return ['SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ReadMessageHistory', 'ViewChannel'];
  }

  public override get collection() {
    return this.client.db.collection(Collections.JOIN_LEAVE_LOGS);
  }

  public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
    const members = data.members.filter((mem) => Object.keys(OP).includes(mem.op));
    if (!members.length) return null;
    const delay = members.length >= 5 ? 2000 : 250;

    members.sort((a, b) => a.rand - b.rand);
    const messages = (await Promise.all(members.map((mem) => this.embed(cache, mem, data)))).filter((m) => m);

    for (const message of messages) {
      if (!message) continue;
      const msg = await this.send(cache, webhook, {
        embeds: [message.embed],
        content: message.content!,
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

  private async embed(cache: Cache, member: Member, data: Feed) {
    const { body: player, res } = await this.client.http.getPlayer(member.tag);
    if (!res.ok) return null;

    let content = null;
    const embed = new EmbedBuilder().setColor(OP[member.op]).setTitle(`\u200e${player.name} (${player.tag})`);
    if (!cache.deepLink || cache.deepLink === DeepLinkTypes.OpenInCOS) {
      embed.setURL(`https://www.clashofstats.com/players/${player.tag.replace('#', '')}`);
    }
    if (cache.deepLink === DeepLinkTypes.OpenInGame) {
      embed.setURL(`https://link.clashofclans.com/?action=OpenPlayerProfile&tag=${encodeURIComponent(player.tag)}`);
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
          const guild = this.client.guilds.cache.get(cache.guild)!;
          const user = await this.client.users.fetch(flag.user, { cache: false }).catch(() => null);
          if (cache.role && guild.roles.cache.has(cache.role)) {
            const role = guild.roles.cache.get(cache.role)!;
            content = `${role.toString()}`;
          }
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
    embed.setTimestamp();
    return { content, embed };
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
    return (100 - (rem.levels * 100) / rem.total).toFixed(1);
  }

  public async init() {
    for await (const data of this.collection.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })) {
      this.cached.set((data.clanId as ObjectId).toHexString(), {
        clanId: data.clanId,
        guild: data.guild,
        channel: data.channel,
        tag: data.tag,
        role: data.role,
        deepLink: data.deepLink,
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
      retries: data.retries ?? 0,
      webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
    });
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
  };
  members: Member[];
  memberList: {
    tag: string;
    role: string;
    clan: { tag: string };
  }[];
}

interface Cache {
  tag: string;
  clanId: ObjectId;
  webhook: WebhookClient | null;
  deleted?: boolean;
  channel: string;
  role: string | null;
  guild: string;
  threadId?: string;
  retries: number;
  deepLink?: string;
}
