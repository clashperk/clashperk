import { Collections } from '@app/constants';
import { FlagsEntity } from '@app/entities';
import {
  APIMessage,
  Collection,
  EmbedBuilder,
  ForumChannel,
  MediaChannel,
  NewsChannel,
  PermissionsString,
  Snowflake,
  TextChannel,
  WebhookClient,
  WebhookMessageCreateOptions,
  time
} from 'discord.js';
import { ObjectId } from 'mongodb';
import { Client } from '../struct/client.js';
import { HOME_BASE_LEAGUES, TOWN_HALLS } from '../util/emojis.js';
import { Util } from '../util/toolkit.js';
import { Enqueuer } from './enqueuer.js';

export class FlagAlertLog {
  public cached: Collection<string, Cache> = new Collection();
  private client: Client;

  public constructor(private enqueuer: Enqueuer) {
    this.client = enqueuer.client;
  }

  public get collection() {
    return this.client.db.collection(Collections.FLAG_ALERT_LOGS);
  }

  public get permissions(): PermissionsString[] {
    return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
  }

  public async exec(tag: string, payload: Feed) {
    const members = payload.members.filter((mem) => mem.op === 'JOINED');
    if (!members.length) return null;

    const clans = this.enqueuer.cached.get(tag) ?? [];
    for (const clan of clans) {
      const cache = this.cached.get(clan.guild);

      // double posting prevention for custom bots
      if (cache?.guildId && this.client.settings.hasCustomBot(cache.guildId) && !this.client.isCustom()) continue;

      if (cache) await this.permissionsFor(cache, payload);
    }
  }

  public async permissionsFor(cache: Cache, payload: Feed) {
    const channel = this.client.util.hasPermissions(cache.channelId, this.permissions);
    if (channel) {
      if (channel.isThread) cache.threadId = channel.channel.id;
      const webhook = await this.webhook(cache, channel.parent);
      if (webhook) return this.handleMessage(cache, webhook, payload);
    }
  }

  public async handleMessage(cache: Cache, webhook: WebhookClient, payload: Feed) {
    return this.send(cache, webhook, payload);
  }

  public updateWebhook(cache: Cache, webhook: WebhookClient, channelId: string) {
    return this.collection.updateOne(
      { _id: new ObjectId(cache._id) },
      { $set: { channelId, webhook: { id: webhook.id, token: webhook.token } } }
    );
  }

  public deleteWebhook(cache: Cache) {
    cache.webhook = null;
    cache.deleted = true;

    return this.collection.updateOne({ _id: new ObjectId(cache._id) }, { $set: { webhook: null } });
  }

  public async updateMessageId(cache: Cache, msg: APIMessage | null) {
    if (msg) {
      await this.collection.updateOne(
        { _id: new ObjectId(cache._id) },
        {
          $set: {
            retries: 0,
            messageId: msg.id,
            channelId: msg.channel_id,
            updatedAt: new Date()
          }
        }
      );
      cache.channelId = msg.channel_id;
    } else {
      await this.collection.updateOne({ _id: new ObjectId(cache._id) }, { $inc: { retries: 1 } });
    }
    return msg;
  }

  public async _send(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await webhook.send(payload);
    } catch (error: any) {
      // Unknown Webhook / Unknown Channel
      if ([10015, 10003].includes(error.code)) {
        await this.deleteWebhook(cache);
      }
      throw error;
    }
  }

  private async send(cache: Cache, webhook: WebhookClient, data: Feed) {
    const members = data.members.filter((mem) => mem.op === 'JOINED');
    if (!members.length) return null;

    const delay = members.length >= 5 ? 2000 : 250;
    const messages = (await Promise.all(members.map((member) => this.embed(cache, data, member)))).filter((m) => m);

    for (const message of messages) {
      if (!message) continue;

      const msg = await this._send(cache, webhook, {
        embeds: [message.embed],
        content: message.content!,
        threadId: cache.threadId
      });
      await this.updateMessageId(cache, msg);
      await Util.delay(delay);
    }

    return members.length;
  }

  public async webhook(cache: Cache, channel: TextChannel | NewsChannel | ForumChannel | MediaChannel): Promise<WebhookClient | null> {
    if (cache.webhook) return cache.webhook;
    if (cache.deleted) return null;

    const webhook = await this.client.storage.getWebhook(channel).catch(() => null);
    if (webhook) {
      cache.webhook = new WebhookClient({ id: webhook.id, token: webhook.token! });
      await this.updateWebhook(cache, cache.webhook, cache.channelId);
      return cache.webhook;
    }

    cache.webhook = null;
    cache.deleted = true;
    return null;
  }

  private async embed(cache: Cache, data: Feed, member: Member) {
    const guild = this.client.guilds.cache.get(cache.guildId);
    if (!guild) return null;

    let content: null | string = null;
    const embed = new EmbedBuilder().setColor(0xeb3508);

    const flag = await this.client.db.collection<FlagsEntity>(Collections.FLAGS).findOne(
      {
        guild: cache.guildId,
        tag: member.tag,
        flagType: 'ban',
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
      },
      { sort: { _id: -1 } }
    );
    if (!flag) return null;

    const { body: player, res } = await this.client.http.getPlayer(member.tag);
    if (!res.ok) return null;

    embed.setTitle(`\u200e${player.name} (${player.tag})`);
    embed.setFooter({ text: `Joined ${data.clan.name}`, iconURL: data.clan.badge });

    const user = await this.client.users.fetch(flag.user, { cache: false }).catch(() => null);

    if (cache.useAutoRole) {
      const clan = await this.client.storage.collection.findOne({ guild: cache.guildId, tag: data.clan.tag });
      const roles = [clan?.roles?.coLeader, clan?.roles?.leader].filter((roleId) => roleId && guild.roles.cache.has(roleId)) as string[];
      if (roles.length) content = `<@&${roles.join('> <@&')}>`;
    } else if (cache.roleId && guild.roles.cache.has(cache.roleId)) {
      content = `<@&${cache.roleId}>`;
    }

    embed.setDescription(
      [
        `${TOWN_HALLS[player.townHallLevel]!} **${player.townHallLevel}** ${HOME_BASE_LEAGUES[player.league?.id ?? 29000000]!} **${
          player.trophies
        }**`,
        '',
        '**Flag**',
        `${flag.reason as string}`,
        '',
        `${user ? user.displayName : 'Unknown'} (${time(flag.createdAt, 'f')})`
      ].join('\n')
    );

    return { embed, content };
  }

  public async init() {
    for await (const data of this.collection.find({
      guildId: { $in: this.client.guilds.cache.map((guild) => guild.id) }
    })) {
      this.cached.set(data.guildId, {
        _id: data._id.toHexString(),
        guildId: data.guildId,
        roleId: data.roleId,
        useAutoRole: data.useAutoRole,
        channelId: data.channelId,
        updatedAt: data.updatedAt,
        webhook: data.webhook ? new WebhookClient(data.webhook) : null
      });
    }
  }

  public async add(guildId: string) {
    const data = await this.collection.findOne({ guildId });
    if (!data) return null;

    this.cached.set(guildId, {
      _id: data._id.toHexString(),
      guildId: data.guildId,
      roleId: data.roleId,
      useAutoRole: data.useAutoRole,
      channelId: data.channelId,
      updatedAt: data.updatedAt,
      webhook: data.webhook ? new WebhookClient(data.webhook) : null
    });
  }

  public del(guildId: string) {
    return this.cached.delete(guildId);
  }
}

interface Cache {
  _id: string;
  guildId: Snowflake;
  channelId: Snowflake;
  threadId?: string;
  roleId?: string;
  useAutoRole: boolean;
  webhook: WebhookClient | null;
  updatedAt: Date;
  deleted?: boolean;
}

interface Member {
  op: string;
  tag: string;
}

interface Feed {
  clan: {
    tag: string;
    name: string;
    badge: string;
  };
  members: Member[];
}
