import { MessageEmbed, Message, Collection, TextChannel, PermissionString } from 'discord.js';
import { COLLECTIONS } from '../util/Constants';
import { Clan } from 'clashofclans.js';
import Client from '../struct/Client';
import { ObjectId } from 'mongodb';

const EVENT_DATE = 22;

export default class ClanGames {
	public cached: Collection<string, any>;
	public intervalId!: NodeJS.Timeout;

	public constructor(private readonly client: Client) {
		this.client = client;
		this.cached = new Collection();
	}

	public async exec(tag: string, clan: Clan, updated: any) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(id, cache, clan, updated);
		}

		return clans.clear();
	}

	private async permissionsFor(id: string, cache: any, clan: Clan, updated: any) {
		const permissions = [
			'READ_MESSAGE_HISTORY',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel)! as TextChannel;
			if (channel.permissionsFor(channel.guild.me!)!.has(permissions as PermissionString[], false)) {
				return this.handleMessage(id, channel, clan, updated);
			}
		}
	}

	private async handleMessage(id: string, channel: TextChannel, clan: Clan, updated: any) {
		const cache = this.cached.get(id);

		if (cache && !cache.message) {
			return this.sendNew(id, channel, clan, updated);
		}

		if (cache.msg) {
			return this.edit(id, cache.msg, clan, updated);
		}

		const message = await channel.messages.fetch(cache.message, false)
			.catch(error => {
				this.client.logger.warn(error, { label: 'CLAN_GAMES_FETCH_MESSAGE' });
				if (error.code === 10008) {
					return { deleted: true };
				}

				return null;
			});

		if (!message) return;

		if (message.deleted) {
			return this.sendNew(id, channel, clan, updated);
		}

		if (message instanceof Message) {
			return this.edit(id, message, clan, updated);
		}
	}

	private async sendNew(id: string, channel: TextChannel, clan: Clan, updated: any) {
		const embed = this.embed(clan, id, updated);
		const message = await channel.send({ embed }).catch(() => null);

		if (message) {
			try {
				const cache = this.cached.get(id)!;
				cache.message = message.id;
				cache.msg = message;
				this.cached.set(id, cache);
				await this.client.db.collection(COLLECTIONS.CLAN_GAMES_LOGS)
					.updateOne(
						{ clan_id: new ObjectId(id) },
						{ $set: { message: message.id } }
					);
			} catch (error) {
				this.client.logger.warn(error, { label: 'MONGODB_ERROR' });
			}
		}

		return message;
	}

	private async edit(id: string, message: Message, clan: Clan, updated: any) {
		const embed = this.embed(clan, id, updated);

		return message.edit({ embed })
			.catch(error => {
				if (error.code === 10008) {
					const cache = this.cached.get(id)!;
					cache.msg = undefined;
					this.cached.set(id, cache);
					return this.sendNew(id, message.channel as TextChannel, clan, updated);
				}
				return null;
			});
	}

	private embed(clan: Clan, id: string, updated: any) {
		const cache = this.cached.get(id);
		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`Clan Games Scoreboard [${clan.members}/50]`,
				`\`\`\`\n\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				(updated.members as any[]).slice(0, 55)
					.map((m, i) => {
						const points = this.padStart(m.points || '0');
						return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name as string}`;
					}).join('\n'),
				'```'
			])
			.setFooter(`Points: ${updated.total as number} [Avg: ${(updated.total / clan.members).toFixed(2)}]`)
			.setTimestamp();

		return embed;
	}

	private get event() {
		const START = new Date();
		START.setDate(EVENT_DATE);
		START.setHours(0, 0, 0, 0);

		const END = new Date();
		END.setDate(EVENT_DATE + 6);
		END.setHours(10, 0, 0, 0);

		return new Date() >= new Date(START) && new Date() <= new Date(END);
	}

	private padStart(num: number) {
		return num.toString().padStart(6, ' ');
	}

	public async init() {
		if (this.event) {
			await this._flush();
			return this._init();
		}

		clearInterval(this.intervalId);
		this.intervalId = setInterval(async () => {
			if (this.event) {
				await this._init();
				await this._flush();
				return clearInterval(this.intervalId);
			}
		}, 5 * 60 * 1000);

		return Promise.resolve(0);
	}

	private async _init() {
		await this.client.db.collection(COLLECTIONS.CLAN_GAMES_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map(guild => guild.id) } })
			.forEach(data => {
				this.cached.set((data.clan_id as ObjectId).toHexString(), {
					guild: data.guild,
					channel: data.channel,
					message: data.message,
					color: data.color,
					tag: data.tag
				});
			});
	}

	private async flush(intervalId: NodeJS.Timeout) {
		if (this.event) return null;
		await this.init();
		clearInterval(intervalId);
		return this.cached.clear();
	}

	private async _flush() {
		const intervalId = setInterval(() => this.flush(intervalId), 5 * 60 * 1000);
		return Promise.resolve(0);
	}

	public async add(id: string) {
		if (!this.event) return null;
		const data = await this.client.db.collection(COLLECTIONS.CLAN_GAMES_LOGS)
			.findOne({ clan_id: new ObjectId(id) });

		if (!data) return null;
		return this.cached.set(id, {
			guild: data.guild,
			channel: data.channel,
			message: data.message,
			color: data.color,
			tag: data.tag
		});
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}
