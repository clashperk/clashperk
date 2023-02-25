import { Collection, PermissionsString, Snowflake, WebhookClient, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Clan } from 'clashofclans.js';
import { ObjectId } from 'mongodb';
import { Collections } from '../util/Constants.js';
import { Client } from '../struct/Client.js';
import { Util } from '../util/index.js';
import { EMOJIS } from '../util/Emojis.js';
import { LastSeenLogModel } from '../types/index.js';
import { lastSeenEmbedMaker } from '../util/Helper.js';
import BaseLog from './BaseLog.js';

export default class LastSeenLog extends BaseLog {
	public declare cached: Collection<string, Cache>;
	private readonly queued = new Set<string>();
	public refreshRate: number;

	public constructor(client: Client) {
		super(client);
		this.refreshRate = 15 * 60 * 1000;
	}

	public override get collection() {
		return this.client.db.collection(Collections.LAST_SEEN_LOGS);
	}

	public override get permissions(): PermissionsString[] {
		return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
	}

	public override async handleMessage(cache: Cache, webhook: WebhookClient) {
		// await this.throttle(webhook.id);
		if (!cache.message) {
			const msg = await this.send(cache, webhook);
			return this.updateMessageId(cache, msg);
		}
		const msg = await this.edit(cache, webhook);
		return this.updateMessageId(cache, msg);
	}

	private _components(tag: string) {
		const row = new ActionRowBuilder<ButtonBuilder>()
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Secondary)
					.setCustomId(JSON.stringify({ cmd: 'lastseen', tag }))
					.setEmoji(EMOJIS.REFRESH)
			)
			.addComponents(
				new ButtonBuilder()
					.setStyle(ButtonStyle.Primary)
					.setCustomId(JSON.stringify({ cmd: 'lastseen', tag, score: true }))
					.setLabel('Scoreboard')
			);

		return row;
	}

	private async send(cache: Cache, webhook: WebhookClient) {
		const embed = await this.embed(cache);
		if (!embed) return null;
		try {
			return await super._send(cache, webhook, {
				embeds: [embed],
				threadId: cache.threadId,
				components: [this._components(cache.tag)]
			});
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'LastSeenLog' });
			return null;
		}
	}

	private async edit(cache: Cache, webhook: WebhookClient) {
		const embed = await this.embed(cache);
		if (!embed) return null;
		try {
			return await super._edit(cache, webhook, {
				embeds: [embed],
				threadId: cache.threadId,
				components: [this._components(cache.tag)]
			});
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'LastSeenLog' });
			return null;
		}
	}

	private async embed(cache: Cache) {
		const clan = (await this.client.redis.json.get(`C${cache.tag}`)) as unknown as Clan | null;
		if (!clan) return null;

		const embed = await lastSeenEmbedMaker(clan, { color: cache.color, scoreView: false });
		return embed;
	}

	public async init() {
		await this.collection.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } }).forEach((data) => {
			this.cached.set((data.clanId as ObjectId).toHexString(), {
				tag: data.tag,
				clanId: data.clanId,
				guild: data.guild,
				color: data.color,
				channel: data.channel,
				message: data.message,
				webhook: data.webhook ? new WebhookClient(data.webhook) : null
			});
		});

		this.initLoop();
	}

	private async initLoop() {
		await this._refresh();
		setInterval(this._refresh.bind(this), this.refreshRate).unref();
	}

	public async add(clanId: string) {
		const data = await this.collection.findOne({ clanId: new ObjectId(clanId) });

		if (!data) return null;
		return this.cached.set(clanId, {
			tag: data.tag,
			clanId: data.clanId,
			guild: data.guild,
			color: data.color,
			channel: data.channel,
			message: data.message,
			webhook: data.webhook ? new WebhookClient(data.webhook) : null
		});
	}

	private async _refresh() {
		const logs = await this.client.db
			.collection(Collections.LAST_SEEN_LOGS)
			.aggregate<LastSeenLogModel & { _id: ObjectId }>([
				{ $match: { updatedAt: { $lte: new Date(Date.now() - 30 * 60 * 1e3) } } },
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

interface Cache {
	tag: string;
	clanId: ObjectId;
	color?: number;
	guild: Snowflake;
	updatedAt?: Date;
	channel: Snowflake;
	message?: Snowflake;
	threadId?: string;
	webhook: WebhookClient | null;
}
