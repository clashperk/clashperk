import { MessageEmbed, PermissionString, TextChannel, Collection, Guild, GuildMember, WebhookClient } from 'discord.js';
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
	memberList: {
		tag: string; role: string;
		clan: { tag: string };
	}[];
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

	private async permissionsFor(cache: any, data: Feed, id: string) {
		const permissions: PermissionString[] = [
			'SEND_MESSAGES',
			'EMBED_LINKS',
			'USE_EXTERNAL_EMOJIS',
			'ADD_REACTIONS',
			'READ_MESSAGE_HISTORY',
			'VIEW_CHANNEL'
		];

		await Promise.all([
			this.addSameTypeRole(cache.guild, data),
			this.addUniqueTypeRole(cache.guild, data)
		]);
		if (this.client.channels.cache.has(cache.channel)) {
			const channel = this.client.channels.cache.get(cache.channel)! as TextChannel;
			if (channel.permissionsFor(channel.guild.me!)!.has(permissions, false)) {
				if (this.hasWebhookPermission(channel)) {
					const webhook = await this.webhook(id);
					if (webhook) return this.handleMessage(id, webhook, data);
				}
				return this.handleMessage(id, channel, data);
			}
		}
	}

	private async handleMessage(id: string, channel: TextChannel | WebhookClient, data: Feed) {
		return this.clanUpdate(channel, data, id);
	}

	private hasWebhookPermission(channel: TextChannel) {
		return channel.permissionsFor(channel.guild.me!)!.has(['MANAGE_WEBHOOKS']) && channel.permissionsFor(channel.guild.id)!.has(['USE_EXTERNAL_EMOJIS']);
	}

	private recreateWebhook(id: string) {
		const cache = this.cached.get(id);
		cache.webhook = null;
		this.cached.set(id, cache);
		return this.webhook(id);
	}

	private stopWebhookCheck(id: string) {
		const cache = this.cached.get(id);
		cache.webhook = null;
		cache.no_webhook = true;
		this.cached.set(id, cache);
		return null;
	}

	private async webhook(id: string): Promise<WebhookClient | null> {
		const cache = this.cached.get(id);
		if (cache.no_webhook) return null;
		if (cache.webhook) return cache.webhook;

		const channel = this.client.channels.cache.get(cache.channel) as TextChannel;
		const webhooks = await channel.fetchWebhooks();
		if (webhooks.size) {
			const webhook = webhooks.find(hook => (hook.owner as any)?.id === this.client.user?.id);

			if (webhook) {
				cache.webhook = new WebhookClient(webhook.id, webhook.token!);
				this.cached.set(id, cache);

				await this.client.db.collection(Collections.CLAN_FEED_LOGS)
					.updateOne(
						{ channel: channel.id, guild: channel.guild.id },
						{ $set: { webhook_id: webhook.id, webhook_token: webhook.token } }
					);

				return cache.webhook;
			}
		}

		if (webhooks.size === 10) return this.stopWebhookCheck(id);
		const webhook = await channel.createWebhook(
			this.client.user!.username,
			{ avatar: this.client.user!.displayAvatarURL({ size: 2048, format: 'png' }) }
		).catch(() => null);

		if (webhook) {
			cache.webhook = new WebhookClient(webhook.id, webhook.token!);
			this.cached.set(id, cache);

			await this.client.db.collection(Collections.CLAN_FEED_LOGS)
				.updateOne(
					{ channel: channel.id, guild: channel.guild.id },
					{ $set: { webhook_id: webhook.id, webhook_token: webhook.token } }
				);

			return cache.webhook;
		}

		return this.stopWebhookCheck(id);
	}

	private async clanUpdate(channel: TextChannel | WebhookClient, data: Feed, id: string) {
		const members = data.members.filter(mem => mem.op !== 'ROLE_UPDATE');
		if (!members.length) return null;
		const delay = members.length >= 5 ? 2000 : 250;
		const cache = this.cached.get(id);

		members.sort((a, b) => a.rand - b.rand);
		const messages = await Promise.all(members.map(mem => this.embed(id, mem, data)))
			.catch(err => {
				console.log(err);
				console.log(members);
				return [];
			});

		for (const message of messages) {
			if (!message) continue;
			if (channel instanceof TextChannel) {
				await channel.send(message).catch(() => null);
			} else {
				try {
					const msg = await channel.send(message.content, { embeds: [message.embed] });
					if (msg.channel.id !== cache.channel) {
						await msg.delete();
						return this.recreateWebhook(id);
					}
				} catch (error) {
					if (error.code === 10015) {
						return this.recreateWebhook(id);
					}
				}
			}

			await this.delay(delay);
		}

		return members.length;
	}

	private async addUniqueTypeRole(guild: string, data: Feed) {
		const clan = await this.client.db.collection(Collections.CLAN_STORES)
			.findOne({ guild, tag: data.clan.tag, autoRole: 1 });
		if (!clan) return null;
		console.log(`======================= UNIQUE_TYPE_AUTO_ROLE ${data.clan.tag} =======================`);

		const collection = await this.client.db.collection(Collections.LINKED_PLAYERS)
			.find({ 'entries.tag': { $in: data.members.map(mem => mem.tag) } })
			.toArray() as { user: string; entries: { tag: string; verified: boolean }[] }[];
		const players = collection.reduce(
			(prev, curr) => {
				prev.push(
					...curr.entries.map(
						en => ({ user: curr.user, tag: en.tag, verified: en.verified })
					)
				);
				return prev;
			}, [] as { user: string; tag: string; verified: boolean }[]
		).filter(en => clan.secureRole ? en.verified : true);

		console.log(`${players.length} PLAYERS_FOUND`);
		for (const member of data.members) {
			const acc = players.find(a => a.tag === member.tag);
			if (!acc) continue;

			const tags = players.map(en => en.tag);
			const multi = data.memberList.filter(mem => tags.includes(mem.tag));
			const role = this.getHighestRole(multi, [clan.tag]);

			await this.manageRole(acc.user, guild, role || member.role, clan.roles);
			await this.delay(250);
		}

		return data.members.length;
	}

	private async addSameTypeRole(guild: string, data: Feed) {
		const clans = await this.client.db.collection(Collections.CLAN_STORES)
			.find({ guild, autoRole: 2 })
			.toArray();
		if (!clans.length) return null;
		console.log(`======================= SAME_TYPE_AUTO_ROLE ${data.clan.tag} =======================`);

		const collection = await this.client.db.collection(Collections.LINKED_PLAYERS)
			.find({ 'entries.tag': { $in: data.members.map(mem => mem.tag) } })
			.toArray() as { user: string; entries: { tag: string; verified: boolean }[] }[];
		const playerTags = collection.reduce(
			(prev, curr) => {
				prev.push(
					...curr.entries.map(
						en => ({ user: curr.user, tag: en.tag, verified: en.verified })
					)
				);
				return prev;
			}, [] as { user: string; tag: string; verified: boolean }[]
		).filter(en => clans[0].secureRole ? en.verified : true);

		const players = (await this.client.http.detailedClanMembers(playerTags))
			.filter(res => res.ok);

		console.log(`${players.length}/${playerTags.length} PLAYERS_FOUND`);
		for (const member of data.members) {
			const acc = collection.find(
				col => col.entries.find(en => en.tag === member.tag && clans[0].secureRole ? en.verified : true)
			);
			if (!acc) continue;

			const tags = acc.entries.map(en => en.tag);
			const role = this.getHighestRole(players.filter(en => tags.includes(en.tag)), clans.map(clan => clan.tag));

			await this.manageRole(acc.user, guild, role, clans[0].roles);
			await this.delay(250);
		}

		return data.members.length;
	}

	private async manageRole(user: string, guild_id: string, clanRole: string, roles: { [key: string]: string }) {
		return this.addRoles(guild_id, user, roles[clanRole], Object.values(roles));
	}

	public async addRoles(guild_id: string, user: string, role_id?: string, roles: string[] = []) {
		const guild = this.client.guilds.cache.get(guild_id);

		if (!role_id && !roles.length) return null;
		if (!guild?.me?.permissions.has('MANAGE_ROLES')) return null;

		const member = await guild.members.fetch({ user, force: true }).catch(() => null);
		if (member?.user.bot) return null;

		console.log(`MEMBER_FOUND: ${member?.user.tag ?? ''}`);
		const excluded = roles.filter(id => id !== role_id && this.checkRole(guild, guild.me!, id))
			.filter(id => member?.roles.cache.has(id));

		if (excluded.length) {
			await member?.roles.remove(excluded, 'auto role');
		}

		console.log(`ROLE_TO_BE_ADDED: ${role_id!} | EX: ${excluded.length}`);
		if (!role_id) return null;
		if (!guild.roles.cache.has(role_id)) return null;

		const role = guild.roles.cache.get(role_id)!;
		if (role.position > guild.me.roles.highest.position) return null;

		console.log('==========ADDED_ROLE==========');
		if (member?.roles.cache.has(role_id)) return null;
		return member?.roles.add(role, 'auto role').catch(() => null);
	}

	private checkRole(guild: Guild, member: GuildMember, role_id: string) {
		const role = guild.roles.cache.get(role_id);
		return role && member.roles.highest.position > role.position;
	}

	private getHighestRole(players: { tag: string; role?: string; clan?: { tag: string } }[], clans: string[]) {
		const roles: { [key: string]: number } = {
			member: 1, admin: 2, coLeader: 3
		};

		const unique = players.filter(a => a.clan && clans.includes(a.clan.tag) && a.role! in roles)
			.map(a => a.role!);

		return unique.sort((a, b) => roles[b] - roles[a])[0];
	}

	private async embed(id: string, member: Member, data: Feed) {
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
				const guild = this.client.guilds.cache.get(cache.guild)!;
				const user = await this.client.users.fetch(flag.user, false).catch(() => null);
				if (guild.roles.cache.has(cache.role)) {
					const role = guild.roles.cache.get(cache.role);
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
			tag: data.tag
		});
	}

	public delete(id: string) {
		return this.cached.delete(id);
	}
}
