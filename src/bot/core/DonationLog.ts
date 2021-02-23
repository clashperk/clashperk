import { MessageEmbed, Collection, PermissionString, TextChannel } from 'discord.js';
import { PLAYER_LEAGUES, EMOJIS } from '../util/Emojis';
import { COLLECTIONS } from '../util/Constants';
import Client from '../struct/Client';
import { ObjectId } from 'mongodb';
import { BLUE_NUMBERS, RED_NUMBERS } from '../util/NumEmojis';

interface Donation {
	clan: {
		name: string;
		tag: string;
		members: number;
		badge: string;
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

export default class ClanEvent {
	public cached: Collection<string, any>;

	public constructor(private readonly client: Client) {
		this.client = client;
		this.cached = new Collection();
	}

	public async exec(tag: string, data: any) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(id, cache, data);
		}

		return clans.clear();
	}

	private async permissionsFor(id: string, cache: any, data: any) {
		const permissions = [
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'VIEW_CHANNEL'
		];

		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel)! as TextChannel;
			if (channel.permissionsFor(channel.guild.me!)!.has(permissions as PermissionString[], false)) {
				return this.handleMessage(id, channel, data);
			}
		}
	}

	private handleMessage(id: string, channel: TextChannel, data: Donation) {
		const cache = this.cached.get(id);
		const embed = new MessageEmbed()
			.setColor(cache.color)
			.setTitle(`${data.clan.name} (${data.clan.tag})`)
			.setURL(`https://link.clashofclans.com/en?action=OpenClanProfile&tag=${encodeURIComponent(data.clan.tag)}`)
			.setThumbnail(data.clan.badge)
			.setFooter(`${data.clan.members}/50`, this.client.user!.displayAvatarURL())
			.setTimestamp();

		if (data.donated.length) {
			embed.addField(`${EMOJIS.USER_BLUE} Donated`, [
				data.donated.map(m => {
					if (m.donated > 200) {
						const [div, mod] = this.divmod(m.donated);
						const list = [`\u200e${PLAYER_LEAGUES[m.league]} ${BLUE_NUMBERS[div > 900 ? 900 : div]} ${m.name}`];
						if (mod > 0) return list.concat(`\u200e${PLAYER_LEAGUES[m.league]} ${BLUE_NUMBERS[mod]} ${m.name}`).join('\n');
						return list.join('\n');
					}
					return `\u200e${PLAYER_LEAGUES[m.league]} ${BLUE_NUMBERS[m.donated]} ${m.name}`;
				}).join('\n').substring(0, 1024)
			]);
		}

		if (data.received.length) {
			embed.addField(`${EMOJIS.USER_RED} Received`, [
				data.received.map(m => {
					if (m.received > 200) {
						const [div, mod] = this.divmod(m.received);
						const list = [`\u200e${PLAYER_LEAGUES[m.league]} ${RED_NUMBERS[div > 900 ? 900 : div]} ${m.name}`];
						if (mod > 0) return list.concat(`\u200e${PLAYER_LEAGUES[m.league]} ${RED_NUMBERS[mod]} ${m.name}`).join('\n');
						return list.join('\n');
					}
					return `\u200e${PLAYER_LEAGUES[m.league]} ${RED_NUMBERS[m.received]} ${m.name}`;
				}).join('\n').substring(0, 1024)
			]);
		}

		if (data.unmatched && (data.unmatched.in || data.unmatched.out)) {
			embed.addField(`${EMOJIS.WRONG} Unmatched`, [
				data.unmatched.in > 0
					? `${EMOJIS.USER_BLUE} ${BLUE_NUMBERS[data.unmatched.in]} Joined`
					: '',
				data.unmatched.out > 0
					? `${EMOJIS.USER_RED} ${RED_NUMBERS[data.unmatched.out]} Left`
					: ''
			]);
		}

		return channel.send({ embed }).catch(() => null);
	}

	private divmod(num: number) {
		return [Math.floor(num / 100) * 100, num % 100];
	}

	public async init() {
		await this.client.db.collection(COLLECTIONS.DONATION_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map(guild => guild.id) } })
			.forEach(data => {
				this.cached.set((data.clan_id as ObjectId).toHexString(), {
					// guild: data.guild,
					channel: data.channel,
					color: data.color,
					tag: data.tag
				});
			});
	}

	public async add(id: string) {
		const data = await this.client.db.collection(COLLECTIONS.DONATION_LOGS)
			.findOne({ clan_id: new ObjectId(id) });

		if (!data) return null;
		return this.cached.set(id, {
			// guild: data.guild,
			channel: data.channel,
			color: data.color,
			tag: data.tag
		});
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}
