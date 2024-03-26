import { APIClan } from 'clashofclans.js';
import { Collection, PermissionsString, Snowflake, WebhookClient } from 'discord.js';
import { ObjectId } from 'mongodb';
import { Collections } from '../util/Constants.js';
import { clanEmbedMaker } from '../util/Helper.js';
import BaseLog from './BaseLog.js';
import RPCHandler from './RPCHandler.js';

export interface Cache {
	clanId: ObjectId;
	tag: string;
	guild: string;
	channel: Snowflake;
	message?: Snowflake;
	color: number;
	embed: any;
	threadId?: string;
	webhook: WebhookClient | null;
}

interface Feed {
	clan: APIClan;
}

export default class ClanEmbedLog extends BaseLog {
	public declare cached: Collection<string, Cache>;

	public override get collection() {
		return this.client.db.collection(Collections.CLAN_EMBED_LOGS);
	}

	public override get permissions(): PermissionsString[] {
		return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
	}

	public constructor(private handler: RPCHandler) {
		super(handler.client);
		this.client = handler.client;
	}

	public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
		if (!cache.message) {
			const msg = await this.send(cache, webhook, data);
			return this.updateMessageId(cache, msg);
		}

		const msg = await this.edit(cache, webhook, data);
		return this.updateMessageId(cache, msg);
	}

	private async send(cache: Cache, webhook: WebhookClient, data: Feed) {
		const embed = await this.embed(cache, data.clan);
		try {
			return await super._send(cache, webhook, { embeds: [embed], threadId: cache.threadId });
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'LastSeenLog' });
			return null;
		}
	}

	private async edit(cache: Cache, webhook: WebhookClient, data: Feed) {
		const embed = await this.embed(cache, data.clan);
		try {
			return await super._edit(cache, webhook, { embeds: [embed], threadId: cache.threadId });
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'LastSeenLog' });
			return null;
		}
	}

	private async embed(cache: Cache, data: APIClan) {
		const embed = await clanEmbedMaker(data, {
			description: cache.embed.description,
			accepts: cache.embed.accepts,
			fields: cache.embed.fields,
			bannerImage: cache.embed.bannerImage,
			color: cache.color
		});

		return embed;
	}

	public async init() {
		const cursor = this.client.db
			.collection(Collections.CLAN_EMBED_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } });

		for await (const data of cursor) {
			this.cached.set((data.clanId as ObjectId).toHexString(), {
				clanId: data.clanId,
				message: data.message,
				guild: data.guild,
				color: data.color,
				embed: data.embed,
				tag: data.tag,
				channel: data.channel,
				webhook: data.webhook ? new WebhookClient(data.webhook) : null
			});
		}
	}

	public async add(_id: string) {
		const data = await this.client.db.collection(Collections.CLAN_EMBED_LOGS).findOne({ clanId: new ObjectId(_id) });

		if (!data) return null;
		return this.cached.set(_id, {
			clanId: data.clanId,
			channel: data.channel,
			guild: data.guild,
			message: data.message,
			color: data.color,
			embed: data.embed,
			tag: data.tag,
			webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
		});
	}
}
