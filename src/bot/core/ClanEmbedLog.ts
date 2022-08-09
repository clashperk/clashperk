import { MessageEmbed, Message, Collection, TextChannel, PermissionString, Snowflake, ThreadChannel } from 'discord.js';
import { APIMessage } from 'discord-api-types/v9';
import { Clan } from 'clashofclans.js';
import { ObjectId } from 'mongodb';
import { EMOJIS, TOWN_HALLS, CWL_LEAGUES, ORANGE_NUMBERS } from '../util/Emojis.js';
import { Collections } from '../util/Constants.js';
import { Client } from '../struct/Client.js';
import { Util } from '../util/index.js';

export interface Cache {
	_id: ObjectId;
	channel: Snowflake;
	message?: Snowflake;
	color: number;
	embed: any;
	tag: string;
	msg?: Message;
}

export default class ClanEmbedLog {
	public cached: Collection<string, Cache>;
	public lastReq: Map<string, NodeJS.Timeout>;
	protected collection = this.client.db.collection(Collections.CLAN_EMBED_LOGS);

	public constructor(private readonly client: Client) {
		this.cached = new Collection();
		this.lastReq = new Map();
	}

	public async exec(tag: string, clan: Clan) {
		const clans = this.cached.filter((d) => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id)!;
			await this.permissionsFor(cache, clan);
		}

		return clans.clear();
	}

	private async throttle(id: string) {
		if (this.lastReq.has(id)) await Util.delay(1000);

		const timeoutID = this.lastReq.get(id);
		if (timeoutID) {
			clearTimeout(timeoutID);
			this.lastReq.delete(id);
		}

		const Timeout = setTimeout(() => {
			this.lastReq.delete(id);
			clearTimeout(Timeout);
		}, 1000);
		this.lastReq.set(id, Timeout);

		return Promise.resolve(0);
	}

	private async permissionsFor(cache: Cache, clan: Clan) {
		const permissions: PermissionString[] = [
			'READ_MESSAGE_HISTORY',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel) as TextChannel | ThreadChannel;
			if (channel.isThread() && (channel.locked || !channel.permissionsFor(this.client.user!)?.has('SEND_MESSAGES_IN_THREADS')))
				return;
			if (channel.permissionsFor(this.client.user!)?.has(permissions)) {
				if (channel.isThread() && channel.archived && !(await this.unarchive(channel))) return;
				return this.handleMessage(cache, channel, clan);
			}
		}
	}

	private async unarchive(thread: ThreadChannel) {
		if (!(thread.editable && thread.manageable)) return null;
		return thread.edit({ autoArchiveDuration: 'MAX', archived: false, locked: false });
	}

	private async handleMessage(cache: Cache, channel: TextChannel | ThreadChannel, clan: Clan) {
		if (!cache.message) {
			const msg = await this.send(cache, channel, clan);
			return this.mutate(cache, msg);
		}

		const msg = await this.edit(cache, channel, clan);
		return this.mutate(cache, msg);
	}

	private async send(cache: Cache, channel: TextChannel | ThreadChannel, clan: Clan) {
		const embed = await this.embed(cache, clan);
		return Util.sendMessage(this.client, channel.id, { embeds: [embed.toJSON()] }).catch(() => null);
	}

	private async edit(cache: Cache, channel: TextChannel | ThreadChannel, clan: Clan) {
		const embed = await this.embed(cache, clan);

		return Util.editMessage(this.client, channel.id, cache.message!, { embeds: [embed.toJSON()] }).catch((error) => {
			if (error.code === 10008) {
				delete cache.message;
				return this.send(cache, channel, clan);
			}
			return null;
		});
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

	private async embed(cache: Cache, data: Clan) {
		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const reduced = fetched.reduce<{ [key: string]: number }>((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {});

		const townHalls = Object.entries(reduced)
			.map((arr) => ({ level: Number(arr[0]), total: arr[1] }))
			.sort((a, b) => b.level - a.level);

		const location = data.location
			? data.location.isCountry
				? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
				: `🌐 ${data.location.name}`
			: `${EMOJIS.WRONG} None`;

		const clanDescription: string = cache.embed.description === 'auto' ? data.description : cache.embed.description;
		const clanRequirements: string =
			cache.embed.accepts === 'auto'
				? data.requiredTownhallLevel
					? `TH ${data.requiredTownhallLevel}+`
					: 'Any'
				: cache.embed.accepts;

		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.medium)
			.setDescription(
				[
					`${EMOJIS.CLAN} **${data.clanLevel}** ${EMOJIS.USERS} **${data.members}** ${EMOJIS.TROPHY} **${data.clanPoints}** ${EMOJIS.VERSUS_TROPHY} **${data.clanVersusPoints}**`,
					'',
					clanDescription || ''
				].join('\n')
			)
			.addField(
				'Clan Leader',
				[
					`${EMOJIS.OWNER} <@!${cache.embed.userId as string}> (${
						data.memberList.find((m) => m.role === 'leader')?.name ?? 'None'
					})`
				].join('\n')
			)
			.addField(
				'Requirements',
				[
					`${EMOJIS.TOWNHALL} ${clanRequirements || 'Any'}`,
					'**Trophies Required**',
					`${EMOJIS.TROPHY} ${data.requiredTrophies}`,
					`**Location** \n${location}`
				].join('\n')
			)
			.addField(
				'War Performance',
				[
					`${EMOJIS.OK} ${data.warWins} Won ${
						data.isWarLogPublic ? `${EMOJIS.WRONG} ${data.warLosses!} Lost ${EMOJIS.EMPTY} ${data.warTies!} Tied` : ''
					}`,
					'**War Frequency & Streak**',
					`${
						data.warFrequency.toLowerCase() === 'morethanonceperweek'
							? '🎟️ More Than Once Per Week'
							: `🎟️ ${data.warFrequency.toLowerCase().replace(/\b(\w)/g, (char) => char.toUpperCase())}`
					} ${'🏅'} ${data.warWinStreak}`,
					'**War League**',
					`${CWL_LEAGUES[data.warLeague?.name ?? ''] || EMOJIS.EMPTY} ${data.warLeague?.name ?? 'Unranked'}`
				].join('\n')
			)
			.addField(
				'Town Halls',
				[
					townHalls
						.slice(0, 7)
						.map((th) => `${TOWN_HALLS[th.level]!} ${ORANGE_NUMBERS[th.total]!}\u200b`)
						.join(' ') || `${EMOJIS.WRONG} None`
				].join('\n')
			)
			.setTimestamp()
			.setFooter({ text: 'Synced' });

		return embed;
	}

	public async init() {
		await this.client.db
			.collection(Collections.CLAN_EMBED_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map((guild) => guild.id) } })
			.forEach((data) => {
				this.cached.set((data.clanId as ObjectId).toHexString(), {
					_id: data.clanId,
					message: data.message,
					color: data.color,
					embed: data.embed,
					tag: data.tag,
					channel: data.channel
				});
			});
	}

	public async add(_id: string) {
		const data = await this.client.db.collection(Collections.CLAN_EMBED_LOGS).findOne({ clanId: new ObjectId(_id) });

		if (!data) return null;
		return this.cached.set(_id, {
			_id: data.clanId,
			channel: data.channel,
			message: data.message,
			color: data.color,
			embed: data.embed,
			tag: data.tag
		});
	}

	public delete(_id: string) {
		return this.cached.delete(_id);
	}
}
