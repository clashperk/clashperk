import { MessageEmbed, Collection, TextChannel, PermissionString, Snowflake, ThreadChannel, SnowflakeUtil } from 'discord.js';
import { Collections } from '../util/Constants';
import { APIMessage } from 'discord-api-types';
import { ClanGames, Util } from '../util/Util';
import { Clan } from 'clashofclans.js';
import Client from '../struct/Client';
import { ObjectId } from 'mongodb';

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
		const clans = this.cached.filter(d => d.tag === tag);
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
			if (channel.isThread() && (channel.locked || !channel.permissionsFor(channel.guild.me!).has(1n << 38n))) return;
			if (channel.permissionsFor(channel.guild.me!)!.has(permissions, false)) {
				if (channel.isThread() && channel.archived && !(await this.unarchive(channel))) return;

				if (cache.message && SnowflakeUtil.deconstruct(cache.message).date.getMonth() === 10) {
					const cursor = this.client.db.collection(Collections.CLAN_MEMBERS)
						.aggregate([
							{
								$match: {
									clanTag: clan.tag, season: '2021-11'
								}
							},
							{
								$sort: {
									clanGamesTotal: -1
								}
							},
							{
								$limit: 60
							}
						]);

					const items = await cursor.toArray();

					const members = items.map(mem => ({
						name: mem.name,
						tag: mem.tag,
						points: Math.min(4000, mem.clanGamesTotal),
						endedAt: mem.clanGamesEndTime
					}));
					members.sort((a, b) => b.points - a.points)
						.sort((a, b) => {
							if (a.endedAt && b.endedAt) {
								return a.endedAt.getTime() - b.endedAt.getTime();
							}
							return 0;
						});
					const total = members.reduce((acc, cur) => acc + cur.points, 0);

					try {
						await this.edit(cache, channel, clan, { total, members }, true);
						delete cache.message;
					} catch {}
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
				{ clan_id: new ObjectId(cache._id) },
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
			await this.collection.updateOne(
				{ clan_id: new ObjectId(cache._id) }, { $inc: { failed: 1 } }
			);
		}
		return msg;
	}

	private async send(cache: Cache, channel: TextChannel | ThreadChannel, clan: Clan, data: Payload) {
		const embed = this.embed(cache, clan, data);
		return Util.sendMessage(this.client, channel.id, { embeds: [embed.toJSON()] }).catch(() => null);
	}

	private async edit(cache: Cache, channel: TextChannel | ThreadChannel, clan: Clan, data: Payload, old = false) {
		const embed = this.embed(cache, clan, data, old);

		return Util.editMessage(this.client, channel.id, cache.message!, { embeds: [embed.toJSON()] })
			.catch(error => {
				if (error.code === 10008) {
					delete cache.message;
					if (!old) return this.send(cache, channel, clan, data);
				}
				return null;
			});
	}

	private embed(cache: Cache, clan: Clan, data: Payload, old = false) {
		const embed = new MessageEmbed()
			.setAuthor(`${clan.name} (${clan.tag})`, clan.badgeUrls.medium)
			.setDescription([
				`Clan Games Scoreboard [${clan.members}/50]`,
				`\`\`\`\n\u200e\u2002# POINTS \u2002 ${'NAME'.padEnd(20, ' ')}`,
				data.members.slice(0, 55)
					.map((m, i) => {
						const points = this.padStart(m.points || '0');
						return `\u200e${(++i).toString().padStart(2, '\u2002')} ${points} \u2002 ${m.name}`;
					}).join('\n'),
				'```'
			].join('\n'))
			.setFooter(`Points: ${data.total} [Avg: ${(data.total / clan.members).toFixed(2)}]`)
			.setTimestamp(old ? new Date('2021-11-28T16:11:30') : new Date());
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
		await this.collection.find({ guild: { $in: this.client.guilds.cache.map(guild => guild.id) } })
			.forEach(data => {
				this.cached.set((data.clan_id as ObjectId).toHexString(), {
					_id: data.clan_id,
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
		const intervalId = setInterval(() => this.flush(intervalId), 5 * 60 * 1000);
		return intervalId.unref();
	}

	public async add(id: string) {
		if (!ClanGames.Started) return null;
		const data = await this.collection.findOne({ clan_id: new ObjectId(id) });

		if (!data) return null;
		return this.cached.set(id, {
			_id: data.clan_id,
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
