import { Collection, EmbedBuilder, PermissionsString, WebhookClient } from 'discord.js';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import Client from '../struct/Client.js';
import { Collections } from '../util/Constants.js';
import { BLUE_NUMBERS, EMOJIS, PLAYER_LEAGUES, RED_NUMBERS } from '../util/Emojis.js';
import { Util } from '../util/index.js';
import BaseLog from './BaseLog.js';

export default class DonationLog extends BaseLog {
	public declare cached: Collection<string, Cache>;
	private readonly queued = new Set<string>();

	public constructor(client: Client) {
		super(client);
	}

	public override get permissions(): PermissionsString[] {
		return ['SendMessages', 'EmbedLinks', 'UseExternalEmojis', 'ViewChannel'];
	}

	public override get collection() {
		return this.client.db.collection(Collections.DONATION_LOGS);
	}

	public override async handleMessage(cache: Cache, webhook: WebhookClient, data: Feed) {
		const msg = await this.send(cache, webhook, data);
		return this.updateMessageId(cache, msg);
	}

	private async send(cache: Cache, webhook: WebhookClient, data: Feed) {
		const embed = this.embed(cache, data);
		try {
			return await super._send(cache, webhook, { embeds: [embed], threadId: cache.threadId });
		} catch (error: any) {
			this.client.logger.error(`${error as string} {${cache.clanId.toString()}}`, { label: 'DonationLog' });
			return null;
		}
	}

	private embed(cache: Cache, data: Feed) {
		const embed = new EmbedBuilder()
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.clan.tag)}`)
			.setThumbnail(data.clan.badge)
			.setFooter({ text: `${data.clan.members} Members`, iconURL: this.client.user!.displayAvatarURL({ extension: 'png' }) })
			.setTimestamp();
		if (cache.color) embed.setColor(cache.color);

		if (data.donated.length) {
			embed.addFields([
				{
					name: `${EMOJIS.USER_BLUE} Donated`,
					value: [
						data.donated
							.map((m) => {
								if (m.donated > 200) {
									const [div, mod] = this.divmod(m.donated);
									const list = [
										`\u200e${PLAYER_LEAGUES[m.league]!} ${BLUE_NUMBERS[(div > 900 ? 900 : div).toString()]!} ${m.name}`
									];
									if (mod > 0)
										return list
											.concat(`\u200e${PLAYER_LEAGUES[m.league]!} ${BLUE_NUMBERS[mod.toString()]!} ${m.name}`)
											.join('\n');
									return list.join('\n');
								}
								return `\u200e${PLAYER_LEAGUES[m.league]!} ${BLUE_NUMBERS[m.donated]!} ${m.name}`;
							})
							.join('\n')
							.substring(0, 1024)
					].join('\n')
				}
			]);
		}

		if (data.received.length) {
			embed.addFields([
				{
					name: `${EMOJIS.USER_RED} Received`,
					value: [
						data.received
							.map((m) => {
								if (m.received > 200) {
									const [div, mod] = this.divmod(m.received);
									const list = [
										`\u200e${PLAYER_LEAGUES[m.league]!} ${RED_NUMBERS[(div > 900 ? 900 : div).toString()]!} ${m.name}`
									];
									if (mod > 0)
										return list
											.concat(`\u200e${PLAYER_LEAGUES[m.league]!} ${RED_NUMBERS[mod.toString()]!} ${m.name}`)
											.join('\n');
									return list.join('\n');
								}
								return `\u200e${PLAYER_LEAGUES[m.league]!} ${RED_NUMBERS[m.received]!} ${m.name}`;
							})
							.join('\n')
							.substring(0, 1024)
					].join('\n')
				}
			]);
		}

		return embed;
	}

	private divmod(num: number) {
		return [Math.floor(num / 100) * 100, num % 100];
	}

	public async init() {
		await this.client.db
			.collection(Collections.DONATION_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })
			.forEach((data) => {
				this.cached.set((data.clanId as ObjectId).toHexString(), {
					clanId: data.clanId,
					guild: data.guild,
					retries: 0,
					tag: data.tag,
					color: data.color,
					channel: data.channel,
					webhook: data.webhook ? new WebhookClient(data.webhook) : null
				});
			});
	}

	public async add(id: string) {
		const data = await this.client.db.collection(Collections.DONATION_LOGS).findOne({ clanId: new ObjectId(id) });

		if (!data) return null;
		return this.cached.set(id, {
			clanId: data.clanId,
			guild: data.guild,
			tag: data.tag,
			color: data.color,
			channel: data.channel,
			retries: 0,
			webhook: data.webhook?.id ? new WebhookClient(data.webhook) : null
		});
	}

	private async _refresh_daily() {
		const timestamp = moment().startOf('day').toDate();

		const logs = await this.client.db
			.collection(Collections.DONATION_LOGS)
			.find({ daily_last_posted: { $lt: timestamp } })
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

	private async _refresh_weekly() {
		const timestamp = moment().weekday(1).startOf('day').toDate();

		const logs = await this.client.db
			.collection(Collections.DONATION_LOGS)
			.find({ weekly_last_posted: { $lt: timestamp } })
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

	private async _refresh_monthly() {
		const timestamp = moment().startOf('month').toDate();

		const logs = await this.client.db
			.collection(Collections.DONATION_LOGS)
			.find({ monthly_last_posted: { $lt: timestamp } })
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

export interface Feed {
	clan: {
		tag: string;
		name: string;
		badge: string;
		members: number;
	};
	donated: {
		donated: number;
		name: string;
		tag: string;
		league: number;
	}[];
	received: {
		received: number;
		name: string;
		tag: string;
		league: number;
	}[];
	unmatched?: {
		in: number;
		out: number;
	};
}

interface Cache {
	tag: string;
	clanId: ObjectId;
	color?: number | null;
	webhook: WebhookClient | null;
	deleted?: boolean;
	channel: string;
	guild: string;
	threadId?: string;
	retries: number;
}
