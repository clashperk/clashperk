import { Clan, Player } from 'clashofclans.js';
import { Collection, Guild, GuildMember, Snowflake } from 'discord.js';
import { Collections } from '../util/Constants';
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
		role?: string;
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
	coLeader: 3,
	leader: 4
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

		const guilds = queried.guilds.filter((id: Snowflake) => this.client.guilds.cache.has(id));
		if (!guilds.length) return null;

		const cursor = this.client.db.collection(Collections.CLAN_STORES).aggregate<any>([
			{
				$match: {
					roles: { $exists: true },
					guild: { $in: [...guilds] }
				}
			},
			{
				$group: {
					_id: '$guild',
					clans: {
						$addToSet: '$$ROOT'
					}
				}
			},
			{
				$set: {
					guildId: '$_id'
				}
			},
			{
				$unset: '_id'
			},
			{
				$match: { 'clans.tag': tag }
			}
		]);

		const groups: { clans: any[]; guildId: Snowflake }[] = await cursor.toArray();
		if (!groups.length) return cursor.close();

		for (const group of groups.filter((ex) => ex.clans.length)) {
			await this.run(group.guildId, group.clans, data);
		}

		return cursor.close();
	}

	private async run(guild: Snowflake, clans: { tag: string; secureRole: boolean; roles: Record<string, string> }[], data: RPCFeed) {
		const clan = clans.find((clan) => clan.tag === data.clan.tag)!;

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
			const highestRoleClanRoles = clans
				.map((clan) => ({
					roles: clan.roles,
					highestRole: this.getHighestRole(
						players.filter((en) => tags.includes(en.tag)),
						[clan.tag]
					)
				}))
				.filter((mem) => mem.highestRole);
			const highestRoles = highestRoleClanRoles.map(({ roles, highestRole }) => roles[highestRole!]).filter((id) => id);

			const reason = ActionType[member.op].replace(/%PLAYER%/, member.name);
			const roles = Array.from(new Set(clans.map((clan) => Object.values(clan.roles)).flat()));
			await this.addRoles(members, guild, mem.user, highestRoles, roles, reason);
			await this.delay(250);
		}

		return data.members.length;
	}

	public async addRoles(
		members: Collection<string, GuildMember>,
		guildId: Snowflake,
		userId: Snowflake,
		roleIds: Snowflake[],
		roles: Snowflake[],
		reason: string
	) {
		const guild = this.client.guilds.cache.get(guildId);

		if (!roleIds.length && !roles.length) return null; // eslint-disable-line
		if (!guild?.me?.permissions.has('MANAGE_ROLES')) return null;

		if (!members.has(userId)) return null;
		const member = members.get(userId)!;
		if (member.user.bot) return null;

		const excluded = roles
			.filter((id) => !roleIds.includes(id) && this.checkRole(guild, guild.me!, id))
			.filter((id) => member.roles.cache.has(id));

		if (excluded.length) {
			await member.roles.remove(excluded, reason);
		}

		const included = roleIds
			.filter((id) => guild.roles.cache.has(id))
			.filter((id) => guild.me!.roles.highest.position > guild.roles.cache.get(id)!.position)
			.filter((id) => !member.roles.cache.has(id));

		if (!included.length) return null;
		return member.roles.add(included, reason);
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
		const highestRoles = players.filter((a) => a.clan && clans.includes(a.clan.tag) && a.role && a.role in roles).map((a) => a.role!);
		const highestRole = highestRoles.sort((a, b) => roles[b] - roles[a])[0];
		if (highestRole) return highestRole.replace('leader', 'coLeader');
		return null;
	}

	private async delay(ms: number) {
		return new Promise((res) => setTimeout(res, ms));
	}
}
