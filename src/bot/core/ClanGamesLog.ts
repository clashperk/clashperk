import { MessageEmbed, Collection, TextChannel, PermissionString, Snowflake, ThreadChannel, SnowflakeUtil } from 'discord.js';
import { APIMessage } from 'discord-api-types/v9';
import { Clan } from 'clashofclans.js';
import { ObjectId } from 'mongodb';
import { Collections } from '../util/Constants.js';
import { ClanGames, Util } from '../util/index.js';
import { Client } from '../struct/Client.js';

interface Cache {
	tag: string;
	_id: ObjectId;
	guild: Snowflake;
	color?: number;
	channel: Snowflake;
	message?: Snowflake;
}

interface Payload {
	total: number;
	members: { name: string; points: number }[];
}

export default class ClanGamesLog {
	public cached: Collection<string, Cache>;
	public intervalId!: NodeJS.Timeout;
	protected collection = this.client.db.collection(Collections.CLAN_GAMES_LOGS);

	public constructor(private readonly client: Client) {
		this.client = client;
		this.cached = new Collection();
	}

	public async exec(tag: string, clan: Clan, data: Payload) {
		const clans = this.cached.filter((d) => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(cache, clan, data);
		}

		return clans.clear();
	}

	private async permissionsFor(cache: Cache, clan: Clan, data: Payload) {
		const permissions: PermissionString[] = [
			'READ_MESSAGE_HISTORY',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel)! as TextChannel | ThreadChannel;
			if (channel.isThread() && (channel.locked || !channel.permissionsFor(this.client.user!)?.has('SEND_MESSAGES_IN_THREADS')))
				return;
			if (channel.permissionsFor(this.client.user!)?.has(permissions)) {
				if (channel.isThread() && channel.archived && !(await this.unarchive(channel))) return;

				if (cache.message && new Date().getDate() === ClanGames.STARTING_DATE) {
					const lastMonthIndex = SnowflakeUtil.deconstruct(cache.message).date.getMonth();
					if (lastMonthIndex < new Date().getMonth()) delete cache.message;
				}

				return this.handleMessage(cache, channel, clan, data);
			}
		}
	}

	private async unarchive(thread: ThreadChannel) {
		if (!(thread.editable && thread.manageable)) return null;
		return thread.edit({ autoArchiveDuration: 'MAX', archived: false, locked: false });
	}

	private async handleMessage(cache: Cache, channel: TextChannel | ThreadChannel, clan: Clan, data: Payload) {
		if (!cache.message) {
			const msg = await this.send(cache, channel, clan, data);
			return this.mutate(cache, msg);
		}

		const msg = await this.edit(cache, channel, clan, data);
		return this.mutate(cache, msg);
	}

	private async mutate(cache: Cache, msg: APIMessage | null) {
		if (msg) {
			await this.collection.updateOne(
				{ clanId: new ObjectId(cache._id) },
				{
					$set: {
						failed: 0,
						message: msg.id,
						updatedAt: new Date()
					}
				}
			);
			cache.message = msg.id;
		} else {
			await this.collection.updateOne({ clanId: new ObjectId(cache._id) }, { $inc: { failed: 1 } });
		}
		return msg;
	}

	private async send(cache: Cache, channel: TextChannel | ThreadChannel, clan: Clan, data: Payload) {
		const embed = this.embed(cache, clan, data);
		return Util.sendMessage(this.client, channel.id, { embeds: [embed.toJSON()] }).catch(() => null);
	}

	private async edit(cache: Cache, channel: TextChannel | ThreadChannel, clan: Clan, data: Payload) {
		const embed = this.embed(cache, clan, data);

		return Util.editMessage(this.client, channel.id, cache.message!, { embeds: [embed.toJSON()] }).catch((error) => {
			if (error.code === 10008) {
				delete cache.message;
				return this.send(cache, channel, clan, data);
			}
			return null;
		});
	}

	private embed(cache: Cache, clan: Clan, data: Payload) {
		const embed = new MessageEmbed()
			.setAuthor({ name: `${clan.name} (${clan.tag})`, iconURL: clan.badgeUrls.medium })
			.setDescription(
				[
					`Clan Games Scoreboard [${clan.members}/50]`,
					`\`\`\`\n\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
					data.members
						.slice(0, 55)
						.map((m, i) => {
							const points = this.padStart(m.points || '0');
							return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
						})
						.join('\n'),
					'```'
				].join('\n')
			)
			.setFooter({ text: `Points: ${data.total} [Avg: ${(data.total / clan.members).toFixed(2)}]` })
			.setTimestamp();
		if (cache.color) embed.setColor(cache.color);

		return embed;
	}

	private padStart(num: number | string) {
		return num.toString().padStart(6, ' ');
	}

	public async init() {
		if (ClanGames.Started) {
			this._flush();
			return this._init();
		}

		clearInterval(this.intervalId);
		this.intervalId = setInterval(async () => {
			if (ClanGames.Started) {
				this._flush();
				await this._init();
				clearInterval(this.intervalId);
			}
		}, 5 * 60 * 1000).unref();
	}

	private async _init() {
		await this.collection.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } }).forEach((data) => {
			this.cached.set((data.clanId as ObjectId).toHexString(), {
				_id: data.clanId,
				tag: data.tag,
				color: data.color,
				guild: data.guild,
				channel: data.channel,
				message: data.message
			});
		});
	}

	private async flush(intervalId: NodeJS.Timeout) {
		if (ClanGames.Started) return null;
		await this.init();
		clearInterval(intervalId);
		return this.cached.clear();
	}

	private _flush() {
		const intervalId: NodeJS.Timeout = setInterval(() => {
			this.flush(intervalId);
		}, 5 * 60 * 1000);
		return intervalId.unref();
	}

	public async add(id: string) {
		if (!ClanGames.Started) return null;
		const data = await this.collection.findOne({ clanId: new ObjectId(id) });

		if (!data) return null;
		return this.cached.set(id, {
			_id: data.clanId,
			tag: data.tag,
			color: data.color,
			guild: data.guild,
			channel: data.channel,
			message: data.message
		});
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}
