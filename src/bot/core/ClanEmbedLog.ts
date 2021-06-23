import { MessageEmbed, Message, Collection, TextChannel, PermissionString, Snowflake } from 'discord.js';
import { EMOJIS, TOWN_HALLS, CWL_LEAGUES } from '../util/Emojis';
import { ORANGE_NUMBERS } from '../util/NumEmojis';
import { Collections } from '../util/Constants';
import { Clan } from 'clashofclans.js';
import Client from '../struct/Client';
import { ObjectId } from 'mongodb';

interface Cache {
	channel: Snowflake;
	message?: Snowflake;
	color: number;
	embed: any;
	tag: string;
	msg?: Message;
}

interface Compo {
	[key: string]: number;
}

export default class ClanEmbedLog {
	public cached: Collection<string, Cache>;
	public lastReq: Map<string, NodeJS.Timeout>;

	public constructor(private readonly client: Client) {
		this.cached = new Collection();
		this.lastReq = new Map();
	}

	public async exec(tag: string, clan: any) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache: Cache = this.cached.get(id)!;
			await this.permissionsFor(id, cache, clan);
		}

		return clans.clear();
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}

	private async throttle(id: string) {
		if (this.lastReq.has(id)) await this.delay(1000);

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

	private async permissionsFor(id: string, cache: Cache, clan: any) {
		const permissions: PermissionString[] = [
			'READ_MESSAGE_HISTORY',
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel) as TextChannel;
			if (channel.permissionsFor(channel.guild.me!).has(permissions, false)) {
				await this.throttle(channel.id);
				return this.handleMessage(id, channel, clan);
			}
		}
	}

	private async handleMessage(id: string, channel: TextChannel, clan: any) {
		const cache = this.cached.get(id);

		if (cache && !cache.message) {
			return this.sendNew(id, channel, clan);
		}

		if (cache!.msg) {
			return this.edit(id, cache!.msg, clan);
		}

		const message = await channel.messages.fetch(cache!.message!, { cache: false })
			.catch(error => {
				this.client.logger.warn(error, { label: 'LAST_ONLINE_FETCH_MESSAGE' });
				if (error.code === 10008) {
					return { deleted: true };
				}

				return null;
			});

		if (!message) return;

		if (message.deleted) {
			return this.sendNew(id, channel, clan);
		}

		if (message instanceof Message) {
			return this.edit(id, message, clan);
		}
	}

	private async sendNew(id: string, channel: TextChannel, clan: any) {
		const embed = await this.embed(id, clan);
		const message = await channel.send({ embeds: [embed] })
			.catch(() => null);

		if (message) {
			try {
				const cache = this.cached.get(id)!;
				cache.message = message.id;
				cache.msg = message;
				this.cached.set(id, cache);
				await this.client.db.collection(Collections.CLAN_EMBED_LOGS)
					.updateOne({ clan_id: new ObjectId(id) }, { $set: { message: message.id } });
			} catch (error) {
				this.client.logger.warn(error, { label: 'MONGODB_ERROR' });
			}
		}

		return message;
	}

	private async edit(id: string, message: Message, clan: any) {
		const embed = await this.embed(id, clan);

		return message.edit({ embeds: [embed] })
			.catch(error => {
				if (error.code === 10008) {
					const cache = this.cached.get(id)!;
					cache.msg = undefined;
					this.cached.set(id, cache);
					return this.sendNew(id, message.channel as TextChannel, clan);
				}
				return null;
			});
	}

	private async embed(id: string, data: Clan) {
		const cache = this.cached.get(id)!;
		const fetched = await this.client.http.detailedClanMembers(data.memberList);
		const reduced = fetched.reduce((count, member) => {
			const townHall = member.townHallLevel;
			count[townHall] = (count[townHall] || 0) + 1;
			return count;
		}, {} as Compo);

		const townHalls = Object.entries(reduced)
			.map(arr => ({ level: Number(arr[0]), total: arr[1] }))
			.sort((a, b) => b.level - a.level);

		const location = data.location
			? data.location.isCountry
				? `:flag_${data.location.countryCode.toLowerCase()}: ${data.location.name}`
				: `🌐 ${data.location.name}`
			: `${EMOJIS.WRONG} None`;

		const clanDescription = cache.embed.description === 'auto' ? data.description : cache.embed.description;
		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setTitle(`${data.name} (${data.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.tag)}`)
			.setThumbnail(data.badgeUrls.medium)
			.setDescription([
				`${EMOJIS.CLAN} **${data.clanLevel}** ${EMOJIS.USERS} **${data.members}** ${EMOJIS.TROPHY} **${data.clanPoints}** ${EMOJIS.VERSUS_TROPHY} **${data.clanVersusPoints}**`,
				'',
				clanDescription || ''
			].join('\n'))
			.addField('Clan Leader', [
				`${EMOJIS.OWNER} <@!${cache.embed.userId as string}> (${data.memberList.find(m => m.role === 'leader')?.name ?? 'None'})`
			].join('\n'))
			.addField('Requirements', [
				`${EMOJIS.TOWNHALL} ${cache.embed.accepts as string}`,
				'**Trophies Required**',
				`${EMOJIS.TROPHY} ${data.requiredTrophies}`,
				`**Location** \n${location}`
			].join('\n'))
			.addField('War Performance', [
				`${EMOJIS.OK} ${data.warWins} Won ${data.isWarLogPublic ? `${EMOJIS.WRONG} ${data.warLosses!} Lost ${EMOJIS.EMPTY} ${data.warTies!} Tied` : ''}`,
				'**War Frequency & Streak**',
				`${data.warFrequency.toLowerCase() === 'morethanonceperweek'
					? '🎟️ More Than Once Per Week'
					: `🎟️ ${data.warFrequency.toLowerCase().replace(/\b(\w)/g, char => char.toUpperCase())}`} ${'🏅'} ${data.warWinStreak}`,
				'**War League**', `${CWL_LEAGUES[data.warLeague?.name ?? ''] || EMOJIS.EMPTY} ${data.warLeague?.name ?? 'Unranked'}`
			].join('\n'))
			.addField('Town Halls', [
				townHalls.slice(0, 7).map(th => `${TOWN_HALLS[th.level]} ${ORANGE_NUMBERS[th.total]}\u200b`).join(' ') || `${EMOJIS.WRONG} None`
			].join('\n'))
			.setTimestamp()
			.setFooter('Synced', this.client.user!.displayAvatarURL());

		return embed;
	}

	public async init() {
		await this.client.db.collection(Collections.CLAN_EMBED_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map(guild => guild.id) } })
			.forEach(data => {
				this.cached.set((data.clan_id as ObjectId).toHexString(), {
					message: data.message,
					color: data.color,
					embed: data.embed,
					tag: data.tag,
					channel: data.channel
				});
			});
	}

	public async add(id: string) {
		const data = await this.client.db.collection(Collections.CLAN_EMBED_LOGS)
			.findOne({ clan_id: new ObjectId(id) });

		if (!data) return null;
		return this.cached.set(id, {
			channel: data.channel,
			message: data.message,
			color: data.color,
			embed: data.embed,
			tag: data.tag
		});
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}
