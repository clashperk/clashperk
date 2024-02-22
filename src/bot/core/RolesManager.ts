import { APIPlayer, UnrankedLeagueData } from 'clashofclans.js';
import { Guild, GuildMember, PermissionFlagsBits } from 'discord.js';
import { ClanStoresEntity } from '../entities/clan-stores.entity.js';
import { Client } from '../struct/Client.js';
import { PlayerLinks } from '../types/index.js';
import { Collections, Settings } from '../util/Constants.js';
import { makeAbbr } from '../util/Helper.js';

export const roles: { [key: string]: number } = {
	member: 1,
	admin: 2,
	coLeader: 3,
	leader: 4
};

export const UNICODE_EMOJI_REGEX = /\p{Extended_Pictographic}/u;

export class RolesManager {
	public constructor(private readonly client: Client) {}
	private queues: Record<string, RolesManagerQueue> = {};

	public async getGuildRolesMap(guildId: string): Promise<GuildRolesDto> {
		const clans = await this.client.db.collection<ClanStoresEntity>(Collections.CLAN_STORES).find({ guild: guildId }).toArray();

		const townHallRoles = this.client.settings.get<Record<string, string>>(guildId, Settings.TOWN_HALL_ROLES, {});
		const leagueRoles = this.client.settings.get<Record<string, string>>(guildId, Settings.LEAGUE_ROLES, {});
		const familyOnlyLeagueRoles = this.client.settings.get<boolean>(guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS_LEAGUE, false);
		const familyOnlyTownHallRoles = this.client.settings.get<boolean>(guildId, Settings.ALLOW_EXTERNAL_ACCOUNTS, false);
		const familyRoleId = this.client.settings.get<string>(guildId, Settings.FAMILY_ROLE, null);
		const verifiedRoleId = this.client.settings.get<string>(guildId, Settings.ACCOUNT_VERIFIED_ROLE, null);
		const guestRoleId = this.client.settings.get<string>(guildId, Settings.GUEST_ROLE, null);

		const clanRoles = clans.reduce<GuildRolesDto['clanRoles']>((prev, curr) => {
			const roles = curr.roles ?? {};
			prev[curr.tag] ??= {
				roles,
				warRoleId: curr.warRole,
				alias: curr.alias ?? null,
				verifiedOnly: Boolean(curr.secureRole)
			} as GuildRolesDto['clanRoles'][string];
			return prev;
		}, {});

		const clanTags = clans.map((clan) => clan.tag);
		const warClanTags = clans.filter((clan) => clan.warRole).map((clan) => clan.tag);

		return {
			guildId,
			clanTags,
			warClanTags,
			familyOnlyLeagueRoles,
			familyOnlyTownHallRoles,
			familyRoleId,
			verifiedRoleId,
			guestRoleId,
			leagueRoles,
			townHallRoles,
			clanRoles
		};
	}

	private getTargetedRoles(rolesMap: GuildRolesDto) {
		const leagueRoles = Object.values(rolesMap.leagueRoles).filter((id) => id);
		const townHallRoles = Object.values(rolesMap.townHallRoles).filter((id) => id);
		const clanRoles = Object.values(rolesMap.clanRoles ?? {})
			.map((_rMap) => Object.values(_rMap.roles))
			.flat()
			.filter((id) => id);
		const warRoles = Object.values(rolesMap.clanRoles ?? {})
			.map((_rMap) => _rMap.warRoleId)
			.flat()
			.filter((id) => id);

		const targetedRoles: string[] = [
			rolesMap.guestRoleId,
			rolesMap.familyRoleId,
			rolesMap.verifiedRoleId,
			...warRoles,
			...leagueRoles,
			...townHallRoles,
			...clanRoles
		].filter((id) => id);

		return {
			targetedRoles: [...new Set(targetedRoles)],
			warRoles: [...new Set(warRoles)],
			clanRoles: [...new Set(clanRoles)],
			leagueRoles: [...new Set(leagueRoles)],
			townHallRoles: [...new Set(townHallRoles)]
		};
	}

	public getPlayerRoles(players: PlayerRolesInput[], rolesMap: GuildRolesDto) {
		const { targetedRoles } = this.getTargetedRoles(rolesMap);

		let rolesToInclude: string[] = [];

		const playerClanTags = players.filter((player) => player.clanTag).map((player) => player.clanTag!);
		const inFamily = rolesMap.clanTags.some((clanTag) => playerClanTags.includes(clanTag));

		for (const player of players) {
			for (const clanTag in rolesMap.clanRoles) {
				const targetClan = rolesMap.clanRoles[clanTag];
				if (player.warClanTag === clanTag && targetClan.warRoleId) {
					rolesToInclude.push(targetClan.warRoleId);
				}

				if (targetClan.verifiedOnly && !player.isVerified) continue;

				const targetClanRolesMap = targetClan.roles ?? {};
				const highestRole = this.getHighestRole(players, clanTag);
				if (highestRole) {
					rolesToInclude.push(targetClanRolesMap[highestRole], targetClanRolesMap['everyone']);
				}
			}

			if (!rolesMap.familyOnlyTownHallRoles || (inFamily && rolesMap.familyOnlyTownHallRoles)) {
				rolesToInclude.push(rolesMap.townHallRoles[player.townHallLevel]);
			}
			if (!rolesMap.familyOnlyLeagueRoles || (inFamily && rolesMap.familyOnlyLeagueRoles)) {
				rolesToInclude.push(rolesMap.leagueRoles[player.leagueId]);
			}

			if (player.isVerified) rolesToInclude.push(rolesMap.verifiedRoleId);
		}

		if (inFamily) rolesToInclude.push(rolesMap.familyRoleId);
		else rolesToInclude.push(rolesMap.guestRoleId);

		rolesToInclude = rolesToInclude.filter((id) => id);
		const rolesToExclude = targetedRoles.filter((id) => !rolesToInclude.includes(id));

		return {
			targetedRoles: [...new Set(targetedRoles)],
			rolesToInclude: [...new Set(rolesToInclude)],
			rolesToExclude: [...new Set(rolesToExclude)]
		};
	}

	public getPlayerNickname(player: APIPlayer, member: GuildMember, rolesMap: GuildRolesDto) {
		const isNickNamingEnabled = this.client.settings.get<boolean>(rolesMap.guildId, Settings.AUTO_NICKNAME, false);
		if (!isNickNamingEnabled) return null;

		const familyFormat = this.client.settings.get<string>(rolesMap.guildId, Settings.FAMILY_NICKNAME_FORMAT);
		const nonFamilyFormat = this.client.settings.get<string>(rolesMap.guildId, Settings.NON_FAMILY_NICKNAME_FORMAT);

		if (familyFormat && player.clan && rolesMap.clanTags.includes(player.clan.tag)) {
			return this.client.nickHandler.getName(
				{
					name: player.name,
					displayName: member.user.displayName,
					username: member.user.username,
					townHallLevel: player.townHallLevel,
					alias: rolesMap.clanRoles[player.clan.tag]?.alias || makeAbbr(player.clan.name),
					clan: player.clan.name,
					role: player.role
				},
				familyFormat
			);
		} else if (nonFamilyFormat) {
			return this.client.nickHandler.getName(
				{
					name: player.name,
					displayName: member.user.displayName,
					username: member.user.username,
					townHallLevel: player.townHallLevel,
					alias: null,
					clan: null,
					role: null
				},
				nonFamilyFormat
			);
		}

		return null;
	}

	public async updateMany(guildId: string, isDryRun = false): Promise<RolesManagerQueue | null> {
		const guild = this.client.guilds.cache.get(guildId);
		if (!guild) return null;

		const rolesMap = await this.getGuildRolesMap(guildId);
		const playersInWarMap = await this.getWarRolesMap(rolesMap.warClanTags);

		const guildMembers = await guild.members.fetch({ time: 300e3 });

		const linkedPlayers = await this.getLinkedPlayers(guildMembers.map((m) => m.id));
		const linkedUserIds = Object.keys(linkedPlayers);

		const { targetedRoles } = this.getTargetedRoles(rolesMap);
		const targetedMembers = guildMembers.filter(
			(m) => !m.user.bot && (m.roles.cache.hasAny(...targetedRoles) || linkedUserIds.includes(m.id))
		);
		if (!targetedMembers.size) return null;

		this.queues[guildId] ??= { progress: 0, memberCount: targetedMembers.size, changes: [] };
		for (const member of targetedMembers.values()) {
			const players = await this.getPlayers(linkedPlayers[member.id] ?? []);
			const result = await this.preRoleUpdateAction({
				member,
				rolesMap,
				players,
				playersInWarMap,
				isDryRun
			});

			const defaultPlayer = players.at(0) ?? null;
			const nickname = defaultPlayer
				? await this.updateNickname({
						member,
						isDryRun,
						player: defaultPlayer,
						nickname: this.getPlayerNickname(defaultPlayer, member, rolesMap)
				  })
				: null;

			const queue = this.queues[guildId];
			if (!queue) break;

			if (result) {
				queue.changes.push({ ...result, userId: member.id, displayName: member.user.displayName, nickname });
			} else if (nickname && !result) {
				queue.changes.push({ included: [], excluded: [], userId: member.id, displayName: member.user.displayName, nickname });
			}
			queue.progress += 1;
			if ((result?.excluded.length || result?.included.length || nickname) && !isDryRun) await this.delay(1000);
		}

		return this.queues[guildId] ?? null;
	}

	public getChanges(guildId: string): RolesManagerQueue | null {
		return this.queues[guildId] ?? null;
	}

	public clearChanges(guildId: string) {
		delete this.queues[guildId];
	}

	private delay(ms: number) {
		return new Promise((res) => setTimeout(res, ms));
	}

	private async getPlayers(playerLinks: PlayerLinks[]) {
		const verifiedPlayersMap = Object.fromEntries(playerLinks.map((player) => [player.tag, player.verified]));
		const players = await this.client.http._getPlayers(playerLinks.map(({ tag }) => ({ tag })));
		return players.map((player) => ({ ...player, verified: verifiedPlayersMap[player.tag] }));
	}

	private async getLinkedPlayers(userIds: string[]) {
		const players = await this.client.db
			.collection<PlayerLinks>(Collections.PLAYER_LINKS)
			.find({ userId: { $in: userIds } })
			.sort({ order: 1 })
			.toArray();

		return players.reduce<Record<string, PlayerLinks[]>>((prev, curr) => {
			prev[curr.userId] ??= [];
			prev[curr.userId].push(curr);
			return prev;
		}, {});
	}

	public async updateOne(userId: string, guildId: string, isDryRun = false) {
		if (!this.client.settings.get(guildId, Settings.USE_V2_ROLES_MANAGER, false)) return null;

		const guild = this.client.guilds.cache.get(guildId);
		if (!guild) return null;

		const member = await guild.members.fetch(userId).catch(() => null);
		if (!member || member.user.bot) return null;

		const linkedPlayers = await this.getLinkedPlayers([userId]);
		const players = await this.getPlayers(linkedPlayers[userId] ?? []);

		const rolesMap = await this.getGuildRolesMap(guildId);
		const playersInWarMap = await this.getWarRolesMap(rolesMap.warClanTags);

		const result = await this.preRoleUpdateAction({
			member,
			rolesMap,
			players,
			playersInWarMap,
			isDryRun
		});

		const defaultPlayer = players.at(0) ?? null;
		const nickname = defaultPlayer
			? await this.updateNickname({
					member,
					isDryRun,
					player: defaultPlayer,
					nickname: this.getPlayerNickname(defaultPlayer, member, rolesMap)
			  })
			: null;

		return { included: result?.included ?? [], excluded: result?.excluded ?? [], nickname };
	}

	private async preRoleUpdateAction({
		member,
		rolesMap,
		playersInWarMap,
		isDryRun,
		players
	}: {
		member: GuildMember;
		isDryRun?: boolean;
		rolesMap: GuildRolesDto;
		playersInWarMap: Record<string, string>;
		players: (APIPlayer & { verified: boolean })[];
	}) {
		const playerList = players.map(
			(player) =>
				({
					name: player.name,
					tag: player.tag,
					townHallLevel: player.townHallLevel,
					leagueId: player.league?.id ?? UnrankedLeagueData.id,
					clanRole: player.role ?? null,
					clanName: player.clan?.name ?? null,
					clanTag: player.clan?.tag ?? null,
					isVerified: player.verified,
					warClanTag: playersInWarMap[player.tag]
				}) satisfies PlayerRolesInput
		);

		const playerRolesMap = this.getPlayerRoles(playerList, rolesMap);
		const result = await this.updateRoles({
			member,
			isDryRun,
			rolesToExclude: playerRolesMap.rolesToExclude,
			rolesToInclude: playerRolesMap.rolesToInclude
		});

		return result;
	}

	private async updateRoles({ member, rolesToExclude, rolesToInclude, isDryRun = false }: AddRoleInput) {
		if (member.user.bot) return null;
		if (!rolesToExclude.length && !rolesToInclude.length) return null;
		if (!member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) return null;

		const excluded = rolesToExclude.filter((id) => this.checkRole(member.guild, id) && member.roles.cache.has(id));
		if (excluded.length && !isDryRun) member = await member.roles.remove(excluded);

		const included = rolesToInclude.filter((id) => this.checkRole(member.guild, id) && !member.roles.cache.has(id));
		if (included.length && !isDryRun) await member.roles.add(included);

		return { included, excluded };
	}

	private checkRole(guild: Guild, roleId: string) {
		const role = guild.roles.cache.get(roleId);
		return guild.members.me && role && !role.managed && guild.members.me.roles.highest.position > role.position && role.id !== guild.id;
	}

	private async getWarRolesMap(clanTags: string[]) {
		const result = await Promise.all(clanTags.map((clanTag) => this.client.http.getCurrentWars(clanTag)));
		const membersMap: Record<string, string> = {};

		for (const war of result.flat()) {
			if (war.state === 'notInWar') continue;

			for (const member of war.clan.members) {
				const inWar = ['preparation', 'inWar'].includes(war.state);
				if (inWar) membersMap[member.tag] = war.clan.tag;
			}
		}

		return membersMap;
	}

	private getHighestRole(players: PlayerRolesInput[], clanTag: string) {
		const highestRoles = players
			.filter((player) => player.clanTag && player.clanTag === clanTag && player.clanRole)
			.map((player) => player.clanRole!);
		return highestRoles.sort((a, b) => roles[b] - roles[a]).at(0) ?? null;
	}

	private async updateNickname({
		member,
		player,
		nickname,
		isDryRun = false
	}: {
		member: GuildMember;
		player: APIPlayer;
		nickname: string | null;
		isDryRun?: boolean;
	}) {
		if (!nickname) return null;

		if (member.id === member.guild.ownerId) return null;
		if (!member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) return null;
		if (member.guild.members.me.roles.highest.position <= member.roles.highest.position) return null;

		if (member.nickname === nickname) return null;
		if (isDryRun) return nickname;

		const newMember = await member.setNickname(nickname.substring(0, 31).trim(), `For ${player.name} (${player.tag})`);
		if (newMember.nickname === member.nickname) return null;
		return newMember.nickname;
	}

	public getRoleChanges(queue: RolesManagerQueue | null) {
		const roleChanges =
			queue?.changes.filter(({ excluded, included, nickname }) => included.length || excluded.length || nickname) ?? [];
		return roleChanges;
	}
}

interface PlayerRolesInput {
	name: string;
	tag: string;
	townHallLevel: number;
	leagueId: number;
	isVerified: boolean;
	clanRole: string | null;
	clanTag: string | null;
	clanName: string | null;
	warClanTag: string | null;
}

interface GuildRolesDto {
	guildId: string;
	townHallRoles: { [townHallLevel: string]: string };
	leagueRoles: { [leagueId: string]: string };
	clanRoles: {
		[clanTag: string]: {
			roles: { [clanRole: string]: string };
			verifiedOnly: boolean;
			warRoleId: string;
			alias: string | null;
		};
	};
	guestRoleId: string;
	familyRoleId: string;
	verifiedRoleId: string;
	clanTags: string[];
	warClanTags: string[];
	familyOnlyTownHallRoles: boolean;
	familyOnlyLeagueRoles: boolean;
}

interface AddRoleInput {
	member: GuildMember;
	rolesToExclude: string[];
	rolesToInclude: string[];
	isDryRun?: boolean;
}

interface RolesManagerQueue {
	memberCount: number;
	progress: number;
	changes: {
		included: string[];
		excluded: string[];
		nickname: string | null;
		userId: string;
		displayName: string;
	}[];
}
