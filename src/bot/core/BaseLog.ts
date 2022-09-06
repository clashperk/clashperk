import {
	APIMessage,
	Collection,
	NewsChannel,
	PermissionsString,
	SnowflakeUtil,
	TextChannel,
	WebhookClient,
	WebhookMessageOptions
} from 'discord.js';
import { Collection as DbCollection, ObjectId } from 'mongodb';
import { Client } from '../struct/Client.js';
import { Util } from '../util/index.js';

export default class BaseLog {
	public cached: Collection<string, Cache>;
	public lastReq: Map<string, NodeJS.Timeout>;

	public constructor(public client: Client) {
		this.cached = new Collection();
		this.lastReq = new Map();
	}

	public async throttle(id: string) {
		if (this.lastReq.has(id)) await Util.delay(1000);

		if (this.lastReq.has(id)) {
			clearTimeout(this.lastReq.get(id));
			this.lastReq.delete(id);
		}

		const timeoutId = setTimeout(() => {
			this.lastReq.delete(id);
			clearTimeout(timeoutId);
		}, 1000);
		this.lastReq.set(id, timeoutId);

		return Promise.resolve(0);
	}

	public get permissions(): PermissionsString[] {
		throw new Error('Method not implemented.');
	}

	public get collection(): DbCollection {
		throw new Error('Method not implemented.');
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public handleMessage(cache: Cache, webhook: WebhookClient, data: unknown) {
		throw new Error('Method not implemented.');
	}

	public async exec(tag: string, data: unknown) {
		const clans = this.cached.filter((d) => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(cache, data);
		}

		return clans.clear();
	}

	public async permissionsFor(cache: Cache, data: unknown) {
		const channel = this.client.util.hasPermissions(cache.channel, this.permissions);
		if (channel) {
			if (channel.isThread) cache.threadId = channel.channel.id;
			const webhook = await this.webhook(cache, channel.parent);
			if (webhook) return this.handleMessage(cache, webhook, data);
		}
	}

	public updateWebhook(cache: Cache, webhook: WebhookClient, channel: string) {
		return this.collection.updateOne(
			{ clanId: new ObjectId(cache.clanId) },
			{ $set: { channel: channel, webhook: { id: webhook.id, token: webhook.token } } }
		);
	}

	public deleteWebhook(cache: Cache) {
		cache.webhook = null;
		cache.deleted = true;

		return this.collection.updateOne({ clanId: new ObjectId(cache.clanId) }, { $set: { webhook: null } });
	}

	public async updateMessageId(cache: Cache, msg: APIMessage | null) {
		if (msg) {
			await this.collection.updateOne(
				{ clanId: new ObjectId(cache.clanId) },
				{
					$set: {
						retries: 0,
						message: msg.id,
						channel: msg.channel_id,
						updatedAt: new Date()
					}
				}
			);
			cache.message = msg.id;
			cache.channel = msg.channel_id;
		} else {
			await this.collection.updateOne({ clanId: new ObjectId(cache.clanId) }, { $inc: { retries: 1 } });
		}
		return msg;
	}

	public async _send(cache: Cache, webhook: WebhookClient, payload: WebhookMessageOptions) {
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

	public async _edit(cache: Cache, webhook: WebhookClient, payload: WebhookMessageOptions) {
		try {
			return await webhook.editMessage(cache.message!, payload);
		} catch (error: any) {
			if (error.code === 10008) {
				delete cache.message;
				// this.deleteMessage(cache);
				return this._send(cache, webhook, payload);
			}
			// Unknown Webhook / Unknown Channel
			if ([10015, 10003].includes(error.code)) {
				await this.deleteWebhook(cache);
			}
			throw error;
		}
	}

	private async deleteMessage(cache: Cache) {
		try {
			if (cache.message) {
				const deconstructed = SnowflakeUtil.deconstruct(cache.message);
				if (Number(deconstructed.timestamp) < new Date('2022-09-05').getTime()) {
					await (this.client.channels.cache.get(cache.channel) as TextChannel).messages.delete(cache.message);
				}
			}
		} catch {}
	}

	public async webhook(cache: Cache, channel: TextChannel | NewsChannel): Promise<WebhookClient | null> {
		if (cache.webhook) return cache.webhook;
		if (cache.deleted) return null;

		const webhook = await this.client.storage.getWebhook(channel).catch(() => null);
		if (webhook) {
			cache.webhook = new WebhookClient({ id: webhook.id, token: webhook.token! });
			await this.updateWebhook(cache, cache.webhook, cache.channel);
			return cache.webhook;
		}

		cache.webhook = null;
		cache.deleted = true;
		return null;
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}

interface Cache {
	tag: string;
	clanId: ObjectId;
	webhook: WebhookClient | null;
	deleted?: boolean;
	message?: string;
	channel: string;
	guild: string;
	threadId?: string;
	retries?: number;
}
