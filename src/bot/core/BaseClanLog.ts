import {
  APIMessage,
  Collection,
  ForumChannel,
  MediaChannel,
  NewsChannel,
  PermissionsString,
  TextChannel,
  WebhookClient,
  WebhookMessageCreateOptions
} from 'discord.js';
import { Collection as DbCollection, ObjectId } from 'mongodb';
import { ClanLogsEntity } from '../entities/clan-logs.entity.js';
import { Client } from '../struct/Client.js';
import { DiscordErrorCodes, FeatureFlags } from '../util/constants.js';

const WEBHOOK_RETRY_THRESHOLD = 3;

export default class BaseClanLog {
  public cached: Collection<string, Cache>;

  public constructor(public client: Client) {
    this.cached = new Collection();
  }

  public get permissions(): PermissionsString[] {
    throw new Error('Method not implemented.');
  }

  public get collection(): DbCollection<ClanLogsEntity> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public handleMessage(cache: Cache, webhook: WebhookClient, data: unknown) {
    throw new Error('Method not implemented.');
  }

  public async exec(clanTag: string, data: Record<string, unknown>) {
    const clans = this.cached.filter((cache) => cache.tag === clanTag);
    for (const _id of clans.keys()) {
      const cache = this.cached.get(_id);
      if (!cache) continue;

      if (data.channel && cache.channel !== data.channel) continue;

      const isEnabled = await this.client.isFeatureEnabled(FeatureFlags.CLAN_LOG_SEPARATION, cache.guild);
      if (!isEnabled) return null;

      // Double posting prevention for custom bots
      if (this.client.settings.hasCustomBot(cache.guild) && !this.client.isCustom()) continue;
      await this.permissionsFor(cache, data);
    }
    return clans.clear();
  }

  public async permissionsFor(cache: Cache, data: unknown) {
    const channel = this.client.util.hasPermissions(cache.channel, this.permissions);
    if (channel) {
      if (channel.isThread) cache.threadId = channel.channel.id;
      const webhook = await this.getWebhook(cache, channel.parent);
      if (webhook) return this.handleMessage(cache, webhook, data);
    }
  }

  public updateWebhook(cache: Cache, webhook: WebhookClient, channelId: string) {
    return this.collection.updateOne({ _id: cache._id }, { $set: { channelId, webhook: { id: webhook.id, token: webhook.token } } });
  }

  public deleteWebhook(cache: Cache) {
    cache.webhook = null;
    cache.deleted = true;

    return this.collection.updateOne({ _id: cache._id }, { $set: { webhook: null } });
  }

  public async updateMessageId(cache: Cache, msg: APIMessage | null) {
    if (msg && (cache.message !== msg.id || cache.channel !== msg.channel_id)) {
      await this.collection.updateOne(
        { _id: cache._id },
        {
          $set: {
            retries: 0,
            messageId: msg.id,
            channelId: msg.channel_id,
            lastPostedAt: new Date()
          }
        }
      );
    }

    if (msg) {
      cache.message = msg.id;
      cache.channel = msg.channel_id;
    }

    if (!msg) {
      await this.collection.updateOne({ _id: cache._id }, { $inc: { retries: 1 } });
    }

    return msg;
  }

  public async sendMessage(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    try {
      return await webhook.send(payload);
    } catch (error) {
      if ([DiscordErrorCodes.UNKNOWN_CHANNEL, DiscordErrorCodes.UNKNOWN_WEBHOOK].includes(error.code)) {
        await this.deleteWebhook(cache);
      }

      throw error;
    }
  }

  public async editMessage(cache: Cache, webhook: WebhookClient, payload: WebhookMessageCreateOptions) {
    if (!cache.message) return this.sendMessage(cache, webhook, payload);

    try {
      return await webhook.editMessage(cache.message, payload);
    } catch (error) {
      if (error.code === DiscordErrorCodes.UNKNOWN_MESSAGE) {
        delete cache.message;
        return this.sendMessage(cache, webhook, payload);
      }

      if ([DiscordErrorCodes.UNKNOWN_CHANNEL, DiscordErrorCodes.UNKNOWN_WEBHOOK].includes(error.code)) {
        await this.deleteWebhook(cache);
      }

      throw error;
    }
  }

  public async getWebhook(cache: Cache, channel: TextChannel | NewsChannel | ForumChannel | MediaChannel): Promise<WebhookClient | null> {
    if (cache.webhook) return cache.webhook;
    if (cache.retries && cache.deleted && cache.retries > WEBHOOK_RETRY_THRESHOLD) return null;

    const webhook = await this.client.storage.getWebhook(channel).catch(() => null);
    if (webhook) {
      cache.webhook = new WebhookClient({ id: webhook.id, token: webhook.token! });
      await this.updateWebhook(cache, cache.webhook, cache.channel);
      return cache.webhook;
    }

    cache.webhook = null;
    cache.deleted = true;
    cache.retries = (cache.retries || 0) + 1;
    return null;
  }

  public delete(_id: string) {
    return this.cached.delete(_id);
  }
}

interface Cache {
  _id: ObjectId;
  tag: string;
  webhook: WebhookClient | null;
  deleted?: boolean;
  channel: string;
  message?: string | null;
  guild: string;
  threadId?: string;
  retries?: number;
}
