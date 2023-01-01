import {
	EmbedBuilder,
	Collection,
	PermissionsString,
	Snowflake,
	WebhookClient,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';
import { Clan } from 'clashofclans.js';
import { ObjectId } from 'mongodb';
import { Collections } from '../util/Constants.js';
import { Client } from '../struct/Client.js';
import { Util } from '../util/index.js';
import { EMOJIS } from '../util/Emojis.js';
import BaseLog from './BaseLog.js';

export default class LastSeenLog extends BaseLog {
	public declare cached: Collection<string, Cache>;

	public constructor(client: Client) {
		super(client);
	}

	public override get collection() {
		return this.client.db.collection(Collections.LAST_SEEN_LOGS);
	}

	public override get permissions(): PermissionsString[] {
		return ['ReadMessageHistory', 'SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'AddReactions', 'ViewChannel'];
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
		// await this.throttle(webhook.id);
		if (!cache.message) {
			const msg = await this.send(cache, webhook, data);
			return this.updateMessageId(cache, msg);
		}
		const msg = await this.edit(cache, webhook, data);
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

	private async send(cache: Cache, webhook: WebhookClient, data: Feed) {
		const embed = this.embed(cache, data);
		try {
			return await super._send(cache, webhook, {
				embeds: [embed],
				threadId: cache.threadId,
				components: [this._components(data.clan.tag)]
			});
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'LastSeenLog' });
			return null;
		}
	}

	private async edit(cache: Cache, webhook: WebhookClient, data: Feed) {
		const embed = this.embed(cache, data);
		try {
			return await super._edit(cache, webhook, {
				embeds: [embed],
				threadId: cache.threadId,
				components: [this._components(data.clan.tag)]
			});
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'LastSeenLog' });
			return null;
		}
	}

	private embed(cache: Cache, { members, clan }: Feed) {
		const getTime = (ms?: number) => {
			if (!ms) return ''.padEnd(7, ' ');
			return Util.duration(ms + 1e3).padEnd(7, ' ');
		};

		const embed = new EmbedBuilder();
		if (cache.color) embed.setColor(cache.color);
		embed.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium });
		embed.setDescription(
			[
				`**[Last seen and last 24h activity scores](https://clashperk.com/faq)**`,
				`\`\`\`\n\u200eLAST-ON 24H  NAME`,
				members.map((m) => `${getTime(m.lastSeen)}  ${Math.min(99, m.count).toString().padStart(2, ' ')}  ${m.name}`).join('\n'),
				'```'
			].join('\n')
		);
		embed.setFooter({ text: `Synced [${members.length}/${clan.members}]` });
		embed.setTimestamp();

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
}

interface Feed {
	clan: Clan;
	members: { name: string; count: number; lastSeen: number }[];
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
