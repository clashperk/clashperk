import { Collections } from '../util/Constants';
import { Clan, Player } from 'clashofclans.js';
import { Collection, Guild, GuildMember, Snowflake } from 'discord.js';
import { Client } from '../struct/Client';
import Queue from '../struct/Queue';

const ActionType: Record<string, string> = {
	LEFT: '"%PLAYER% left"',
	JOINED: '"%PLAYER% joined"',
	DEMOTED: '"%PLAYER% has been demoted"',
	PROMOTED: '"%PLAYER% has been promoted"',
	SYNCED: '"%PLAYER% [Auto Role Initiated]"'
};

export interface RPCFeed {
	clan: {
		tag: string;
		name: string;
	};
	members: {
		op: string;
		tag: string;
		name: string;
		role: string;
	}[];
	memberList: {
		tag: string;
		role: string;
		clan: { tag: string };
	}[];
}

const roles: { [key: string]: number } = {
	member: 1,
	admin: 2,
	coLeader: 3
};

export class RoleManager {
	private readonly _queue: Queue;
	private readonly queues = new Set<string>();

	public constructor(private readonly client: Client) {
		this._queue = new Queue();
	}

	public async queue(clan: Clan) {
		if (this.queues.has(clan.tag)) return null;

		const data = {
			clan: { name: clan.name, tag: clan.tag },
			memberList: clan.memberList.map((mem) => ({ tag: mem.tag, role: mem.role, clan: { tag: clan.tag } })),
			members: clan.memberList.map((mem) => ({ op: 'SYNCED', name: mem.name, tag: mem.tag, role: mem.role }))
		};

		this.queues.add(clan.tag);
		await this._queue.wait();

		try {
			return await this.exec(clan.tag, data);
		} finally {
			this._queue.shift();
			this.queues.delete(clan.tag);
		}
	}

	public async newLink(player: Player) {
		const clan = await this.client.http.clan(player.clan!.tag);
		if (!clan.ok) return null;

		return this.exec(clan.tag, {
			clan: { name: player.clan!.name, tag: player.clan!.tag },
			memberList: clan.memberList
				.map((mem) => ({ tag: mem.tag, role: mem.role, clan: { tag: clan.tag } }))
				.filter((mem) => mem.tag !== player.tag),
			members: [{ op: 'SYNCED', name: player.name, tag: player.tag, role: player.role! }]
		});
	}

	public async exec(tag: string, data: RPCFeed) {
		const queried = await this.client.db
			.collection(Collections.CLAN_STORES)
			.aggregate([
				{
					$match: {
						tag,
						active: true,
						paused: false
					}
				},
				{
					$group: {
						_id: null,
						guilds: {
							$addToSet: '$guild'
						}
					}
				},
				{
					$unset: '_id'
				}
			])
			.next();
		if (!queried?.guilds.length) return null;

		const guildIds = queried.guilds.filter((id: Snowflake) => this.client.guilds.cache.has(id));
		if (!guildIds.length) return null;

		const cursor = this.client.db.collection(Collections.CLAN_STORES).aggregate<any>([
			{
				$match: {
					autoRole: { $gt: 0 },
					guild: { $in: guildIds }
				}
			},
			{
				$group: {
					_id: {
						guild: '$guild',
						autoRole: '$autoRole'
					},
					clans: {
						$addToSet: '$$ROOT'
					}
				}
			},
			{
				$set: {
					guildId: '$_id.guild',
					type: '$_id.autoRole'
				}
			},
			{
				$unset: '_id'
			},
			{
				$match: { 'clans.tag': tag }
			}
		]);

		const groups: { clans: any[]; guildId: Snowflake; type: 1 | 2 }[] = await cursor.toArray();
		if (!groups.length) return cursor.close();

		for (const group of groups.filter((ex) => ex.type === 2 && ex.clans.length)) {
			await this.addSameTypeRole(group.guildId, group.clans, data);
		}

		for (const group of groups.filter((ex) => ex.type === 1 && ex.clans.length)) {
			const clan = group.clans.find((clan) => clan.tag === data.clan.tag);
			if (clan) await this.addUniqueTypeRole(group.guildId, clan, data);
		}

		return cursor.close();
	}

	private async addUniqueTypeRole(guild: Snowflake, clan: any, data: RPCFeed) {
		const collection = await this.client.db
			.collection<{ user: Snowflake; entries: { tag: string; verified: boolean }[] }>(Collections.LINKED_PLAYERS)
			.find({ 'entries.tag': { $in: data.members.map((mem) => mem.tag) } })
			.toArray();

		const flattened = this.flatPlayers(collection, clan.secureRole);
		const userIds = flattened.reduce<Snowflake[]>((prev, curr) => {
			if (!prev.includes(curr.user)) prev.push(curr.user);
			return prev;
		}, []);

		// fetch guild members at once
		const members = await this.client.guilds.cache.get(guild)?.members.fetch({ user: userIds, force: true });
		if (!members?.size) return null;

		for (const member of data.members) {
			const mem = flattened.find((a) => a.tag === member.tag);
			if (!mem) continue;
			const acc = flattened.filter((a) => a.user === mem.user);

			const tags = acc.map((en) => en.tag);
			const multi = data.memberList.filter((mem) => tags.includes(mem.tag));
			const role = this.getHighestRole(multi, [clan.tag]) || member.role;

			const reason = ActionType[member.op].replace(/%PLAYER%/, member.name);
			await this.manageRole(members, mem.user, guild, role, clan.roles, reason);
			await this.delay(250);
		}

		return data.members.length;
	}

	private async addSameTypeRole(guild: Snowflake, clans: any[], data: RPCFeed) {
		const clan = clans[0];

		const collection = await this.client.db
			.collection<{ user: Snowflake; entries: { tag: string; verified: boolean }[] }>(Collections.LINKED_PLAYERS)
			.find({ 'entries.tag': { $in: data.members.map((mem) => mem.tag) } })
			.toArray();

		const flattened = this.flatPlayers(collection, clan.secureRole);
		const userIds = flattened.reduce<Snowflake[]>((prev, curr) => {
			if (!prev.includes(curr.user)) prev.push(curr.user);
			return prev;
		}, []);

		// fetch guild members at once
		const members = await this.client.guilds.cache.get(guild)?.members.fetch({ user: userIds, force: true });
		if (!members?.size) return null;

		const players = (await this.client.http.detailedClanMembers(flattened)).filter((res) => res.ok);

		for (const member of data.members) {
			const mem = flattened.find((a) => a.tag === member.tag);
			if (!mem) continue;
			const acc = flattened.filter((a) => a.user === mem.user);

			const tags = acc.map((en) => en.tag);
			const role = this.getHighestRole(
				players.filter((en) => tags.includes(en.tag)),
				clans.map((clan) => clan.tag)
			);

			const reason = ActionType[member.op].replace(/%PLAYER%/, member.name);
			await this.manageRole(members, mem.user, guild, role, clan.roles, reason);
			await this.delay(250);
		}

		return data.members.length;
	}

	private async manageRole(
		members: Collection<string, GuildMember>,
		userId: Snowflake,
		guildId: Snowflake,
		clanRole: string,
		roles: { [key: string]: Snowflake },
		reason: string
	) {
		return this.addRoles(members, guildId, userId, roles[clanRole], Object.values(roles), reason);
	}

	public async addRoles(
		members: Collection<string, GuildMember>,
		guildId: Snowflake,
		userId: Snowflake,
		roleId: Snowflake,
		roles: Snowflake[],
		reason: string
	) {
		const guild = this.client.guilds.cache.get(guildId);

		if (!roleId && !roles.length) return null; // eslint-disable-line
		if (!guild?.me?.permissions.has('MANAGE_ROLES')) return null;

		if (!members.has(userId)) return null;
		const member = members.get(userId)!;
		if (member.user.bot) return null;

		const excluded = roles
			.filter((id) => id !== roleId && this.checkRole(guild, guild.me!, id))
			.filter((id) => member.roles.cache.has(id));

		if (excluded.length) {
			await member.roles.remove(excluded, reason);
		}

		if (!roleId) return null; // eslint-disable-line
		if (!guild.roles.cache.has(roleId)) return null;

		const role = guild.roles.cache.get(roleId)!;
		if (role.position > guild.me.roles.highest.position) return null;

		if (member.roles.cache.has(roleId)) return null;
		return member.roles.add(role, reason).catch(() => null);
	}

	private flatPlayers(collection: { user: Snowflake; entries: { tag: string; verified: boolean }[] }[], secureRole: boolean) {
		return collection
			.reduce<{ user: Snowflake; tag: string; verified: boolean }[]>((prev, curr) => {
				prev.push(...curr.entries.map((en) => ({ user: curr.user, tag: en.tag, verified: en.verified })));
				return prev;
			}, [])
			.filter((en) => (secureRole ? en.verified : true));
	}

	private checkRole(guild: Guild, member: GuildMember, roleId: Snowflake) {
		const role = guild.roles.cache.get(roleId);
		return role && member.roles.highest.position > role.position;
	}

	private getHighestRole(players: { tag: string; role?: string; clan?: { tag: string } }[], clans: string[]) {
		const unique = players.filter((a) => a.clan && clans.includes(a.clan.tag) && a.role! in roles).map((a) => a.role!);

		return unique.sort((a, b) => roles[b] - roles[a])[0];
	}

	private async delay(ms: number) {
		return new Promise((res) => setTimeout(res, ms));
	}
}
