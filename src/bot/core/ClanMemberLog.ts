import { MessageEmbed, PermissionString, TextChannel, Collection } from 'discord.js';
import { TOWN_HALLS, EMOJIS, PLAYER_LEAGUES, HEROES } from '../util/Emojis';
import { Player } from 'clashofclans.js';
import Client from '../struct/Client';
import { ObjectId } from 'mongodb';
import moment from 'moment';

const MODE: { [key: string]: number } = {
	JOINED: 0x38d863, // green
	LEFT: 0xeb3508 // red
};

interface Member {
	mode: string;
	tag: string;
	value: number;
	donations: number;
	donationsReceived: number;
}

interface Resp {
	clan: {
		tag: string;
		name: string;
		badge: string;
	};
	tags: Member[];
}

export default class PlayerEvent {
	public cached: Collection<string, any>;

	public constructor(private readonly client: Client) {
		this.cached = new Collection();
	}

	public async exec(tag: string, data: any) {
		const clans = this.cached.filter(d => d.tag === tag);
		for (const id of clans.keys()) {
			const cache = this.cached.get(id);
			if (cache) await this.permissionsFor(cache, data, id);
		}

		return clans.clear();
	}

	private async delay(ms: number) {
		return new Promise(res => setTimeout(res, ms));
	}

	private async permissionsFor(cache: any, data: any, id: string) {
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
				return this.handleMessage(channel, data, id);
			}
		}
	}

	private async handleMessage(channel: TextChannel, data: Resp, id: string) {
		const ms = data.tags.length >= 5 ? 2000 : 250;
		for (const item of data.tags.sort((a, b) => a.value - b.value)) {
			const message = await this.embed(channel, item, data, id);
			if (!message) continue;
			await channel.send(message).catch(() => null);
			await this.delay(ms);
		}

		return data.tags.length;
	}

	private async embed(channel: TextChannel, item: Member, data: Resp, id: string) {
		const cache = this.cached.get(id);
		if (!cache) return null;
		const member = await this.client.http.player(item.tag) as Player;
		if (!member.ok) return null;

		let content = '';
		const embed = new MessageEmbed()
			.setColor(MODE[item.mode])
			.setTitle(`\u200e${member.name} (${member.tag})`)
			.setURL(`https://www.clashofstats.com/players/${item.tag.substr(1)}`);
		if (item.mode === 'LEFT') {
			embed.setFooter(`Left ${data.clan.name}`, data.clan.badge);
			embed.setDescription([
				`${TOWN_HALLS[member.townHallLevel]} **${member.townHallLevel}**`,
				`${EMOJIS.EXP} **${member.expLevel}**`,
				`${EMOJIS.TROOPS_DONATE} **${item.donations}**${EMOJIS.UP_KEY} **${item.donationsReceived}**${EMOJIS.DOWN_KEY}`
			].join(' '));
		} else {
			const flag = await this.client.db.collection('flaggedusers')
				.findOne({ guild: cache.guild, tag: item.tag });

			embed.setFooter(`Joined ${data.clan.name}`, data.clan.badge);
			embed.setDescription([
				`${TOWN_HALLS[member.townHallLevel]}**${member.townHallLevel}**`,
				`${this.formatHeroes(member)}`,
				`${EMOJIS.WAR_STAR}**${member.warStars}**`,
				`${PLAYER_LEAGUES[member.league ? member.league.id : 29000000]}**${member.trophies}**`
			].join(' '));

			if (flag) {
				const user = await this.client.users.fetch(flag.user, false).catch(() => null);
				if (channel.guild.roles.cache.has(cache.role)) {
					const role = channel.guild.roles.cache.get(cache.role);
					content = `${role!.toString()}`;
				}
				embed.setDescription([
					embed.description,
					'',
					'**Flag**',
					`${flag.reason as string}`,
					`\`${user ? user.tag : 'Unknown#0000'} (${moment.utc(flag.createdAt).format('DD-MM-YYYY kk:mm')})\``
				]);
			}
		}
		embed.setTimestamp();
		return { content, embed };
	}

	private formatHeroes(member: Player) {
		if (member.heroes.length) {
			const heroes = member.heroes.filter(({ village }) => village === 'home');
			return heroes.length
				? heroes.length > 3
					? heroes.map(hero => `${HEROES[hero.name]}**${hero.level}**`).join(' ')
					: `${EMOJIS.EXP}**${member.expLevel}** ${heroes.map(hero => `${HEROES[hero.name]}**${hero.level}**`).join(' ')}`
				: `${EMOJIS.EXP} **${member.expLevel}**`;
		}

		return `${EMOJIS.EXP} **${member.expLevel}**`;
	}

	public async init() {
		const collection = await this.client.db
			.collection('playerlogs')
			.find()
			.toArray();

		collection.forEach(data => {
			if (this.client.guilds.cache.has(data.guild)) {
				this.cached.set((data.clan_id as ObjectId).toHexString(), {
					guild: data.guild,
					channel: data.channel,
					role: data.role,
					tag: data.tag
				});
			}
		});
	}

	public async add(id: string) {
		const data = await this.client.db.collection('playerlogs')
			.findOne({ clan_id: new ObjectId(id) });

		if (!data) return null;
		return this.cached.set(id, {
			guild: data.guild,
			channel: data.channel,
			role: data.role,
			tag: data.tag
		});
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}
