import { MessageEmbed, PermissionString, TextChannel, Collection, Guild, GuildMember } from 'discord.js';
import { TOWN_HALLS, EMOJIS, PLAYER_LEAGUES, HEROES } from '../util/Emojis';
import { COLLECTIONS } from '../util/Constants';
import { Collections } from '@clashperk/node';
import { Player } from 'clashofclans.js';
import Client from '../struct/Client';
import { ObjectId } from 'mongodb';
import moment from 'moment';

const OP: { [key: string]: number } = {
	JOINED: 0x38d863, // GREEN
	LEFT: 0xeb3508 // RED
};

interface Member {
	op: string;
	tag: string;
	rand: number;
	role: string;
	donations: number;
	donationsReceived: number;
}

interface Feed {
	clan: {
		tag: string;
		name: string;
		badge: string;
	};
	members: Member[];
}

export default class ClanFeedLog {
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

	private async handleMessage(channel: TextChannel, data: Feed, id: string) {
		return Promise.allSettled([
			this.clanUpdate(channel, data, id),
			this.clanMemberUpdate(channel, data)
		]);
	}

	private async clanUpdate(channel: TextChannel, data: Feed, id: string) {
		const members = data.members.filter(mem => mem.op !== 'ROLE_UPADTE');
		const delay = members.length >= 5 ? 2000 : 250;

		for (const member of members.sort((a, b) => a.rand - b.rand)) {
			const ctx = await this.embed(channel, member, data, id);
			if (!ctx) continue;

			await channel.send(ctx).catch(() => null);
			await this.delay(delay);
		}

		return members.length;
	}

	private async clanMemberUpdate(channel: TextChannel, data: Feed) {
		const clan = await this.client.db.collection(Collections.CLAN_STORES)
			.findOne({ guild: channel.guild.id, tag: data.clan.tag });
		if (!clan?.autoRole) return null;

		const collection = await this.client.db.collection(Collections.LINKED_PLAYERS)
			.find({ 'entires.tag': { $in: data.members.map(mem => mem.tag) } })
			.toArray() as { user: string; entries: { tag: string; verified: boolean }[] }[];
		const players = collection.reduce(
			(prev, curr) => {
				prev.push(...curr.entries.map(en => ({ user: curr.user, tag: en.tag, verified: en.verified })));
				return prev;
			}, [] as { user: string; tag: string; verified: boolean }[]
		).filter(en => clan.secureRole ? en.verified : true);

		for (const member of data.members) {
			const link = players.find(en => en.tag === member.tag);
			if (!link) continue;

			await this.roleManagement(link.user, channel.guild.id, member.role, clan.roles);
			await this.delay(250);
		}

		return data.members.length;
	}

	private async roleManagement(user: string, guild_id: string, clanRole: string, roles: { [key: string]: string }) {
		return this.addRole(guild_id, user, roles[clanRole], Object.values(roles));
	}

	public async addRole(guild_id: string, user: string, role_id?: string, roles: string[] = []) {
		const guild = this.client.guilds.cache.get(guild_id);

		if (!role_id && !roles.length) return null;
		if (!guild?.me?.hasPermission('MANAGE_ROLES')) return null;

		const member = await guild.members.fetch(user).catch(() => null);
		if (member?.user.bot) return null;

		const excluded = roles.filter(id => id !== role_id && this.checkRole(guild, guild.me!, id))
			.filter(id => member?.roles.cache.has(id));

		if (excluded.length) {
			await member?.roles.remove(excluded, 'AUTO_ROLE');
		}

		if (!role_id) return null;
		if (!guild.roles.cache.has(role_id)) return null;

		const role = guild.roles.cache.get(role_id)!;
		if (role.position > guild.me.roles.highest.position) return null;

		if (member?.roles.cache.has(role_id)) return null;
		return member?.roles.add(role, 'AUTO_ROLE').catch(() => null);
	}

	private checkRole(guild: Guild, member: GuildMember, role_id: string) {
		if (guild.roles.cache.has(role_id)) return null;
		const role = guild.roles.cache.get(role_id)!;
		return member.roles.highest.position > role.position;
	}

	private async embed(channel: TextChannel, member: Member, data: Feed, id: string) {
		const cache = this.cached.get(id);
		if (!cache) return null;
		const player: Player = await this.client.http.player(member.tag);
		if (!player.ok) return null;

		let content = '';
		const embed = new MessageEmbed()
			.setColor(OP[member.op])
			.setTitle(`\u200e${player.name} (${player.tag})`)
			.setURL(`https://www.clashofstats.com/players/${player.tag.substr(1)}`);
		if (member.op === 'LEFT') {
			embed.setFooter(`Left ${data.clan.name}`, data.clan.badge);
			embed.setDescription([
				`${TOWN_HALLS[player.townHallLevel]} **${player.townHallLevel}**`,
				`${EMOJIS.EXP} **${player.expLevel}**`,
				`${EMOJIS.TROOPS_DONATE} **${member.donations}**${EMOJIS.UP_KEY} **${member.donationsReceived}**${EMOJIS.DOWN_KEY}`
			].join(' '));
		} else {
			const flag = await this.client.db.collection(COLLECTIONS.FLAGGED_USERS)
				.findOne({ guild: cache.guild, tag: member.tag });

			embed.setFooter(`Joined ${data.clan.name}`, data.clan.badge);
			embed.setDescription([
				`${TOWN_HALLS[player.townHallLevel]}**${player.townHallLevel}**`,
				`${this.formatHeroes(player)}`,
				`${EMOJIS.WAR_STAR}**${player.warStars}**`,
				`${PLAYER_LEAGUES[player.league ? player.league.id : 29000000]}**${player.trophies}**`
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
		await this.client.db.collection(COLLECTIONS.PLAYER_LOGS)
			.find({ guild: { $in: this.client.guilds.cache.map(guild => guild.id) } })
			.forEach(data => {
				this.cached.set((data.clan_id as ObjectId).toHexString(), {
					guild: data.guild,
					channel: data.channel,
					role: data.role,
					tag: data.tag
				});
			});
	}

	public async add(id: string) {
		const data = await this.client.db.collection(COLLECTIONS.PLAYER_LOGS)
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
