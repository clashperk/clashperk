import { Clan, Player } from 'clashofclans.js';
import { Collection, Guild, GuildMember } from 'discord.js';
import { Collections, PLAYER_LEAGUE_MAPS, Settings } from '../util/Constants.js';
import { Client } from '../struct/Client.js';
import Queue from '../struct/Queue.js';
import { PlayerLinks } from '../types/index.js';

const ActionType: Record<string, string> = {
	LEFT: '"%PLAYER% left"',
	JOINED: '"%PLAYER% joined"',
	DEMOTED: '"%PLAYER% has been demoted"',
	PROMOTED: '"%PLAYER% has been promoted"',
	SYNCED: '"%PLAYER% [Auto Role Initiated]"'
};

interface AggregatedClan {
	tag: string;
	secureRole: boolean;
	roles: Record<string, string>;
}

interface AggregatedGuild {
	guild: string;
	clans: AggregatedClan[];
}

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

	public init() {
		this.client.db
			.collection<PlayerLinks>(Collections.PLAYER_LINKS)
			.watch(
				[
					{
						$match: { operationType: { $in: ['insert', 'update'] } }
					}
				],
				{ fullDocument: 'updateLookup' }
			)
			.on('change', async (change) => {
				if (['insert', 'update'].includes(change.operationType)) {
					const link = change.fullDocument!;
					const res = await this.client.http.player(link.tag);
					if (res.ok && res.clan) return this.newLink(res);
				}
			});
	}

	public async queue(clan: Clan, { isThRole = false, isLeagueRole = false }) {
		if (this.queues.has(clan.tag)) return null;

		const data = {
			clan: { name: clan.name, tag: clan.tag },
			members: clan.memberList.map((mem) => ({ op: 'SYNCED', name: mem.name, tag: mem.tag, role: mem.role }))
		};

		this.queues.add(clan.tag);
		await this._queue.wait();

		try {
			if (isLeagueRole) {
				await this.execLeagueRoles(clan.tag, clan.memberList);
			} else if (isThRole) {
				await this.execTownHall(clan.tag, clan.memberList);
			} else {
				await this.exec(clan.tag, data);
			}
		} finally {
			this._queue.shift();
			this.queues.delete(clan.tag);
		}
	}

	public async newLink(player: Player) {
		const clan = await this.client.http.clan(player.clan!.tag);
		if (!clan.ok) return null;

		await this.execTownHall(clan.tag, [{ tag: player.tag }]);
		await this.execLeagueRoles(clan.tag, [{ tag: player.tag }]);
		await this.exec(clan.tag, {
			clan: { name: player.clan!.name, tag: player.clan!.tag },
			members: [{ op: 'SYNCED', name: player.name, tag: player.tag, role: player.role! }]
		});
	}

	public async exec(tag: string, data: RPCFeed) {
		const members = data.members.filter((mem) => ['JOINED', 'LEFT'].includes(mem.op));
		if (members.length) await this.execTownHall(tag, members);

		const leagueChanges = data.members.filter((mem) => ['LEAGUE_CHANGE'].includes(mem.op));
		if (leagueChanges.length) await this.execLeagueRoles(tag, leagueChanges);

		const roleChanges = data.members.filter((mem) => ['PROMOTED', 'DEMOTED', 'JOINED', 'LEFT', 'SYNCED'].includes(mem.op));
		if (!roleChanges.length) return null;

		const queried = await this.client.db
			.collection(Collections.CLAN_STORES)
			.aggregate<AggregatedGuild>([
				{
					$match: {
						tag,
						active: true,
						paused: false
					}
				},
				{
					$project: {
						guild: 1
					}
				},
				{
					$lookup: {
						from: Collections.CLAN_STORES,
						localField: 'guild',
						foreignField: 'guild',
						as: 'clans',
						pipeline: [
							{
								$match: {
									active: true,
									paused: false,
									roles: { $exists: true }
								}
							},
							{
								$project: {
									tag: 1,
									secureRole: 1,
									roles: 1
								}
							}
						]
					}
				},
				{
					$match: { 'clans.tag': tag }
				}
			])
			.toArray();

		for (const { guild, clans } of queried) {
			if (!clans.length) continue;
			if (!this.client.guilds.cache.has(guild)) continue;
			const clan = clans.find((c) => c.tag === tag)!;
			await this.run(guild, clans, clan, roleChanges);
		}
	}

	public async execTownHall(tag: string, members: { tag: string }[]) {
		const queried = await this.client.db
			.collection(Collections.CLAN_STORES)
			.aggregate<{ guild: string; clans: { tag: string }[] }>([
				{
					$match: {
						tag,
						active: true,
						paused: false
					}
				},
				{
					$project: {
						guild: 1
					}
				},
				{
					$lookup: {
						from: Collections.CLAN_STORES,
						localField: 'guild',
						foreignField: 'guild',
						as: 'clans',
						pipeline: [
							{
								$project: {
									tag: 1
								}
							}
						]
					}
				}
			])
			.toArray();
		if (!queried.length) return null;

		for (const { guild, clans } of queried) {
			if (!clans.length) continue;
			if (!this.client.guilds.cache.has(guild)) continue;
			await this.runTownHallRoles(
				guild,
				clans,
				members.map((mem) => mem.tag)
			);
		}
	}

	public async execLeagueRoles(tag: string, members: { tag: string }[]) {
		const queried = await this.client.db
			.collection(Collections.CLAN_STORES)
			.aggregate<{ guild: string; clans: { tag: string }[] }>([
				{
					$match: {
						tag,
						active: true,
						paused: false
					}
				},
				{
					$project: {
						guild: 1
					}
				},
				{
					$lookup: {
						from: Collections.CLAN_STORES,
						localField: 'guild',
						foreignField: 'guild',
						as: 'clans',
						pipeline: [
							{
								$project: {
									tag: 1
								}
							}
						]
					}
				}
			])
			.toArray();
		if (!queried.length) return null;

		for (const { guild, clans } of queried) {
			if (!clans.length) continue;
			if (!this.client.guilds.cache.has(guild)) continue;
			await this.runLeagueRoles(
				guild,
				clans,
				members.map((mem) => mem.tag)
			);
		}
	}

	private async run(
		guildId: string,
		clans: AggregatedClan[],
		clan: AggregatedClan,
		members: {
			op: string;
			tag: string;
			name: string;
			role?: string;
		}[]
	) {
		// getting all linked accounts of all clan members
		const flattened = await this.client.db
			.collection(Collections.PLAYER_LINKS)
			.aggregate<PlayerLinks>([
				{
					$match: {
						tag: { $in: members.map((mem) => mem.tag) },
						...(clan.secureRole ? { verified: true } : {})
					}
				},
				{
					$lookup: {
						from: Collections.PLAYER_LINKS,
						localField: 'userId',
						foreignField: 'userId',
						as: 'links'
					}
				},
				{
					$unwind: {
						path: '$links'
					}
				},
				{
					$replaceRoot: {
						newRoot: '$links'
					}
				}
			])
			.toArray();

		// flattening the array
		// getting unique user ids
		const userIds = flattened.reduce<string[]>((prev, curr) => {
			if (!prev.includes(curr.userId)) prev.push(curr.userId);
			return prev;
		}, []);

		// fetch guild members at once
		const guildMembers = await this.client.guilds.cache.get(guildId)?.members.fetch({ user: userIds });
		if (!guildMembers?.size) return null;

		// getting roles of all linked players
		const players = (await this.client.http.detailedClanMembers(flattened)).filter((res) => res.ok);

		// going through all clan members
		for (const member of members) {
			// whether the member is linked
			const mem = flattened.find((a) => a.tag === member.tag);
			if (!mem) continue;
			// getting linked user's accounts
			const acc = flattened.filter((a) => a.userId === mem.userId);
			const tags = acc.map((en) => en.tag);

			// getting the member's highest role for each clan
			const highestClanRoles = clans
				.map((clan) => ({
					roles: clan.roles,
					highestRole: this.getHighestRole(
						players.filter((en) => tags.includes(en.tag)),
						[clan.tag]
					),
					commonRoleId: clan.roles.everyone // <- this is the role that is common to all clan members
				}))
				.filter((mem) => mem.highestRole);
			// mapping the highest role with discord role ids
			const highestRoles = highestClanRoles
				// mapping the common role id with the highest role id
				.map(({ roles, highestRole, commonRoleId }) => [roles[highestRole!], commonRoleId])
				.flat()
				.filter((id) => id);

			const reason = ActionType[member.op].replace(/%PLAYER%/, member.name);
			// flatten all the role ids for each clan
			const roles = Array.from(new Set(clans.map((clan) => Object.values(clan.roles)).flat()));
			const count = await this.addRoles({
				members: guildMembers,
				guildId,
				userId: mem.userId,
				roleIds: highestRoles,
				roles,
				reason
			});
			if (count) await this.delay(members.length >= 10 ? 1000 : 250);
		}

		return members.length;
	}

	private handleTHRoles(players: Player[], clans: string[], rolesMap: Record<string, string>, allowExternal: boolean) {
		// at least one account should be in the clan
		if (allowExternal && !players.some((player) => player.clan && clans.includes(player.clan.tag))) {
			return [];
		}

		const roles = players.reduce<string[]>((acc, player) => {
			const roleId = rolesMap[player.townHallLevel];
			if (roleId && !acc.includes(roleId)) {
				if (!allowExternal && player.clan && clans.includes(player.clan.tag)) acc.push(roleId);
				if (allowExternal) acc.push(roleId);
			}
			return acc;
		}, []);

		return roles;
	}

	private handleLeagueRoles(players: Player[], clans: string[], rolesMap: Record<string, string>, allowExternal: boolean) {
		// at least one account should be in the clan
		if (allowExternal && !players.some((player) => player.clan && clans.includes(player.clan.tag))) {
			return [];
		}

		const roles = players.reduce<string[]>((acc, player) => {
			const roleId = rolesMap[PLAYER_LEAGUE_MAPS[player.league?.id ?? '29000000']];
			if (roleId && !acc.includes(roleId)) {
				if (!allowExternal && player.clan && clans.includes(player.clan.tag)) acc.push(roleId);
				if (allowExternal) acc.push(roleId);
			}
			return acc;
		}, []);

		return roles;
	}

	private async runTownHallRoles(guildId: string, clans: { tag: string }[], memberTags: string[]) {
		const allowExternal = this.client.settings.get<boolean>(guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS, false);
		const rolesMap = this.client.settings.get<Record<string, string>>(guildId, Settings.TOWN_HALL_ROLES, {});
		const roles = Array.from(new Set(Object.values(rolesMap)));
		if (!roles.length) return null;

		// getting all linked accounts of all clan members
		const flattened = await this.client.db
			.collection(Collections.PLAYER_LINKS)
			.aggregate<PlayerLinks>([
				{
					$match: { tag: { $in: memberTags } }
				},
				{
					$lookup: {
						from: Collections.PLAYER_LINKS,
						localField: 'userId',
						foreignField: 'userId',
						as: 'links'
					}
				},
				{
					$unwind: {
						path: '$links'
					}
				},
				{
					$replaceRoot: {
						newRoot: '$links'
					}
				}
			])
			.toArray();

		// flattening the array
		// getting unique user ids
		const userIds = flattened.reduce<string[]>((prev, curr) => {
			if (!prev.includes(curr.userId)) prev.push(curr.userId);
			return prev;
		}, []);

		// fetch guild members at once
		const members = await this.client.guilds.cache.get(guildId)?.members.fetch({ user: userIds });
		if (!members?.size) return null;

		// getting roles of all linked players
		const players = (await this.client.http.detailedClanMembers(flattened)).filter((res) => res.ok);

		// going through all clan members
		for (const tag of memberTags) {
			// whether the member is linked
			const mem = flattened.find((a) => a.tag === tag);
			if (!mem) continue;

			const acc = flattened.filter((a) => a.userId === mem.userId);
			const tags = acc.map((en) => en.tag);

			// getting linked user's accounts
			const thRoles = this.handleTHRoles(
				players.filter((en) => tags.includes(en.tag)),
				clans.map((clan) => clan.tag),
				rolesMap,
				allowExternal
			);
			if (!thRoles.length) continue;

			// flatten all the role ids for each clan
			const count = await this.addRoles({
				members,
				guildId,
				userId: mem.userId,
				roleIds: thRoles,
				roles,
				reason: 'Town Hall Level Synced'
			});
			if (count) await this.delay(memberTags.length >= 10 ? 1000 : 250);
		}

		return memberTags.length;
	}

	private async runLeagueRoles(guildId: string, clans: { tag: string }[], memberTags: string[]) {
		const allowExternal = this.client.settings.get<boolean>(guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS_LEAGUE, false);
		const rolesMap = this.client.settings.get<Record<string, string>>(guildId, Settings.LEAGUE_ROLES, {});
		const roles = Array.from(new Set(Object.values(rolesMap)));
		if (!roles.length) return null;

		// getting all linked accounts of all clan members
		const flattened = await this.client.db
			.collection(Collections.PLAYER_LINKS)
			.aggregate<PlayerLinks>([
				{
					$match: { tag: { $in: memberTags } }
				},
				{
					$lookup: {
						from: Collections.PLAYER_LINKS,
						localField: 'userId',
						foreignField: 'userId',
						as: 'links'
					}
				},
				{
					$unwind: {
						path: '$links'
					}
				},
				{
					$replaceRoot: {
						newRoot: '$links'
					}
				}
			])
			.toArray();

		// flattening the array
		// getting unique user ids
		const userIds = flattened.reduce<string[]>((prev, curr) => {
			if (!prev.includes(curr.userId)) prev.push(curr.userId);
			return prev;
		}, []);

		// fetch guild members at once
		const members = await this.client.guilds.cache.get(guildId)?.members.fetch({ user: userIds });
		if (!members?.size) return null;

		// getting roles of all linked players
		const players = (await this.client.http.detailedClanMembers(flattened)).filter((res) => res.ok);

		// going through all clan members
		for (const tag of memberTags) {
			// whether the member is linked
			const mem = flattened.find((a) => a.tag === tag);
			if (!mem) continue;

			const acc = flattened.filter((a) => a.userId === mem.userId);
			const tags = acc.map((en) => en.tag);

			// getting linked user's accounts
			const thRoles = this.handleLeagueRoles(
				players.filter((en) => tags.includes(en.tag)),
				clans.map((clan) => clan.tag),
				rolesMap,
				allowExternal
			);
			if (!thRoles.length) continue;

			// flatten all the role ids for each clan
			const count = await this.addRoles({
				members,
				guildId,
				userId: mem.userId,
				roleIds: thRoles,
				roles,
				reason: 'League Roles Synced'
			});
			if (count) await this.delay(memberTags.length >= 10 ? 1000 : 250);
		}

		return memberTags.length;
	}

	public async addRoles({
		members,
		guildId,
		userId,
		roleIds,
		roles,
		reason
	}: {
		members: Collection<string, GuildMember>;
		guildId: string;
		userId: string;
		roleIds: string[];
		roles: string[];
		reason: string;
	}) {
		const guild = this.client.guilds.cache.get(guildId);

		if (!roleIds.length && !roles.length) return 0;
		if (!guild?.members.me?.permissions.has('ManageRoles')) return 0;

		if (!members.has(userId)) return 0;
		const member = members.get(userId)!;
		if (member.user.bot) return 0;

		// filter out the roles that should be removed
		const excluded = roles
			.filter((id) => !roleIds.includes(id))
			.filter((id) => this.checkRole(guild, guild.members.me!, id))
			.filter((id) => member.roles.cache.has(id));

		if (excluded.length) {
			await member.roles.remove(excluded, reason);
		}

		// filter out the roles that should be added
		const included = roleIds
			.filter((id) => guild.roles.cache.has(id))
			.filter((id) => guild.members.me!.roles.highest.position > guild.roles.cache.get(id)!.position)
			.filter((id) => !member.roles.cache.has(id));

		if (!included.length) return excluded.length;
		await member.roles.add(included, reason);
		return included.length;
	}

	private checkRole(guild: Guild, member: GuildMember, roleId: string) {
		const role = guild.roles.cache.get(roleId);
		return role && member.roles.highest.position > role.position;
	}

	private getHighestRole(players: { tag: string; role?: string; clan?: { tag: string } }[], clans: string[]) {
		const highestRoles = players.filter((a) => a.clan && clans.includes(a.clan.tag) && a.role && a.role in roles).map((a) => a.role!);
		const highestRole = highestRoles.sort((a, b) => roles[b] - roles[a]).at(0);
		if (highestRole) return highestRole.replace('leader', 'coLeader');
		return null;
	}

	private async delay(ms: number) {
		return new Promise((res) => setTimeout(res, ms));
	}
}
