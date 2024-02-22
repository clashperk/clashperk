import { APIPlayer, UnrankedLeagueData } from 'clashofclans.js';
import { Guild, GuildMember, GuildMemberEditOptions, PermissionFlagsBits } from 'discord.js';
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

const NickActions = {
	DECLINED: 'declined',
	UNSET: 'unset',
	NO_ACTION: 'no-action',
	SET_NAME: 'set-name'
} as const;

export const UNICODE_EMOJI_REGEX = /\p{Extended_Pictographic}/u;

export class RolesManager {
	public constructor(private readonly client: Client) {}
	private changeLogs: Record<string, RolesManagerChangeLog> = {};

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

	public preNicknameUpdate(players: APIPlayer[], member: GuildMember, rolesMap: GuildRolesDto) {
		if (member.id === member.guild.ownerId) return { action: NickActions.DECLINED };
		if (!member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageNicknames)) return { action: NickActions.DECLINED };
		if (member.guild.members.me.roles.highest.position <= member.roles.highest.position) return { action: NickActions.DECLINED };

		const player = players.at(0);
		if (!player) return { action: NickActions.UNSET };

		const isNickNamingEnabled = this.client.settings.get<boolean>(rolesMap.guildId, Settings.AUTO_NICKNAME, false);
		if (!isNickNamingEnabled) return { action: NickActions.NO_ACTION };

		const familyFormat = this.client.settings.get<string>(rolesMap.guildId, Settings.FAMILY_NICKNAME_FORMAT);
		const nonFamilyFormat = this.client.settings.get<string>(rolesMap.guildId, Settings.NON_FAMILY_NICKNAME_FORMAT);

		const inFamily = player.clan && rolesMap.clanTags.includes(player.clan.tag);
		const clanAlias = player.clan && inFamily ? rolesMap.clanRoles[player.clan.tag]?.alias || makeAbbr(player.clan.name) : null;

		const format = inFamily ? familyFormat : nonFamilyFormat;
		if (!format) return { action: NickActions.UNSET };

		const nickname = this.client.nickHandler.getName(
			{
				name: player.name,
				displayName: member.user.displayName,
				username: member.user.username,
				townHallLevel: player.townHallLevel,
				alias: clanAlias ?? null,
				clan: player.clan && inFamily ? player.clan.name : null,
				role: player.role && inFamily ? player.role : null
			},
			format
		);

		if (!nickname) return { action: NickActions.UNSET };
		if (member.nickname === nickname) return { action: NickActions.NO_ACTION };

		return { action: NickActions.SET_NAME, nickname };
	}

	public async updateMany(guildId: string, isDryRun = false): Promise<RolesManagerChangeLog | null> {
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

		this.changeLogs[guildId] ??= { progress: 0, memberCount: targetedMembers.size, changes: [] };
		for (const member of targetedMembers.values()) {
			const players = await this.getPlayers(linkedPlayers[member.id] ?? []);
			const roleUpdate = await this.preRoleUpdateAction({
				member,
				rolesMap,
				players,
				playersInWarMap,
				isDryRun: true
			});
			const nickUpdate = this.preNicknameUpdate(players, member, rolesMap);

			const changeLog: RolesManagerChangeLog['changes'][number] = {
				...roleUpdate,
				nickname: null,
				_updated: false,
				userId: member.id,
				displayName: member.user.displayName
			};
			const memberUpdate: GuildMemberEditOptions = {};

			if (roleUpdate.excluded.length || roleUpdate.included.length) {
				const existingRoleIds = member.roles.cache.map((role) => role.id);
				const roleIdsToSet = [...existingRoleIds, ...roleUpdate.included].filter((id) => !roleUpdate.excluded.includes(id));

				changeLog._updated = true;
				memberUpdate.roles = roleIdsToSet;
			}

			if (nickUpdate.action === NickActions.SET_NAME) {
				changeLog._updated = true;
				memberUpdate.nick = nickUpdate.nickname;
				changeLog.nickname = `**+** \`${nickUpdate.nickname}\``;
			}

			if (nickUpdate.action === NickActions.UNSET && member.nickname) {
				changeLog._updated = true;
				memberUpdate.nick = null;
				changeLog.nickname = `**-** ~~\`${member.nickname}\`~~`;
			}

			if (changeLog._updated) {
				const _oldNick = member.nickname; // TODO: Preserve Emojis in the Nickname
				const editedMember = await member.edit(memberUpdate);
				if (nickUpdate.action === NickActions.SET_NAME && _oldNick && _oldNick === editedMember.nickname) {
					changeLog.nickname = null;
				}
			}

			const queue = this.changeLogs[guildId];
			queue.changes.push(changeLog);
			queue.progress += 1;

			if (!queue) break;

			if ((roleUpdate.excluded.length || roleUpdate.included.length || nickUpdate.nickname) && !isDryRun) await this.delay(1000);
		}

		return this.changeLogs[guildId] ?? null;
	}

	public getChanges(guildId: string): RolesManagerChangeLog | null {
		return this.changeLogs[guildId] ?? null;
	}

	public clearChanges(guildId: string) {
		delete this.changeLogs[guildId];
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

		const roleUpdate = await this.preRoleUpdateAction({
			member,
			rolesMap,
			players,
			playersInWarMap,
			isDryRun
		});

		const nickUpdate = this.preNicknameUpdate(players, member, rolesMap);

		const memberUpdate: GuildMemberEditOptions & { _updated?: boolean } = {};

		if (roleUpdate.excluded.length || roleUpdate.excluded.length) {
			const existingRoleIds = member.roles.cache.map((role) => role.id);
			const roleIdsToSet = [...existingRoleIds, ...roleUpdate.included].filter((id) => !roleUpdate.excluded.includes(id));

			memberUpdate._updated = true;
			memberUpdate.roles = roleIdsToSet;
		}

		if (nickUpdate.action === NickActions.SET_NAME) {
			memberUpdate._updated = true;
			memberUpdate.nick = nickUpdate.nickname;
		}

		if (nickUpdate.action === NickActions.UNSET && member.nickname) {
			memberUpdate.nick = null;
			memberUpdate._updated = true;
		}

		if (memberUpdate._updated) await member.edit(memberUpdate);

		return memberUpdate._updated;
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
		return this.checkRoles({
			member,
			isDryRun,
			rolesToExclude: playerRolesMap.rolesToExclude,
			rolesToInclude: playerRolesMap.rolesToInclude
		});
	}

	private checkRoles({ member, rolesToExclude, rolesToInclude }: AddRoleInput) {
		if (member.user.bot) return { included: [], excluded: [] };
		if (!rolesToExclude.length && !rolesToInclude.length) return { included: [], excluded: [] };
		if (!member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles)) return { included: [], excluded: [] };

		const excluded = rolesToExclude.filter((id) => this.checkRole(member.guild, id) && member.roles.cache.has(id));
		const included = rolesToInclude.filter((id) => this.checkRole(member.guild, id) && !member.roles.cache.has(id));

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

	public getRoleChanges(queue: RolesManagerChangeLog | null) {
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

interface RolesManagerChangeLog {
	memberCount: number;
	progress: number;
	changes: {
		userId: string;
		displayName: string;
		included: string[];
		excluded: string[];
		nickname: string | null;
		/** Inter property to use within the RolesManager only. */
		_updated: boolean;
	}[];
}
